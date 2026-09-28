import type { StockInfo } from '@vero/types';
import { cn } from '@vero/ui';
import { useTranslation } from 'react-i18next';

const TONE = {
  in_stock: 'text-success',
  low_stock: 'text-warning',
  out_of_stock: 'text-muted-foreground',
} as const;

/** "In stock" / "Only 3 left" / "Out of stock" with a status dot. */
export function StockStatus({ stock, className, showCount = false }: { stock: StockInfo; className?: string; showCount?: boolean }) {
  const { t } = useTranslation();
  const text =
    stock.status === 'out_of_stock'
      ? t('common:product.outOfStock')
      : stock.status === 'low_stock'
        ? t('common:product.lowStock', { count: stock.available })
        : showCount
          ? t('common:product.available', { count: stock.available })
          : t('common:product.inStock');
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold', TONE[stock.status], className)}>
      <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full bg-current', stock.status === 'out_of_stock' && 'opacity-60')} />
      {text}
    </span>
  );
}
