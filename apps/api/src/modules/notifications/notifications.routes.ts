import { Router } from 'express';
import { objectId, z } from '@vero/validation';
import { requireAuth } from '../../middleware/auth';
import { validate, params, query } from '../../middleware/validate';
import { noContent, noStore, ok, paged } from '../../lib/respond';
import { pageMeta } from '../../lib/pagination';
import { notFound } from '../../lib/http-error';
import { emitSync } from '../../lib/socket';
import { Notification } from '../../models/notification.model';
import { toNotificationDTO } from './notifications.service';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth, (_req, res, next) => {
  noStore(res);
  next();
});

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  unread: z.enum(['1', 'true', '0', 'false']).optional(),
});

notificationsRouter.get('/', validate({ query: listQuery }), async (req, res) => {
  const q = query<z.output<typeof listQuery>>(req);
  const filter: Record<string, unknown> = { user: req.auth!.id };
  if (q.unread === '1' || q.unread === 'true') filter.readAt = null;
  const [items, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    Notification.countDocuments(filter),
  ]);
  paged(res, items.map((n) => toNotificationDTO(n, req.ctx.lang)), pageMeta(q.page, q.limit, total));
});

notificationsRouter.get('/unread-count', async (req, res) => {
  ok(res, { count: await Notification.countDocuments({ user: req.auth!.id, readAt: null }) });
});

notificationsRouter.post('/read-all', async (req, res) => {
  await Notification.updateMany({ user: req.auth!.id, readAt: null }, { $set: { readAt: new Date() } });
  emitSync({ userId: String(req.auth!.id) }, 'notifications', req.ctx.instanceId);
  noContent(res);
});

notificationsRouter.post('/:id/read', validate({ params: z.object({ id: objectId }) }), async (req, res) => {
  const r = await Notification.updateOne({ _id: params<{ id: string }>(req).id, user: req.auth!.id }, { $set: { readAt: new Date() } });
  if (!r.matchedCount) throw notFound('Notification');
  emitSync({ userId: String(req.auth!.id) }, 'notifications', req.ctx.instanceId);
  noContent(res);
});

notificationsRouter.delete('/:id', validate({ params: z.object({ id: objectId }) }), async (req, res) => {
  const r = await Notification.deleteOne({ _id: params<{ id: string }>(req).id, user: req.auth!.id });
  if (!r.deletedCount) throw notFound('Notification');
  emitSync({ userId: String(req.auth!.id) }, 'notifications', req.ctx.instanceId);
  noContent(res);
});
