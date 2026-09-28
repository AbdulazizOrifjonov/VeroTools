import { Router } from 'express';
import { BANNER_PLACEMENTS } from '@vero/types';
import { contactMessageSchema, regionCode, z, type ContactMessageFormInput } from '@vero/validation';
import { LANGUAGES } from '@vero/config';
import { optionalAuth } from '../../middleware/auth';
import { writeLimiter } from '../../middleware/rate-limit';
import { validate, body, params, query } from '../../middleware/validate';
import { notFound } from '../../lib/http-error';
import { cache, CacheTags } from '../../lib/cache';
import { created, ok, publicCache } from '../../lib/respond';
import { events } from '../../lib/events';
import { iso } from '../../lib/localize';
import { Promotion } from '../../models/marketing.model';
import { ContactMessage, Faq, Page, Translation } from '../../models/content.model';
import { activeBanners } from '../home/home.routes';
import { toBannerDTO, toFaqDTO, toPageDTO, toPromotionDTO } from './content.serializers';
import { publicSettings } from '../settings/settings.service';
import { availablePaymentMethods } from '../payments/payments.service';
import { activePickupPoints, defaultFreeThreshold, deliveryOptions, toPickupDTO } from '../delivery/delivery.service';

export const contentRouter = Router();

contentRouter.get('/settings/public', async (req, res) => {
  const data = await cache.wrap(`${CacheTags.settings}public:${req.ctx.lang}`, 120, async () => {
    const methods = (await availablePaymentMethods(undefined, req.ctx.lang)).filter((m) => m.available).map((m) => m.code);
    return publicSettings(req.ctx.lang, methods, await defaultFreeThreshold());
  });
  publicCache(res, 120);
  ok(res, data);
});

contentRouter.get('/banners', validate({ query: z.object({ placement: z.enum(BANNER_PLACEMENTS) }) }), async (req, res) => {
  const { placement } = query<{ placement: string }>(req);
  const banners = await activeBanners(placement);
  publicCache(res, 60);
  ok(res, banners.map((b) => toBannerDTO(b, req.ctx.lang)));
});

contentRouter.get('/promotions', async (req, res) => {
  const now = new Date();
  const list = await Promotion.find({ isActive: true, endsAt: { $gt: now }, startsAt: { $lte: new Date(now.getTime() + 30 * 86_400_000) } })
    .sort({ startsAt: 1, priority: -1 })
    .lean();
  publicCache(res, 60);
  ok(res, list.map((p) => toPromotionDTO(p, req.ctx.lang, now)));
});

contentRouter.get('/promotions/:slug', validate({ params: z.object({ slug: z.string().min(1).max(120) }) }), async (req, res) => {
  const p = await Promotion.findOne({ slug: params<{ slug: string }>(req).slug.toLowerCase(), isActive: true }).lean();
  if (!p) throw notFound('Promotion');
  publicCache(res, 60);
  ok(res, toPromotionDTO(p, req.ctx.lang));
});

contentRouter.get('/pages/:slug', validate({ params: z.object({ slug: z.string().min(1).max(60) }) }), async (req, res) => {
  const page = await Page.findOne({ slug: params<{ slug: string }>(req).slug.toLowerCase(), isPublished: true }).lean();
  if (!page) throw notFound('Page');
  publicCache(res, 300);
  ok(res, toPageDTO(page, req.ctx.lang));
});

contentRouter.get('/faq', async (req, res) => {
  const list = await Faq.find({ isActive: true }).sort({ category: 1, order: 1 }).lean();
  publicCache(res, 300);
  ok(res, list.map((f) => toFaqDTO(f, req.ctx.lang)));
});

contentRouter.get('/translations', validate({ query: z.object({ lng: z.enum(LANGUAGES).optional() }) }), async (req, res) => {
  const lng = query<{ lng?: 'uz' | 'ru' | 'en' }>(req).lng ?? req.ctx.lang;
  const data = await cache.wrap(`${CacheTags.translations}${lng}`, 300, async () => {
    const rows = await Translation.find({ [`values.${lng}`]: { $type: 'string', $ne: '' } }).lean();
    const resources: Record<string, Record<string, string>> = {};
    let updatedAt: Date | undefined;
    for (const r of rows) {
      const v = r.values?.[lng];
      if (!v) continue;
      (resources[r.namespace] ??= {})[r.key] = v;
      if (!updatedAt || r.updatedAt > updatedAt) updatedAt = r.updatedAt;
    }
    return { language: lng, resources, updatedAt: iso(updatedAt) };
  });
  publicCache(res, 300);
  ok(res, data);
});

contentRouter.post('/contact', optionalAuth, writeLimiter, validate({ body: contactMessageSchema }), async (req, res) => {
  const input = body<ContactMessageFormInput & { phone: string }>(req);
  const msg = await ContactMessage.create({
    type: input.type,
    name: input.name,
    phone: input.phone,
    email: input.email,
    subject: input.subject,
    message: input.message,
    product: input.productId,
    user: req.auth?.id,
    ip: req.ctx.ip,
  });
  events.emit('contact.created', { messageId: msg._id });
  created(res, { id: String(msg._id) });
});

/* ---------------------------- delivery / payment --------------------------- */

contentRouter.get(
  '/delivery/options',
  validate({ query: z.object({ region: regionCode.optional(), subtotal: z.coerce.number().min(0).default(0) }) }),
  async (req, res) => {
    const q = query<{ region?: string; subtotal: number }>(req);
    ok(res, await deliveryOptions(q.region, q.subtotal, req.ctx.lang));
  },
);

contentRouter.get('/delivery/pickup-points', async (req, res) => {
  publicCache(res, 300);
  ok(res, (await activePickupPoints()).map((p) => toPickupDTO(p, req.ctx.lang)));
});

contentRouter.get('/payments/methods', validate({ query: z.object({ amount: z.coerce.number().min(0).optional() }) }), async (req, res) => {
  ok(res, await availablePaymentMethods(query<{ amount?: number }>(req).amount, req.ctx.lang));
});
