import type { ProductFacets, ProductListParams } from '@vero/types';
import { cn } from '@vero/ui';
import { formatNumber } from '@vero/utils';
import { XIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFormat } from '../../hooks/use-format';

interface Chip {
  key: string;
  label: string;
  remove: () => ProductListParams;
}

/** Removable chips for every active filter + "Clear all". */
export function ActiveFilters({
  value,
  fixed,
  facets,
  onChange,
  onClear,
  className,
}: {
  value: ProductListParams;
  fixed: ProductListParams;
  facets: ProductFacets | undefined;
  onChange: (next: ProductListParams) => void;
  onClear: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const chips: Chip[] = [];
  const without = (patch: Partial<ProductListParams>) => () => ({ ...value, ...patch, page: undefined });

  if (value.category && !fixed.category) {
    const label = facets?.categories.find((c) => c.value === value.category)?.label ?? value.category;
    chips.push({ key: 'cat', label, remove: without({ category: undefined }) });
  }
  if (!fixed.brand) {
    for (const b of value.brand ?? []) {
      const label = facets?.brands.find((o) => o.value === b)?.label ?? b;
      chips.push({ key: `b-${b}`, label, remove: without({ brand: (value.brand ?? []).filter((x) => x !== b) }) });
    }
  }
  if (value.minPrice !== undefined || value.maxPrice !== undefined) {
    const label =
      value.minPrice !== undefined && value.maxPrice !== undefined
        ? `${formatNumber(value.minPrice)} – ${f.price(value.maxPrice)}`
        : value.minPrice !== undefined
          ? `${t('common:labels.from')} ${f.price(value.minPrice)}`
          : `${t('common:labels.to')} ${f.price(value.maxPrice!)}`;
    chips.push({ key: 'price', label, remove: without({ minPrice: undefined, maxPrice: undefined }) });
  }
  if (value.rating) chips.push({ key: 'rating', label: `★ ${t('shop:catalog.ratingAtLeast', { value: value.rating })}`, remove: without({ rating: undefined }) });
  if (value.inStock) chips.push({ key: 'stock', label: t('shop:catalog.onlyInStock'), remove: without({ inStock: undefined }) });
  if (value.discounted) chips.push({ key: 'disc', label: t('shop:catalog.onlyDiscounted'), remove: without({ discounted: undefined }) });
  if (value.isNew) chips.push({ key: 'new', label: t('common:product.new'), remove: without({ isNew: undefined }) });
  if (value.bestseller) chips.push({ key: 'best', label: t('common:product.bestseller'), remove: without({ bestseller: undefined }) });
  if (value.featured) chips.push({ key: 'feat', label: t('common:product.featured'), remove: without({ featured: undefined }) });

  for (const [key, v] of Object.entries(value.specs ?? {})) {
    const facet = facets?.specs.find((s) => s.key === key);
    const name = facet?.label ?? key;
    const removeSpec = () => {
      const specs = { ...(value.specs ?? {}) };
      delete specs[key];
      return { ...value, specs: Object.keys(specs).length ? specs : undefined, page: undefined };
    };
    if (v === true) chips.push({ key: `s-${key}`, label: name, remove: removeSpec });
    else if (Array.isArray(v)) {
      const labels = v.map((x) => (facet?.type === 'options' ? (facet.options.find((o) => o.value === x)?.label ?? x) : x));
      chips.push({ key: `s-${key}`, label: `${name}: ${labels.join(', ')}`, remove: removeSpec });
    } else if (v && typeof v === 'object') {
      const unit = facet && 'unit' in facet && facet.unit ? ` ${facet.unit}` : '';
      const range =
        v.min !== undefined && v.max !== undefined
          ? `${formatNumber(v.min, v.min % 1 ? 1 : 0)}–${formatNumber(v.max, v.max % 1 ? 1 : 0)}`
          : v.min !== undefined
            ? `${t('common:labels.from')} ${formatNumber(v.min, v.min % 1 ? 1 : 0)}`
            : `${t('common:labels.to')} ${formatNumber(v.max ?? 0, (v.max ?? 0) % 1 ? 1 : 0)}`;
      chips.push({ key: `s-${key}`, label: `${name}: ${range}${unit}`, remove: removeSpec });
    }
  }

  if (!chips.length) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)} aria-label={t('shop:catalog.activeFilters')} role="group">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => onChange(c.remove())}
          aria-label={`${t('common:actions.remove')}: ${c.label}`}
          className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-border bg-surface-elevated ps-3 pe-2 text-[13px] font-medium transition-colors hover:border-foreground/30 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span className="truncate">{c.label}</span>
          <XIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="inline-flex h-8 items-center rounded-full px-2 text-[13px] font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring dark:text-brand"
      >
        {t('shop:catalog.clearFilters')}
      </button>
    </div>
  );
}
