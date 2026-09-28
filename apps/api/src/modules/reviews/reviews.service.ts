import { type Types } from 'mongoose';
import { SOCKET_EVENTS } from '@vero/config';
import { publicName } from '@vero/utils';
import { Review } from '../../models/review.model';
import { Product } from '../../models/product.model';
import { Order } from '../../models/order.model';
import { User } from '../../models/user.model';
import { HttpError, notFound } from '../../lib/http-error';
import { events } from '../../lib/events';
import { emitToAdmins } from '../../lib/socket';
import { imagesFromMediaIds } from '../media/media.service';

/** Recomputes average rating + distribution from approved reviews. */
export async function recomputeRating(productId: Types.ObjectId) {
  const rows = await Review.aggregate<{ _id: number; n: number }>([
    { $match: { product: productId, status: 'APPROVED' } },
    { $group: { _id: '$rating', n: { $sum: 1 } } },
  ]);
  const distribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } as Record<'1' | '2' | '3' | '4' | '5', number>;
  let count = 0;
  let sum = 0;
  for (const r of rows) {
    const k = String(r._id) as keyof typeof distribution;
    if (k in distribution) {
      distribution[k] = r.n;
      count += r.n;
      sum += r._id * r.n;
    }
  }
  const average = count ? Math.round((sum / count) * 100) / 100 : 0;
  await Product.updateOne({ _id: productId }, { $set: { rating: { average, count, distribution } } });
}

export async function createReview(
  userId: Types.ObjectId,
  input: { productId: string; rating: number; title?: string; comment: string; pros?: string; cons?: string; images?: string[] },
  lang: string,
) {
  const product = await Product.findOne({ _id: input.productId, status: 'published' }).select('_id').lean();
  if (!product) throw notFound('Product');
  if (await Review.exists({ product: product._id, user: userId })) throw new HttpError(409, 'REVIEW_EXISTS', 'You have already reviewed this product');
  const user = await User.findById(userId).select('firstName lastName').lean();
  const verified = !!(await Order.exists({ user: userId, status: 'DELIVERED', 'items.product': product._id }));
  const images = await imagesFromMediaIds(input.images ?? []);
  const review = await Review.create({
    product: product._id,
    user: userId,
    authorName: publicName(user?.firstName, user?.lastName),
    rating: input.rating,
    title: input.title,
    comment: input.comment,
    pros: input.pros,
    cons: input.cons,
    images,
    isVerifiedPurchase: verified,
    status: 'PENDING',
    language: lang,
  });
  if (verified) {
    await Order.updateMany({ user: userId, 'items.product': product._id }, { $set: { 'items.$[i].reviewed': true } }, { arrayFilters: [{ 'i.product': product._id }] });
  }
  await User.updateOne({ _id: userId }, { $inc: { 'stats.reviewsCount': 1 } });
  events.emit('review.created', { reviewId: review._id });
  emitToAdmins(SOCKET_EVENTS.adminReviewNew, { reviewId: String(review._id), rating: review.rating });
  return review.toObject();
}
