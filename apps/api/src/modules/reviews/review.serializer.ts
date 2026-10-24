import type { Language } from '@vero/config';
import type { ProductQuestionDTO, ReviewDTO } from '@vero/types';
import type { IReview, IProductQuestion } from '../../models/review.model';
import type { ImageValue, Localized } from '../../models/common';
import { iso, loc, toImageRef } from '../../lib/localize';

export function toReviewDTO(
  r: IReview,
  lang: Language,
  opts: { includeStatus?: boolean; product?: { _id: unknown; slug: string; name: Localized; images?: ImageValue[] } | null } = {},
): ReviewDTO {
  return {
    id: String(r._id),
    rating: r.rating,
    title: r.title || undefined,
    comment: r.comment,
    pros: r.pros || undefined,
    cons: r.cons || undefined,
    images: (r.images ?? []).map((i) => toImageRef(i, lang)!).filter(Boolean),
    isVerifiedPurchase: r.isVerifiedPurchase,
    author: { name: r.authorName },
    reply: r.reply?.text ? { text: r.reply.text, createdAt: iso(r.reply.at)! } : undefined,
    status: opts.includeStatus ? r.status : undefined,
    product: opts.product
      ? { id: String(opts.product._id), slug: opts.product.slug, name: loc(opts.product.name, lang), image: toImageRef(opts.product.images?.[0], lang) }
      : undefined,
    createdAt: iso(r.createdAt)!,
  };
}

export function toQuestionDTO(q: IProductQuestion): ProductQuestionDTO {
  return {
    id: String(q._id),
    question: q.question,
    author: { name: q.authorName },
    answer: q.answer?.text ? { text: q.answer.text, author: q.answer.byName ?? 'OCKEAN', createdAt: iso(q.answer.at)! } : undefined,
    createdAt: iso(q.createdAt)!,
  };
}
