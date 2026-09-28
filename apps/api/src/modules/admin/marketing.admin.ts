import { Router } from 'express';
import type { AdminBanner, AdminCoupon, AdminDeliveryZone, AdminPickupPoint, AdminPromotion } from '@vero/types';
import { BANNER_PLACEMENTS, COUPON_SCOPES } from '@vero/types';
import { escapeRegex, slugify } from '@vero/utils';
import {
  bannerInputSchema,
  couponInputSchema,
  deliveryZoneInputSchema,
  objectId,
  pickupPointInputSchema,
  promotionInputSchema,
  z,
} from '@vero/validation';
import { requirePermission } from '../../middleware/auth';
import { validate, body, params, query } from '../../middleware/validate';
import { HttpError, notFound } from '../../lib/http-error';
import { created, noContent, ok, paged } from '../../lib/respond';
import { pageMeta } from '../../lib/pagination';
import { audit } from '../../lib/audit';
import { absoluteUrl, iso } from '../../lib/localize';
import { cache, CacheTags } from '../../lib/cache';
import { Coupon, Promotion, Banner, type IBanner, type ICoupon, type IPromotion } from '../../models/marketing.model';
import { DeliveryZone, PickupPoint, type IDeliveryZone, type IPickupPoint } from '../../models/delivery.model';
import type { ImageValue } from '../../models/common';
import { imageFromMediaId } from '../media/media.service';
import { countPromotionTargets, refreshAllPricing } from '../catalog/promotions.service';
import { invalidateDeliveryCache } from '../delivery/delivery.service';

export const couponsAdminRouter = Router();
export const promotionsAdminRouter = Router();
export const bannersAdminRouter = Router();
export const deliveryAdminRouter = Router();

const idParams = z.object({ id: objectId });
const page = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), q: z.string().trim().max(80).optional() });
const img = (i?: ImageValue) => (i?.url ? { media: i.media ? String(i.media) : '', url: absoluteUrl(i.url)!, thumb: absoluteUrl(i.thumb), medium: absoluteUrl(i.medium), alt: i.alt } : undefined);
const ids = (list?: unknown[]) => (list ?? []).map(String);

/* --------------------------------- coupons -------------------------------- */

const toAdminCoupon = (c: ICoupon): AdminCoupon => ({
  id: String(c._id),
  code: c.code,
  description: c.description,
  type: c.type,
  value: c.value,
  maxDiscount: c.maxDiscount,
  scope: c.scope,
  products: ids(c.products),
  categories: ids(c.categories),
  brands: ids(c.brands),
  minOrderAmount: c.minOrderAmount,
  firstOrderOnly: c.firstOrderOnly,
  startsAt: iso(c.startsAt),
  expiresAt: iso(c.expiresAt),
  usageLimit: c.usageLimit,
  perUserLimit: c.perUserLimit,
  usedCount: c.usedCount,
  isActive: c.isActive,
  createdAt: iso(c.createdAt)!,
  updatedAt: iso(c.updatedAt)!,
});

couponsAdminRouter.get('/', requirePermission('coupons.read'), validate({ query: page.extend({ status: z.enum(['active', 'expired', 'inactive']).optional(), scope: z.enum(COUPON_SCOPES).optional() }) }), async (req, res) => {
  const q = query<z.output<typeof page> & { status?: string; scope?: string }>(req);
  const filter: Record<string, unknown> = {};
  const now = new Date();
  if (q.q) filter.code = { $regex: escapeRegex(q.q.toUpperCase()) };
  if (q.scope) filter.scope = q.scope;
  if (q.status === 'inactive') filter.isActive = false;
  if (q.status === 'active') Object.assign(filter, { isActive: true, $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }] });
  if (q.status === 'expired') filter.expiresAt = { $lte: now };
  const [items, total] = await Promise.all([Coupon.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(), Coupon.countDocuments(filter)]);
  paged(res, items.map(toAdminCoupon), pageMeta(q.page, q.limit, total));
});

couponsAdminRouter.get('/:id', requirePermission('coupons.read'), validate({ params: idParams }), async (req, res) => {
  const c = await Coupon.findById(params<{ id: string }>(req).id).lean();
  if (!c) throw notFound('Coupon');
  ok(res, toAdminCoupon(c));
});

couponsAdminRouter.post('/', requirePermission('coupons.create'), validate({ body: couponInputSchema }), async (req, res) => {
  const input = body<z.output<typeof couponInputSchema>>(req);
  if (await Coupon.exists({ code: input.code })) throw new HttpError(409, 'CONFLICT', 'Code already exists', { fields: { code: 'validation.duplicate' } });
  const doc = await Coupon.create(input);
  await audit(req, { action: 'coupon.create', target: { type: 'coupon', id: String(doc._id), label: doc.code } });
  created(res, toAdminCoupon(doc.toObject() as ICoupon));
});

couponsAdminRouter.put('/:id', requirePermission('coupons.update'), validate({ params: idParams, body: couponInputSchema }), async (req, res) => {
  const input = body<z.output<typeof couponInputSchema>>(req);
  const existing = await Coupon.findById(params<{ id: string }>(req).id).lean();
  if (!existing) throw notFound('Coupon');
  if (input.code !== existing.code && (await Coupon.exists({ code: input.code }))) throw new HttpError(409, 'CONFLICT', 'Code already exists', { fields: { code: 'validation.duplicate' } });
  const unset: Record<string, 1> = {};
  for (const k of ['maxDiscount', 'startsAt', 'expiresAt', 'usageLimit', 'perUserLimit'] as const) if (input[k] === undefined) unset[k] = 1;
  await Coupon.updateOne({ _id: existing._id }, { $set: input, ...(Object.keys(unset).length ? { $unset: unset } : {}) });
  await audit(req, { action: 'coupon.update', target: { type: 'coupon', id: String(existing._id), label: input.code } });
  ok(res, toAdminCoupon((await Coupon.findById(existing._id).lean())!));
});

couponsAdminRouter.delete('/:id', requirePermission('coupons.delete'), validate({ params: idParams }), async (req, res) => {
  const c = await Coupon.findByIdAndDelete(params<{ id: string }>(req).id).lean();
  if (!c) throw notFound('Coupon');
  await audit(req, { action: 'coupon.delete', target: { type: 'coupon', id: String(c._id), label: c.code } });
  noContent(res);
});

/* ------------------------------- promotions ------------------------------- */

function promoState(p: IPromotion, now = new Date()): AdminPromotion['state'] {
  if (!p.isActive) return 'inactive';
  if (p.startsAt > now) return 'scheduled';
  if (p.endsAt <= now) return 'ended';
  return 'active';
}

const toAdminPromotion = (p: IPromotion): AdminPromotion => ({
  id: String(p._id),
  slug: p.slug,
  name: p.name,
  description: p.description,
  type: p.type,
  discountType: p.discountType,
  discountValue: p.discountValue,
  products: ids(p.products),
  categories: ids(p.categories),
  brands: ids(p.brands),
  startsAt: iso(p.startsAt)!,
  endsAt: iso(p.endsAt)!,
  priority: p.priority,
  isActive: p.isActive,
  showOnHome: p.showOnHome,
  image: img(p.image),
  productCount: p.productCount ?? 0,
  state: promoState(p),
  createdAt: iso(p.createdAt)!,
  updatedAt: iso(p.updatedAt)!,
});

async function afterPromotionChange() {
  await refreshAllPricing(true);
  await cache.invalidate(CacheTags.home, CacheTags.catalog);
}

promotionsAdminRouter.get('/', requirePermission('promotions.read'), validate({ query: page }), async (req, res) => {
  const q = query<z.output<typeof page>>(req);
  const rx = q.q ? { $regex: escapeRegex(q.q), $options: 'i' } : null;
  const filter = rx ? { $or: [{ slug: rx }, { 'name.uz': rx }, { 'name.ru': rx }, { 'name.en': rx }] } : {};
  const [items, total] = await Promise.all([Promotion.find(filter).sort({ startsAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(), Promotion.countDocuments(filter)]);
  paged(res, items.map(toAdminPromotion), pageMeta(q.page, q.limit, total));
});

promotionsAdminRouter.get('/:id', requirePermission('promotions.read'), validate({ params: idParams }), async (req, res) => {
  const p = await Promotion.findById(params<{ id: string }>(req).id).lean();
  if (!p) throw notFound('Promotion');
  ok(res, toAdminPromotion(p));
});

promotionsAdminRouter.post('/', requirePermission('promotions.create'), validate({ body: promotionInputSchema }), async (req, res) => {
  const input = body<z.output<typeof promotionInputSchema>>(req);
  const slug = input.slug ?? slugify(input.name.en || input.name.uz);
  if (await Promotion.exists({ slug })) throw new HttpError(409, 'CONFLICT', 'Slug already used', { fields: { slug: 'validation.duplicate' } });
  const doc = await Promotion.create({ ...input, slug, image: input.image?.media ? await imageFromMediaId(input.image.media) : undefined, productCount: await countPromotionTargets(input as never) });
  await afterPromotionChange();
  await audit(req, { action: 'promotion.create', target: { type: 'promotion', id: String(doc._id), label: doc.slug } });
  created(res, toAdminPromotion((await Promotion.findById(doc._id).lean())!));
});

promotionsAdminRouter.put('/:id', requirePermission('promotions.update'), validate({ params: idParams, body: promotionInputSchema }), async (req, res) => {
  const input = body<z.output<typeof promotionInputSchema>>(req);
  const existing = await Promotion.findById(params<{ id: string }>(req).id).lean();
  if (!existing) throw notFound('Promotion');
  const slug = input.slug ?? existing.slug;
  if (slug !== existing.slug && (await Promotion.exists({ slug }))) throw new HttpError(409, 'CONFLICT', 'Slug already used', { fields: { slug: 'validation.duplicate' } });
  await Promotion.updateOne({ _id: existing._id }, { $set: { ...input, slug, image: input.image?.media ? await imageFromMediaId(input.image.media) : undefined } });
  await afterPromotionChange();
  await audit(req, { action: 'promotion.update', target: { type: 'promotion', id: String(existing._id), label: slug } });
  ok(res, toAdminPromotion((await Promotion.findById(existing._id).lean())!));
});

promotionsAdminRouter.delete('/:id', requirePermission('promotions.delete'), validate({ params: idParams }), async (req, res) => {
  const p = await Promotion.findByIdAndDelete(params<{ id: string }>(req).id).lean();
  if (!p) throw notFound('Promotion');
  await afterPromotionChange();
  await audit(req, { action: 'promotion.delete', target: { type: 'promotion', id: String(p._id), label: p.slug } });
  noContent(res);
});

/* --------------------------------- banners -------------------------------- */

const toAdminBanner = (b: IBanner): AdminBanner => ({
  id: String(b._id),
  placement: b.placement,
  title: b.title,
  subtitle: b.subtitle,
  buttonText: b.buttonText,
  buttonUrl: b.buttonUrl,
  imageDesktop: img(b.imageDesktop),
  imageMobile: img(b.imageMobile),
  textTheme: b.textTheme,
  startsAt: iso(b.startsAt),
  endsAt: iso(b.endsAt),
  priority: b.priority,
  isActive: b.isActive,
  createdAt: iso(b.createdAt)!,
  updatedAt: iso(b.updatedAt)!,
});

async function bannerFields(input: z.output<typeof bannerInputSchema>) {
  return {
    ...input,
    imageDesktop: await imageFromMediaId(input.imageDesktop.media),
    imageMobile: input.imageMobile?.media ? await imageFromMediaId(input.imageMobile.media) : undefined,
  };
}

bannersAdminRouter.get('/', requirePermission('banners.read'), validate({ query: page.extend({ placement: z.enum(BANNER_PLACEMENTS).optional() }) }), async (req, res) => {
  const q = query<z.output<typeof page> & { placement?: string }>(req);
  const filter = q.placement ? { placement: q.placement } : {};
  const [items, total] = await Promise.all([Banner.find(filter).sort({ placement: 1, priority: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(), Banner.countDocuments(filter)]);
  paged(res, items.map(toAdminBanner), pageMeta(q.page, q.limit, total));
});

bannersAdminRouter.get('/:id', requirePermission('banners.read'), validate({ params: idParams }), async (req, res) => {
  const b = await Banner.findById(params<{ id: string }>(req).id).lean();
  if (!b) throw notFound('Banner');
  ok(res, toAdminBanner(b));
});

bannersAdminRouter.post('/', requirePermission('banners.create'), validate({ body: bannerInputSchema }), async (req, res) => {
  const doc = await Banner.create(await bannerFields(body(req)));
  await cache.invalidate(CacheTags.home);
  await audit(req, { action: 'banner.create', target: { type: 'banner', id: String(doc._id), label: doc.title.uz } });
  created(res, toAdminBanner(doc.toObject() as IBanner));
});

bannersAdminRouter.put('/:id', requirePermission('banners.update'), validate({ params: idParams, body: bannerInputSchema }), async (req, res) => {
  const input = body<z.output<typeof bannerInputSchema>>(req);
  const fields = await bannerFields(input);
  const unset: Record<string, 1> = {};
  for (const k of ['startsAt', 'endsAt', 'imageMobile', 'buttonUrl'] as const) if (fields[k] === undefined) unset[k] = 1;
  const doc = await Banner.findByIdAndUpdate(params<{ id: string }>(req).id, { $set: fields, ...(Object.keys(unset).length ? { $unset: unset } : {}) }, { new: true }).lean();
  if (!doc) throw notFound('Banner');
  await cache.invalidate(CacheTags.home);
  await audit(req, { action: 'banner.update', target: { type: 'banner', id: String(doc._id), label: doc.title.uz } });
  ok(res, toAdminBanner(doc));
});

bannersAdminRouter.delete('/:id', requirePermission('banners.delete'), validate({ params: idParams }), async (req, res) => {
  const b = await Banner.findByIdAndDelete(params<{ id: string }>(req).id).lean();
  if (!b) throw notFound('Banner');
  await cache.invalidate(CacheTags.home);
  await audit(req, { action: 'banner.delete', target: { type: 'banner', id: String(b._id), label: b.title.uz } });
  noContent(res);
});

/* --------------------------------- delivery ------------------------------- */

const toZone = (z: IDeliveryZone): AdminDeliveryZone => ({
  id: String(z._id),
  code: z.code,
  name: z.name,
  regions: z.regions,
  price: z.price,
  freeThreshold: z.freeThreshold,
  minDays: z.minDays,
  maxDays: z.maxDays,
  priority: z.priority,
  isActive: z.isActive,
});

const toPoint = (p: IPickupPoint): AdminPickupPoint => ({
  id: String(p._id),
  code: p.code,
  name: p.name,
  address: p.address,
  region: p.region,
  city: p.city,
  phone: p.phone,
  workingHours: p.workingHours,
  location: p.location,
  isActive: p.isActive,
});

async function afterDelivery() {
  await invalidateDeliveryCache();
  await cache.invalidate('catalog:pickup-points', CacheTags.settings);
}

deliveryAdminRouter.get('/zones', requirePermission('delivery.read'), async (_req, res) => {
  const items = await DeliveryZone.find().sort({ priority: -1 }).lean();
  paged(res, items.map(toZone), pageMeta(1, items.length || 1, items.length));
});
deliveryAdminRouter.get('/zones/:id', requirePermission('delivery.read'), validate({ params: idParams }), async (req, res) => {
  const z1 = await DeliveryZone.findById(params<{ id: string }>(req).id).lean();
  if (!z1) throw notFound('Delivery zone');
  ok(res, toZone(z1));
});
deliveryAdminRouter.post('/zones', requirePermission('delivery.update'), validate({ body: deliveryZoneInputSchema }), async (req, res) => {
  const input = body<z.output<typeof deliveryZoneInputSchema>>(req);
  if (await DeliveryZone.exists({ code: input.code })) throw new HttpError(409, 'CONFLICT', 'Code already exists', { fields: { code: 'validation.duplicate' } });
  const doc = await DeliveryZone.create(input);
  await afterDelivery();
  await audit(req, { action: 'delivery_zone.create', target: { type: 'delivery_zone', id: String(doc._id), label: doc.code } });
  created(res, toZone(doc.toObject() as IDeliveryZone));
});
deliveryAdminRouter.put('/zones/:id', requirePermission('delivery.update'), validate({ params: idParams, body: deliveryZoneInputSchema }), async (req, res) => {
  const doc = await DeliveryZone.findByIdAndUpdate(params<{ id: string }>(req).id, { $set: body(req) }, { new: true }).lean();
  if (!doc) throw notFound('Delivery zone');
  await afterDelivery();
  await audit(req, { action: 'delivery_zone.update', target: { type: 'delivery_zone', id: String(doc._id), label: doc.code } });
  ok(res, toZone(doc));
});
deliveryAdminRouter.delete('/zones/:id', requirePermission('delivery.update'), validate({ params: idParams }), async (req, res) => {
  const doc = await DeliveryZone.findByIdAndDelete(params<{ id: string }>(req).id).lean();
  if (!doc) throw notFound('Delivery zone');
  await afterDelivery();
  await audit(req, { action: 'delivery_zone.delete', target: { type: 'delivery_zone', id: String(doc._id), label: doc.code } });
  noContent(res);
});

deliveryAdminRouter.get('/pickup-points', requirePermission('delivery.read'), async (_req, res) => {
  const items = await PickupPoint.find().sort({ region: 1, code: 1 }).lean();
  paged(res, items.map(toPoint), pageMeta(1, items.length || 1, items.length));
});
deliveryAdminRouter.get('/pickup-points/:id', requirePermission('delivery.read'), validate({ params: idParams }), async (req, res) => {
  const p = await PickupPoint.findById(params<{ id: string }>(req).id).lean();
  if (!p) throw notFound('Pickup point');
  ok(res, toPoint(p));
});
deliveryAdminRouter.post('/pickup-points', requirePermission('delivery.update'), validate({ body: pickupPointInputSchema }), async (req, res) => {
  const input = body<z.output<typeof pickupPointInputSchema>>(req);
  if (await PickupPoint.exists({ code: input.code })) throw new HttpError(409, 'CONFLICT', 'Code already exists', { fields: { code: 'validation.duplicate' } });
  const doc = await PickupPoint.create(input);
  await afterDelivery();
  await audit(req, { action: 'pickup_point.create', target: { type: 'pickup_point', id: String(doc._id), label: doc.code } });
  created(res, toPoint(doc.toObject() as IPickupPoint));
});
deliveryAdminRouter.put('/pickup-points/:id', requirePermission('delivery.update'), validate({ params: idParams, body: pickupPointInputSchema }), async (req, res) => {
  const doc = await PickupPoint.findByIdAndUpdate(params<{ id: string }>(req).id, { $set: body(req) }, { new: true }).lean();
  if (!doc) throw notFound('Pickup point');
  await afterDelivery();
  await audit(req, { action: 'pickup_point.update', target: { type: 'pickup_point', id: String(doc._id), label: doc.code } });
  ok(res, toPoint(doc));
});
deliveryAdminRouter.delete('/pickup-points/:id', requirePermission('delivery.update'), validate({ params: idParams }), async (req, res) => {
  const doc = await PickupPoint.findByIdAndDelete(params<{ id: string }>(req).id).lean();
  if (!doc) throw notFound('Pickup point');
  await afterDelivery();
  await audit(req, { action: 'pickup_point.delete', target: { type: 'pickup_point', id: String(doc._id), label: doc.code } });
  noContent(res);
});
