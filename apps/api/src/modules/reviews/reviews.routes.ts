import { Router } from 'express';
import { createQuestionSchema, createReviewSchema, objectId, reviewListQuerySchema, z, type CreateReviewInput } from '@vero/validation';
import { publicName } from '@vero/utils';
import { requireAuth } from '../../middleware/auth';
import { reviewUpload } from '../../middleware/upload';
import { uploadLimiter, writeLimiter } from '../../middleware/rate-limit';
import { validate, body, params, query } from '../../middleware/validate';
import { HttpError, notFound } from '../../lib/http-error';
import { created, ok, paged, publicCache } from '../../lib/respond';
import { pageMeta } from '../../lib/pagination';
import { toImageRef } from '../../lib/localize';
import { Review, ProductQuestion } from '../../models/review.model';
import { Product } from '../../models/product.model';
import { User } from '../../models/user.model';
import { uploadFile, toImageValue } from '../media/media.service';
import { toQuestionDTO, toReviewDTO } from './review.serializer';
import { createReview } from './reviews.service';

export const productReviewsRouter = Router({ mergeParams: true });
export const reviewsRouter = Router();
export const questionsRouter = Router();

const productParams = z.object({ id: objectId });

productReviewsRouter.get('/reviews', validate({ params: productParams, query: reviewListQuerySchema }), async (req, res) => {
  const { id } = params<{ id: string }>(req);
  const q = query<z.output<typeof reviewListQuerySchema>>(req);
  const filter: Record<string, unknown> = { product: id, status: 'APPROVED' };
  if (q.rating) filter.rating = q.rating;
  if (q.withPhotos) filter['images.0'] = { $exists: true };
  const sort: Record<string, 1 | -1> = q.sort === 'rating_desc' ? { rating: -1, createdAt: -1 } : q.sort === 'rating_asc' ? { rating: 1, createdAt: -1 } : { createdAt: -1 };
  const [items, total] = await Promise.all([
    Review.find(filter).sort(sort).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    Review.countDocuments(filter),
  ]);
  publicCache(res, 30);
  paged(res, items.map((r) => toReviewDTO(r, req.ctx.lang)), pageMeta(q.page, q.limit, total));
});

productReviewsRouter.get(
  '/questions',
  validate({ params: productParams, query: z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(10) }) }),
  async (req, res) => {
    const { id } = params<{ id: string }>(req);
    const q = query<{ page: number; limit: number }>(req);
    const filter = { product: id, status: 'PUBLISHED' };
    const [items, total] = await Promise.all([
      ProductQuestion.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
      ProductQuestion.countDocuments(filter),
    ]);
    publicCache(res, 30);
    paged(res, items.map(toQuestionDTO), pageMeta(q.page, q.limit, total));
  },
);

reviewsRouter.post('/', requireAuth, writeLimiter, validate({ body: createReviewSchema }), async (req, res) => {
  const review = await createReview(req.auth!.id, body<CreateReviewInput & { images?: string[] }>(req) as never, req.ctx.lang);
  created(res, toReviewDTO(review, req.ctx.lang, { includeStatus: true }));
});

reviewsRouter.post('/images', requireAuth, uploadLimiter, reviewUpload.array('files', 5), async (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (!files.length) throw new HttpError(400, 'FILE_REQUIRED', 'Files are required');
  const out = [];
  for (const f of files) {
    const media = await uploadFile(f, 'reviews', { id: req.auth!.id, name: req.auth!.user.firstName });
    out.push(toImageRef(toImageValue(media), req.ctx.lang)!);
  }
  created(res, out);
});

questionsRouter.post('/', requireAuth, writeLimiter, validate({ body: createQuestionSchema }), async (req, res) => {
  const input = body<{ productId: string; question: string }>(req);
  const product = await Product.exists({ _id: input.productId, status: 'published' });
  if (!product) throw notFound('Product');
  const user = await User.findById(req.auth!.id).select('firstName lastName').lean();
  const q = await ProductQuestion.create({
    product: input.productId,
    user: req.auth!.id,
    authorName: publicName(user?.firstName, user?.lastName),
    question: input.question,
    status: 'PENDING',
  });
  created(res, toQuestionDTO(q.toObject()));
});

void ok;
