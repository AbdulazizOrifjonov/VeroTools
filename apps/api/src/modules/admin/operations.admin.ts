import { Router } from 'express';
import { type Types } from 'mongoose';
import type { AdminInventoryItem, AdminInventoryMovement, AdminPayment, AdminQuestion, AdminReview } from '@vero/types';
import { INVENTORY_MOVEMENT_TYPES, PAYMENT_METHODS, PAYMENT_PROVIDERS, PAYMENT_STATUSES, QUESTION_STATUSES, REVIEW_STATUSES, REFUND_STATUSES } from '@vero/types';
import { escapeRegex, stockStatusFor } from '@vero/utils';
import { inventoryAdjustSchema, inventorySettingsSchema, objectId, questionAnswerSchema, refundUpdateSchema, reviewModerationSchema, z } from '@vero/validation';
import { env } from '../../config/env';
import { requirePermission } from '../../middleware/auth';
import { validate, body, params, query } from '../../middleware/validate';
import { notFound } from '../../lib/http-error';
import { noContent, ok, paged } from '../../lib/respond';
import { pageMeta, sortSpec } from '../../lib/pagination';
import { audit } from '../../lib/audit';
import { absoluteUrl, iso, toImageRef } from '../../lib/localize';
import { cache, CacheTags } from '../../lib/cache';
import { events } from '../../lib/events';
import { Review, ProductQuestion } from '../../models/review.model';
import { Product } from '../../models/product.model';
import { Inventory, InventoryMovement, type IInventory } from '../../models/inventory.model';
import { Payment } from '../../models/payment.model';
import { Order } from '../../models/order.model';
import type { Localized } from '../../models/common';
import { recomputeRating } from '../reviews/reviews.service';
import * as inventory from '../inventory/inventory.service';
import { clickConfigured, paymeConfigured, providerFor } from '../payments/payments.service';
import { getSetting } from '../settings/settings.service';
import { canSeeFinance } from '../auth/permissions';

export const reviewsAdminRouter = Router();
export const questionsAdminRouter = Router();
export const inventoryAdminRouter = Router();
export const paymentsAdminRouter = Router();

const idParams = z.object({ id: objectId });
const actor = (req: import('express').Request) => ({ id: req.auth!.id, name: `${req.auth!.user.firstName} ${req.auth!.user.lastName}`.trim() });
const page = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });

/* --------------------------------- reviews -------------------------------- */

type PopulatedProduct = { _id: Types.ObjectId; name: Localized; slug: string; images?: Array<{ url: string; thumb?: string }> } | null;
type PopulatedUser = { _id: Types.ObjectId; firstName: string; lastName: string; phone?: string } | null;

function toAdminReview(r: import('../../models/review.model').IReview): AdminReview {
  const product = r.product as unknown as PopulatedProduct;
  const user = r.user as unknown as PopulatedUser;
  return {
    id: String(r._id),
    product: { id: String(product?._id ?? r.product), name: product?.name ?? { uz: '', ru: '', en: '' }, slug: product?.slug ?? '', image: product?.images?.[0] ? { url: absoluteUrl(product.images[0].url)!, thumb: absoluteUrl(product.images[0].thumb) } : undefined },
    user: { id: String(user?._id ?? r.user), name: user ? `${user.firstName} ${user.lastName}` : r.authorName, phone: user?.phone },
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    pros: r.pros,
    cons: r.cons,
    images: (r.images ?? []).map((i) => toImageRef(i, 'uz')!).filter(Boolean),
    isVerifiedPurchase: r.isVerifiedPurchase,
    status: r.status,
    reply: r.reply?.text ? { text: r.reply.text, by: r.reply.byName ?? '', createdAt: iso(r.reply.at)! } : undefined,
    moderatedAt: iso(r.moderatedAt),
    createdAt: iso(r.createdAt)!,
  };
}

const reviewList = page.extend({
  status: z.enum(REVIEW_STATUSES).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  product: objectId.optional(),
  q: z.string().max(80).optional(),
});

reviewsAdminRouter.get('/', requirePermission('reviews.read'), validate({ query: reviewList }), async (req, res) => {
  const q = query<z.output<typeof reviewList>>(req);
  const filter: Record<string, unknown> = {};
  if (q.status) filter.status = q.status;
  if (q.rating) filter.rating = q.rating;
  if (q.product) filter.product = q.product;
  if (q.q) {
    const rx = { $regex: escapeRegex(q.q), $options: 'i' };
    filter.$or = [{ comment: rx }, { title: rx }, { pros: rx }, { cons: rx }, { authorName: rx }];
  }
  const [items, total] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).populate('product', 'name slug images').populate('user', 'firstName lastName phone').lean(),
    Review.countDocuments(filter),
  ]);
  paged(res, items.map(toAdminReview), pageMeta(q.page, q.limit, total));
});

reviewsAdminRouter.patch('/:id', requirePermission('reviews.moderate'), validate({ params: idParams, body: reviewModerationSchema }), async (req, res) => {
  const input = body<{ status?: 'PENDING' | 'APPROVED' | 'REJECTED'; reply?: string }>(req);
  const review = await Review.findById(params<{ id: string }>(req).id).lean();
  if (!review) throw notFound('Review');
  const set: Record<string, unknown> = { moderatedBy: req.auth!.id, moderatedAt: new Date() };
  if (input.status) set.status = input.status;
  if (input.reply !== undefined) set.reply = input.reply ? { text: input.reply, by: req.auth!.id, byName: 'VERO TOOLS', at: new Date() } : undefined;
  await Review.updateOne({ _id: review._id }, input.reply === '' ? { $set: set, $unset: { reply: 1 } } : { $set: set });
  if (input.status && input.status !== review.status) await recomputeRating(review.product);
  await cache.invalidate(CacheTags.home);
  events.emit('review.moderated', { reviewId: review._id, approved: input.status === 'APPROVED' && review.status !== 'APPROVED', replied: !!input.reply && input.reply !== review.reply?.text });
  await audit(req, { action: `review.${input.status?.toLowerCase() ?? 'reply'}`, target: { type: 'review', id: String(review._id) } });
  const fresh = await Review.findById(review._id).populate('product', 'name slug images').populate('user', 'firstName lastName phone').lean();
  ok(res, toAdminReview(fresh!));
});

reviewsAdminRouter.delete('/:id', requirePermission('reviews.moderate'), validate({ params: idParams }), async (req, res) => {
  const review = await Review.findByIdAndDelete(params<{ id: string }>(req).id).lean();
  if (!review) throw notFound('Review');
  await recomputeRating(review.product);
  await audit(req, { action: 'review.delete', target: { type: 'review', id: String(review._id) } });
  noContent(res);
});

/* -------------------------------- questions ------------------------------- */

function toAdminQuestion(q: import('../../models/review.model').IProductQuestion): AdminQuestion {
  const product = q.product as unknown as PopulatedProduct;
  const user = q.user as unknown as PopulatedUser;
  return {
    id: String(q._id),
    product: { id: String(product?._id ?? q.product), name: product?.name ?? { uz: '', ru: '', en: '' }, slug: product?.slug ?? '' },
    user: { id: String(user?._id ?? q.user), name: user ? `${user.firstName} ${user.lastName}` : q.authorName },
    question: q.question,
    answer: q.answer?.text ? { text: q.answer.text, by: q.answer.byName ?? '', createdAt: iso(q.answer.at)! } : undefined,
    status: q.status,
    createdAt: iso(q.createdAt)!,
  };
}

const questionList = page.extend({
  status: z.enum(QUESTION_STATUSES).optional(),
  product: objectId.optional(),
  q: z.string().trim().max(80).optional(),
});

questionsAdminRouter.get('/', requirePermission('reviews.read'), validate({ query: questionList }), async (req, res) => {
  const q = query<z.output<typeof questionList>>(req);
  const filter: Record<string, unknown> = {};
  if (q.status) filter.status = q.status;
  if (q.product) filter.product = q.product;
  if (q.q) {
    const rx = { $regex: escapeRegex(q.q), $options: 'i' };
    filter.$or = [{ question: rx }, { authorName: rx }, { 'answer.text': rx }];
  }
  const [items, total] = await Promise.all([
    ProductQuestion.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).populate('product', 'name slug').populate('user', 'firstName lastName').lean(),
    ProductQuestion.countDocuments(filter),
  ]);
  paged(res, items.map(toAdminQuestion), pageMeta(q.page, q.limit, total));
});

questionsAdminRouter.patch('/:id', requirePermission('reviews.moderate'), validate({ params: idParams, body: questionAnswerSchema }), async (req, res) => {
  const input = body<{ status?: string; answer?: string }>(req);
  const q = await ProductQuestion.findById(params<{ id: string }>(req).id).lean();
  if (!q) throw notFound('Question');
  const set: Record<string, unknown> = {};
  if (input.answer) {
    set.answer = { text: input.answer, by: req.auth!.id, byName: 'VERO TOOLS', at: new Date() };
    set.status = input.status ?? 'PUBLISHED';
  } else if (input.status) set.status = input.status;
  await ProductQuestion.updateOne({ _id: q._id }, { $set: set });
  if (input.answer && input.answer !== q.answer?.text) events.emit('question.answered', { questionId: q._id });
  await audit(req, { action: 'question.answer', target: { type: 'question', id: String(q._id) } });
  const fresh = await ProductQuestion.findById(q._id).populate('product', 'name slug').populate('user', 'firstName lastName').lean();
  ok(res, toAdminQuestion(fresh!));
});

questionsAdminRouter.delete('/:id', requirePermission('reviews.moderate'), validate({ params: idParams }), async (req, res) => {
  const q = await ProductQuestion.findByIdAndDelete(params<{ id: string }>(req).id).lean();
  if (!q) throw notFound('Question');
  await audit(req, { action: 'question.delete', target: { type: 'question', id: String(q._id) } });
  noContent(res);
});

/* -------------------------------- inventory ------------------------------- */

/** `finance: false` → cost price and stock value are sent as 0. */
export async function toInventoryItems(rows: IInventory[], finance = true): Promise<AdminInventoryItem[]> {
  const low = await getSetting('inventory.lowStockThreshold');
  const products = await Product.find({ _id: { $in: rows.map((r) => r.product) } }).select('name slug images status variants').lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));
  return rows.map((r) => {
    const p = byId.get(String(r.product));
    const v = r.variant ? p?.variants.find((x) => String(x._id) === String(r.variant)) : undefined;
    const available = Math.max(0, r.onHand - r.reserved);
    return {
      id: String(r._id),
      product: { id: String(r.product), name: p?.name ?? { uz: r.sku, ru: r.sku, en: r.sku }, slug: p?.slug ?? '', image: p?.images?.[0] ? { url: absoluteUrl(p.images[0].url)!, thumb: absoluteUrl(p.images[0].thumb) } : undefined, status: p?.status ?? 'archived' },
      variant: v ? { id: String(v._id), name: v.name } : undefined,
      sku: r.sku,
      stock: r.onHand,
      reserved: r.reserved,
      available,
      minStock: r.minStock,
      incoming: r.incoming,
      status: stockStatusFor(available, Math.max(low, r.minStock)),
      costPrice: finance ? r.costPrice : 0,
      stockValue: finance ? r.onHand * r.costPrice : 0,
      updatedAt: iso(r.updatedAt)!,
    };
  });
}

const inventoryList = page.extend({
  q: z.string().trim().max(80).optional(),
  stock: z.enum(['low', 'out', 'in', 'reserved']).optional(),
  product: objectId.optional(),
  sort: z.string().max(30).optional(),
});

inventoryAdminRouter.get('/', requirePermission('inventory.read'), validate({ query: inventoryList }), async (req, res) => {
  const q = query<z.output<typeof inventoryList>>(req);
  const low = await getSetting('inventory.lowStockThreshold');
  const filter: Record<string, unknown> = {};
  const available = { $subtract: ['$onHand', '$reserved'] };
  if (q.stock === 'out') filter.$expr = { $lte: [available, 0] };
  if (q.stock === 'low') filter.$expr = { $and: [{ $gt: [available, 0] }, { $lte: [available, { $max: ['$minStock', low] }] }] };
  if (q.stock === 'in') filter.$expr = { $gt: [available, { $max: ['$minStock', low] }] };
  if (q.stock === 'reserved') filter.reserved = { $gt: 0 };
  if (q.product) filter.product = q.product;
  if (q.q) {
    const productIds = await Product.find({ searchText: { $regex: escapeRegex(q.q.toLowerCase()) } }).distinct('_id');
    filter.$or = [{ sku: { $regex: escapeRegex(q.q), $options: 'i' } }, { product: { $in: productIds } }];
  }
  const sort = sortSpec(q.sort, ['onHand', 'reserved', 'sku', 'updatedAt', 'minStock'], { updatedAt: -1, _id: -1 });
  const [rows, total] = await Promise.all([Inventory.find(filter).sort(sort).skip((q.page - 1) * q.limit).limit(q.limit).lean(), Inventory.countDocuments(filter)]);
  paged(res, await toInventoryItems(rows, canSeeFinance(req.auth!.permissions)), pageMeta(q.page, q.limit, total));
});

function toMovement(m: import('../../models/inventory.model').IInventoryMovement, names: Map<string, { name: Localized; variants: Array<{ _id: Types.ObjectId; name: Localized }> }>): AdminInventoryMovement {
  const p = names.get(String(m.product));
  const v = m.variant ? p?.variants.find((x) => String(x._id) === String(m.variant)) : undefined;
  return {
    id: String(m._id),
    inventory: String(m.inventory),
    product: { id: String(m.product), name: p?.name ?? { uz: m.sku, ru: m.sku, en: m.sku } },
    variant: v ? { id: String(v._id), name: v.name } : undefined,
    sku: m.sku,
    type: m.type,
    quantity: m.quantity,
    stockBefore: m.stockBefore,
    stockAfter: m.stockAfter,
    reservedBefore: m.reservedBefore,
    reservedAfter: m.reservedAfter,
    reason: m.reason,
    reference: m.reference?.type ? { type: m.reference.type, id: m.reference.id, label: m.reference.label } : undefined,
    user: m.user ? { id: String(m.user), name: m.userName ?? '' } : undefined,
    createdAt: iso(m.createdAt)!,
  };
}

async function movementPage(filter: Record<string, unknown>, q: { page: number; limit: number }) {
  const [rows, total] = await Promise.all([InventoryMovement.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(), InventoryMovement.countDocuments(filter)]);
  const products = await Product.find({ _id: { $in: rows.map((r) => r.product) } }).select('name variants._id variants.name').lean();
  const names = new Map(products.map((p) => [String(p._id), { name: p.name, variants: p.variants }]));
  return { items: rows.map((r) => toMovement(r, names)), meta: pageMeta(q.page, q.limit, total) };
}

const movementList = page.extend({
  type: z.enum(INVENTORY_MOVEMENT_TYPES).optional(),
  product: objectId.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

inventoryAdminRouter.get('/movements', requirePermission('inventory.read'), validate({ query: movementList }), async (req, res) => {
  const q = query<z.output<typeof movementList>>(req);
  const filter: Record<string, unknown> = {};
  if (q.type) filter.type = q.type;
  if (q.product) filter.product = q.product;
  if (q.from || q.to) filter.createdAt = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lt: q.to } : {}) };
  const r = await movementPage(filter, q);
  paged(res, r.items, r.meta);
});

inventoryAdminRouter.get('/:id/movements', requirePermission('inventory.read'), validate({ params: idParams, query: page }), async (req, res) => {
  const r = await movementPage({ inventory: params<{ id: string }>(req).id }, query(req));
  paged(res, r.items, r.meta);
});

inventoryAdminRouter.post('/:id/adjust', requirePermission('inventory.update'), validate({ params: idParams, body: inventoryAdjustSchema }), async (req, res) => {
  const input = body<z.output<typeof inventoryAdjustSchema>>(req);
  const before = await Inventory.findById(params<{ id: string }>(req).id).lean();
  if (!before) throw notFound('Inventory item');
  // only finance roles may change the unit cost of stock
  const costPrice = canSeeFinance(req.auth!.permissions) ? (input.costPrice ?? undefined) : undefined;
  const updated = await inventory.adjust(String(before._id), { ...input, costPrice }, actor(req));
  await cache.invalidate(CacheTags.home);
  await audit(req, {
    action: 'inventory.adjust',
    target: { type: 'inventory', id: String(before._id), label: before.sku },
    changes: { onHand: { from: before.onHand, to: updated.onHand }, incoming: { from: before.incoming, to: updated.incoming } },
    meta: { type: input.type, quantity: input.quantity, reason: input.reason },
  });
  ok(res, (await toInventoryItems([updated], canSeeFinance(req.auth!.permissions)))[0]);
});

inventoryAdminRouter.patch('/:id', requirePermission('inventory.update'), validate({ params: idParams, body: inventorySettingsSchema }), async (req, res) => {
  const updated = await inventory.setMinStock(params<{ id: string }>(req).id, body<{ minStock: number }>(req).minStock);
  await audit(req, { action: 'inventory.min_stock', target: { type: 'inventory', id: String(updated._id), label: updated.sku }, meta: { minStock: updated.minStock } });
  ok(res, (await toInventoryItems([updated], canSeeFinance(req.auth!.permissions)))[0]);
});

/* --------------------------------- payments ------------------------------- */

const paymentList = page.extend({
  status: z.enum(PAYMENT_STATUSES).optional(),
  provider: z.enum(PAYMENT_PROVIDERS).optional(),
  method: z.enum(PAYMENT_METHODS).optional(),
  refundStatus: z.enum(REFUND_STATUSES).optional(),
  q: z.string().max(60).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

paymentsAdminRouter.get('/', requirePermission('payments.read'), validate({ query: paymentList }), async (req, res) => {
  const q = query<z.output<typeof paymentList>>(req);
  const filter: Record<string, unknown> = {};
  if (q.status) filter.status = q.status;
  if (q.provider) filter.provider = q.provider;
  if (q.method) filter.method = q.method;
  if (q.refundStatus) filter.refundStatus = q.refundStatus;
  if (q.q) filter.$or = [{ orderNumber: { $regex: escapeRegex(q.q), $options: 'i' } }, { transactionId: q.q }];
  if (q.from || q.to) filter.createdAt = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lt: q.to } : {}) };
  const [rows, total] = await Promise.all([Payment.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(), Payment.countDocuments(filter)]);
  const orders = await Order.find({ _id: { $in: rows.map((r) => r.order) } }).select('number status customer user').lean();
  const byId = new Map(orders.map((o) => [String(o._id), o]));
  const items: AdminPayment[] = rows.map((p) => {
    const o = byId.get(String(p.order));
    return {
      id: String(p._id),
      order: { id: String(p.order), number: p.orderNumber, status: o?.status ?? 'CANCELLED' },
      customer: { id: String(p.user), name: o ? `${o.customer.firstName} ${o.customer.lastName}` : '', phone: o?.customer.phone ?? '' },
      method: p.method,
      provider: p.provider,
      amount: p.amount,
      currency: 'UZS',
      status: p.status,
      transactionId: p.transactionId,
      refundStatus: p.refundStatus,
      refundAmount: p.refundAmount,
      paidAt: iso(p.paidAt),
      createdAt: iso(p.createdAt)!,
      updatedAt: iso(p.updatedAt)!,
    };
  });
  paged(res, items, pageMeta(q.page, q.limit, total));
});

paymentsAdminRouter.get('/providers', requirePermission('payments.read'), async (_req, res) => {
  const enabled = new Set(await getSetting('payments.enabledMethods'));
  const base = env.PUBLIC_API_URL.replace(/\/+$/, '');
  const methodsOf = (provider: string) => PAYMENT_METHODS.filter((m) => providerFor(m) === provider);
  ok(res, [
    { provider: 'cash', methods: methodsOf('cash'), configured: true, enabled: methodsOf('cash').some((m) => enabled.has(m)) },
    { provider: 'payme', methods: methodsOf('payme'), configured: paymeConfigured(), enabled: methodsOf('payme').some((m) => enabled.has(m)), testMode: env.PAYME_TEST_MODE, webhookUrl: `${base}/api/payments/payme` },
    { provider: 'click', methods: methodsOf('click'), configured: clickConfigured(), enabled: methodsOf('click').some((m) => enabled.has(m)), webhookUrl: `${base}/api/payments/click/prepare | ${base}/api/payments/click/complete` },
    { provider: 'installment', methods: methodsOf('installment'), configured: env.INSTALLMENT_ENABLED, enabled: enabled.has('installment') },
  ]);
});

paymentsAdminRouter.patch('/:id/refund', requirePermission('payments.update'), validate({ params: idParams, body: refundUpdateSchema }), async (req, res) => {
  const input = body<{ refundStatus: 'NONE' | 'PENDING' | 'REFUNDED' | 'REJECTED'; refundAmount?: number; note?: string }>(req);
  const p = await Payment.findById(params<{ id: string }>(req).id).lean();
  if (!p) throw notFound('Payment');
  const set: Record<string, unknown> = { refundStatus: input.refundStatus };
  if (input.refundAmount) set.refundAmount = input.refundAmount;
  if (input.refundStatus === 'REFUNDED') {
    set.status = 'REFUNDED';
    set.refundedAt = new Date();
  }
  await Payment.updateOne({ _id: p._id }, { $set: set, $push: { history: { status: `REFUND_${input.refundStatus}`, at: new Date(), note: input.note, by: actor(req).name } } });
  if (input.refundStatus === 'REFUNDED') await Order.updateOne({ _id: p.order }, { $set: { 'payment.status': 'REFUNDED' } });
  await audit(req, { action: 'payment.refund_update', target: { type: 'payment', id: String(p._id), label: p.orderNumber }, changes: { refundStatus: { from: p.refundStatus, to: input.refundStatus } } });
  const fresh = (await Payment.findById(p._id).lean())!;
  ok(res, { id: String(fresh._id), status: fresh.status, refundStatus: fresh.refundStatus, refundAmount: fresh.refundAmount });
});
