import { STORE_ROUTES } from '@vero/config';
import type { PromotionDTO } from '@vero/types';
import { Badge, cn } from '@vero/ui';
import { CalendarIcon, TimerIcon } from 'lucide-react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useFormat } from '../../hooks/use-format';
import { LocaleLink } from '../../hooks/use-lang';
import { Countdown } from '../common/Countdown';
import { SmartImage } from '../common/SmartImage';

export function promotionDiscountLabel(p: PromotionDTO, t: TFunction, price: (n: number) => string): string {
  return p.discountType === 'percent'
    ? t('shop:promotions.discountPercent', { value: p.discountValue })
    : t('shop:promotions.discountFixed', { amount: price(p.discountValue) });
}

/** Promotion tile: image, discount, dates / countdown for the last three days. */
export function PromotionCard({ promotion, className }: { promotion: PromotionDTO; className?: string }) {
  const { t } = useTranslation();
  const f = useFormat();
  const now = Date.now();
  const starts = new Date(promotion.startsAt).getTime();
  const ends = new Date(promotion.endsAt).getTime();
  const upcoming = starts > now;
  const endingSoon = !upcoming && ends - now < 3 * 86_400_000;

  return (
    <LocaleLink
      to={STORE_ROUTES.promotion(promotion.slug)}
      className={cn(
        'group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors duration-150 hover:border-foreground/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
      )}
    >
      <div className="relative aspect-[3/2] overflow-hidden bg-graphite">
        <SmartImage image={promotion.image} prefer="medium" sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="size-full object-cover" alt="" />
        <Badge variant="sale" size="lg" className="absolute start-3 top-3">
          {promotionDiscountLabel(promotion, t, f.price)}
        </Badge>
        {upcoming ? (
          <Badge variant="secondary" size="lg" className="absolute end-3 top-3">
            {t('shop:promotions.upcoming')}
          </Badge>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-base leading-snug font-bold tracking-tight group-hover:text-primary dark:group-hover:text-brand">{promotion.name}</h3>
        {promotion.description ? <p className="line-clamp-2 text-sm text-muted-foreground">{promotion.description}</p> : null}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs font-semibold text-muted-foreground">
          {endingSoon ? (
            <span className="inline-flex items-center gap-1.5 text-primary dark:text-brand">
              <TimerIcon className="size-3.5" aria-hidden="true" />
              <Countdown endsAt={promotion.endsAt} label={t('shop:product.promoEnds')} />
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <CalendarIcon className="size-3.5" aria-hidden="true" />
              {upcoming ? t('promotions.startsOn', { date: f.date(promotion.startsAt, 'dayMonth') }) : t('shop:promotions.until', { date: f.date(promotion.endsAt, 'dayMonth') })}
            </span>
          )}
          {promotion.productCount ? <span>{t('shop:catalog.found', { count: promotion.productCount })}</span> : null}
        </div>
      </div>
    </LocaleLink>
  );
}
