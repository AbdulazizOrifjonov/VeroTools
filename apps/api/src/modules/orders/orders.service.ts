import { Types, type ClientSession } from 'mongoose';
import type { ClientApp, Language } from '@vero/config';
import { findRegion } from '@vero/config';
import {
  CUSTOMER_CANCELLABLE_STATUSES,
  ORDER_STATUS_TRANSITIONS,
  type CheckoutQuote,
  type CreateOrderResult,
  type OrderStatus,
} from '@vero/types';
import type { CheckoutData, CheckoutQuoteInput } from '@vero/validation';
import { addWorkingDays, businessDateKey, calcInstallment } from '@vero/utils';
import { logger } from '../../config/logger';
import { withTransaction, sessionOpt } from '../../db/transaction';
import { HttpError, notFound } from '../../lib/http-error';
import { events } from '../../lib/events';
import { emitSync, emitToAdmins, emitToUser } from '../../lib/socket';
import { SOCKET_EVENTS } from '@vero/config';
import { Address } from '../../models/address.model';
import { Cart } from '../../models/cart.model';
import { Counter, Order, type IOrder, type IOrderItem } from '../../models/order.model';
import { Payment } from '../../models/payment.model';
import { Product } from '../../models/product.model';
import { User } from '../../models/user.model';
import { PickupPoint } from '../../models/delivery.model';
import type { RequestContext } from '../../types/express';
import { consumeCoupon, evaluateCoupon, releaseCoupon, type CouponResult } from '../cart/coupon.service';
import { findCart, resolveLines, type ResolvedLine } from '../cart/cart.service';
import { toCartItemDTO } from '../cart/cart.service';
import { zoneForRegion } from '../delivery/delivery.service';
import * as inventory from '../inventory/inventory.service';
import { availablePaymentMethods, createPayment, onOrderStatus, paymentAction, providerFor } from '../payments/payments.service';
import { getSettings } from '../settings/settings.service';
import { getCatalogIndex } from '../catalog/catalog-index';
import { toOrderDetail } from './order.serializer';
import { clock } from '../../lib/clock';

export interface Actor {
  id?: Types.ObjectId;
  name?: string;
  isStaff: boolean;
  origin?: string | null;
}

const SYSTEM: Actor = { name: 'system', isStaff: true };

/** VT-YYMMDD-NNN — sequence per business day (Asia/Tashkent). */
export async function nextOrderNumber(session?: ClientSession | null, date: Date = clock.now()): Promise<string> {
  const day = businessDateKey(date).replace(/-/g, '').slice(2); // YYMMDD
  const counter = await Counter.findOneAndUpdate({ _id: `order:${day}` }, { $inc: { seq: 1 } }, { upsert: true, new: true, ...sessionOpt(session) }).lean();
  return `VT-${day}-${String(counter!.seq).padStart(3, '0')}`;
}

function stockLines(items: Pick<IOrderItem, 'product' | 'variant' | 'quantity' | 'sku'>[]): inventory.StockLine[] {
  return items.map((i) => ({ product: i.product, variant: i.variant ?? null, quantity: i.quantity, sku: i.sku }));
}

/* ---------------------------------------------------------------------- */
/* Pricing (shared by quote + create)                                      */
/* ---------------------------------------------------------------------- */

interface Priced {
  lines: ResolvedLine[];
  subtotal: number;
  oldSubtotal: number;
  regularSubtotal: number;
  coupon: CouponResult | null;
  couponDiscount: number;
  deliveryFee: number;
  total: number;
}

async function priceCart(
  lines: ResolvedLine[],
  opts: { couponCode?: string | null; userId: Types.ObjectId; lang: Language; deliveryFeeFor: (goods: number) => number; strictCoupon: boolean },
): Promise<Priced> {
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const oldSubtotal = lines.reduce((s, l) => s + (l.oldPrice ?? l.price) * l.quantity, 0);
  const regularSubtotal = lines.reduce((s, l) => s + Math.max(l.regularPrice, l.price) * l.quantity, 0);
  let coupon: CouponResult | null = null;
  if (opts.couponCode) {
    try {
      coupon = await evaluateCoupon(
        opts.couponCode,
        lines.map((l) => ({ productId: l.productId, categoryPath: l.product.categoryPath ?? [], brand: l.product.brand, lineTotal: l.price * l.quantity })),
        { userId: opts.userId, lang: opts.lang },
      );
    } catch (e) {
      if (opts.strictCoupon) throw e;
    }
  }
  const couponDiscount = coupon?.discount ?? 0;
  const goods = subtotal - couponDiscount;
  const deliveryFee = opts.deliveryFeeFor(goods);
  return { lines, subtotal, oldSubtotal, regularSubtotal, coupon, couponDiscount, deliveryFee, total: goods + deliveryFee };
}

async function checkoutLines(userId: Types.ObjectId) {
  const cart = await findCart({ userId });
  const lines = await resolveLines(cart?.items ?? []);
  return { cart, lines };
}

export async function quote(userId: Types.ObjectId, input: CheckoutQuoteInput, lang: Language): Promise<CheckoutQuote> {
  const { cart, lines } = await checkoutLines(userId);
  const available = lines.filter((l) => l.isAvailable);
  const s = await getSettings();
  let region = input.delivery?.region;
  if (!region && input.delivery?.addressId) region = (await Address.findOne({ _id: input.delivery.addressId, user: userId }).lean())?.region;
  const zone = input.delivery?.method === 'courier' ? await zoneForRegion(region) : null;
  const priced = await priceCart(available, {
    couponCode: input.couponCode ?? cart?.couponCode,
    userId,
    lang,
    deliveryFeeFor: (goods) => (zone ? (zone.freeThreshold > 0 && goods >= zone.freeThreshold ? 0 : zone.price) : 0),
    strictCoupon: false,
  });
  const idx = await getCatalogIndex();
  const low = s['inventory.lowStockThreshold'];
  let installment: CheckoutQuote['installment'];
  if (input.payment?.method === 'installment' && input.payment.installmentMonths) {
    const plan = s['installment.plans'].find((p) => p.months === input.payment!.installmentMonths);
    if (plan) installment = calcInstallment(priced.total, plan);
  }
  return {
    items: lines.map((l) => toCartItemDTO(l, lang, low, l.product?.brand ? idx.brands.get(String(l.product.brand))?.name : undefined)),
    subtotal: priced.subtotal,
    oldSubtotal: priced.oldSubtotal,
    productDiscount: Math.max(0, priced.oldSubtotal - priced.subtotal),
    couponDiscount: priced.couponDiscount,
    coupon: priced.coupon
      ? { code: priced.coupon.coupon.code, type: priced.coupon.coupon.type, value: priced.coupon.coupon.value, discount: priced.coupon.discount, description: priced.coupon.description }
      : undefined,
    deliveryFee: priced.deliveryFee,
    total: priced.total,
    installment,
    delivery: input.delivery?.method
      ? {
          method: input.delivery.method,
          minDays: zone?.minDays ?? 0,
          maxDays: zone?.maxDays ?? available.reduce((m, l) => Math.max(m, l.product.deliveryDays?.max ?? 1), 1),
        }
      : undefined,
  };
}

/* ---------------------------------------------------------------------- */
/* Create                                                                  */
/* ---------------------------------------------------------------------- */

export async function createOrder(userId: Types.ObjectId, input: CheckoutData, ctx: RequestContext): Promise<CreateOrderResult> {
  const lang = ctx.lang;
  const s = await getSettings();
  const { cart, lines } = await checkoutLines(userId);
  if (!lines.length) throw new HttpError(422, 'CART_EMPTY', 'Cart is empty');
  const problems = lines.filter((l) => !l.isAvailable || l.quantity !== l.requested);
  if (problems.length) {
    throw new HttpError(409, 'INSUFFICIENT_STOCK', 'Some items are no longer available in the requested quantity', {
      details: problems.map((l) => ({ productId: String(l.productId), sku: l.variant?.sku ?? l.product?.sku, available: l.available, requested: l.requested })),
    });
  }

  /* delivery */
  let addressSnapshot: IOrder['delivery']['address'];
  let region: string | undefined;
  let zone = null as Awaited<ReturnType<typeof zoneForRegion>>;
  let pickupSnapshot: IOrder['delivery']['pickupSnapshot'];
  let pickupPoint: Types.ObjectId | null = null;
  if (input.delivery.method === 'courier') {
    if (input.delivery.addressId) {
      const a = await Address.findOne({ _id: input.delivery.addressId, user: userId }).lean();
      if (!a) throw new HttpError(422, 'VALIDATION_ERROR', 'Address not found', { fields: { 'delivery.addressId': 'errors.NOT_FOUND' } });
      addressSnapshot = { firstName: a.firstName, lastName: a.lastName, phone: a.phone, region: a.region, city: a.city, district: a.district, street: a.street, house: a.house, apartment: a.apartment, comment: a.comment };
    } else if (input.delivery.address) {
      const a = input.delivery.address;
      addressSnapshot = { firstName: input.customer.firstName, lastName: input.customer.lastName, phone: input.customer.phone, ...a };
    }
    region = addressSnapshot?.region;
    if (!region || !findRegion(region)) throw new HttpError(422, 'DELIVERY_UNAVAILABLE', 'Unknown region');
    zone = await zoneForRegion(region);
    if (!zone) throw new HttpError(422, 'DELIVERY_UNAVAILABLE', 'Delivery to this region is not available');
  } else {
    const p = await PickupPoint.findOne({ _id: input.delivery.pickupPointId, isActive: true }).lean();
    if (!p) throw new HttpError(422, 'PICKUP_POINT_UNAVAILABLE', 'Pickup point is not available');
    pickupPoint = p._id;
    region = p.region;
    pickupSnapshot = { code: p.code, name: p.name, address: p.address, phone: p.phone, workingHours: p.workingHours, lat: p.location.lat, lng: p.location.lng };
  }

  /* pricing */
  const priced = await priceCart(lines, {
    couponCode: input.couponCode || cart?.couponCode,
    userId,
    lang,
    deliveryFeeFor: (goods) => (zone ? (zone.freeThreshold > 0 && goods >= zone.freeThreshold ? 0 : zone.price) : 0),
    strictCoupon: !!input.couponCode,
  });

  /* payment */
  const methods = await availablePaymentMethods(priced.total, lang);
  const method = methods.find((m) => m.code === input.payment.method);
  const provider = providerFor(input.payment.method);
  if (!method?.available || !provider) throw new HttpError(422, 'PAYMENT_METHOD_UNAVAILABLE', 'Payment method is not available');
  let installment: IOrder['payment']['installment'];
  if (input.payment.method === 'installment') {
    const plan = s['installment.plans'].find((p) => p.months === input.payment.installmentMonths);
    if (!plan) throw new HttpError(422, 'VALIDATION_ERROR', 'Invalid installment term', { fields: { 'payment.installmentMonths': 'validation.installmentMonths' } });
    const calc = calcInstallment(priced.total, plan);
    installment = { months: calc.months, markupPercent: calc.markupPercent, monthlyPayment: calc.monthlyPayment, total: calc.total, status: 'UNDER_REVIEW' };
  }

  /* items snapshot */
  const idx = await getCatalogIndex();
  const items: IOrderItem[] = lines.map((l, i) => {
    const allocated = priced.coupon?.allocation[i] ?? 0;
    const image = l.variant?.image ?? l.product.images?.[0];
    return {
      _id: new Types.ObjectId(),
      product: l.productId,
      variant: l.variantId,
      sku: l.variant?.sku ?? l.product.sku,
      slug: l.product.slug,
      name: l.product.name,
      variantName: l.variant?.name,
      image: image ? { url: image.url, thumb: image.thumb } : undefined,
      brandId: l.product.brand,
      brandName: l.product.brand ? idx.brands.get(String(l.product.brand))?.name : undefined,
      categoryId: l.product.category,
      regularPrice: Math.max(l.regularPrice, l.price),
      price: l.price,
      oldPrice: l.oldPrice,
      costPrice: l.costPrice,
      quantity: l.quantity,
      couponDiscount: allocated,
      total: l.price * l.quantity - allocated,
      warrantyMonths: l.product.warrantyMonths ?? 0,
      reviewed: false,
    };
  });

  const now = clock.now();
  const orderId = new Types.ObjectId();
  let reserved = false;
  let couponConsumed = false;

  const order = await withTransaction(async (session) => {
    try {
      const number = await nextOrderNumber(session);
      await inventory.reserve(stockLines(items), { type: 'order', id: String(orderId), label: number }, session);
      reserved = true;
      if (priced.coupon) {
        await consumeCoupon(priced.coupon.coupon._id, session);
        couponConsumed = true;
      }
      const minDays = zone?.minDays ?? 0;
      const maxDays = zone?.maxDays ?? Math.max(1, ...lines.map((l) => l.product.deliveryDays?.max ?? 1));
      const doc: Partial<IOrder> = {
        _id: orderId,
        number,
        user: userId,
        items,
        itemsCount: items.reduce((sum, i) => sum + i.quantity, 0),
        customer: { ...input.customer, email: input.customer.email },
        delivery: {
          method: input.delivery.method,
          zone: zone?._id ?? null,
          zoneName: zone?.name,
          address: addressSnapshot,
          pickupPoint,
          pickupSnapshot,
          fee: priced.deliveryFee,
          minDays,
          maxDays,
          estimatedFrom: addWorkingDays(now, Math.max(0, minDays)),
          estimatedTo: addWorkingDays(now, Math.max(minDays, maxDays)),
        },
        payment: { method: input.payment.method, provider, status: 'PENDING', installment },
        coupon: priced.coupon ? { code: priced.coupon.coupon.code, couponId: priced.coupon.coupon._id, discount: priced.couponDiscount } : undefined,
        regularSubtotal: priced.regularSubtotal,
        subtotal: priced.subtotal,
        oldSubtotal: priced.oldSubtotal,
        productDiscount: Math.max(0, priced.oldSubtotal - priced.subtotal),
        promotionDiscount: Math.max(0, priced.regularSubtotal - priced.subtotal),
        couponDiscount: priced.couponDiscount,
        deliveryFee: priced.deliveryFee,
        total: priced.total,
        costTotal: items.reduce((sum, i) => sum + i.costPrice * i.quantity, 0),
        status: 'PENDING',
        statusHistory: [{ status: 'PENDING', at: now }],
        comment: input.comment,
        source: ctx.client === 'mobile' ? 'mobile' : 'web',
        inventoryState: 'reserved',
        region,
        ip: ctx.ip,
        userAgent: ctx.userAgent.slice(0, 300),
      };
      const [created] = await Order.create([doc], sessionOpt(session));
      const payment = await createPayment(created!.toObject() as IOrder, session);
      await Order.updateOne({ _id: orderId }, { $set: { 'payment.paymentId': payment._id } }, sessionOpt(session));
      // remove ordered lines from the cart (they are all the available lines)
      await Cart.updateOne({ user: userId }, { $set: { items: [], couponCode: null } }, sessionOpt(session));
      await User.updateOne({ _id: userId }, { $inc: { 'stats.ordersCount': 1 }, $set: { 'stats.lastOrderAt': now } }, sessionOpt(session));
      return (await Order.findById(orderId, null, sessionOpt(session)).lean())!;
    } catch (err) {
      if (!session) {
        if (reserved) await inventory.release(stockLines(items), { type: 'order', id: String(orderId) }).catch(() => undefined);
        if (couponConsumed && priced.coupon) await releaseCoupon(priced.coupon.coupon._id).catch(() => undefined);
        await Order.deleteOne({ _id: orderId }).catch(() => undefined);
        await Payment.deleteMany({ order: orderId }).catch(() => undefined);
      }
      throw err;
    }
  });

  if (input.delivery.method === 'courier' && input.delivery.address && input.delivery.saveAddress && addressSnapshot) {
    const count = await Address.countDocuments({ user: userId });
    await Address.create({ user: userId, ...addressSnapshot, isDefault: count === 0 }).catch((err) => logger.warn({ err }, 'saving address failed'));
    emitSync({ userId: String(userId) }, 'addresses');
  }

  events.emit('order.created', { orderId: order._id, origin: ctx.instanceId });
  emitSync({ userId: String(userId) }, 'cart', ctx.instanceId);
  emitSync({ userId: String(userId) }, 'orders', ctx.instanceId);
  emitToAdmins(SOCKET_EVENTS.adminOrderNew, {
    orderId: String(order._id),
    number: order.number,
    total: order.total,
    status: order.status,
    customerName: `${order.customer.firstName} ${order.customer.lastName}`,
  });

  const detail = toOrderDetail(order, lang, ctx.client);
  return { order: detail, payment: { method: order.payment.method, status: order.payment.status, action: paymentAction(order, ctx.client, lang) } };
}

/* ---------------------------------------------------------------------- */
/* Status changes                                                          */
/* ---------------------------------------------------------------------- */

export async function changeStatus(
  orderId: Types.ObjectId | string,
  to: OrderStatus,
  actor: Actor,
  opts: { note?: string; carrier?: string; trackingNumber?: string; cancelReason?: string } = {},
): Promise<IOrder> {
  const current = await Order.findById(orderId).lean();
  if (!current) throw notFound('Order');
  const from = current.status;
  if (from === to) return current;
  if (!ORDER_STATUS_TRANSITIONS[from].includes(to)) {
    throw new HttpError(409, 'INVALID_STATUS_TRANSITION', `Cannot change status from ${from} to ${to}`, { details: { from, to } });
  }
  if (!actor.isStaff && !(to === 'CANCELLED' && CUSTOMER_CANCELLABLE_STATUSES.includes(from))) {
    throw new HttpError(409, 'ORDER_CANNOT_CANCEL', 'This order can no longer be cancelled');
  }
  const ref = { type: 'order' as const, id: String(current._id), label: current.number };
  const inventoryActor = { id: actor.id, name: actor.name };
  const now = clock.now();

  const result = await withTransaction(async (session): Promise<{ order: IOrder; applied: boolean }> => {
    // 1. claim the transition first (optimistic concurrency): only one caller can move the order away from
    //    `from`, so stock is never released / deducted twice — also on a standalone server without transactions
    const set: Record<string, unknown> = { status: to };
    if (to === 'CANCELLED') {
      set.cancelledAt = now;
      set.cancelReason = opts.cancelReason ?? opts.note;
    }
    if (to === 'DELIVERED') {
      set.deliveredAt = now;
      set['delivery.deliveredAt'] = now;
    }
    if (opts.carrier) set['delivery.carrier'] = opts.carrier;
    if (opts.trackingNumber) set['delivery.trackingNumber'] = opts.trackingNumber;
    const claimed = await Order.findOneAndUpdate(
      { _id: current._id, status: from },
      { $set: set, $push: { statusHistory: { status: to, at: now, by: actor.id, byName: actor.name, note: opts.note } } },
      { new: true, ...sessionOpt(session) },
    ).lean();
    if (!claimed) {
      // a concurrent caller already made exactly this change (e.g. provider callback and staff action at once)
      const latest = await Order.findById(current._id, null, sessionOpt(session)).lean();
      if (latest?.status === to) return { order: latest, applied: false };
      throw new HttpError(409, 'CONFLICT', 'Order was modified concurrently, please retry');
    }

    // 2. stock movements of the transition
    let inventoryState = current.inventoryState;
    try {
      if (to === 'CANCELLED' && current.inventoryState === 'reserved') {
        await inventory.release(stockLines(current.items), ref, inventoryActor, session);
        inventoryState = 'released';
      }
      if ((to === 'SHIPPED' || to === 'DELIVERED') && current.inventoryState === 'reserved') {
        await inventory.deduct(stockLines(current.items), ref, inventoryActor, session);
        inventoryState = 'deducted';
      }
      if (to === 'RETURNED' && current.inventoryState === 'deducted') {
        await inventory.returnStock(stockLines(current.items), { ...ref, type: 'return' }, inventoryActor, session);
        inventoryState = 'returned';
      }
    } catch (err) {
      // a transaction rolls the claim back by itself; without one, restore the previous state explicitly
      if (!session) await revertClaim(current, set, to);
      throw err;
    }

    // 3. inventory state, customer and product statistics
    const res = await Order.findOneAndUpdate({ _id: current._id }, { $set: { inventoryState } }, { new: true, ...sessionOpt(session) }).lean();
    if (!res) throw notFound('Order');
    if (to === 'DELIVERED') {
      await User.updateOne({ _id: current.user }, { $inc: { 'stats.totalSpent': current.total } }, sessionOpt(session));
      for (const item of current.items) {
        await Product.updateOne({ _id: item.product }, { $inc: { soldCount: item.quantity, popularity: item.quantity * 10 } }, sessionOpt(session));
      }
    }
    if (to === 'RETURNED' && from === 'DELIVERED') {
      await User.updateOne({ _id: current.user }, { $inc: { 'stats.totalSpent': -current.total } }, sessionOpt(session));
    }
    return { order: res, applied: true };
  });
  // the other caller performs the follow-up work (payment sync, notifications, realtime events)
  if (!result.applied) return result.order;
  const updated = result.order;

  if (to === 'CANCELLED' && current.coupon?.couponId) await releaseCoupon(current.coupon.couponId).catch(() => undefined);
  await onOrderStatus(updated, to, actor.name).catch((err) => logger.error({ err }, 'payment sync failed'));
  const fresh = (await Order.findById(updated._id).lean())!;

  events.emit('order.status_changed', { orderId: fresh._id, from, to, byStaff: actor.isStaff, origin: actor.origin });
  emitSync({ userId: String(fresh.user) }, 'orders', actor.origin);
  emitToUser(String(fresh.user), SOCKET_EVENTS.orderUpdated, { orderId: String(fresh._id), number: fresh.number, status: fresh.status, origin: actor.origin ?? undefined });
  emitToAdmins(SOCKET_EVENTS.adminOrderUpdated, { orderId: String(fresh._id), number: fresh.number, total: fresh.total, status: fresh.status });
  return fresh;
}

/** Undo a claimed status change when the stock movement failed (standalone servers without transactions). */
async function revertClaim(current: IOrder, set: Record<string, unknown>, claimedStatus: OrderStatus) {
  const restore: Record<string, unknown> = {};
  const unset: Record<string, ''> = {};
  for (const key of Object.keys(set)) {
    const previous = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | null | undefined)?.[k], current);
    if (previous === undefined || previous === null) unset[key] = '';
    else restore[key] = previous;
  }
  await Order.updateOne(
    { _id: current._id, status: claimedStatus },
    { $set: restore, ...(Object.keys(unset).length ? { $unset: unset } : {}), $pop: { statusHistory: 1 } },
  ).catch((err) => logger.error({ err, order: current.number }, 'failed to revert order status after a stock error'));
}

export async function customerCancel(orderId: string, userId: Types.ObjectId, reason: string | undefined, ctx: RequestContext) {
  const order = await Order.findOne({ _id: orderId, user: userId }).lean();
  if (!order) throw notFound('Order');
  if (!CUSTOMER_CANCELLABLE_STATUSES.includes(order.status)) throw new HttpError(409, 'ORDER_CANNOT_CANCEL', 'This order can no longer be cancelled');
  return changeStatus(order._id, 'CANCELLED', { id: userId, name: `${order.customer.firstName} ${order.customer.lastName}`, isStaff: false, origin: ctx.instanceId }, { cancelReason: reason || 'customer' });
}

export async function findCustomerOrder(idOrNumber: string, userId: Types.ObjectId) {
  const filter = Types.ObjectId.isValid(idOrNumber) && idOrNumber.length === 24 ? { _id: idOrNumber } : { number: idOrNumber.toUpperCase() };
  const order = await Order.findOne({ ...filter, user: userId }).lean();
  if (!order) throw notFound('Order');
  return order;
}

export function detail(order: IOrder, lang: Language, client: ClientApp) {
  return toOrderDetail(order, lang, client);
}

/* ---------------------------------------------------------------------- */
/* Payment-driven transitions & maintenance                                 */
/* ---------------------------------------------------------------------- */

/** A received payment confirms a pending order (provider callback via `payment.paid`, or the admin payment action). */
export async function applyPaymentReceived(orderId: Types.ObjectId, actor: Actor = SYSTEM): Promise<IOrder | null> {
  const order = await Order.findById(orderId).lean();
  if (order?.status === 'PENDING') return changeStatus(order._id, 'CONFIRMED', actor, { note: 'payment received' });
  if (order) emitSync({ userId: String(order.user) }, 'orders');
  return order;
}

events.on('payment.paid', async ({ orderId }) => {
  await applyPaymentReceived(orderId);
});

/**
 * Order consequences of a payment that failed, was cancelled or refunded: a pending online-payment order is
 * cancelled (stock released); an order that has not shipped yet is cancelled when its payment was refunded.
 * Called for provider callbacks (via the `payment.failed` event) and directly by the admin payment action.
 */
export async function applyPaymentCancellation(orderId: Types.ObjectId, actor: Actor = SYSTEM): Promise<IOrder | null> {
  const order = await Order.findById(orderId).lean();
  if (!order) return null;
  if (order.status === 'PENDING' && order.payment.provider !== 'cash' && order.payment.provider !== 'installment') {
    return changeStatus(order._id, 'CANCELLED', actor, { note: 'online payment cancelled', cancelReason: 'payment_cancelled' });
  }
  if (['CONFIRMED', 'PROCESSING', 'PACKED'].includes(order.status) && order.payment.status === 'REFUNDED') {
    return changeStatus(order._id, 'CANCELLED', actor, { note: actor === SYSTEM ? 'payment refunded by provider' : 'payment refunded', cancelReason: 'refunded' });
  }
  return order;
}

events.on('payment.failed', async ({ orderId }) => {
  await applyPaymentCancellation(orderId);
});

/** Cancels online-payment orders that were not paid in time and releases their stock. */
export async function expireUnpaidOrders(): Promise<number> {
  const minutes = (await getSettings())['order.autoCancelUnpaidMinutes'];
  if (!minutes || minutes <= 0) return 0;
  const cutoff = new Date(Date.now() - minutes * 60_000);
  const candidates = await Order.find({
    status: 'PENDING',
    'payment.provider': { $in: ['payme', 'click'] },
    'payment.status': 'PENDING',
    createdAt: { $lt: cutoff },
  })
    .limit(100)
    .lean();
  let n = 0;
  for (const order of candidates) {
    const payment = order.payment.paymentId ? await Payment.findById(order.payment.paymentId).lean() : null;
    // a Payme transaction in progress may still be performed within 12h — leave it alone
    if (payment?.providerState === 1 && Date.now() - (payment.providerCreateTime ?? 0) < 43_200_000) continue;
    try {
      await changeStatus(order._id, 'CANCELLED', SYSTEM, { note: 'payment timeout', cancelReason: 'payment_timeout' });
      n += 1;
    } catch (err) {
      logger.warn({ err, order: order.number }, 'auto-cancel failed');
    }
  }
  return n;
}

export async function reorder(orderId: string, userId: Types.ObjectId) {
  const order = await findCustomerOrder(orderId, userId);
  return order.items.map((i) => ({ productId: String(i.product), variantId: i.variant ? String(i.variant) : undefined, quantity: i.quantity }));
}
