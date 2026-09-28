import { STORE_ROUTES } from '@vero/config';
import type { BrandSummary, CategorySummary } from '@vero/types';
import { cn } from '@vero/ui';
import { useTranslation } from 'react-i18next';
import { LocaleLink } from '../../hooks/use-lang';
import { DynamicIcon } from '../common/DynamicIcon';
import { SmartImage } from '../common/SmartImage';

/** Brand logo on a light chip (logos are dark artwork on transparent backgrounds). */
export function BrandLogo({ brand, className, imgClassName }: { brand: Pick<BrandSummary, 'name' | 'logo'>; className?: string; imgClassName?: string }) {
  return (
    <span className={cn('flex items-center justify-center overflow-hidden rounded-md bg-white', className)}>
      {brand.logo ? (
        <SmartImage image={brand.logo} prefer="thumb" sizes="200px" alt={brand.name} className={cn('max-h-full max-w-full object-contain', imgClassName)} />
      ) : (
        <span className="px-2 text-center text-sm font-extrabold tracking-tight text-neutral-900 uppercase">{brand.name}</span>
      )}
    </span>
  );
}

export function BrandTile({ brand, className }: { brand: BrandSummary; className?: string }) {
  const { t } = useTranslation();
  return (
    <LocaleLink
      to={STORE_ROUTES.brand(brand.slug)}
      className={cn(
        'group flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-3 text-center transition-colors duration-150 hover:border-foreground/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
      )}
    >
      <BrandLogo brand={brand} className="h-16 w-full p-2 dark:ring-1 dark:ring-white/10" />
      <span className="flex flex-col">
        <span className="text-sm font-semibold group-hover:text-primary dark:group-hover:text-brand">{brand.name}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{t('shop:catalog.found', { count: brand.productCount })}</span>
      </span>
    </LocaleLink>
  );
}

export function CategoryTile({ category, className, size = 'md' }: { category: CategorySummary; className?: string; size?: 'md' | 'sm' }) {
  const { t } = useTranslation();
  return (
    <LocaleLink
      to={STORE_ROUTES.category(category.slug)}
      className={cn(
        'group flex flex-col items-center gap-2.5 rounded-lg border border-border bg-card p-3 text-center transition-colors duration-150 hover:border-foreground/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-4',
        className,
      )}
    >
      <span className={cn('flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-surface', size === 'sm' ? 'max-w-20' : 'max-w-28')}>
        {category.image ? (
          <SmartImage
            image={category.image}
            prefer="thumb"
            sizes="(min-width: 1024px) 140px, 30vw"
            alt=""
            className="size-full object-contain p-2 transition-transform duration-200 group-hover:scale-[1.04]"
          />
        ) : (
          <DynamicIcon name={category.icon} className="size-8 text-muted-foreground" />
        )}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="line-clamp-2 text-[13px] leading-snug font-semibold text-balance group-hover:text-primary sm:text-sm dark:group-hover:text-brand">
          {category.name}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">{t('shop:catalog.found', { count: category.productCount })}</span>
      </span>
    </LocaleLink>
  );
}
