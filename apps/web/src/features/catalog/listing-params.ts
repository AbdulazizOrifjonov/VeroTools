import { LIMITS } from '@vero/config';
import type { ProductListParams, SpecFilterValue } from '@vero/types';
import { parseProductListParams, productListParamsToSearch } from '@vero/utils';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

/** Keys that describe the result set (everything except paging / sort). */
export type FilterParams = Omit<ProductListParams, 'page' | 'limit' | 'sort'>;

const FIXED_KEYS = ['q', 'category', 'brand', 'promotion'] as const;

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
  for (const k of Object.keys(out) as Array<keyof ProductListParams>) if (out[k] === undefined || out[k] === false) delete out[k];
  return out;
}

/**
 * Product-list state that lives entirely in the URL (shareable, back/forward friendly).
 * `fixed` params come from the route (category slug, brand, promotion) and are never written to the query.
 */
export function useListingParams(fixed: ProductListParams = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const fixedKey = JSON.stringify(fixed);

  const urlParams = useMemo(() => {
    const parsed = parseProductListParams(searchParams);
    const f = JSON.parse(fixedKey) as ProductListParams;
    for (const k of FIXED_KEYS) if (f[k] !== undefined) delete parsed[k];
    delete parsed.limit;
    return parsed;
  }, [searchParams, fixedKey]);

  const params = useMemo<ProductListParams>(
    () => cleanParams({ ...urlParams, ...(JSON.parse(fixedKey) as ProductListParams), limit: LIMITS.pageSizeDefault }),
    [urlParams, fixedKey],
  );

  /** Writes new filters to the URL; any change other than `page` goes back to page 1. */
  const setParams = useCallback(
    (next: ProductListParams, options: { keepPage?: boolean; replace?: boolean } = {}) => {
      const f = JSON.parse(fixedKey) as ProductListParams;
      const toWrite: ProductListParams = cleanParams({ ...next });
      for (const k of FIXED_KEYS) if (f[k] !== undefined) delete toWrite[k];
      delete toWrite.limit;
      if (!options.keepPage) delete toWrite.page;
      const sp = productListParamsToSearch(toWrite, { omitPage1: true });
      // non-filter UI state kept in the URL (grid / list)
      const view = new URLSearchParams(window.location.search).get('view');
      if (view) sp.set('view', view);
      // flushSync: the next control change must already see these params (router updates are transitions,
      // so a quick second click could otherwise start from the previous URL state)
      setSearchParams(sp, { preventScrollReset: true, replace: options.replace, flushSync: true });
    },
    [fixedKey, setSearchParams],
  );

  return { params, urlParams, fixed, setParams };
}

/** Number of user-set filters (chips) — excludes fixed params, sort and paging. */
export function countFilters(p: ProductListParams, fixed: ProductListParams): number {
  let n = 0;
  if (p.brand?.length && !fixed.brand) n += p.brand.length;
  if (p.category && !fixed.category) n += 1;
  if (p.minPrice !== undefined || p.maxPrice !== undefined) n += 1;
  if (p.rating) n += 1;
  if (p.inStock) n += 1;
  if (p.discounted) n += 1;
  if (p.featured) n += 1;
  if (p.isNew) n += 1;
  if (p.bestseller) n += 1;
  if (p.specs) n += Object.keys(p.specs).length;
  return n;
}

/** Removes every user filter but keeps the fixed params, sort and search query. */
export function withoutFilters(p: ProductListParams, fixed: ProductListParams): ProductListParams {
  return cleanParams({ ...fixed, q: p.q, sort: p.sort, category: fixed.category ?? undefined });
}
