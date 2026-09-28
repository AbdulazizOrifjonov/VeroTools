import type { Types } from 'mongoose';
import type { Language } from '@vero/config';
import { HttpError } from '../../lib/http-error';
import { loc } from '../../lib/localize';
import { Coupon, type ICoupon } from '../../models/marketing.model';
import { Order } from '../../models/order.model';

export interface CouponLine {
  productId: Types.ObjectId;
  categoryPath: Types.ObjectId[];
  brand: Types.ObjectId | null;
  lineTotal: number;
}

export interface CouponResult {
  coupon: ICoupon;
  discount: number;
  eligibleSubtotal: number;
  /** discount per line (same order as input), proportional to line totals */
  allocation: number[];
  description?: string;
}

function lineEligible(coupon: ICoupon, line: CouponLine): boolean {
  switch (coupon.scope) {
    case 'products':
      return coupon.products.some((p) => String(p) === String(line.productId));
    case 'categories': {
      const path = new Set(line.categoryPath.map(String));
      return coupon.categories.some((c) => path.has(String(c)));
    }
    case 'brands':
      return !!line.brand && coupon.brands.some((b) => String(b) === String(line.brand));
    case 'all':
    default:
      return true;
  }
}

/**
 * Validates a promo code against the current cart lines and computes the discount.
 * Throws HttpError with a specific COUPON_* code when the coupon cannot be used.
 */
export async function evaluateCoupon(
  code: string,
  lines: CouponLine[],
  opts: { userId?: Types.ObjectId | null; lang: Language; now?: Date },
): Promise<CouponResult> {
  const now = opts.now ?? new Date();
  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() }).lean();
  if (!coupon || !coupon.isActive) throw new HttpError(422, 'COUPON_INVALID', 'Promo code not found');
  if (coupon.startsAt && coupon.startsAt > now) throw new HttpError(422, 'COUPON_NOT_STARTED', 'Promo code is not active yet');
  if (coupon.expiresAt && coupon.expiresAt <= now) throw new HttpError(422, 'COUPON_EXPIRED', 'Promo code expired');
  if (coupon.usageLimit !== undefined && coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw new HttpError(422, 'COUPON_USAGE_LIMIT', 'Promo code usage limit reached');
  }
  if (opts.userId) {
    if (coupon.perUserLimit) {
      const used = await Order.countDocuments({ user: opts.userId, 'coupon.code': coupon.code, status: { $ne: 'CANCELLED' } });
      if (used >= coupon.perUserLimit) throw new HttpError(422, 'COUPON_USAGE_LIMIT', 'You have already used this promo code');
    }
    if (coupon.firstOrderOnly) {
      const orders = await Order.countDocuments({ user: opts.userId, status: { $ne: 'CANCELLED' } });
      if (orders > 0) throw new HttpError(422, 'COUPON_FIRST_ORDER', 'Promo code is valid for the first order only');
    }
  }
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
    throw new HttpError(422, 'COUPON_MIN_ORDER', 'Order amount is below the promo code minimum', {
      details: { minOrderAmount: coupon.minOrderAmount },
    });
  }
  const eligible = lines.map((l) => (lineEligible(coupon, l) ? l.lineTotal : 0));
  const eligibleSubtotal = eligible.reduce((a, b) => a + b, 0);
  if (eligibleSubtotal <= 0) throw new HttpError(422, 'COUPON_NOT_APPLICABLE', 'Promo code does not apply to these products');

  let discount =
    coupon.type === 'percent' ? Math.round((eligibleSubtotal * Math.min(100, coupon.value)) / 100) : Math.min(coupon.value, eligibleSubtotal);
  if (coupon.type === 'percent' && coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.max(0, Math.min(discount, eligibleSubtotal));

  // proportional allocation, rounding remainder onto the largest eligible line
  const allocation = eligible.map((e) => (eligibleSubtotal ? Math.floor((discount * e) / eligibleSubtotal) : 0));
  const remainder = discount - allocation.reduce((a, b) => a + b, 0);
  if (remainder > 0) {
    const maxIdx = eligible.indexOf(Math.max(...eligible));
    allocation[maxIdx] = (allocation[maxIdx] ?? 0) + remainder;
  }
  return { coupon, discount, eligibleSubtotal, allocation, description: loc(coupon.description, opts.lang) || undefined };
}

/** Atomically consumes one use of a coupon (respects usageLimit under concurrency). */
export async function consumeCoupon(couponId: Types.ObjectId, session?: import('mongoose').ClientSession | null): Promise<void> {
  const res = await Coupon.updateOne(
    { _id: couponId, $or: [{ usageLimit: null }, { usageLimit: { $exists: false } }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }] },
    { $inc: { usedCount: 1 } },
    session ? { session } : {},
  );
  if (res.modifiedCount === 0) throw new HttpError(422, 'COUPON_USAGE_LIMIT', 'Promo code usage limit reached');
}

export async function releaseCoupon(couponId: Types.ObjectId): Promise<void> {
  await Coupon.updateOne({ _id: couponId, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
}
