import { useMyReviews } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import type { ReviewDTO, ReviewStatus } from '@vero/types';
import { Badge, Button, EmptyState, RatingStars, Skeleton, type BadgeVariant } from '@vero/ui';
import { MessageSquareTextIcon, StoreIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SmartImage } from '../../components/common/SmartImage';
import { ErrorState } from '../../components/common/states';
import { AccountHeading } from '../../features/account/AccountSection';
import { useDocumentMeta } from '../../hooks/use-document-meta';
import { useFormat } from '../../hooks/use-format';
import { LocaleLink } from '../../hooks/use-lang';
import { assetUrl } from '../../lib/images';

const STATUS_TONE: Record<ReviewStatus, BadgeVariant> = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' };

function MyReview({ review }: { review: ReviewDTO }) {
  const { t } = useTranslation();
  const f = useFormat();
  const product = review.product;
  return (
    <li className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        {product ? (
          <LocaleLink to={STORE_ROUTES.product(product.slug)} className="img-well size-16 shrink-0 overflow-hidden rounded-lg bg-well" tabIndex={-1} aria-hidden="true">
            <SmartImage image={product.image} prefer="thumb" sizes="64px" className="size-full object-contain" alt="" />
          </LocaleLink>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {product ? (
            <LocaleLink to={STORE_ROUTES.product(product.slug)} className="line-clamp-2 text-sm leading-snug font-semibold hover:text-primary dark:hover:text-brand">
              {product.name}
            </LocaleLink>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <RatingStars value={review.rating} size="sm" label={t('common:a11y.rating', { value: review.rating })} />
            {review.status ? (
              <Badge variant={STATUS_TONE[review.status]} size="sm" className={review.status === 'REJECTED' ? 'border-danger/30 bg-transparent text-danger' : undefined}>
                {t(`shop:myReviews.status.${review.status}`)}
              </Badge>
            ) : null}
            <time dateTime={review.createdAt} className="text-xs text-muted-foreground">
              {f.date(review.createdAt, 'long')}
            </time>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {review.title ? <h2 className="font-bold">{review.title}</h2> : null}
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
            {review.images.map((img) => (
              <li key={img.id ?? img.url}>
                <a
                  href={assetUrl(img.url)}
                  target="_blank"
                  rel="noopener"
                  aria-label={t('common:a11y.zoomImage')}
                  className="block size-20 overflow-hidden rounded-lg border border-border bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <SmartImage image={img} prefer="thumb" sizes="80px" className="size-full object-cover" alt="" />
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {review.reply ? (
        <div className="flex flex-col gap-1 rounded-lg bg-surface p-3.5 text-sm">
          <span className="inline-flex items-center gap-2 font-semibold">
            <StoreIcon className="size-4 text-primary dark:text-brand" aria-hidden="true" />
            {t('shop:reviews.storeReply')}
            <time dateTime={review.reply.createdAt} className="text-xs font-normal text-muted-foreground">
              {f.date(review.reply.createdAt, 'short')}
            </time>
          </span>
          <p className="leading-relaxed whitespace-pre-line text-muted-foreground">{review.reply.text}</p>
        </div>
      ) : null}
    </li>
  );
}

export default function MyReviewsPage() {
  const { t } = useTranslation();
  const reviews = useMyReviews();
  useDocumentMeta({ title: t('shop:myReviews.title'), noindex: true });

  return (
    <div className="flex flex-col gap-5">
      <AccountHeading title={t('shop:myReviews.title')} />
      {reviews.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : reviews.isError ? (
        <ErrorState error={reviews.error} onRetry={() => void reviews.refetch()} />
      ) : !reviews.data.length ? (
        <EmptyState
          bordered
          icon={<MessageSquareTextIcon />}
          title={t('shop:myReviews.empty')}
          description={t('myReviews.emptyHint')}
          action={
            <Button asChild variant="outline">
              <LocaleLink to={`${STORE_ROUTES.orders}?status=completed`}>{t('common:nav.orders')}</LocaleLink>
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {reviews.data.map((r) => (
            <MyReview key={r.id} review={r} />
          ))}
        </ul>
      )}
    </div>
  );
}
