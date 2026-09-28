import { isApiError, useAddToCart, useSession, useToggleWishlist, useWishlist } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import type { WishlistItemDTO } from '@vero/types';
import { Button, cn, EmptyState, toast } from '@vero/ui';
import { HeartIcon, ShoppingCartIcon, TrendingDownIcon, TrendingUpIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Crumbs } from '../components/common/Crumbs';
import { PageTitle } from '../components/common/Section';
import { ErrorState } from '../components/common/states';
import { ProductCard, ProductCardSkeleton, ProductGrid } from '../components/product/ProductCard';
import { useDocumentMeta } from '../hooks/use-document-meta';
import { useFormat } from '../hooks/use-format';
import { LocaleLink } from '../hooks/use-lang';
import { errorMessage } from '../lib/i18n';
import { withQuery } from '../lib/paths';

function PriceNote({ item }: { item: WishlistItemDTO }) {
  const { t } = useTranslation();
  const f = useFormat();
  if (!item.priceChange) return null;
  const cheaper = item.priceChange < 0;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-semibold', cheaper ? 'text-success' : 'text-muted-foreground')}>
      {cheaper ? <TrendingDownIcon className="size-3.5" aria-hidden="true" /> : <TrendingUpIcon className="size-3.5" aria-hidden="true" />}
      {cheaper ? t('common:product.priceDropped', { amount: f.price(-item.priceChange) }) : t('common:product.priceRaised', { amount: f.price(item.priceChange) })}
      <span className="font-normal text-muted-foreground">· {t('shop:wishlist.priceAtAdd', { amount: f.price(item.priceAtAdd) })}</span>
    </span>
  );
}

/** Adds every in-stock item without options to the cart and removes it from the wishlist. */
function useMoveAllToCart(items: WishlistItemDTO[]) {
  const { t } = useTranslation();
  const add = useAddToCart();
  const toggle = useToggleWishlist();
  const [pending, setPending] = useState(false);
  const movable = items.filter((i) => i.product.stock.status !== 'out_of_stock' && i.product.stock.available > 0 && !i.product.hasVariants);

  const run = async () => {
    setPending(true);
    let moved = 0;
    let failed: unknown = null;
    for (const item of movable) {
      try {
        await add.mutateAsync({ productId: item.productId, quantity: 1 });
        await toggle.mutateAsync({ productId: item.productId, active: true });
        moved += 1;
      } catch (error) {
        failed = error;
      }
    }
    setPending(false);
    if (moved) toast.success(t('shop:wishlist.movedToCart'), { description: t('shop:cart.items', { count: moved }) });
    if (failed) toast.error(isApiError(failed) ? errorMessage(t, failed) : t('common:status.error'));
  };

  return { movableCount: movable.length, run, pending };
}

export default function WishlistPage() {
  const { t } = useTranslation();
  const session = useSession();
  const wishlist = useWishlist();
  const items = wishlist.data?.items ?? [];
  const move = useMoveAllToCart(items);
  useDocumentMeta({ title: t('shop:wishlist.title'), noindex: true });

  return (
    <div className="container-page flex flex-col gap-5 py-5 sm:py-6">
      <Crumbs items={[{ label: t('shop:wishlist.title') }]} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle count={wishlist.data?.count ? t('shop:wishlist.count', { count: wishlist.data.count }) : undefined}>{t('shop:wishlist.title')}</PageTitle>
        {move.movableCount > 0 ? (
          <Button onClick={() => void move.run()} loading={move.pending} leftIcon={<ShoppingCartIcon aria-hidden="true" />}>
            {t('shop:wishlist.moveAllToCart')}
          </Button>
        ) : null}
      </div>
      {session.isReady && !session.isAuthenticated && items.length ? (
        <p className="rounded-lg bg-surface px-4 py-3 text-sm text-muted-foreground">
          {t('wishlist.guestNote')}{' '}
          <LocaleLink to={withQuery(STORE_ROUTES.login, { next: STORE_ROUTES.wishlist })} className="font-semibold text-foreground underline-offset-2 hover:underline">
            {t('common:nav.login')}
          </LocaleLink>
        </p>
      ) : null}
      {wishlist.isPending ? (
        <ProductGrid>
          {Array.from({ length: 8 }, (_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </ProductGrid>
      ) : wishlist.isError ? (
        <ErrorState error={wishlist.error} onRetry={() => void wishlist.refetch()} />
      ) : !items.length ? (
        <EmptyState
          icon={<HeartIcon />}
          title={t('shop:wishlist.empty')}
          description={t('shop:wishlist.emptyHint')}
          action={
            <Button asChild size="lg">
              <LocaleLink to={STORE_ROUTES.catalog}>{t('common:actions.continueShopping')}</LocaleLink>
            </Button>
          }
        />
      ) : (
        <>
          <h2 className="sr-only">{t('shop:wishlist.count', { count: items.length })}</h2>
          <ProductGrid>
            {items.map((item) => (
              <ProductCard key={item.productId} product={item.product} note={<PriceNote item={item} />} />
            ))}
          </ProductGrid>
        </>
      )}
    </div>
  );
}
