import { useSettings } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import type { ProductCard as ProductCardDTO } from '@vero/types';
import { cn, RatingStars, Skeleton } from '@vero/ui';
import { cheapestInstallment, formatPrice } from '@vero/utils';
import { TruckIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LocaleLink, useLang } from '../../hooks/use-lang';
import { usePrefetchProduct } from '../../features/product/actions';
import { Money } from '../common/Money';
import { SmartImage } from '../common/SmartImage';
import { CartControl, CompareButton, WishlistButton } from './ProductActions';
import { ProductBadges } from './ProductBadges';
import { StockStatus } from './StockStatus';

/** "from 99 000 so'm/mo" when installments are enabled and the price qualifies. */
export function useInstallmentFrom(price: number): string | null {
  const { t } = useTranslation();
  const lang = useLang();
  const settings = useSettings();
  const inst = settings.data?.installment;
  if (!inst?.enabled) return null;
  const best = cheapestInstallment(price, inst.plans, inst.minAmount);
  if (!best) return null;
  return t('common:product.installmentFrom', { amount: formatPrice(best.monthlyPayment, lang, t('common:currency')) });
}

export interface ProductCardProps {
  product: ProductCardDTO;
  layout?: 'grid' | 'list';
  /** eager image for above-the-fold cards */
  priority?: boolean;
  className?: string;
  /** replaces the default buy control (wishlist page adds its own actions) */
  footer?: ReactNode;
  /** extra line under the price (price change since added…) */
  note?: ReactNode;
  sizes?: string;
}

export function ProductCard({ product, layout = 'grid', priority = false, className, footer, note, sizes }: ProductCardProps) {
  const { t } = useTranslation();
  const prefetch = usePrefetchProduct();
  const href = STORE_ROUTES.product(product.slug);
  const installment = useInstallmentFrom(product.price);
  const second = product.images[1];
  const warm = () => prefetch(product.slug);

  const media = (
    <div className={cn('relative shrink-0', layout === 'list' && 'w-32 sm:w-48')}>
      <LocaleLink
        to={href}
        tabIndex={-1}
        aria-hidden="true"
        onMouseEnter={warm}
        className={cn('img-well relative block aspect-square overflow-hidden bg-well', layout === 'grid' ? 'rounded-t-[11px]' : 'rounded-lg')}
      >
        <SmartImage
          image={product.image}
          prefer="medium"
          priority={priority}
          sizes={sizes ?? (layout === 'list' ? '192px' : '(min-width: 1280px) 20vw, (min-width: 768px) 30vw, 50vw')}
          className={cn('size-full object-contain transition-opacity duration-200', second && 'group-hover:opacity-0')}
          alt=""
        />
        {second ? (
          <SmartImage
            image={second}
            prefer="medium"
            sizes={sizes ?? '(min-width: 1280px) 20vw, (min-width: 768px) 30vw, 50vw'}
            className="absolute inset-0 size-full object-contain opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            alt=""
          />
        ) : null}
      </LocaleLink>
      <ProductBadges product={product} size="sm" className="pointer-events-none absolute start-2 top-2 max-w-[calc(100%-3.5rem)]" />
      {layout === 'grid' ? (
        <div className="absolute end-2 top-2 flex flex-col gap-1.5">
          <WishlistButton productId={product.id} productName={product.name} />
          <CompareButton productId={product.id} productName={product.name} />
        </div>
      ) : null}
    </div>
  );

  const title = (
    <h3 className={cn('text-sm leading-snug font-semibold text-foreground', layout === 'grid' ? 'line-clamp-2 min-h-[2.6em]' : 'line-clamp-2 sm:text-base')}>
      <LocaleLink
        to={href}
        onMouseEnter={warm}
        onFocus={warm}
        className="rounded-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:hover:text-brand"
      >
        {product.name}
      </LocaleLink>
    </h3>
  );

  const meta = (
    <div className="flex min-h-5 items-center gap-2 text-xs text-muted-foreground">
      {product.brand ? <span className="truncate font-semibold tracking-wide uppercase">{product.brand.name}</span> : null}
      {product.reviewCount > 0 ? (
        <span className="ms-auto inline-flex shrink-0 items-center gap-1">
          <RatingStars value={product.rating} size="xs" label={t('common:a11y.rating', { value: product.rating.toFixed(1) })} />
          <span className="tabular-nums">({product.reviewCount})</span>
        </span>
      ) : null}
    </div>
  );

  const price = (
    <div className="flex flex-col gap-0.5">
      <Money amount={product.price} oldAmount={product.oldPrice} size="md" className="gap-x-1.5" />
      {installment ? <span className="text-xs text-muted-foreground">{installment}</span> : null}
      {note}
    </div>
  );

  if (layout === 'list') {
    return (
      <article className={cn('group relative flex gap-3 rounded-lg border border-border bg-card p-3 transition-colors duration-150 hover:border-foreground/20 sm:gap-5 sm:p-4', className)}>
        {media}
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:gap-6">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {meta}
            {title}
            {product.shortDescription ? <p className="line-clamp-2 hidden text-sm text-muted-foreground sm:block">{product.shortDescription}</p> : null}
            <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
              <StockStatus stock={product.stock} />
              {product.stock.status !== 'out_of_stock' ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <TruckIcon className="size-3.5" aria-hidden="true" />
                  {t('common:product.deliveryDays', { min: product.deliveryDays.min, max: product.deliveryDays.max })}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:w-52 sm:items-stretch">
            {price}
            <div className="mt-auto flex flex-col gap-2">
              <div className="flex items-center justify-end gap-1.5">
                <WishlistButton productId={product.id} productName={product.name} size="md" className="shadow-none" />
                <CompareButton productId={product.id} productName={product.name} size="md" className="shadow-none" />
              </div>
              {footer ?? <CartControl product={product} size="default" />}
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={cn('group relative flex flex-col rounded-lg border border-border bg-card transition-colors duration-150 hover:border-foreground/20', className)}>
      {media}
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-3.5">
        {meta}
        {title}
        {price}
        <StockStatus stock={product.stock} />
        <div className="mt-auto pt-1">{footer ?? <CartControl product={product} size="sm" />}</div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton({ layout = 'grid' }: { layout?: 'grid' | 'list' }) {
  if (layout === 'list') {
    return (
      <div className="flex gap-4 rounded-lg border border-border p-4">
        <Skeleton className="aspect-square w-32 shrink-0 rounded-lg sm:w-48" />
        <div className="flex flex-1 flex-col gap-2.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="mt-auto h-9 w-40" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col rounded-lg border border-border" aria-hidden="true">
      <Skeleton className="aspect-square w-full rounded-t-[11px] rounded-b-none" />
      <div className="flex flex-col gap-2.5 p-3.5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="mt-1 h-8 w-full" />
      </div>
    </div>
  );
}

/** Responsive product grid. */
export function ProductGrid({ children, className, dense = false }: { children: ReactNode; className?: string; dense?: boolean }) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-2.5 sm:gap-4',
        dense ? 'md:grid-cols-3 xl:grid-cols-4' : 'md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5',
        className,
      )}
    >
      {children}
    </div>
  );
}
