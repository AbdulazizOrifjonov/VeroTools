import { discountPercent } from '@vero/utils';
import type { IProduct, IProductPromotionRef, IProductVariant } from '../../models/product.model';
import type { IPromotion } from '../../models/marketing.model';

export interface PriceResult {
  price: number;
  oldPrice?: number;
  discountPercent: number;
}

/** Promotion prices are rounded down to whole 100 so'm so they look deliberate. */
const roundPrice = (v: number) => Math.max(0, Math.floor(v / 100) * 100);

export function applyDiscount(regular: number, promo: Pick<IPromotion, 'discountType' | 'discountValue'> | null | undefined): number {
  if (!promo) return regular;
  if (promo.discountType === 'percent') return roundPrice(regular * (1 - Math.min(90, promo.discountValue) / 100));
  return Math.max(0, regular - promo.discountValue);
}

export function computePrice(regular: number, regularOld: number | undefined | null, promo?: Pick<IPromotion, 'discountType' | 'discountValue'> | null): PriceResult {
  const price = applyDiscount(regular, promo);
  let oldPrice: number | undefined;
  if (promo && price < regular) oldPrice = Math.max(regularOld ?? 0, regular);
  else if (regularOld && regularOld > price) oldPrice = regularOld;
  return { price, oldPrice, discountPercent: discountPercent(price, oldPrice) };
}

export function promotionRef(promo: IPromotion): IProductPromotionRef {
  return {
    id: promo._id,
    slug: promo.slug,
    name: promo.name,
    type: promo.type,
    discountType: promo.discountType,
    discountValue: promo.discountValue,
    endsAt: promo.endsAt,
  };
}

/**
 * Recomputes effective prices for a product and its variants. Returns the fields to $set.
 * With variants the product shows the cheapest active variant.
 */
export function pricingFields(product: Pick<IProduct, 'regularPrice' | 'regularOldPrice' | 'variants'>, promo: IPromotion | null) {
  const base = computePrice(product.regularPrice, product.regularOldPrice, promo);
  const variants: IProductVariant[] = (product.variants ?? []).map((v) => {
    const r = computePrice(v.regularPrice, v.regularOldPrice, promo);
    return { ...v, price: r.price, oldPrice: r.oldPrice, discountPercent: r.discountPercent };
  });
  const active = variants.filter((v) => v.isActive);
  const cheapest = active.length ? active.reduce((a, b) => (b.price < a.price ? b : a)) : null;
  const effective: PriceResult = cheapest ? { price: cheapest.price, oldPrice: cheapest.oldPrice, discountPercent: cheapest.discountPercent } : base;
  const appliedPromo = promo && effective.price < (cheapest ? cheapest.regularPrice : product.regularPrice) ? promotionRef(promo) : undefined;
  return {
    price: effective.price,
    oldPrice: effective.oldPrice,
    discountPercent: effective.discountPercent,
    isDiscounted: effective.discountPercent > 0,
    promotion: appliedPromo,
    variants,
  };
}

/** Does a promotion target this product? */
export function promotionTargets(
  promo: Pick<IPromotion, 'products' | 'categories' | 'brands'>,
  product: Pick<IProduct, '_id' | 'categoryPath' | 'brand'>,
): boolean {
  const pid = String(product._id);
  if (promo.products?.some((p) => String(p) === pid)) return true;
  const path = new Set((product.categoryPath ?? []).map(String));
  if (promo.categories?.some((c) => path.has(String(c)))) return true;
  if (product.brand && promo.brands?.some((b) => String(b) === String(product.brand))) return true;
  return false;
}

/** Best promotion for a product: highest priority, then the lowest resulting price. */
export function bestPromotion(promotions: IPromotion[], product: Pick<IProduct, '_id' | 'categoryPath' | 'brand' | 'regularPrice'>): IPromotion | null {
  let best: IPromotion | null = null;
  let bestPrice = Infinity;
  for (const promo of promotions) {
    if (!promotionTargets(promo, product)) continue;
    const price = applyDiscount(product.regularPrice, promo);
    if (!best || promo.priority > best.priority || (promo.priority === best.priority && price < bestPrice)) {
      best = promo;
      bestPrice = price;
    }
  }
  return best;
}
