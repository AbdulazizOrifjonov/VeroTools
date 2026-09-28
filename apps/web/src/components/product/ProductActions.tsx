import { STORE_ROUTES } from '@vero/config';
import type { ProductCard } from '@vero/types';
import { Button, cn, QuantityStepper, type ButtonProps } from '@vero/ui';
import { GitCompareArrowsIcon, HeartIcon, ListChecksIcon, ShoppingCartIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LocaleLink } from '../../hooks/use-lang';
import { useAddToCartAction, useCartLine, useCompareToggle, useSetLineQuantity, useWishlistToggle } from '../../features/product/actions';

/** Round heart toggle (optimistic). */
export function WishlistButton({ productId, productName, className, size = 'sm' }: { productId: string; productName: string; className?: string; size?: 'sm' | 'md' }) {
  const { t } = useTranslation();
  const wishlist = useWishlistToggle();
  const active = wishlist.isActive(productId);
  return (
    <button
      type="button"
      onClick={() => wishlist.toggle(productId)}
      aria-pressed={active}
      aria-label={`${active ? t('common:actions.removeFromWishlist') : t('common:actions.addToWishlist')}: ${productName}`}
      title={active ? t('common:actions.removeFromWishlist') : t('common:actions.addToWishlist')}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-surface-elevated/95 text-foreground shadow-xs transition-[color,background-color,scale] duration-150',
        'hover:text-primary active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:hover:text-brand',
        size === 'sm' ? 'size-9' : 'size-11',
        active && 'text-primary dark:text-brand',
        className,
      )}
    >
      <HeartIcon className={cn(size === 'sm' ? 'size-[18px]' : 'size-5', active && 'fill-current')} aria-hidden="true" />
    </button>
  );
}

export function CompareButton({ productId, productName, className, size = 'sm' }: { productId: string; productName: string; className?: string; size?: 'sm' | 'md' }) {
  const { t } = useTranslation();
  const compare = useCompareToggle();
  const active = compare.isActive(productId);
  return (
    <button
      type="button"
      onClick={() => compare.toggle(productId)}
      aria-pressed={active}
      aria-label={`${active ? t('common:actions.removeFromCompare') : t('common:actions.addToCompare')}: ${productName}`}
      title={active ? t('common:actions.removeFromCompare') : t('common:actions.addToCompare')}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-surface-elevated/95 text-foreground shadow-xs transition-[color,background-color,scale] duration-150',
        'hover:text-primary active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:hover:text-brand',
        size === 'sm' ? 'size-9' : 'size-11',
        active && 'border-primary/40 bg-brand-soft text-primary dark:text-brand',
        className,
      )}
    >
      <GitCompareArrowsIcon className={size === 'sm' ? 'size-[18px]' : 'size-5'} aria-hidden="true" />
    </button>
  );
}

/**
 * Buy control of a product card: "Add to cart" → quantity stepper once the product is in the cart.
 * Products with options link to the product page; out-of-stock products get a disabled button.
 */
export function CartControl({
  product,
  size = 'default',
  className,
  fullWidth = true,
}: {
  product: ProductCard;
  size?: ButtonProps['size'];
  className?: string;
  fullWidth?: boolean;
}) {
  const { t } = useTranslation();
  const line = useCartLine(product.id);
  const cartAction = useAddToCartAction();
  const qty = useSetLineQuantity();
  const out = product.stock.status === 'out_of_stock' || product.stock.available <= 0;

  if (out) {
    return (
      <Button variant="secondary" size={size} disabled className={cn(fullWidth && 'w-full', className)}>
        {t('common:product.outOfStock')}
      </Button>
    );
  }

  if (product.hasVariants) {
    return (
      <Button variant="outline" size={size} asChild className={cn(fullWidth && 'w-full', className)} leftIcon={<ListChecksIcon aria-hidden="true" />}>
        <LocaleLink to={STORE_ROUTES.product(product.slug)}>{t('productCard.chooseOption')}</LocaleLink>
      </Button>
    );
  }

  if (line && line.isAvailable) {
    return (
      <div className={cn('flex items-center gap-2', fullWidth && 'w-full', className)}>
        <QuantityStepper
          size={size === 'sm' ? 'sm' : 'default'}
          value={line.quantity}
          min={0}
          max={Math.max(1, line.maxQuantity)}
          onChange={(q) => qty.setQuantity(line.id, q)}
          decreaseLabel={t('common:product.decrease')}
          increaseLabel={t('common:product.increase')}
          inputLabel={`${t('common:product.quantity')}: ${product.name}`}
          className={cn(fullWidth && 'flex-1 justify-between')}
        />
        <Button variant="brand-outline" size={size === 'sm' ? 'icon-sm' : 'icon'} asChild aria-label={t('common:actions.goToCart')} title={t('common:actions.goToCart')}>
          <LocaleLink to={STORE_ROUTES.cart}>
            <ShoppingCartIcon aria-hidden="true" />
          </LocaleLink>
        </Button>
      </div>
    );
  }

  return (
    <Button
      size={size}
      className={cn(fullWidth && 'w-full', className)}
      loading={cartAction.isPending}
      onClick={() => cartAction.add({ productId: product.id, quantity: 1 })}
      leftIcon={<ShoppingCartIcon aria-hidden="true" />}
      aria-label={`${t('common:actions.addToCart')}: ${product.name}`}
    >
      {t('common:actions.addToCart')}
    </Button>
  );
}
