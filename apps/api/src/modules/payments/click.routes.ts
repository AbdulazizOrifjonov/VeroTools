import { Router, urlencoded, json, type Request, type Response } from 'express';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { md5, safeEqual } from '../../lib/crypto';
import { Counter, Order } from '../../models/order.model';
import { Payment } from '../../models/payment.model';
import { clickConfigured, markPaid, markPaymentCancelled } from './payments.service';

/**
 * Click SHOP-API (Prepare / Complete).
 * Configure in the Click merchant cabinet:
 *   Prepare URL:  https://<api-host>/api/payments/click/prepare
 *   Complete URL: https://<api-host>/api/payments/click/complete
 * merchant_trans_id = order number.
 */
export const clickRouter = Router();
clickRouter.use(urlencoded({ extended: false, limit: '50kb' }), json({ limit: '50kb' }));

const E = {
  SUCCESS: 0,
  SIGN_FAILED: -1,
  BAD_AMOUNT: -2,
  ACTION_NOT_FOUND: -3,
  ALREADY_PAID: -4,
  ORDER_NOT_FOUND: -5,
  TX_NOT_FOUND: -6,
  UPDATE_FAILED: -7,
  REQUEST_ERROR: -8,
  CANCELLED: -9,
} as const;

const NOTES: Record<number, string> = {
  0: 'Success',
  [-1]: 'SIGN CHECK FAILED!',
  [-2]: 'Incorrect parameter amount',
  [-3]: 'Action not found',
  [-4]: 'Already paid',
  [-5]: 'User does not exist',
  [-6]: 'Transaction does not exist',
  [-7]: 'Failed to update user',
  [-8]: 'Error in request from click',
  [-9]: 'Transaction cancelled',
};

interface ClickBody {
  click_trans_id?: string;
  service_id?: string;
  click_paydoc_id?: string;
  merchant_trans_id?: string;
  merchant_prepare_id?: string;
  amount?: string;
  action?: string;
  error?: string;
  error_note?: string;
  sign_time?: string;
  sign_string?: string;
}

function checkSign(b: ClickBody, withPrepareId: boolean): boolean {
  const base = withPrepareId
    ? `${b.click_trans_id}${b.service_id}${env.CLICK_SECRET_KEY}${b.merchant_trans_id}${b.merchant_prepare_id}${b.amount}${b.action}${b.sign_time}`
    : `${b.click_trans_id}${b.service_id}${env.CLICK_SECRET_KEY}${b.merchant_trans_id}${b.amount}${b.action}${b.sign_time}`;
  return !!b.sign_string && safeEqual(md5(base), String(b.sign_string).toLowerCase());
}

const respond = (res: Response, b: ClickBody, error: number, extra: Record<string, unknown> = {}) =>
  res.json({ click_trans_id: b.click_trans_id, merchant_trans_id: b.merchant_trans_id, ...extra, error, error_note: NOTES[error] ?? 'Error' });

const amountMatches = (a: string | undefined, total: number) => Math.abs(Number(a) - total) < 0.01;

async function nextPrepareId(): Promise<number> {
  const c = await Counter.findOneAndUpdate({ _id: 'click_prepare' }, { $inc: { seq: 1 } }, { upsert: true, new: true }).lean();
  return c!.seq;
}

clickRouter.post('/prepare', async (req: Request, res: Response) => {
  const b = (req.body ?? {}) as ClickBody;
  if (!clickConfigured() || String(b.service_id) !== String(env.CLICK_SERVICE_ID)) return respond(res, b, E.REQUEST_ERROR);
  if (!checkSign(b, false)) return respond(res, b, E.SIGN_FAILED);
  if (String(b.action) !== '0') return respond(res, b, E.ACTION_NOT_FOUND);
  try {
    const order = await Order.findOne({ number: String(b.merchant_trans_id ?? '') }).lean();
    if (!order || order.payment.provider !== 'click') return respond(res, b, E.ORDER_NOT_FOUND);
    if (order.payment.status === 'PAID') return respond(res, b, E.ALREADY_PAID);
    if (order.status === 'CANCELLED' || order.payment.status === 'CANCELLED') return respond(res, b, E.CANCELLED);
    if (!amountMatches(b.amount, order.total)) return respond(res, b, E.BAD_AMOUNT);
    const prepareId = await nextPrepareId();
    await Payment.updateOne(
      { _id: order.payment.paymentId },
      {
        $set: { transactionId: String(b.click_trans_id), providerState: 1, providerCreateTime: prepareId, raw: { prepare: b as Record<string, unknown> } },
        $push: { history: { status: 'PENDING', at: new Date(), note: 'click prepare' } },
      },
    );
    return respond(res, b, E.SUCCESS, { merchant_prepare_id: prepareId });
  } catch (err) {
    logger.error({ err }, 'click prepare failed');
    return respond(res, b, E.UPDATE_FAILED);
  }
});

clickRouter.post('/complete', async (req: Request, res: Response) => {
  const b = (req.body ?? {}) as ClickBody;
  if (!clickConfigured() || String(b.service_id) !== String(env.CLICK_SERVICE_ID)) return respond(res, b, E.REQUEST_ERROR);
  if (!checkSign(b, true)) return respond(res, b, E.SIGN_FAILED);
  if (String(b.action) !== '1') return respond(res, b, E.ACTION_NOT_FOUND);
  try {
    const payment = await Payment.findOne({ provider: 'click', transactionId: String(b.click_trans_id) }).lean();
    if (!payment || String(payment.providerCreateTime) !== String(b.merchant_prepare_id)) return respond(res, b, E.TX_NOT_FOUND);
    if (payment.status === 'PAID') return respond(res, b, E.ALREADY_PAID, { merchant_confirm_id: payment.providerCreateTime });
    const order = await Order.findById(payment.order).lean();
    if (!order) return respond(res, b, E.ORDER_NOT_FOUND);
    if (Number(b.error ?? 0) < 0) {
      // Click reports a failed / cancelled payment
      await Payment.updateOne({ _id: payment._id }, { $set: { providerState: -1, providerCancelTime: Date.now() } });
      await markPaymentCancelled(payment._id, { failed: true, note: `click error ${b.error}: ${b.error_note ?? ''}` });
      return respond(res, b, E.CANCELLED);
    }
    if (order.status === 'CANCELLED' || payment.status === 'CANCELLED') return respond(res, b, E.CANCELLED);
    if (!amountMatches(b.amount, order.total)) return respond(res, b, E.BAD_AMOUNT);
    await Payment.updateOne({ _id: payment._id }, { $set: { providerState: 2, providerPerformTime: Date.now() } });
    await markPaid(payment._id, { transactionId: String(b.click_trans_id), note: 'click complete' });
    return respond(res, b, E.SUCCESS, { merchant_confirm_id: payment.providerCreateTime });
  } catch (err) {
    logger.error({ err }, 'click complete failed');
    return respond(res, b, E.UPDATE_FAILED);
  }
});
