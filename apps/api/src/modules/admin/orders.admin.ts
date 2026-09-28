import { Router } from 'express';
import { Types } from 'mongoose';
import { findRegion, type Language } from '@vero/config';
import {
  DELIVERY_METHODS,
  ORDER_STATUS_TRANSITIONS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  type AdminCustomer,
  type AdminCustomerDetail,
  type AdminOrder,
  type AdminOrderSummary,
} from '@vero/types';
import { escapeRegex, normalizeUzPhone, pickLocalized } from '@vero/utils';
import {
  customerUpdateSchema,
  installmentDecisionSchema,
  objectId,
  orderDeliveryUpdateSchema,
  orderNoteSchema,
  orderStatusUpdateSchema,
  paymentStatusUpdateSchema,
  z,
} from '@vero/validation';
import { requirePermission } from '../../middleware/auth';
import { validate, body, params, query } from '../../middleware/validate';
import { HttpError, notFound } from '../../lib/http-error';
import { ok, paged } from '../../lib/respond';
import { pageMeta, sortSpec } from '../../lib/pagination';
import { audit } from '../../lib/audit';
import { absoluteUrl, iso, toImageRef } from '../../lib/localize';
import { emitSync } from '../../lib/socket';
import { events } from '../../lib/events';
import { Order, type IOrder } from '../../models/order.model';
import { Payment } from '../../models/payment.model';
import { User, type IUser } from '../../models/user.model';
import { Address } from '../../models/address.model';
import { Review } from '../../models/review.model';
import { Wishlist } from '../../models/wishlist.model';
import { Cart } from '../../models/cart.model';
import { applyPaymentCancellation, applyPaymentReceived, changeStatus } from '../orders/orders.service';
import { isOnlineProvider, markPaid, markPaymentCancelled } from '../payments/payments.service';
import { revokeAllSessions } from '../auth/auth.service';
import { canSeeFinance } from '../auth/permissions';

export const ordersAdminRouter = Router();
export const customersAdminRouter = Router();

const idParams = z.object({ id: objectId });

const regionLabel = (code: string | undefined, lang: Language) => {
  const r = code ? findRegion(code) : undefined;
  return r ? pickLocalized(r.name, lang) : (code ?? '');
};

/** Addresses store the Uzbek city / district name from UZ_REGIONS — shown in the admin's language. */
const cityLabel = (regionCode: string | undefined, city: string | undefined, lang: Language) => {
  if (!city) return city ?? '';
  const match = regionCode ? findRegion(regionCode)?.cities.find((c) => c.code === city || c.name.uz === city || c.name.ru === city || c.name.en === city) : undefined;
  return match ? pickLocalized(match.name, lang) : city;
};

export function toAdminOrderSummary(o: IOrder, lang: Language = 'uz'): AdminOrderSummary {
  return {
    id: String(o._id),
    number: o.number,
    customer: { id: String(o.user), name: `${o.customer.firstName} ${o.customer.lastName}`.trim(), phone: o.customer.phone },
    status: o.status,
    paymentStatus: o.payment.status,
    paymentMethod: o.payment.method,
    deliveryMethod: o.delivery.method,
    region: o.region ? regionLabel(o.region, lang) : undefined,
    itemsCount: o.itemsCount,
    total: o.total,
    source: o.source,
    createdAt: iso(o.createdAt)!,
  };
}

/** `finance: false` → item costs, order cost and estimated profit are sent as 0. */
export async function toAdminOrder(o: IOrder, lang: Language = 'uz', finance = true): Promise<AdminOrder> {
  const payment = o.payment.paymentId ? await Payment.findById(o.payment.paymentId).lean() : null;
  const addr = o.delivery.address;
  const pick = o.delivery.pickupSnapshot;
  return {
    ...toAdminOrderSummary(o, lang),
    items: o.items.map((i) => ({
      id: String(i._id),
      product: String(i.product),
      variant: i.variant ? String(i.variant) : undefined,
      sku: i.sku,
      name: i.name,
      variantName: i.variantName,
      image: i.image?.url ? { url: absoluteUrl(i.image.url)!, thumb: absoluteUrl(i.image.thumb ?? i.image.url) } : undefined,
      price: i.price,
      oldPrice: i.oldPrice,
      costPrice: finance ? i.costPrice : 0,
      quantity: i.quantity,
      couponDiscount: i.couponDiscount,
      total: i.total,
    })),
    customerInfo: { ...o.customer, email: o.customer.email || undefined },
    delivery: {
      method: o.delivery.method,
      address: addr ? { ...addr, city: cityLabel(addr.region, addr.city, lang), regionName: regionLabel(addr.region, lang) } : undefined,
      pickupPoint:
        pick && o.delivery.pickupPoint
          ? { id: String(o.delivery.pickupPoint), code: pick.code, name: pickLocalized(pick.name, lang), address: pickLocalized(pick.address, lang), region: o.region ?? '', city: '', phone: pick.phone, workingHours: pickLocalized(pick.workingHours, lang), location: { lat: pick.lat, lng: pick.lng } }
          : undefined,
      zone: o.delivery.zone && o.delivery.zoneName ? { id: String(o.delivery.zone), name: o.delivery.zoneName } : undefined,
      fee: o.delivery.fee,
      minDays: o.delivery.minDays,
      maxDays: o.delivery.maxDays,
      carrier: o.delivery.carrier || undefined,
      trackingNumber: o.delivery.trackingNumber || undefined,
    },
    payment: {
      id: payment ? String(payment._id) : undefined,
      method: o.payment.method,
      provider: o.payment.provider,
      status: o.payment.status,
      transactionId: payment?.transactionId,
      paidAt: iso(o.payment.paidAt),
      installment: o.payment.installment
        ? { months: o.payment.installment.months, markupPercent: o.payment.installment.markupPercent, monthlyPayment: o.payment.installment.monthlyPayment, total: o.payment.installment.total, status: o.payment.installment.status }
        : undefined,
    },
    subtotal: o.subtotal,
    oldSubtotal: o.oldSubtotal,
    productDiscount: o.productDiscount,
    couponDiscount: o.couponDiscount,
    coupon: o.coupon ? { code: o.coupon.code } : undefined,
    deliveryFee: o.deliveryFee,
    costTotal: finance ? o.costTotal : 0,
    estimatedProfit: finance ? o.total - o.deliveryFee - o.costTotal : 0,
    comment: o.comment || undefined,
    adminNotes: (o.adminNotes ?? []).map((n) => ({ text: n.text, by: n.byName ?? '', at: iso(n.at)! })),
    statusHistory: o.statusHistory.map((h) => ({ status: h.status, at: iso(h.at)!, note: h.note || undefined, by: h.byName || undefined })),
    allowedTransitions: [...ORDER_STATUS_TRANSITIONS[o.status]],
    cancelReason: o.cancelReason || undefined,
    inventoryDeducted: o.inventoryState === 'deducted',
    updatedAt: iso(o.updatedAt)!,
  };
}

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(80).optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  deliveryMethod: z.enum(DELIVERY_METHODS).optional(),
  customer: objectId.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sort: z.string().max(30).optional(),
});

ordersAdminRouter.get('/', requirePermission('orders.read'), validate({ query: listQuery }), async (req, res) => {
  const q = query<z.output<typeof listQuery>>(req);
  const filter: Record<string, unknown> = {};
  if (q.status) filter.status = q.status;
  if (q.paymentStatus) filter['payment.status'] = q.paymentStatus;
  if (q.paymentMethod) filter['payment.method'] = q.paymentMethod;
  if (q.deliveryMethod) filter['delivery.method'] = q.deliveryMethod;
  if (q.customer) filter.user = new Types.ObjectId(q.customer);
  if (q.from || q.to) filter.createdAt = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lt: q.to } : {}) };
  if (q.q) {
    const phone = normalizeUzPhone(q.q);
    const rx = { $regex: escapeRegex(q.q), $options: 'i' };
    filter.$or = [{ number: rx }, { 'customer.firstName': rx }, { 'customer.lastName': rx }, { 'customer.phone': phone ?? rx }, { 'items.sku': rx }];
  }
  const sort = sortSpec(q.sort, ['createdAt', 'total', 'status', 'number'], { createdAt: -1, _id: -1 });
  const [items, total] = await Promise.all([Order.find(filter).sort(sort).skip((q.page - 1) * q.limit).limit(q.limit).lean(), Order.countDocuments(filter)]);
  paged(res, items.map((o) => toAdminOrderSummary(o, req.ctx.lang)), pageMeta(q.page, q.limit, total));
});

ordersAdminRouter.get('/:id', requirePermission('orders.read'), validate({ params: idParams }), async (req, res) => {
  const o = await Order.findById(params<{ id: string }>(req).id).lean();
  if (!o) throw notFound('Order');
  ok(res, await toAdminOrder(o, req.ctx.lang, canSeeFinance(req.auth!.permissions)));
});

const actorOf = (req: import('express').Request) => ({
  id: req.auth!.id,
  name: `${req.auth!.user.firstName} ${req.auth!.user.lastName}`.trim(),
  isStaff: true,
  origin: req.ctx.instanceId,
});

ordersAdminRouter.post('/:id/status', requirePermission('orders.update'), validate({ params: idParams, body: orderStatusUpdateSchema }), async (req, res) => {
  const input = body<z.output<typeof orderStatusUpdateSchema>>(req);
  const before = await Order.findById(params<{ id: string }>(req).id).select('status number').lean();
  if (!before) throw notFound('Order');
  const order = await changeStatus(before._id, input.status, actorOf(req), { note: input.note, carrier: input.carrier, trackingNumber: input.trackingNumber });
  await audit(req, { action: 'order.status_change', target: { type: 'order', id: String(order._id), label: order.number }, changes: { status: { from: before.status, to: order.status } }, meta: input.note ? { note: input.note } : undefined });
  ok(res, await toAdminOrder(order, req.ctx.lang, canSeeFinance(req.auth!.permissions)));
});

ordersAdminRouter.post('/:id/notes', requirePermission('orders.update'), validate({ params: idParams, body: orderNoteSchema }), async (req, res) => {
  const { text } = body<{ text: string }>(req);
  const actor = actorOf(req);
  const order = await Order.findByIdAndUpdate(params<{ id: string }>(req).id, { $push: { adminNotes: { text, by: actor.id, byName: actor.name, at: new Date() } } }, { new: true }).lean();
  if (!order) throw notFound('Order');
  await audit(req, { action: 'order.note', target: { type: 'order', id: String(order._id), label: order.number } });
  ok(res, await toAdminOrder(order, req.ctx.lang, canSeeFinance(req.auth!.permissions)));
});

ordersAdminRouter.patch('/:id/delivery', requirePermission('orders.update'), validate({ params: idParams, body: orderDeliveryUpdateSchema }), async (req, res) => {
  const input = body<{ carrier?: string; trackingNumber?: string }>(req);
  const set: Record<string, unknown> = {};
  if (input.carrier !== undefined) set['delivery.carrier'] = input.carrier;
  if (input.trackingNumber !== undefined) set['delivery.trackingNumber'] = input.trackingNumber;
  const order = await Order.findByIdAndUpdate(params<{ id: string }>(req).id, { $set: set }, { new: true }).lean();
  if (!order) throw notFound('Order');
  emitSync({ userId: String(order.user) }, 'orders', req.ctx.instanceId);
  await audit(req, { action: 'order.delivery_update', target: { type: 'order', id: String(order._id), label: order.number }, meta: input });
  ok(res, await toAdminOrder(order, req.ctx.lang, canSeeFinance(req.auth!.permissions)));
});

ordersAdminRouter.patch('/:id/payment', requirePermission(['orders.update', 'payments.update']), validate({ params: idParams, body: paymentStatusUpdateSchema }), async (req, res) => {
  const input = body<{ status: string; note?: string }>(req);
  const order = await Order.findById(params<{ id: string }>(req).id).lean();
  if (!order?.payment.paymentId) throw notFound('Payment');
  const by = actorOf(req).name;
  // online payments (Payme / Click) become PAID only through the provider's signed callback — never by hand
  if (input.status === 'PAID' && isOnlineProvider(order.payment.provider)) {
    throw new HttpError(409, 'CONFLICT', 'Online payments are confirmed by the payment provider only', { details: { provider: order.payment.provider } });
  }
  if (input.status === 'PAID') {
    const payment = await markPaid(order.payment.paymentId, { note: input.note ?? 'marked paid by staff', by, emit: false });
    if (!payment) throw new HttpError(409, 'CONFLICT', 'Only a pending or failed payment can be marked as paid', { details: { status: order.payment.status } });
    // confirm the pending order right away (attributed to this staff member), then notify the customer
    await applyPaymentReceived(order._id, actorOf(req));
    events.emit('payment.paid', { orderId: payment.order, paymentId: payment._id });
  } else if (input.status === 'CANCELLED' || input.status === 'FAILED' || input.status === 'REFUNDED') {
    await markPaymentCancelled(order.payment.paymentId, { failed: input.status === 'FAILED', refunded: input.status === 'REFUNDED', note: input.note, by, emit: false });
    // the order follows right away (pending online order → cancelled, stock released), attributed to this staff member
    await applyPaymentCancellation(order._id, actorOf(req));
  } else throw new HttpError(422, 'VALIDATION_ERROR', 'Unsupported payment status change');
  const fresh = (await Order.findById(order._id).lean())!;
  emitSync({ userId: String(fresh.user) }, 'orders', req.ctx.instanceId);
  await audit(req, { action: 'order.payment_update', target: { type: 'order', id: String(order._id), label: order.number }, changes: { paymentStatus: { from: order.payment.status, to: fresh.payment.status } } });
  ok(res, await toAdminOrder(fresh, req.ctx.lang, canSeeFinance(req.auth!.permissions)));
});

ordersAdminRouter.post('/:id/installment', requirePermission('orders.update'), validate({ params: idParams, body: installmentDecisionSchema }), async (req, res) => {
  const input = body<{ status: 'APPROVED' | 'REJECTED'; note?: string }>(req);
  const order = await Order.findById(params<{ id: string }>(req).id).lean();
  if (!order?.payment.installment) throw notFound('Installment application');
  await Order.updateOne({ _id: order._id }, { $set: { 'payment.installment.status': input.status, 'payment.installment.note': input.note } });
  let fresh: IOrder = (await Order.findById(order._id).lean<IOrder>())!;
  if (input.status === 'APPROVED' && fresh.status === 'PENDING') fresh = await changeStatus(order._id, 'CONFIRMED', actorOf(req), { note: 'installment approved' });
  if (input.status === 'REJECTED' && fresh.status === 'PENDING') fresh = await changeStatus(order._id, 'CANCELLED', actorOf(req), { note: 'installment rejected', cancelReason: 'installment_rejected' });
  emitSync({ userId: String(fresh.user) }, 'orders', req.ctx.instanceId);
  await audit(req, { action: 'order.installment_decision', target: { type: 'order', id: String(order._id), label: order.number }, meta: input });
  ok(res, await toAdminOrder(fresh, req.ctx.lang, canSeeFinance(req.auth!.permissions)));
});

/* -------------------------------- customers ------------------------------- */

export function toAdminCustomer(u: IUser): AdminCustomer {
  return {
    id: String(u._id),
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone,
    email: u.email || undefined,
    avatar: toImageRef(u.avatar, 'uz'),
    status: u.status,
    isEmailVerified: u.isEmailVerified,
    isPhoneVerified: u.isPhoneVerified,
    language: u.preferences?.language ?? 'uz',
    ordersCount: u.stats?.ordersCount ?? 0,
    totalSpent: u.stats?.totalSpent ?? 0,
    lastOrderAt: iso(u.stats?.lastOrderAt),
    lastLoginAt: iso(u.lastLoginAt),
    createdAt: iso(u.createdAt)!,
  };
}

const customerList = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(80).optional(),
  status: z.enum(['active', 'blocked']).optional(),
  hasOrders: z.enum(['1', '0']).optional(),
  sort: z.string().max(30).optional(),
});

customersAdminRouter.get('/', requirePermission('customers.read'), validate({ query: customerList }), async (req, res) => {
  const q = query<z.output<typeof customerList>>(req);
  const filter: Record<string, unknown> = { roleKey: 'CUSTOMER' };
  if (q.status) filter.status = q.status;
  if (q.hasOrders === '1') filter['stats.ordersCount'] = { $gt: 0 };
  if (q.hasOrders === '0') filter['stats.ordersCount'] = { $in: [0, null] };
  if (q.q) {
    const rx = { $regex: escapeRegex(q.q), $options: 'i' };
    const phone = normalizeUzPhone(q.q);
    filter.$or = [{ firstName: rx }, { lastName: rx }, { email: rx }, { phone: phone ?? rx }];
  }
  const sort = sortSpec(q.sort, ['createdAt', 'stats.totalSpent', 'stats.ordersCount', 'lastLoginAt', 'firstName'], { createdAt: -1, _id: -1 });
  const [items, total] = await Promise.all([User.find(filter).sort(sort).skip((q.page - 1) * q.limit).limit(q.limit).lean(), User.countDocuments(filter)]);
  paged(res, items.map(toAdminCustomer), pageMeta(q.page, q.limit, total));
});

customersAdminRouter.get('/:id', requirePermission('customers.read'), validate({ params: idParams }), async (req, res) => {
  const u = await User.findById(params<{ id: string }>(req).id).lean();
  if (!u) throw notFound('Customer');
  const [addresses, orders, reviewsCount, wishlist, cart] = await Promise.all([
    Address.find({ user: u._id }).lean(),
    Order.find({ user: u._id }).sort({ createdAt: -1 }).limit(10).lean(),
    Review.countDocuments({ user: u._id }),
    Wishlist.findOne({ user: u._id }).select('items').lean(),
    Cart.findOne({ user: u._id }).select('items').lean(),
  ]);
  const detail: AdminCustomerDetail = {
    ...toAdminCustomer(u),
    addresses: addresses.map((a) => ({ id: String(a._id), label: a.label, isDefault: a.isDefault, firstName: a.firstName, lastName: a.lastName, phone: a.phone, region: a.region, city: cityLabel(a.region, a.city, req.ctx.lang), district: a.district, street: a.street, house: a.house, apartment: a.apartment, comment: a.comment, regionName: regionLabel(a.region, req.ctx.lang) })),
    recentOrders: orders.map((o) => toAdminOrderSummary(o, req.ctx.lang)),
    reviewsCount,
    wishlistCount: wishlist?.items.length ?? 0,
    cartItemsCount: (cart?.items ?? []).reduce((s, i) => s + i.quantity, 0),
  };
  ok(res, detail);
});

customersAdminRouter.patch('/:id', requirePermission('customers.update'), validate({ params: idParams, body: customerUpdateSchema }), async (req, res) => {
  const input = body<{ status?: 'active' | 'blocked'; firstName?: string; lastName?: string; email?: string }>(req);
  const u = await User.findOne({ _id: params<{ id: string }>(req).id, roleKey: 'CUSTOMER' }).lean();
  if (!u) throw notFound('Customer');
  if (input.email && input.email !== u.email && (await User.exists({ email: input.email }))) throw new HttpError(409, 'EMAIL_TAKEN', 'Email already registered');
  await User.updateOne({ _id: u._id }, { $set: input });
  if (input.status === 'blocked' && u.status !== 'blocked') await revokeAllSessions(u._id);
  await audit(req, { action: input.status && input.status !== u.status ? `customer.${input.status === 'blocked' ? 'block' : 'unblock'}` : 'customer.update', target: { type: 'customer', id: String(u._id), label: u.phone } });
  const fresh = (await User.findById(u._id).lean())!;
  ok(res, toAdminCustomer(fresh));
});
