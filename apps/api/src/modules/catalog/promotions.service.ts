import type { AnyBulkWriteOperation, Types } from 'mongoose';
import { logger } from '../../config/logger';
import { cache, CacheTags } from '../../lib/cache';
import { events } from '../../lib/events';
import { Promotion, type IPromotion } from '../../models/marketing.model';
import { Product, type IProduct } from '../../models/product.model';
import { bestPromotion, pricingFields, promotionTargets } from './pricing';

export async function activePromotions(now = new Date()): Promise<IPromotion[]> {
  return Promotion.find({ isActive: true, startsAt: { $lte: now }, endsAt: { $gt: now } }).lean();
}

let lastSignature = '';

function signature(promos: IPromotion[]) {
  return promos
    .map((p) => `${String(p._id)}:${p.updatedAt?.getTime?.() ?? ''}`)
    .sort()
    .join('|');
}

function priceChanged(p: IProduct, next: ReturnType<typeof pricingFields>) {
  return (
    p.price !== next.price ||
    (p.oldPrice ?? null) !== (next.oldPrice ?? null) ||
    String(p.promotion?.id ?? '') !== String(next.promotion?.id ?? '') ||
    p.variants.some((v, i) => v.price !== next.variants[i]?.price || (v.oldPrice ?? null) !== (next.variants[i]?.oldPrice ?? null))
  );
}

/** Applies current promotions to one product (after it is created or edited). */
export async function applyPricing(productId: Types.ObjectId, promos?: IPromotion[]): Promise<void> {
  const product = await Product.findById(productId).lean();
  if (!product) return;
  const list = promos ?? (await activePromotions());
  const promo = bestPromotion(list, product);
  const next = pricingFields(product, promo);
  if (!priceChanged(product, next)) return;
  await Product.updateOne(
    { _id: product._id },
    {
      $set: { price: next.price, oldPrice: next.oldPrice, discountPercent: next.discountPercent, isDiscounted: next.isDiscounted, variants: next.variants, ...(next.promotion ? { promotion: next.promotion } : {}) },
      ...(next.promotion ? {} : { $unset: { promotion: 1 } }),
    },
  );
  if (product.status === 'published' && next.price < product.price) {
    events.emit('product.price_dropped', { productId: product._id, oldPrice: product.price, newPrice: next.price });
  }
}

/** Recomputes effective prices for the whole catalogue (promotion started/ended/edited). */
export async function refreshAllPricing(force = false): Promise<{ updated: number }> {
  const now = new Date();
  const promos = await activePromotions(now);
  const sig = signature(promos);
  if (!force && sig === lastSignature) return { updated: 0 };
  lastSignature = sig;

  const ops: AnyBulkWriteOperation<IProduct>[] = [];
  const drops: Array<{ id: Types.ObjectId; oldPrice: number; newPrice: number }> = [];
  const counts = new Map<string, number>();
  const cursor = Product.find({ status: { $ne: 'archived' } })
    .select('regularPrice regularOldPrice variants price oldPrice promotion categoryPath brand status')
    .lean()
    .cursor();
  for await (const p of cursor) {
    for (const promo of promos) if (promotionTargets(promo, p)) counts.set(String(promo._id), (counts.get(String(promo._id)) ?? 0) + 1);
    const promo = bestPromotion(promos, p);
    const next = pricingFields(p as IProduct, promo);
    if (!priceChanged(p as IProduct, next)) continue;
    ops.push({
      updateOne: {
        filter: { _id: p._id },
        update: {
          $set: { price: next.price, oldPrice: next.oldPrice, discountPercent: next.discountPercent, isDiscounted: next.isDiscounted, variants: next.variants, ...(next.promotion ? { promotion: next.promotion } : {}) },
          ...(next.promotion ? {} : { $unset: { promotion: 1 } }),
        } as never,
      },
    });
    if (p.status === 'published' && next.price < p.price) drops.push({ id: p._id, oldPrice: p.price, newPrice: next.price });
  }
  for (let i = 0; i < ops.length; i += 500) await Product.bulkWrite(ops.slice(i, i + 500), { ordered: false });
  const all = await Promotion.find().select('_id').lean();
  if (all.length) {
    await Promotion.bulkWrite(all.map((p) => ({ updateOne: { filter: { _id: p._id }, update: { $set: { productCount: counts.get(String(p._id)) ?? 0 } } } })));
  }
  for (const d of drops) events.emit('product.price_dropped', { productId: d.id, oldPrice: d.oldPrice, newPrice: d.newPrice });
  if (ops.length) {
    await cache.invalidate(CacheTags.home, CacheTags.catalog);
    logger.info({ updated: ops.length, promotions: promos.length }, 'promotion pricing refreshed');
  }
  return { updated: ops.length };
}

/** Counts target products for a promotion regardless of its dates (admin preview). */
export async function countPromotionTargets(promo: Pick<IPromotion, 'products' | 'categories' | 'brands'>): Promise<number> {
  const or: Record<string, unknown>[] = [];
  if (promo.products?.length) or.push({ _id: { $in: promo.products } });
  if (promo.categories?.length) or.push({ categoryPath: { $in: promo.categories } });
  if (promo.brands?.length) or.push({ brand: { $in: promo.brands } });
  if (!or.length) return 0;
  return Product.countDocuments({ status: 'published', $or: or });
}
