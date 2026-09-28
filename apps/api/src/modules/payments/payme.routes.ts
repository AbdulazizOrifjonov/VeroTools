import { Router, json, type NextFunction, type Request, type Response } from 'express';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { safeEqual } from '../../lib/crypto';
import { Order, type IOrder } from '../../models/order.model';
import { Payment, type IPayment } from '../../models/payment.model';
import { markPaid, markPaymentCancelled, paymeConfigured } from './payments.service';

/**
 * Payme (Paycom) Merchant API — JSON-RPC 2.0 endpoint.
 * Configure in the Payme merchant cabinet: endpoint https://<api-host>/api/payments/payme, account field "order_id".
 * Amounts are in tiyin (1 so'm = 100 tiyin). Transaction timeout: 12 hours.
 */
export const paymeRouter = Router();

const TIMEOUT_MS = 43_200_000;

const ERR = {
  auth: { code: -32504, message: { uz: 'Ruxsat yetarli emas', ru: 'Недостаточно привилегий', en: 'Insufficient privileges' } },
  parse: { code: -32700, message: { uz: "So'rovni o'qib bo'lmadi", ru: 'Ошибка разбора запроса', en: 'Parse error' } },
  invalid: { code: -32600, message: { uz: "Noto'g'ri so'rov", ru: 'Неверный запрос', en: 'Invalid request' } },
  method: { code: -32601, message: { uz: 'Metod topilmadi', ru: 'Метод не найден', en: 'Method not found' } },
  amount: { code: -31001, message: { uz: "Noto'g'ri summa", ru: 'Неверная сумма', en: 'Incorrect amount' } },
  orderNotFound: { code: -31050, message: { uz: 'Buyurtma topilmadi', ru: 'Заказ не найден', en: 'Order not found' } },
  orderNotPayable: { code: -31051, message: { uz: "Buyurtmani to'lab bo'lmaydi", ru: 'Заказ не может быть оплачен', en: 'Order cannot be paid' } },
  busy: { code: -31099, message: { uz: "Buyurtma bo'yicha boshqa tranzaksiya kutilmoqda", ru: 'По заказу ожидается оплата другой транзакции', en: 'Another transaction is pending for this order' } },
  txNotFound: { code: -31003, message: { uz: 'Tranzaksiya topilmadi', ru: 'Транзакция не найдена', en: 'Transaction not found' } },
  cannotPerform: { code: -31008, message: { uz: 'Amalni bajarib bo\'lmaydi', ru: 'Невозможно выполнить операцию', en: 'Unable to perform operation' } },
  cannotCancel: { code: -31007, message: { uz: 'Tranzaksiyani bekor qilib bo\'lmaydi', ru: 'Невозможно отменить транзакцию', en: 'Unable to cancel transaction' } },
} as const;

type RpcError = (typeof ERR)[keyof typeof ERR];

interface RpcBody {
  id?: number | string;
  method?: string;
  params?: Record<string, unknown>;
}

function expectedAuth() {
  return `Basic ${Buffer.from(`Paycom:${env.PAYME_KEY ?? ''}`).toString('base64')}`;
}

const orderNumberOf = (params: Record<string, unknown>) => String((params.account as { order_id?: unknown } | undefined)?.order_id ?? '');

function txResult(p: IPayment) {
  return {
    create_time: p.providerCreateTime ?? 0,
    perform_time: p.providerPerformTime ?? 0,
    cancel_time: p.providerCancelTime ?? 0,
    transaction: String(p._id),
    state: p.providerState ?? 0,
    reason: p.cancelReason ?? null,
  };
}

async function payableOrder(params: Record<string, unknown>): Promise<{ order?: IOrder; error?: RpcError }> {
  const number = orderNumberOf(params);
  if (!number) return { error: ERR.orderNotFound };
  const order = await Order.findOne({ number }).lean();
  if (!order) return { error: ERR.orderNotFound };
  if (order.payment.provider !== 'payme' || order.status !== 'PENDING' || order.payment.status !== 'PENDING') return { error: ERR.orderNotPayable };
  if (Number(params.amount) !== Math.round(order.total * 100)) return { error: ERR.amount };
  return { order };
}

async function cancelTimedOut(p: IPayment): Promise<IPayment> {
  const now = Date.now();
  await Payment.updateOne({ _id: p._id }, { $set: { providerState: -1, providerCancelTime: now, cancelReason: 4 } });
  await markPaymentCancelled(p._id, { note: 'payme timeout', reason: 4 });
  return { ...p, providerState: -1, providerCancelTime: now, cancelReason: 4 };
}

paymeRouter.post('/', json({ limit: '100kb' }), async (req: Request, res: Response) => {
  const rpc = (req.body ?? {}) as RpcBody;
  const id = rpc.id ?? null;
  const ok = (result: unknown) => res.json({ jsonrpc: '2.0', id, result });
  const fail = (e: RpcError, data?: string) => res.json({ jsonrpc: '2.0', id, error: { code: e.code, message: e.message, data } });

  const auth = req.header('authorization') ?? '';
  if (!paymeConfigured() || !safeEqual(auth, expectedAuth())) return fail(ERR.auth);
  if (!rpc.method || typeof rpc.params !== 'object' || !rpc.params) return fail(ERR.invalid);
  const params = rpc.params;

  try {
    switch (rpc.method) {
      case 'CheckPerformTransaction': {
        const { error } = await payableOrder(params);
        if (error) return fail(error, error === ERR.amount ? 'amount' : 'order_id');
        return ok({ allow: true });
      }

      case 'CreateTransaction': {
        const txId = String(params.id ?? '');
        if (!txId) return fail(ERR.invalid);
        const existing = await Payment.findOne({ provider: 'payme', transactionId: txId }).lean();
        if (existing) {
          if (existing.providerState !== 1) return fail(ERR.cannotPerform);
          if (Date.now() - (existing.providerCreateTime ?? 0) > TIMEOUT_MS) {
            await cancelTimedOut(existing);
            return fail(ERR.cannotPerform);
          }
          return ok({ create_time: existing.providerCreateTime, transaction: String(existing._id), state: 1 });
        }
        const { order, error } = await payableOrder(params);
        if (error || !order) return fail(error ?? ERR.orderNotFound, 'order_id');
        let payment = await Payment.findById(order.payment.paymentId).lean();
        if (payment?.transactionId && payment.providerState === 1) {
          if (Date.now() - (payment.providerCreateTime ?? 0) <= TIMEOUT_MS) return fail(ERR.busy, 'order_id');
          await cancelTimedOut(payment);
          payment = null;
        }
        const createTime = Date.now();
        if (!payment || payment.transactionId) {
          // previous transaction was cancelled — start a fresh payment record for this order
          const created = await Payment.create({
            order: order._id,
            orderNumber: order.number,
            user: order.user,
            method: order.payment.method,
            provider: 'payme',
            amount: order.total,
            status: 'PENDING',
            transactionId: txId,
            providerState: 1,
            providerCreateTime: createTime,
            history: [{ status: 'PENDING', at: new Date(), note: 'payme transaction created' }],
          });
          await Order.updateOne({ _id: order._id }, { $set: { 'payment.paymentId': created._id, 'payment.status': 'PENDING' } });
          return ok({ create_time: createTime, transaction: String(created._id), state: 1 });
        }
        await Payment.updateOne(
          { _id: payment._id },
          { $set: { transactionId: txId, providerState: 1, providerCreateTime: createTime }, $push: { history: { status: 'PENDING', at: new Date(), note: 'payme transaction created' } } },
        );
        return ok({ create_time: createTime, transaction: String(payment._id), state: 1 });
      }

      case 'PerformTransaction': {
        const payment = await Payment.findOne({ provider: 'payme', transactionId: String(params.id ?? '') }).lean();
        if (!payment) return fail(ERR.txNotFound);
        if (payment.providerState === 2) return ok({ transaction: String(payment._id), perform_time: payment.providerPerformTime, state: 2 });
        if (payment.providerState !== 1) return fail(ERR.cannotPerform);
        if (Date.now() - (payment.providerCreateTime ?? 0) > TIMEOUT_MS) {
          await cancelTimedOut(payment);
          return fail(ERR.cannotPerform);
        }
        const order = await Order.findById(payment.order).lean();
        if (!order || order.status === 'CANCELLED') return fail(ERR.cannotPerform);
        const performTime = Date.now();
        const updated = await Payment.findOneAndUpdate(
          { _id: payment._id, providerState: 1 },
          { $set: { providerState: 2, providerPerformTime: performTime } },
          { new: true },
        ).lean();
        if (!updated) {
          const fresh = await Payment.findById(payment._id).lean();
          return fresh?.providerState === 2 ? ok({ transaction: String(fresh._id), perform_time: fresh.providerPerformTime, state: 2 }) : fail(ERR.cannotPerform);
        }
        await markPaid(payment._id, { transactionId: payment.transactionId, note: 'payme perform' });
        return ok({ transaction: String(payment._id), perform_time: performTime, state: 2 });
      }

      case 'CancelTransaction': {
        const payment = await Payment.findOne({ provider: 'payme', transactionId: String(params.id ?? '') }).lean();
        if (!payment) return fail(ERR.txNotFound);
        const reason = Number(params.reason ?? 0) || null;
        if (payment.providerState === -1 || payment.providerState === -2) {
          return ok({ transaction: String(payment._id), cancel_time: payment.providerCancelTime, state: payment.providerState });
        }
        const cancelTime = Date.now();
        if (payment.providerState === 1) {
          await Payment.updateOne({ _id: payment._id }, { $set: { providerState: -1, providerCancelTime: cancelTime, cancelReason: reason ?? undefined } });
          await markPaymentCancelled(payment._id, { note: 'payme cancel', reason: reason ?? undefined });
          return ok({ transaction: String(payment._id), cancel_time: cancelTime, state: -1 });
        }
        if (payment.providerState === 2) {
          const order = await Order.findById(payment.order).lean();
          if (order && ['SHIPPED', 'DELIVERED'].includes(order.status)) return fail(ERR.cannotCancel);
          await Payment.updateOne({ _id: payment._id }, { $set: { providerState: -2, providerCancelTime: cancelTime, cancelReason: reason ?? undefined } });
          await markPaymentCancelled(payment._id, { refunded: true, note: 'payme refund', reason: reason ?? undefined });
          return ok({ transaction: String(payment._id), cancel_time: cancelTime, state: -2 });
        }
        return fail(ERR.cannotCancel);
      }

      case 'CheckTransaction': {
        const payment = await Payment.findOne({ provider: 'payme', transactionId: String(params.id ?? '') }).lean();
        if (!payment) return fail(ERR.txNotFound);
        return ok(txResult(payment));
      }

      case 'GetStatement': {
        const from = Number(params.from ?? 0);
        const to = Number(params.to ?? 0);
        const rows = await Payment.find({ provider: 'payme', transactionId: { $type: 'string' }, providerCreateTime: { $gte: from, $lte: to } })
          .sort({ providerCreateTime: 1 })
          .lean();
        return ok({
          transactions: rows.map((p) => ({
            id: p.transactionId,
            time: p.providerCreateTime,
            amount: Math.round(p.amount * 100),
            account: { order_id: p.orderNumber },
            ...txResult(p),
          })),
        });
      }

      case 'ChangePassword':
        // The key is managed through environment configuration, not over the API.
        return fail(ERR.auth);

      default:
        return fail(ERR.method);
    }
  } catch (err) {
    logger.error({ err, method: rpc.method }, 'payme handler failed');
    return fail(ERR.cannotPerform);
  }
});

/** Malformed JSON → JSON-RPC error with HTTP 200, as the Payme sandbox expects (auth is still checked first). */
paymeRouter.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  if ((err as { type?: string } | null)?.type !== 'entity.parse.failed') return next(err);
  const authorized = paymeConfigured() && safeEqual(req.header('authorization') ?? '', expectedAuth());
  const e = authorized ? ERR.parse : ERR.auth;
  res.json({ jsonrpc: '2.0', id: null, error: { code: e.code, message: e.message } });
});
