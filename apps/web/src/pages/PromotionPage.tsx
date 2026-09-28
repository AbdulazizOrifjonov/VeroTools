import { usePromotion } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import { Badge, Button, EmptyState } from '@vero/ui';
import { CalendarClockIcon, CalendarIcon, PackageSearchIcon, TimerIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { Countdown } from '../components/common/Countdown';
import { Crumbs } from '../components/common/Crumbs';
import { SmartImage } from '../components/common/SmartImage';
import { ErrorState, PageSkeleton } from '../components/common/states';
import { promotionDiscountLabel } from '../components/marketing/PromotionCard';
import { ProductListing } from '../features/catalog/ProductListing';
import { useDocumentMeta } from '../hooks/use-document-meta';
import { useFormat } from '../hooks/use-format';
import { LocaleLink } from '../hooks/use-lang';
import { isNotFound } from '../lib/errors';
import NotFoundPage from './NotFoundPage';

export default function PromotionPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const { slug = '' } = useParams();
  const promotion = usePromotion(slug);
  const fixed = useMemo(() => ({ promotion: slug }), [slug]);
  const p = promotion.data;
  useDocumentMeta({ title: p?.name, description: p?.description });

  if (promotion.isPending) return <PageSkeleton />;
  if (promotion.isError || !p) {
    if (isNotFound(promotion.error)) return <NotFoundPage />;
    return (
      <div className="container-page py-10">
        <ErrorState error={promotion.error} onRetry={() => void promotion.refetch()} />
      </div>
    );
  }

  const now = Date.now();
  const upcoming = new Date(p.startsAt).getTime() > now;
  const ended = new Date(p.endsAt).getTime() <= now || (!p.isActive && !upcoming);

  return (
    <div className="container-page flex flex-col gap-5 py-5 sm:py-6">
      <Crumbs items={[{ label: t('shop:promotions.title'), to: STORE_ROUTES.promotions }, { label: p.name }]} />
      <header className="grid overflow-hidden rounded-xl border border-border bg-card md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="relative aspect-[16/9] bg-graphite md:aspect-auto md:min-h-72">
          <SmartImage image={p.image} prefer="full" priority sizes="(min-width: 768px) 55vw, 100vw" className="absolute inset-0 size-full object-cover" alt="" />
          <Badge variant="sale" size="lg" className="absolute start-4 top-4 text-base">
            {promotionDiscountLabel(p, t, f.price)}
          </Badge>
        </div>
        <div className="flex flex-col gap-4 p-5 sm:p-8">
          {upcoming ? (
            <Badge variant="secondary" className="w-fit">
              {t('shop:promotions.upcoming')}
            </Badge>
          ) : ended ? (
            <Badge variant="muted" className="w-fit">
              {t('shop:promotions.ended')}
            </Badge>
          ) : null}
          <h1 className="text-2xl leading-tight font-bold tracking-tight text-balance sm:text-3xl">{p.name}</h1>
          {p.description ? <p className="leading-relaxed text-muted-foreground">{p.description}</p> : null}
          <dl className="mt-auto flex flex-col gap-3 border-t border-border pt-4 text-sm">
            <div className="flex items-center gap-2">
              <dt className="sr-only">{t('common:labels.date')}</dt>
              <CalendarIcon className="size-4 text-muted-foreground" aria-hidden="true" />
              <dd className="tabular-nums">
                {f.date(p.startsAt, 'dayMonth')} – {f.date(p.endsAt, 'long')}
              </dd>
            </div>
            {!upcoming && !ended ? (
              <div className="flex flex-wrap items-center gap-2">
                <dt className="inline-flex items-center gap-2 text-muted-foreground">
                  <TimerIcon className="size-4" aria-hidden="true" />
                  {t('shop:product.promoEnds')}
                </dt>
                <dd>
                  <Countdown endsAt={p.endsAt} variant="boxes" label={t('shop:product.promoEnds')} />
                </dd>
              </div>
            ) : upcoming ? (
              <div className="flex items-center gap-2">
                <dt className="sr-only">{t('shop:promotions.upcoming')}</dt>
                <CalendarClockIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                <dd className="font-semibold">{t('promotions.startsOn', { date: f.date(p.startsAt, 'long') })}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </header>

      <div className="flex flex-col gap-4 pt-2">
        <h2 id="promo-products" className="text-xl font-bold tracking-tight sm:text-2xl">
          {t('shop:promotions.products')}
        </h2>
        {ended ? (
          <EmptyState
            bordered
            icon={<PackageSearchIcon />}
            title={t('shop:promotions.ended')}
            action={
              <Button asChild>
                <LocaleLink to={STORE_ROUTES.promotions}>{t('shop:home.allPromotions')}</LocaleLink>
              </Button>
            }
          />
        ) : (
          <ProductListing
            fixed={fixed}
            showCategoryFacet
            emptyState={
              <EmptyState
                bordered
                icon={<PackageSearchIcon />}
                title={upcoming ? t('promotions.startsOn', { date: f.date(p.startsAt, 'long') }) : t('common:status.noResults')}
                action={
                  <Button asChild variant="outline">
                    <LocaleLink to={STORE_ROUTES.promotions}>{t('shop:home.allPromotions')}</LocaleLink>
                  </Button>
                }
              />
            }
          />
        )}
      </div>
    </div>
  );
}
