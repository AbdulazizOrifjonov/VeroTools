import type { ProductFacets, ProductListParams, SpecFilterValue } from '@vero/types';
import { formatNumber } from '@vero/utils';
import type { TFunction } from 'i18next';

/** Removes empty values so equal filters produce equal query keys. */
export function cleanParams(p: ProductListParams): ProductListParams {
  const out: ProductListParams = { ...p };
  if (out.brand && !out.brand.length) delete out.brand;
  if (out.specs) {
    const specs: Record<string, SpecFilterValue> = {};
    for (const [k, v] of Object.entries(out.specs)) {
      if (v === false || v === undefined) continue;
      if (Array.isArray(v) && !v.length) continue;
      if (!Array.isArray(v) && typeof v === 'object' && v.min === undefined && v.max === undefined) continue;
      specs[k] = v;
    }
    out.specs = Object.keys(specs).length ? specs : undefined;
  }
  for (const k of Object.keys(out) as Array<keyof ProductListParams>)
    if (out[k] === undefined || out[k] === false) delete out[k];
  return out;
}

/** Number of user-set filters — excludes the fixed scope, sort and paging. */
export function countFilters(p: ProductListParams, fixed: ProductListParams): number {
  let n = 0;
  if (p.brand?.length && !fixed.brand) n += p.brand.length;
  if (p.category && !fixed.category) n += 1;
  if (p.minPrice !== undefined || p.maxPrice !== undefined) n += 1;
  if (p.rating) n += 1;
  if (p.inStock) n += 1;
  if (p.discounted && !fixed.discounted) n += 1;
  if (p.featured && !fixed.featured) n += 1;
  if (p.isNew && !fixed.isNew) n += 1;
  if (p.bestseller && !fixed.bestseller) n += 1;
  if (p.specs) n += Object.keys(p.specs).length;
  return n;
}

export interface FilterChip {
  key: string;
  label: string;
  /** params without this filter */
  remove: (p: ProductListParams) => ProductListParams;
}

const fmtNum = (n: number) => formatNumber(n, Number.isInteger(n) ? 0 : 1);

/** Human readable chips for the active filters (labels from the facets when available). */
export function activeChips(
  p: ProductListParams,
  fixed: ProductListParams,
  facets: ProductFacets | undefined,
  t: TFunction,
  price: (n: number) => string,
): FilterChip[] {
  const chips: FilterChip[] = [];
  if (p.category && !fixed.category) {
    const label = facets?.categories.find((c) => c.value === p.category)?.label ?? p.category;
    chips.push({ key: 'category', label, remove: (x) => ({ ...x, category: undefined }) });
  }
  if (p.minPrice !== undefined || p.maxPrice !== undefined) {
    const label =
      p.minPrice !== undefined && p.maxPrice !== undefined
        ? `${price(p.minPrice)} – ${price(p.maxPrice)}`
        : p.minPrice !== undefined
          ? `${t('common:labels.from')} ${price(p.minPrice)}`
          : `${t('common:labels.to')} ${price(p.maxPrice!)}`;
    chips.push({ key: 'price', label, remove: (x) => ({ ...x, minPrice: undefined, maxPrice: undefined }) });
  }
  if (!fixed.brand) {
    for (const b of p.brand ?? []) {
      const label = facets?.brands.find((o) => o.value === b)?.label ?? b;
      chips.push({
        key: `brand:${b}`,
        label,
        remove: (x) => ({ ...x, brand: (x.brand ?? []).filter((v) => v !== b) }),
      });
    }
  }
  if (p.rating)
    chips.push({
      key: 'rating',
      label: t('shop:catalog.ratingAtLeast', { value: p.rating }),
      remove: (x) => ({ ...x, rating: undefined }),
    });
  if (p.inStock)
    chips.push({
      key: 'inStock',
      label: t('shop:catalog.onlyInStock'),
      remove: (x) => ({ ...x, inStock: undefined }),
    });
  if (p.discounted && !fixed.discounted)
    chips.push({
      key: 'discounted',
      label: t('shop:catalog.onlyDiscounted'),
      remove: (x) => ({ ...x, discounted: undefined }),
    });
  if (p.isNew && !fixed.isNew)
    chips.push({ key: 'isNew', label: t('common:product.new'), remove: (x) => ({ ...x, isNew: undefined }) });
  if (p.bestseller && !fixed.bestseller)
    chips.push({
      key: 'bestseller',
      label: t('common:product.bestseller'),
      remove: (x) => ({ ...x, bestseller: undefined }),
    });
  if (p.featured && !fixed.featured)
    chips.push({
      key: 'featured',
      label: t('common:product.featured'),
      remove: (x) => ({ ...x, featured: undefined }),
    });
  for (const [key, value] of Object.entries(p.specs ?? {})) {
    const facet = facets?.specs.find((s) => s.key === key);
    const name = facet?.label ?? key;
    const unit = facet && 'unit' in facet && facet.unit ? ` ${facet.unit}` : '';
    const drop = (x: ProductListParams) => {
      const specs = { ...(x.specs ?? {}) };
      delete specs[key];
      return { ...x, specs };
    };
    if (value === true) chips.push({ key: `spec:${key}`, label: name, remove: drop });
    else if (Array.isArray(value)) {
      for (const v of value) {
        const label = facet?.type === 'options' ? (facet.options.find((o) => o.value === v)?.label ?? v) : v;
        chips.push({
          key: `spec:${key}:${v}`,
          label: `${name}: ${label}`,
          remove: (x) => {
            const current = x.specs?.[key];
            const next = Array.isArray(current) ? current.filter((c) => c !== v) : [];
            return { ...x, specs: { ...(x.specs ?? {}), [key]: next } };
          },
        });
      }
    } else if (value && typeof value === 'object') {
      const { min, max } = value;
      const range =
        min !== undefined && max !== undefined
          ? `${fmtNum(min)}–${fmtNum(max)}`
          : min !== undefined
            ? `≥ ${fmtNum(min)}`
            : `≤ ${fmtNum(max!)}`;
      chips.push({ key: `spec:${key}`, label: `${name}: ${range}${unit}`, remove: drop });
    }
  }
  return chips;
}

/** Keeps the scope (fixed params), the search query and sort; drops every user filter. */
export function withoutFilters(p: ProductListParams, fixed: ProductListParams): ProductListParams {
  return cleanParams({ ...fixed, q: p.q ?? fixed.q, sort: p.sort });
}
