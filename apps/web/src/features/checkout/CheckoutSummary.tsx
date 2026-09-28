import type { CheckoutQuote } from '@vero/types';
import { cn, Skeleton } from '@vero/ui';
import { useTranslation } from 'react-i18next';
import { Money } from '../../components/common/Money';
import { SmartImage } from '../../components/common/SmartImage';
import { useFormat } from '../../hooks/use-format';

/** Order totals from the checkout quote (the API is the source of truth for every amount). */
export function CheckoutSummary({
  quote,
  loading,
  deliveryKnown,
  className,
}: {
  quote: CheckoutQuote | undefined;
  loading: boolean;
  /** false until a delivery method with a valid address / pickup point is chosen */
  deliveryKnown: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  if (!quote) {
    return (
      <div className={cn('flex flex-col gap-3 rounded-xl border border-border bg-card p-5', className)}>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }
  const items = quote.items.filter((i) => i.isAvailable);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  return (
    <div className={cn('flex flex-col gap-4 rounded-xl border border-border bg-card p-5', loading && 'opacity-70', className)} aria-busy={loading || undefined}>
      <h2 className="text-lg font-bold tracking-tight">{t('shop:cart.summary')}</h2>
      <ul className="flex flex-col gap-3">
        {items.slice(0, 4).map((i) => (
          <li key={i.id} className="flex items-center gap-3">
            <span className="img-well relative size-12 shrink-0 overflow-hidden rounded-md bg-well">
              <SmartImage image={i.image} prefer="thumb" sizes="48px" className="size-full object-contain" alt="" />
              <span className="absolute end-0.5 bottom-0.5 rounded-sm bg-graphite px-1 text-[10px] leading-4 font-bold text-graphite-foreground tabular-nums">×{i.quantity}</span>
            </span>
            <span className="line-clamp-2 min-w-0 flex-1 text-xs leading-snug font-medium">
              {i.name}
              {i.variantName ? <span className="text-muted-foreground"> · {i.variantName}</span> : null}
            </span>
            <span className="shrink-0 text-xs font-semibold tabular-nums">{f.price(i.lineTotal)}</span>
          </li>
        ))}
        {items.length > 4 ? <li className="text-xs text-muted-foreground">{t('checkout.moreItems', { count: items.length - 4 })}</li> : null}
      </ul>
      <dl className="flex flex-col gap-2.5 border-t border-border pt-4 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{t('shop:cart.subtotal', { count })}</dt>
          <dd className="font-semibold tabular-nums">{f.price(quote.oldSubtotal || quote.subtotal)}</dd>
        </div>
        {quote.productDiscount > 0 ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t('shop:cart.productDiscount')}</dt>
            <dd className="font-semibold text-success tabular-nums">−{f.price(quote.productDiscount)}</dd>
          </div>
        ) : null}
        {quote.couponDiscount > 0 ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">
              {t('shop:cart.couponDiscount')} {quote.coupon ? <span className="font-semibold text-foreground">{quote.coupon.code}</span> : null}
            </dt>
            <dd className="font-semibold text-success tabular-nums">−{f.price(quote.couponDiscount)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{t('shop:cart.delivery')}</dt>
          <dd className={cn('text-end font-semibold tabular-nums', deliveryKnown && quote.deliveryFee === 0 && 'text-success')}>
            {!deliveryKnown ? <span className="font-normal text-muted-foreground">{t('shop:checkout.selectRegionFirst')}</span> : quote.deliveryFee === 0 ? t('common:labels.free') : f.price(quote.deliveryFee)}
          </dd>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-border pt-3">
          <dt className="text-base font-bold">{t('shop:cart.total')}</dt>
          <dd>
            <Money amount={quote.total} size="lg" />
          </dd>
        </div>
        {quote.installment ? (
          <div className="flex justify-between gap-3 rounded-lg bg-brand-soft px-3 py-2 text-brand-soft-foreground">
            <dt className="font-medium">{t('checkout.installmentFor', { count: quote.installment.months })}</dt>
            <dd className="font-bold tabular-nums">
              {f.price(quote.installment.monthlyPayment)}
              <span className="font-medium"> / {t('common:units.month')}</span>
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
