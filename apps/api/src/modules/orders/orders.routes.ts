import { Router } from 'express';
import { cancelOrderSchema, checkoutQuoteSchema, checkoutSchema, objectId, z, type CheckoutData, type CheckoutQuoteInput } from '@vero/validation';
import { requireAuth } from '../../middleware/auth';
import { writeLimiter } from '../../middleware/rate-limit';
import { validate, body, params, query } from '../../middleware/validate';
import { HttpError } from '../../lib/http-error';
import { created, noStore, ok, paged } from '../../lib/respond';
import { pageMeta } from '../../lib/pagination';
import { Order } from '../../models/order.model';
import { addItem, getCart } from '../cart/cart.service';
import { paymentAction } from '../payments/payments.service';
import * as orders from './orders.service';
import { toOrderSummary } from './order.serializer';

export const checkoutRouter = Router();
export const ordersRouter = Router();
for (const r of [checkoutRouter, ordersRouter]) {
  r.use(requireAuth, (_req, res, next) => {
    noStore(res);
    next();
  });
}

checkoutRouter.post('/quote', validate({ body: checkoutQuoteSchema }), async (req, res) => {
  ok(res, await orders.quote(req.auth!.id, body<CheckoutQuoteInput>(req), req.ctx.lang));
});

ordersRouter.post('/', writeLimiter, validate({ body: checkoutSchema }), async (req, res) => {
  created(res, await orders.createOrder(req.auth!.id, body<CheckoutData>(req), req.ctx));
});

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
});
const STATUS_GROUPS = {
  active: ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED'],
  completed: ['DELIVERED'],
  cancelled: ['CANCELLED', 'RETURNED'],
} as const;

ordersRouter.get('/', validate({ query: listQuery }), async (req, res) => {
  const q = query<z.output<typeof listQuery>>(req);
  const filter: Record<string, unknown> = { user: req.auth!.id };
  if (q.status) filter.status = { $in: STATUS_GROUPS[q.status] };
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    Order.countDocuments(filter),
  ]);
  paged(res, items.map((o) => toOrderSummary(o, req.ctx.lang)), pageMeta(q.page, q.limit, total));
});

const idParams = z.object({ id: z.string().min(3).max(40) });

ordersRouter.get('/:id', validate({ params: idParams }), async (req, res) => {
  const order = await orders.findCustomerOrder(params<{ id: string }>(req).id, req.auth!.id);
  ok(res, orders.detail(order, req.ctx.lang, req.ctx.client));
});

ordersRouter.post('/:id/cancel', validate({ params: z.object({ id: objectId }), body: cancelOrderSchema }), async (req, res) => {
  const order = await orders.customerCancel(params<{ id: string }>(req).id, req.auth!.id, body<{ reason?: string }>(req).reason, req.ctx);
  ok(res, orders.detail(order, req.ctx.lang, req.ctx.client));
});

ordersRouter.post('/:id/pay', validate({ params: z.object({ id: objectId }) }), async (req, res) => {
  const order = await orders.findCustomerOrder(params<{ id: string }>(req).id, req.auth!.id);
  if (order.status !== 'PENDING' || order.payment.status !== 'PENDING') throw new HttpError(409, 'PAYMENT_FAILED', 'This order cannot be paid');
  ok(res, { action: paymentAction(order, req.ctx.client, req.ctx.lang) });
});

ordersRouter.post('/:id/reorder', writeLimiter, validate({ params: z.object({ id: objectId }) }), async (req, res) => {
  const lines = await orders.reorder(params<{ id: string }>(req).id, req.auth!.id);
  for (const line of lines) {
    try {
      await addItem({ userId: req.auth!.id }, line, req.ctx.lang, req.ctx.instanceId);
    } catch {
      /* skip unavailable items */
    }
  }
  ok(res, await getCart({ userId: req.auth!.id }, req.ctx.lang));
});
