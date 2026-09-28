import type { ClientSession, Types } from 'mongoose';
import type { ClientApp, Language } from '@vero/config';
import type { PaymentAction, PaymentMethod, PaymentMethodDTO, PaymentProviderCode } from '@vero/types';
import { PAYMENT_METHODS } from '@vero/types';
import { formatPrice } from '@vero/utils';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { Payment, type IPayment } from '../../models/payment.model';
import { Order, type IOrder } from '../../models/order.model';
import { events } from '../../lib/events';
import { sessionOpt } from '../../db/transaction';
import { getSettings } from '../settings/settings.service';
import { clock } from '../../lib/clock';

/* ----------------------------------------------------------------------- */
/* Provider registry                                                        */
/* ----------------------------------------------------------------------- */

export const paymeConfigured = () => Boolean(env.PAYME_MERCHANT_ID && env.PAYME_KEY);
export const clickConfigured = () => Boolean(env.CLICK_SERVICE_ID && env.CLICK_MERCHANT_ID && env.CLICK_SECRET_KEY);

const PROVIDER_CONFIGURED: Record<PaymentProviderCode, () => boolean> = {
  cash: () => true,
  installment: () => env.INSTALLMENT_ENABLED,
  payme: paymeConfigured,
  click: clickConfigured,
};

export function providerFor(method: PaymentMethod): PaymentProviderCode | null {
  switch (method) {
    case 'cash':
    case 'card_on_delivery':
      return 'cash';
    case 'click':
      return 'click';
    case 'payme':
      return 'payme';
    case 'uzcard':
    case 'humo':
      return env.CARD_PAYMENT_PROVIDER;
    case 'bank_card':
      return env.BANK_CARD_PROVIDER || null;
    case 'installment':
      return 'installment';
    default:
      return null;
  }
}

export const isOnlineProvider = (p: PaymentProviderCode) => p === 'payme' || p === 'click';

const TEXT: Record<Language, Record<PaymentMethod, { name: string; description: string }>> = {
  uz: {
    cash: { name: "Naqd pul", description: "Buyurtmani qabul qilganingizda kuryerga yoki punktda to'laysiz" },
    card_on_delivery: { name: 'Karta orqali qabul qilganda', description: "Uzcard, Humo yoki Visa kartasi bilan kuryer terminali orqali to'lov" },
    click: { name: 'Click', description: "Click ilovasi yoki sahifasi orqali onlayn to'lov" },
    payme: { name: 'Payme', description: "Payme orqali onlayn to'lov" },
    uzcard: { name: 'Uzcard', description: "Uzcard kartasi bilan xavfsiz onlayn to'lov" },
    humo: { name: 'Humo', description: "Humo kartasi bilan xavfsiz onlayn to'lov" },
    bank_card: { name: 'Visa / Mastercard', description: "Xalqaro bank kartasi bilan onlayn to'lov" },
    installment: { name: "Muddatli to'lov", description: "3, 6 yoki 12 oyga bo'lib to'lash — ariza menejer tomonidan tasdiqlanadi" },
  },
  ru: {
    cash: { name: 'Наличными', description: 'Оплата курьеру или в пункте выдачи при получении' },
    card_on_delivery: { name: 'Картой при получении', description: 'Оплата картой Uzcard, Humo или Visa через терминал курьера' },
    click: { name: 'Click', description: 'Онлайн-оплата через приложение или страницу Click' },
    payme: { name: 'Payme', description: 'Онлайн-оплата через Payme' },
    uzcard: { name: 'Uzcard', description: 'Безопасная онлайн-оплата картой Uzcard' },
    humo: { name: 'Humo', description: 'Безопасная онлайн-оплата картой Humo' },
    bank_card: { name: 'Visa / Mastercard', description: 'Онлайн-оплата международной банковской картой' },
    installment: { name: 'Рассрочка', description: 'Оплата частями на 3, 6 или 12 месяцев — заявку подтверждает менеджер' },
  },
  en: {
    cash: { name: 'Cash', description: 'Pay the courier or at the pickup point on receipt' },
    card_on_delivery: { name: 'Card on delivery', description: "Pay with Uzcard, Humo or Visa using the courier's card terminal" },
    click: { name: 'Click', description: 'Pay online in the Click app or checkout page' },
    payme: { name: 'Payme', description: 'Pay online with Payme' },
    uzcard: { name: 'Uzcard', description: 'Secure online payment with an Uzcard card' },
    humo: { name: 'Humo', description: 'Secure online payment with a Humo card' },
    bank_card: { name: 'Visa / Mastercard', description: 'Online payment with an international bank card' },
    installment: { name: 'Installment', description: 'Pay in 3, 6 or 12 monthly parts — a manager approves the application' },
  },
};

export async function availablePaymentMethods(amount: number | undefined, lang: Language): Promise<PaymentMethodDTO[]> {
  const s = await getSettings();
  const enabled = new Set(s['payments.enabledMethods']);
  return PAYMENT_METHODS.filter((m) => enabled.has(m)).map((method) => {
    const provider = providerFor(method);
    const configured = !!provider && PROVIDER_CONFIGURED[provider]();
    let available = configured;
    let unavailableReason: string | undefined = configured ? undefined : 'NOT_CONFIGURED';
    if (method === 'installment') {
      if (!s['installment.enabled']) {
        available = false;
        unavailableReason = 'DISABLED';
      } else if (amount !== undefined && amount < s['installment.minAmount']) {
        available = false;
        unavailableReason = 'MIN_AMOUNT';
      }
    }
    return {
      code: method,
      provider: provider ?? 'cash',
      name: TEXT[lang][method].name,
      description: TEXT[lang][method].description,
      online: !!provider && isOnlineProvider(provider),
      available,
      unavailableReason,
      installmentPlans: method === 'installment' ? s['installment.plans'] : undefined,
      minAmount: method === 'installment' ? s['installment.minAmount'] : undefined,
    };
  }).filter((m) => m.available || m.unavailableReason === 'MIN_AMOUNT');
}

/* ----------------------------------------------------------------------- */
/* Checkout redirects                                                       */
/* ----------------------------------------------------------------------- */

function returnUrl(order: Pick<IOrder, '_id'>, client: ClientApp): string {
  if (client === 'mobile') return `${env.MOBILE_RETURN_URL.replace(/\/+$/, '')}/${String(order._id)}`;
  return `${env.CLIENT_URL.replace(/\/+$/, '')}/checkout/success/${String(order._id)}?payment=return`;
}

export function paymeCheckoutUrl(order: Pick<IOrder, '_id' | 'number'>, amount: number, client: ClientApp, lang: Language): string {
  const params = [`m=${env.PAYME_MERCHANT_ID}`, `ac.order_id=${order.number}`, `a=${Math.round(amount * 100)}`, `c=${returnUrl(order, client)}`, `l=${lang === 'en' ? 'en' : lang === 'ru' ? 'ru' : 'uz'}`].join(';');
  const host = env.PAYME_TEST_MODE ? 'https://checkout.test.paycom.uz' : 'https://checkout.paycom.uz';
  return `${host}/${Buffer.from(params, 'utf8').toString('base64')}`;
}

export function clickCheckoutUrl(order: Pick<IOrder, '_id' | 'number'>, amount: number, method: PaymentMethod, client: ClientApp): string {
  const q = new URLSearchParams({
    service_id: env.CLICK_SERVICE_ID ?? '',
    merchant_id: env.CLICK_MERCHANT_ID ?? '',
    amount: amount.toFixed(2),
    transaction_param: order.number,
    return_url: returnUrl(order, client),
  });
  if (env.CLICK_MERCHANT_USER_ID) q.set('merchant_user_id', env.CLICK_MERCHANT_USER_ID);
  if (method === 'uzcard' || method === 'humo') q.set('card_type', method);
  return `https://my.click.uz/services/pay?${q.toString()}`;
}

const INSTALLMENT_TEXT: Record<Language, (monthly: string, months: number) => string> = {
  uz: (m, n) => `Muddatli to'lov arizasi qabul qilindi: ${n} oy, oyiga ${m}. Menejerimiz tez orada siz bilan bog'lanadi.`,
  ru: (m, n) => `Заявка на рассрочку принята: ${n} мес., ${m} в месяц. Менеджер скоро свяжется с вами.`,
  en: (m, n) => `Installment application received: ${n} months, ${m} per month. Our manager will contact you shortly.`,
};

/** What the client should do next for this payment (redirect to provider, show instructions, nothing). */
export function paymentAction(order: IOrder, client: ClientApp, lang: Language): PaymentAction {
  const p = order.payment;
  if (p.status !== 'PENDING') return { type: 'none' };
  if (p.provider === 'payme' && paymeConfigured()) return { type: 'redirect', url: paymeCheckoutUrl(order, order.total, client, lang) };
  if (p.provider === 'click' && clickConfigured()) return { type: 'redirect', url: clickCheckoutUrl(order, order.total, p.method, client) };
  if (p.provider === 'installment' && p.installment) {
    return { type: 'instructions', message: INSTALLMENT_TEXT[lang](formatPrice(p.installment.monthlyPayment, lang), p.installment.months) };
  }
  return { type: 'none' };
}

export async function createPayment(order: IOrder, session?: ClientSession | null): Promise<IPayment> {
  const [payment] = await Payment.create(
    [
      {
        order: order._id,
        orderNumber: order.number,
        user: order.user,
        method: order.payment.method,
        provider: order.payment.provider,
        amount: order.total,
        status: 'PENDING',
        history: [{ status: 'PENDING', at: clock.now(), note: 'created' }],
      },
    ],
    sessionOpt(session),
  );
  return payment!.toObject() as IPayment;
}

/* ----------------------------------------------------------------------- */
/* State changes (called by provider webhooks and the admin panel)          */
/* ----------------------------------------------------------------------- */

/**
 * Payment → PAID (provider callback, cash collected on delivery, offline payment recorded by staff). Emits
 * `payment.paid` (order confirmation + customer notification); `emit: false` lets the caller apply the order
 * change itself first and emit afterwards.
 */
export async function markPaid(paymentId: Types.ObjectId, info: { transactionId?: string; note?: string; by?: string; raw?: Record<string, unknown>; emit?: boolean } = {}) {
  const now = clock.now();
  const payment = await Payment.findOneAndUpdate(
    { _id: paymentId, status: { $in: ['PENDING', 'FAILED'] } },
    {
      $set: { status: 'PAID', paidAt: now, ...(info.transactionId ? { transactionId: info.transactionId } : {}), ...(info.raw ? { raw: info.raw } : {}) },
      $push: { history: { status: 'PAID', at: now, note: info.note, by: info.by } },
    },
    { new: true },
  ).lean();
  if (!payment) return null;
  await Order.updateOne({ _id: payment.order }, { $set: { 'payment.status': 'PAID', 'payment.paidAt': now } });
  if (info.emit !== false) events.emit('payment.paid', { orderId: payment.order, paymentId: payment._id });
  logger.info({ order: payment.orderNumber, provider: payment.provider }, 'payment received');
  return payment;
}

/**
 * Payment → CANCELLED / FAILED / REFUNDED. Emits `payment.failed` so the order follows (cancelled when it was
 * waiting for this payment); callers that apply the order change themselves pass `emit: false`.
 */
export async function markPaymentCancelled(
  paymentId: Types.ObjectId,
  opts: { refunded?: boolean; failed?: boolean; note?: string; by?: string; reason?: number; emit?: boolean } = {},
) {
  const now = clock.now();
  const status = opts.refunded ? 'REFUNDED' : opts.failed ? 'FAILED' : 'CANCELLED';
  const payment = await Payment.findOneAndUpdate(
    { _id: paymentId },
    {
      $set: { status, ...(opts.refunded ? { refundStatus: 'REFUNDED', refundedAt: now } : {}), ...(opts.reason !== undefined ? { cancelReason: opts.reason } : {}) },
      $push: { history: { status, at: now, note: opts.note, by: opts.by } },
    },
    { new: true },
  ).lean();
  if (!payment) return null;
  await Order.updateOne({ _id: payment.order }, { $set: { 'payment.status': status } });
  if (opts.emit !== false) events.emit('payment.failed', { orderId: payment.order, paymentId: payment._id });
  return payment;
}

/** Keeps payment status consistent with order status changes (cancel / deliver / return). */
export async function onOrderStatus(order: IOrder, to: IOrder['status'], by?: string) {
  const paymentId = order.payment.paymentId;
  if (!paymentId) return;
  const payment = await Payment.findById(paymentId).lean();
  if (!payment) return;
  const now = clock.now();
  if (to === 'CANCELLED' || to === 'RETURNED') {
    if (payment.status === 'PAID') {
      await Payment.updateOne(
        { _id: paymentId },
        { $set: { status: 'REFUND_PENDING', refundStatus: 'PENDING', refundAmount: payment.amount }, $push: { history: { status: 'REFUND_PENDING', at: now, by } } },
      );
      await Order.updateOne({ _id: order._id }, { $set: { 'payment.status': 'REFUND_PENDING' } });
    } else if (payment.status === 'PENDING') {
      await Payment.updateOne({ _id: paymentId }, { $set: { status: 'CANCELLED' }, $push: { history: { status: 'CANCELLED', at: now, by } } });
      await Order.updateOne({ _id: order._id }, { $set: { 'payment.status': 'CANCELLED' } });
    }
  }
  if (to === 'DELIVERED' && payment.provider === 'cash' && payment.status === 'PENDING') {
    // cash / card on delivery is collected by the courier on hand-over
    await markPaid(paymentId, { note: 'collected on delivery', by });
  }
}
