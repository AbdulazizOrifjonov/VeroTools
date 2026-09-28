import type { ProductCard } from '@vero/types';
import { Badge, cn, formatDiscount } from '@vero/ui';
import { ZapIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/** Discount %, promotion, new, bestseller — at most three, most important first. */
export function ProductBadges({ product, className, size = 'default' }: { product: ProductCard; className?: string; size?: 'sm' | 'default' }) {
  const { t } = useTranslation();
  const badges: Array<{ key: string; node: ReactNode }> = [];
  if (product.discountPercent > 0) {
    badges.push({
      key: 'discount',
      node: (
        <Badge variant="sale" size={size}>
          <span className="sr-only">{t('common:product.discount')} </span>
          {formatDiscount(product.discountPercent)}
        </Badge>
      ),
    });
  }
  if (product.promotion) {
    badges.push({
      key: 'promo',
      node: (
        <Badge variant="brand" size={size} title={product.promotion.name}>
          {product.promotion.type === 'FLASH_SALE' ? <ZapIcon aria-hidden="true" /> : null}
          {t('common:product.sale')}
        </Badge>
      ),
    });
  }
  if (product.flags.isNew) {
    badges.push({ key: 'new', node: <Badge variant="new" size={size}>{t('common:product.new')}</Badge> });
  }
  if (product.flags.bestseller) {
    badges.push({ key: 'best', node: <Badge variant="warning" size={size}>{t('common:product.bestseller')}</Badge> });
  }
  if (!badges.length) return null;
  return (
    <div className={cn('flex flex-wrap items-start gap-1', className)}>
      {badges.slice(0, 3).map((b) => (
        <span key={b.key} className="contents">
          {b.node}
        </span>
      ))}
    </div>
  );
}
