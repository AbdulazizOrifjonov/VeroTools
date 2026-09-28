import {
  useAddToCart,
  useCart,
  useClearCart,
  useEngagement,
  useProducts,
  useRemoveCartItem,
  useSession,
  useToggleWishlist,
} from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import type { CartDTO, CartItemDTO } from '@vero/types';
import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Button,
  cn,
  EmptyState,
  Progress,
  QuantityStepper,
  Skeleton,
  toast,
} from '@vero/ui';
import { HeartIcon, LockIcon, ShoppingCartIcon, TagIcon, Trash2Icon, TriangleAlertIcon, TruckIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Crumbs } from '../components/common/Crumbs';
import { Money } from '../components/common/Money';
import { PageTitle, Section } from '../components/common/Section';
import { SmartImage } from '../components/common/SmartImage';
import { ErrorState } from '../components/common/states';
import { ProductRail } from '../components/product/ProductRail';
import { useSetLineQuantity } from '../features/product/actions';
import { useDocumentMeta } from '../hooks/use-document-meta';
import { useFormat } from '../hooks/use-format';
import { LocaleLink } from '../hooks/use-lang';
import { CouponBox } from '../features/cart/CouponBox';
import { errorMessage } from '../lib/i18n';
import { withQuery } from '../lib/paths';

function warningText(t: ReturnType<typeof useTranslation>['t'], item: CartItemDTO): string | null {
  if (!item.warning) return null;
  return t(`shop:cart.warning.${item.warning}`, { count: item.quantity });
}

function CartLine({ item }: { item: CartItemDTO }) {
  const { t } = useTranslation();
  const f = useFormat();
  const qty = useSetLineQuantity();
  const remove = useRemoveCartItem();
  const add = useAddToCart();
  const wishlist = useToggleWishlist();
  const engagement = useEngagement();
  const href = STORE_ROUTES.product(item.slug);
  const warning = warningText(t, item);
  const inWishlist = engagement.data?.wishlistIds.includes(item.productId) ?? false;

  const removeLine = (options: { undo: boolean }) =>
    remove.mutate(item.id, {
      onSuccess: () => {
        if (!options.undo) return;
        toast(t('shop:cart.removed'), {
          description: item.name,
          action: {
            label: t('shop:cart.undo'),
            onClick: () =>
              add.mutate(
                { productId: item.productId, variantId: item.variantId, quantity: item.quantity },
                { onError: (e) => toast.error(errorMessage(t, e)) },
              ),
          },
        });
      },
      onError: (e) => toast.error(errorMessage(t, e)),
    });

  const moveToWishlist = () => {
    const done = () => {
      removeLine({ undo: false });
      toast.success(t('cart.movedToWishlist'));
    };
    if (inWishlist) done();
    else wishlist.mutate({ productId: item.productId, active: false }, { onSuccess: done, onError: (e) => toast.error(errorMessage(t, e)) });
  };

  return (
    <li className={cn('flex gap-3 py-4 sm:gap-5 sm:py-5', !item.isAvailable && 'opacity-80')}>
      <LocaleLink to={href} className="img-well size-20 shrink-0 overflow-hidden rounded-lg bg-well sm:size-28" tabIndex={-1} aria-hidden="true">
        <SmartImage image={item.image} prefer="thumb" sizes="112px" className={cn('size-full object-contain', !item.isAvailable && 'grayscale')} alt="" />
      </LocaleLink>
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {item.brandName ? <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{item.brandName}</span> : null}
          <LocaleLink to={href} className="line-clamp-2 text-sm leading-snug font-semibold hover:text-primary sm:text-[15px] dark:hover:text-brand">
            {item.name}
          </LocaleLink>
          {item.variantName ? <span className="text-sm text-muted-foreground">{item.variantName}</span> : null}
          <span className="text-xs text-muted-foreground">
            {t('common:product.sku')}: <span className="tabular-nums">{item.sku}</span>
          </span>
          {warning ? (
            <Badge variant={item.isAvailable ? 'warning' : 'danger'} className="mt-1 h-auto w-fit py-1 whitespace-normal">
              <TriangleAlertIcon aria-hidden="true" />
              {warning}
            </Badge>
          ) : null}
          <div className="mt-auto flex items-center gap-1 pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="-ms-2 text-muted-foreground"
              onClick={moveToWishlist}
              loading={wishlist.isPending}
              leftIcon={<HeartIcon aria-hidden="true" />}
            >
              <span className="hidden sm:inline">{t('cart.moveToWishlist')}</span>
              <span className="sr-only sm:hidden">{t('cart.moveToWishlist')}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-danger"
              onClick={() => removeLine({ undo: true })}
              loading={remove.isPending}
              leftIcon={<Trash2Icon aria-hidden="true" />}
              aria-label={t('common:a11y.removeItem', { name: item.name })}
            >
              <span className="hidden sm:inline">{t('common:actions.remove')}</span>
            </Button>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 sm:w-56 sm:flex-col sm:items-end sm:justify-start">
          {item.isAvailable ? (
            <QuantityStepper
              size="sm"
              value={item.quantity}
              min={1}
              max={Math.max(1, item.maxQuantity)}
              onChange={(q) => qty.setQuantity(item.id, q)}
              decreaseLabel={t('common:product.decrease')}
              increaseLabel={t('common:product.increase')}
              inputLabel={`${t('common:product.quantity')}: ${item.name}`}
            />
          ) : (
            <span className="text-sm font-semibold text-muted-foreground">{t('common:product.outOfStock')}</span>
          )}
          <div className="flex flex-col items-end gap-0.5 text-end">
            <Money amount={item.lineTotal || item.price * item.quantity} oldAmount={item.lineOldTotal > item.lineTotal ? item.lineOldTotal : undefined} size="md" stacked className="items-end" />
            {item.quantity > 1 ? <span className="text-xs text-muted-foreground tabular-nums">{t('shop:cart.perItem', { amount: f.price(item.price) })}</span> : null}
          </div>
        </div>
      </div>
    </li>
  );
}

export function CartTotals({ cart }: { cart: CartDTO }) {
  const { t } = useTranslation();
  const tot = cart.totals;
  return (
    <dl className="flex flex-col gap-2.5 text-sm">
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">{t('shop:cart.subtotal', { count: tot.itemsCount })}</dt>
        <dd className="font-semibold">
          <Money amount={tot.oldSubtotal || tot.subtotal} size="sm" />
        </dd>
      </div>
      {tot.productDiscount > 0 ? (
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{t('shop:cart.productDiscount')}</dt>
          <dd className="font-semibold text-success tabular-nums">
            −<Money amount={tot.productDiscount} size="sm" className="[&_[data-slot=price-current]]:text-success" />
          </dd>
        </div>
      ) : null}
      {tot.couponDiscount > 0 ? (
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">
            {t('shop:cart.couponDiscount')} {cart.coupon ? <span className="font-semibold text-foreground">{cart.coupon.code}</span> : null}
          </dt>
          <dd className="font-semibold text-success tabular-nums">
            −<Money amount={tot.couponDiscount} size="sm" className="[&_[data-slot=price-current]]:text-success" />
          </dd>
        </div>
      ) : null}
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">{t('shop:cart.delivery')}</dt>
        <dd className="text-end text-muted-foreground">{t('shop:cart.deliveryAtCheckout')}</dd>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-border pt-3">
        <dt className="text-base font-bold">{t('shop:cart.total')}</dt>
        <dd>
          <Money amount={tot.total} size="lg" />
        </dd>
      </div>
    </dl>
  );
}

function FreeDeliveryHint({ cart }: { cart: CartDTO }) {
  const { t } = useTranslation();
  const f = useFormat();
  const { freeDeliveryThreshold: threshold, amountToFreeDelivery: left, total } = cart.totals;
  if (!threshold) return null;
  const pct = Math.min(100, Math.round((total / threshold) * 100));
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-surface p-3">
      <p className="flex items-center gap-2 text-sm font-medium">
        <TruckIcon className={cn('size-4 shrink-0', left <= 0 ? 'text-success' : 'text-muted-foreground')} aria-hidden="true" />
        {left > 0 ? t('shop:cart.freeDeliveryLeft', { amount: f.price(left) }) : t('shop:cart.freeDeliveryReached')}
      </p>
      <Progress value={pct} size="sm" tone={left <= 0 ? 'success' : 'brand'} aria-label={t('cart.freeDeliveryProgress')} />
      <p className="text-xs text-muted-foreground">{t('cart.freeDeliveryNote')}</p>
    </div>
  );
}

function EmptyCart() {
  const { t } = useTranslation();
  const popular = useProducts({ sort: 'popular', limit: 10 });
  return (
    <div className="flex flex-col gap-4">
      <EmptyState
        icon={<ShoppingCartIcon />}
        title={t('shop:cart.empty')}
        description={t('shop:cart.emptyHint')}
        action={
          <Button asChild size="lg">
            <LocaleLink to={STORE_ROUTES.catalog}>{t('common:actions.continueShopping')}</LocaleLink>
          </Button>
        }
      />
      {popular.data?.items.length ? (
        <Section title={t('shop:home.popular')}>
          <ProductRail products={popular.data.items} label={t('shop:home.popular')} />
        </Section>
      ) : null}
    </div>
  );
}

export default function CartPage() {
  const { t } = useTranslation();
  const cart = useCart();
  const session = useSession();
  const clear = useClearCart();
  const remove = useRemoveCartItem();
  useDocumentMeta({ title: t('shop:cart.title'), noindex: true });

  const header = (
    <>
      <Crumbs items={[{ label: t('shop:cart.title') }]} />
    </>
  );

  if (!session.isReady || cart.isPending) {
    return (
      <div className="container-page flex flex-col gap-5 py-5 sm:py-6">
        {header}
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }
  if (cart.isError) {
    return (
      <div className="container-page flex flex-col gap-5 py-5 sm:py-6">
        {header}
        <ErrorState error={cart.error} onRetry={() => void cart.refetch()} />
      </div>
    );
  }

  const c = cart.data;
  const unavailable = c.items.filter((i) => !i.isAvailable);
  const orderable = c.items.some((i) => i.isAvailable);

  return (
    <div className="container-page flex flex-col gap-5 py-5 sm:py-6">
      {header}
      {!c.items.length ? (
        <>
          <PageTitle>{t('shop:cart.title')}</PageTitle>
          <EmptyCart />
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <PageTitle count={t('shop:cart.items', { count: c.totals.itemsCount })}>{t('shop:cart.title')}</PageTitle>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground" leftIcon={<Trash2Icon aria-hidden="true" />}>
                  {t('shop:cart.clear')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogMedia>
                    <Trash2Icon />
                  </AlertDialogMedia>
                  <AlertDialogTitle>{t('shop:cart.clear')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('shop:cart.clearConfirm')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={() => clear.mutate(undefined, { onError: (e) => toast.error(errorMessage(t, e)) })}>
                    {t('common:actions.clear')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
            <div className="flex min-w-0 flex-col gap-4">
              {unavailable.length ? (
                <Alert variant="warning">
                  <AlertDescription className="flex flex-wrap items-center justify-between gap-3 text-foreground">
                    <span>{t('shop:cart.hasUnavailable')}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={remove.isPending}
                      onClick={async () => {
                        for (const i of unavailable) await remove.mutateAsync(i.id).catch(() => undefined);
                      }}
                    >
                      {t('shop:cart.removeUnavailable')}
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null}
              {c.couponError ? (
                <Alert variant="warning">
                  <AlertDescription className="text-foreground">{t(`errors:${c.couponError}`, { defaultValue: t('errors:COUPON_INVALID') })}</AlertDescription>
                </Alert>
              ) : null}
              <ul className="divide-y divide-border rounded-xl border border-border bg-card px-4 sm:px-5" aria-live="polite">
                {c.items.map((item) => (
                  <CartLine key={item.id} item={item} />
                ))}
              </ul>
            </div>
            <aside aria-label={t('shop:cart.summary')} className="flex flex-col gap-4 lg:sticky lg:top-[calc(var(--header-offset)+1rem)]">
              <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
                <h2 className="text-lg font-bold tracking-tight">{t('shop:cart.summary')}</h2>
                <CartTotals cart={c} />
                <FreeDeliveryHint cart={c} />
                {c.estimatedDelivery ? (
                  <p className="text-sm text-muted-foreground">
                    {t('shop:cart.estimatedDelivery', { min: c.estimatedDelivery.minDays, max: c.estimatedDelivery.maxDays })}
                  </p>
                ) : null}
                {session.isAuthenticated ? (
                  <Button asChild size="xl" className={cn(!orderable && 'pointer-events-none opacity-50')} aria-disabled={!orderable}>
                    <LocaleLink to={STORE_ROUTES.checkout}>{t('common:actions.checkout')}</LocaleLink>
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button asChild size="xl">
                      <LocaleLink to={withQuery(STORE_ROUTES.login, { next: STORE_ROUTES.checkout })}>{t('common:actions.checkout')}</LocaleLink>
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      {t('shop:cart.loginToCheckout')}. {t('shop:cart.guestNote')}{' '}
                      <LocaleLink to={withQuery(STORE_ROUTES.register, { next: STORE_ROUTES.checkout })} className="font-semibold text-primary hover:underline dark:text-brand">
                        {t('common:nav.register')}
                      </LocaleLink>
                    </p>
                  </div>
                )}
                <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <LockIcon className="size-3.5" aria-hidden="true" />
                  {t('shop:cart.secureCheckout')}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <CouponBox cart={c} />
              </div>
              <LocaleLink to={STORE_ROUTES.catalog} className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-primary hover:underline dark:text-brand">
                <TagIcon className="size-4" aria-hidden="true" />
                {t('common:actions.continueShopping')}
              </LocaleLink>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

