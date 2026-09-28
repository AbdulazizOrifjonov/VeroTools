import { useCreateReview, useMyReviews, useProductReviews, useSession, useUploadReviewImages } from '@vero/api-client';
import { LIMITS, STORE_ROUTES } from '@vero/config';
import type { ImageRef, ProductDetail, ReviewDTO } from '@vero/types';
import {
  Badge,
  Button,
  cn,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  NativeSelect,
  NativeSelectOption,
  PaginationBar,
  RatingInput,
  RatingStars,
  Skeleton,
  Spinner,
  toast,
} from '@vero/ui';
import { V, createReviewSchema, z } from '@vero/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { BadgeCheckIcon, ImagePlusIcon, MessageSquareQuoteIcon, StoreIcon, XIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useLocation, useSearchParams } from 'react-router';
import { SmartImage } from '../../components/common/SmartImage';
import { ErrorState } from '../../components/common/states';
import { FieldMessage, TextareaField, TextField } from '../../components/form/fields';
import { useFormat } from '../../hooks/use-format';
import { LocaleLink } from '../../hooks/use-lang';
import { handleFormError } from '../../lib/errors';
import { errorMessage } from '../../lib/i18n';
import { withQuery } from '../../lib/paths';
import { parseLocalizedPath } from '@vero/config';
import { Lightbox } from './Gallery';

type SortValue = 'newest' | 'rating_desc' | 'rating_asc';

function RatingSummary({ product, active, onPick }: { product: ProductDetail; active?: number; onPick: (rating?: number) => void }) {
  const { t } = useTranslation();
  const dist = product.ratingDistribution;
  const total = Object.values(dist).reduce((s, n) => s + n, 0);
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-4">
        <span className="text-5xl leading-none font-extrabold tracking-tight tabular-nums">{product.rating ? product.rating.toFixed(1) : '—'}</span>
        <div className="flex flex-col gap-1">
          <RatingStars value={product.rating} size="lg" label={t('common:a11y.rating', { value: product.rating.toFixed(1) })} />
          <span className="text-sm text-muted-foreground">{t('shop:reviews.basedOn', { count: total })}</span>
        </div>
      </div>
      <ul className="flex flex-col gap-1.5">
        {[5, 4, 3, 2, 1].map((n) => {
          const count = dist[String(n) as '1'] ?? 0;
          const pct = total ? Math.round((count / total) * 100) : 0;
          return (
            <li key={n}>
              <button
                type="button"
                disabled={!count}
                aria-pressed={active === n}
                onClick={() => onPick(active === n ? undefined : n)}
                aria-label={t('product.filterByStars', { count: n, reviews: count })}
                className={cn(
                  'grid w-full grid-cols-[2.25rem_1fr_2.5rem] items-center gap-2.5 rounded-md px-1.5 py-1 text-sm transition-colors enabled:hover:bg-accent disabled:opacity-50',
                  'focus-visible:outline-2 focus-visible:outline-ring',
                  active === n && 'bg-brand-soft',
                )}
              >
                <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
                  {n}
                  <span aria-hidden="true" className="text-rating">
                    ★
                  </span>
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--input)_70%,transparent)]" aria-hidden="true">
                  <span className="block h-full rounded-full bg-rating" style={{ width: `${pct}%` }} />
                </span>
                <span className="text-end text-muted-foreground tabular-nums">{count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ReviewItem({ review }: { review: ReviewDTO }) {
  const { t } = useTranslation();
  const f = useFormat();
  const [open, setOpen] = useState<number | null>(null);
  return (
    <article className="flex flex-col gap-3 border-b border-border py-5 first:pt-0 last:border-0">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold">{review.author.name}</span>
        {review.isVerifiedPurchase ? (
          <Badge variant="success" size="sm">
            <BadgeCheckIcon aria-hidden="true" />
            {t('common:product.verifiedPurchase')}
          </Badge>
        ) : null}
        <time dateTime={review.createdAt} className="ms-auto text-xs text-muted-foreground">
          {f.date(review.createdAt, 'long')}
        </time>
      </header>
      <RatingStars value={review.rating} size="sm" label={t('common:a11y.rating', { value: review.rating })} />
      {review.title ? <h3 className="font-bold">{review.title}</h3> : null}
      <p className="text-sm leading-relaxed whitespace-pre-line">{review.comment}</p>
      {review.pros || review.cons ? (
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {review.pros ? (
            <div>
              <dt className="font-semibold text-success">{t('shop:reviews.pros')}</dt>
              <dd className="whitespace-pre-line text-muted-foreground">{review.pros}</dd>
            </div>
          ) : null}
          {review.cons ? (
            <div>
              <dt className="font-semibold text-danger">{t('shop:reviews.cons')}</dt>
              <dd className="whitespace-pre-line text-muted-foreground">{review.cons}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      {review.images.length ? (
        <ul className="flex flex-wrap gap-2">
          {review.images.map((img, i) => (
            <li key={img.id ?? img.url}>
              <button
                type="button"
                onClick={() => setOpen(i)}
                aria-label={t('common:a11y.zoomImage')}
                className="block size-20 overflow-hidden rounded-lg border border-border bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <SmartImage image={img} prefer="thumb" sizes="80px" className="size-full object-cover" alt="" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {review.reply ? (
        <div className="flex flex-col gap-1 rounded-lg bg-surface p-3.5 text-sm">
          <span className="inline-flex items-center gap-2 font-semibold">
            <StoreIcon className="size-4 text-primary dark:text-brand" aria-hidden="true" />
            {t('shop:reviews.storeReply')}
            <time dateTime={review.reply.createdAt} className="text-xs font-normal text-muted-foreground">
              {f.date(review.reply.createdAt, 'short')}
            </time>
          </span>
          <p className="whitespace-pre-line text-muted-foreground">{review.reply.text}</p>
        </div>
      ) : null}
      {review.images.length ? (
        <Lightbox images={review.images} start={open ?? 0} open={open !== null} onOpenChange={(v) => !v && setOpen(null)} title={review.author.name} />
      ) : null}
    </article>
  );
}

const reviewFormSchema = createReviewSchema.extend({
  rating: z.coerce.number(V.rating).int(V.rating).min(1, V.rating).max(5, V.rating),
});

function ReviewDialog({ product, open, onOpenChange }: { product: ProductDetail; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useTranslation();
  const create = useCreateReview();
  const upload = useUploadReviewImages();
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<ImageRef[]>([]);
  const inputId = useId();
  const form = useForm({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: { productId: product.id, rating: 0, title: '', comment: '', pros: '', cons: '', images: [] as string[] },
  });

  const onFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const files = Array.from(list).slice(0, LIMITS.reviewImagesMax - images.length);
    const tooBig = files.find((f) => f.size > LIMITS.reviewImageMaxBytes);
    if (tooBig) {
      toast.error(t('errors:FILE_TOO_LARGE'));
      return;
    }
    if (files.some((f) => !f.type.startsWith('image/'))) {
      toast.error(t('errors:FILE_TYPE_NOT_ALLOWED'));
      return;
    }
    try {
      const uploaded = await upload.mutateAsync(files);
      const next = [...images, ...uploaded].slice(0, LIMITS.reviewImagesMax);
      setImages(next);
      form.setValue('images', next.map((i) => i.id!).filter(Boolean));
    } catch (e) {
      toast.error(errorMessage(t, e));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeImage = (id: string | undefined) => {
    const next = images.filter((i) => i.id !== id);
    setImages(next);
    form.setValue('images', next.map((i) => i.id!).filter(Boolean));
  };

  const onSubmit = form.handleSubmit((values) =>
    create.mutate(values, {
      onSuccess: () => {
        toast.success(t('shop:reviews.submitted'));
        form.reset();
        setImages([]);
        onOpenChange(false);
      },
      onError: (e) => handleFormError(t, form, e),
    }),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t('common:actions.close')} size="lg">
        <DialogHeader>
          <DialogTitle>{t('shop:reviews.write')}</DialogTitle>
          <DialogDescription className="line-clamp-2">{product.name}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id="review-form" onSubmit={onSubmit} className="contents" noValidate>
            <DialogBody className="flex flex-col gap-4 py-1">
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t('shop:reviews.yourRating')}</FormLabel>
                    <FormControl>
                      <RatingInput
                        value={Number(field.value) || 0}
                        onChange={field.onChange}
                        labels={{ group: t('shop:reviews.yourRating'), options: (n) => t(`shop:reviews.ratingLabels.${n}`) }}
                        showLabel
                        size="lg"
                      />
                    </FormControl>
                    <FieldMessage />
                  </FormItem>
                )}
              />
              <TextField control={form.control} name="title" label={t('shop:reviews.fieldTitle')} maxLength={120} />
              <TextareaField control={form.control} name="comment" label={t('shop:reviews.fieldComment')} placeholder={t('shop:reviews.commentPlaceholder')} required maxLength={2000} rows={5} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextareaField control={form.control} name="pros" label={t('shop:reviews.fieldPros')} rows={2} maxLength={500} />
                <TextareaField control={form.control} name="cons" label={t('shop:reviews.fieldCons')} rows={2} maxLength={500} />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor={inputId} className="text-sm font-semibold">
                  {t('shop:reviews.fieldPhotos')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {images.map((img) => (
                    <div key={img.id} className="relative size-20 overflow-hidden rounded-lg border border-border bg-surface">
                      <SmartImage image={img} prefer="thumb" sizes="80px" className="size-full object-cover" alt="" />
                      <button
                        type="button"
                        onClick={() => removeImage(img.id)}
                        aria-label={t('common:actions.remove')}
                        className="absolute end-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-white"
                      >
                        <XIcon className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                  {images.length < LIMITS.reviewImagesMax ? (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={upload.isPending}
                      className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
                    >
                      {upload.isPending ? <Spinner size="sm" /> : <ImagePlusIcon className="size-5" aria-hidden="true" />}
                      {t('common:actions.add')}
                    </button>
                  ) : null}
                </div>
                <input
                  ref={fileRef}
                  id={inputId}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  onChange={(e) => void onFiles(e.target.files)}
                />
              </div>
            </DialogBody>
          </form>
        </Form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" form="review-form" loading={create.isPending} disabled={upload.isPending}>
            {t('common:actions.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Rating summary, filters, sorting, paginated list and the write-review dialog. */
export function Reviews({ product }: { product: ProductDetail }) {
  const { t } = useTranslation();
  const session = useSession();
  const myReviews = useMyReviews();
  const location = useLocation();
  const [rating, setRating] = useState<number | undefined>();
  const [withPhotos, setWithPhotos] = useState(false);
  const [sort, setSort] = useState<SortValue>('newest');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const sortId = useId();
  const reviews = useProductReviews(product.id, { page, limit: 5, sort, rating, withPhotos: withPhotos || undefined });
  const alreadyReviewed = !!myReviews.data?.some((r) => r.product?.id === product.id);
  const here = `${parseLocalizedPath(location.pathname).path}#reviews`;
  const [searchParams, setSearchParams] = useSearchParams();
  const wantsReview = searchParams.get('review') === '1';

  // "Write a review" from a delivered order: /product/x?review=1#reviews opens the form once
  useEffect(() => {
    if (!wantsReview || !session.isReady || (session.isAuthenticated && myReviews.isPending)) return;
    if (session.isAuthenticated && !alreadyReviewed) setOpen(true);
    const sp = new URLSearchParams(searchParams);
    sp.delete('review');
    setSearchParams(sp, { replace: true, preventScrollReset: true });
  }, [wantsReview, session.isReady, session.isAuthenticated, myReviews.isPending, alreadyReviewed, searchParams, setSearchParams]);

  const setFilter = (next: { rating?: number; withPhotos?: boolean }) => {
    setRating(next.rating);
    setWithPhotos(!!next.withPhotos);
    setPage(1);
  };

  const writeButton = !session.isReady ? null : session.isAuthenticated ? (
    alreadyReviewed ? (
      <p className="text-sm text-muted-foreground">{t('shop:reviews.alreadyReviewed')}</p>
    ) : (
      <Button onClick={() => setOpen(true)} leftIcon={<MessageSquareQuoteIcon aria-hidden="true" />}>
        {t('shop:reviews.write')}
      </Button>
    )
  ) : (
    <Button variant="outline" asChild>
      <LocaleLink to={withQuery(STORE_ROUTES.login, { next: here })}>{t('shop:reviews.loginToWrite')}</LocaleLink>
    </Button>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-10">
      <div className="flex flex-col gap-4 lg:sticky lg:top-[calc(var(--header-offset)+1rem)] lg:self-start">
        <RatingSummary product={product} active={rating} onPick={(r) => setFilter({ rating: r, withPhotos })} />
        {writeButton}
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={!rating && !withPhotos}
            onClick={() => setFilter({})}
            className={cn('h-8 rounded-full border px-3 text-[13px] font-semibold transition-colors', !rating && !withPhotos ? 'border-primary bg-brand-soft text-brand-soft-foreground' : 'border-border hover:bg-accent')}
          >
            {t('shop:reviews.filterAll')}
          </button>
          <button
            type="button"
            aria-pressed={withPhotos}
            onClick={() => setFilter({ rating, withPhotos: !withPhotos })}
            className={cn('h-8 rounded-full border px-3 text-[13px] font-semibold transition-colors', withPhotos ? 'border-primary bg-brand-soft text-brand-soft-foreground' : 'border-border hover:bg-accent')}
          >
            {t('shop:reviews.withPhotos')}
          </button>
          {rating ? (
            <button type="button" onClick={() => setFilter({ withPhotos })} className="inline-flex h-8 items-center gap-1 rounded-full border border-primary bg-brand-soft px-3 text-[13px] font-semibold text-brand-soft-foreground">
              {rating} ★
              <XIcon className="size-3.5" aria-label={t('common:actions.remove')} />
            </button>
          ) : null}
          <div className="ms-auto flex items-center gap-2">
            <label htmlFor={sortId} className="sr-only">
              {t('common:actions.sort')}
            </label>
            <NativeSelect id={sortId} selectSize="sm" value={sort} onChange={(e) => (setSort(e.target.value as SortValue), setPage(1))} containerClassName="w-auto">
              <NativeSelectOption value="newest">{t('shop:reviews.sortNewest')}</NativeSelectOption>
              <NativeSelectOption value="rating_desc">{t('shop:reviews.sortHigh')}</NativeSelectOption>
              <NativeSelectOption value="rating_asc">{t('shop:reviews.sortLow')}</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>
        {reviews.isPending ? (
          <div className="flex flex-col gap-5">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        ) : reviews.isError ? (
          <ErrorState compact error={reviews.error} onRetry={() => void reviews.refetch()} />
        ) : !reviews.data.items.length ? (
          <EmptyState size="sm" bordered icon={<MessageSquareQuoteIcon />} title={rating || withPhotos ? t('common:status.noResults') : t('shop:reviews.empty')} />
        ) : (
          <div className={cn('flex flex-col transition-opacity', reviews.isPlaceholderData && 'opacity-60')}>
            {reviews.data.items.map((r) => (
              <ReviewItem key={r.id} review={r} />
            ))}
            <PaginationBar
              className="mt-4"
              page={page}
              pages={reviews.data.meta.pages}
              onPageChange={setPage}
              labels={{ previous: t('common:a11y.previous'), next: t('common:a11y.next'), page: (n) => t('common:a11y.page', { page: n }), morePages: t('common:a11y.morePages') }}
            />
          </div>
        )}
      </div>
      {session.isAuthenticated ? <ReviewDialog product={product} open={open} onOpenChange={setOpen} /> : null}
    </div>
  );
}
