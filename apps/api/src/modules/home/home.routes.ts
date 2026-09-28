import { Router } from 'express';
import type { Language } from '@vero/config';
import type { HomeDTO } from '@vero/types';
import { Banner, Promotion } from '../../models/marketing.model';
import { Product } from '../../models/product.model';
import { Review } from '../../models/review.model';
import { Faq } from '../../models/content.model';
import { cache, CacheTags } from '../../lib/cache';
import { loc, toImageRef, iso } from '../../lib/localize';
import { ok, publicCache } from '../../lib/respond';
import { getCatalogIndex } from '../catalog/catalog-index';
import { CARD_PROJECTION, toBrandSummary, toCategorySummary, toProductCard } from '../catalog/serializers';
import { getSetting } from '../settings/settings.service';
import { toBannerDTO, toFaqDTO, toPromotionDTO } from '../content/content.serializers';

export const homeRouter = Router();

export async function activeBanners(placement: string) {
  const now = new Date();
  return Banner.find({
    placement,
    isActive: true,
    $and: [{ $or: [{ startsAt: null }, { startsAt: { $exists: false } }, { startsAt: { $lte: now } }] }, { $or: [{ endsAt: null }, { endsAt: { $exists: false } }, { endsAt: { $gt: now } }] }],
  })
    .sort({ priority: -1, createdAt: -1 })
    .limit(10)
    .lean();
}

async function buildHome(lang: Language): Promise<HomeDTO> {
  const idx = await getCatalogIndex();
  const low = await getSetting('inventory.lowStockThreshold');
  const now = new Date();
  const base = { status: 'published' };
  const cards = (q: Record<string, unknown>, sort: Record<string, 1 | -1>, limit = 12) =>
    Product.find({ ...base, ...q }).sort(sort).limit(limit).select(CARD_PROJECTION).lean();

  const [hero, secondary, middle, featured, newArrivals, bestsellers, discounted, recommended, promotions, reviews, faq] = await Promise.all([
    activeBanners('home_hero'),
    activeBanners('home_secondary'),
    activeBanners('home_middle'),
    cards({ 'flags.featured': true }, { inStock: -1, popularity: -1 }),
    cards({ 'flags.isNew': true }, { createdAt: -1 }),
    cards({ 'flags.bestseller': true }, { soldCount: -1, popularity: -1 }),
    cards({ isDiscounted: true, inStock: true }, { discountPercent: -1 }),
    cards({ inStock: true, 'rating.count': { $gt: 0 } }, { 'rating.average': -1, 'rating.count': -1 }),
    Promotion.find({ isActive: true, showOnHome: true, startsAt: { $lte: now }, endsAt: { $gt: now } }).sort({ priority: -1, endsAt: 1 }).limit(8).lean(),
    Review.find({ status: 'APPROVED', rating: { $gte: 4 } }).sort({ createdAt: -1 }).limit(8).populate('product', 'slug name images').lean(),
    Faq.find({ isActive: true }).sort({ order: 1 }).limit(6).lean(),
  ]);
  const toCards = (list: typeof featured) => list.map((p) => toProductCard(p, lang, idx, low));
  return {
    hero: hero.map((b) => toBannerDTO(b, lang)),
    secondary: secondary.map((b) => toBannerDTO(b, lang)),
    middle: middle.map((b) => toBannerDTO(b, lang)),
    categories: idx.roots.filter((c) => c.isActive).map((c) => toCategorySummary(c, lang)),
    featured: toCards(featured),
    newArrivals: toCards(newArrivals),
    bestsellers: toCards(bestsellers),
    discounted: toCards(discounted),
    recommended: toCards(recommended),
    brands: [...idx.brands.values()].filter((b) => b.isActive && b.productCount > 0).sort((a, b) => b.productCount - a.productCount).map((b) => toBrandSummary(b, lang)),
    promotions: promotions.map((p) => toPromotionDTO(p, lang, now)),
    reviews: reviews
      .filter((r) => r.product)
      .map((r) => {
        const product = r.product as unknown as { _id: unknown; slug: string; name: never; images?: never[] };
        return {
          id: String(r._id),
          rating: r.rating,
          comment: r.comment,
          author: { name: r.authorName },
          product: { id: String(product._id), slug: product.slug, name: loc(product.name, lang), image: toImageRef(product.images?.[0], lang) },
          createdAt: iso(r.createdAt)!,
        };
      }),
    faq: faq.map((f) => toFaqDTO(f, lang)),
  };
}

homeRouter.get('/', async (req, res) => {
  const data = await cache.wrap(`${CacheTags.home}${req.ctx.lang}`, 60, () => buildHome(req.ctx.lang));
  publicCache(res, 60);
  ok(res, data);
});
