import { SORT_OPTIONS, type ProductListParams, type SortOption, type SpecFilterValue } from '@vero/types';

/**
 * Product-list URL/query format shared by the API, the web storefront (URL state) and mobile:
 *   q, category, brand=a,b, minPrice, maxPrice, rating, inStock=1, discounted=1, featured=1, isNew=1,
 *   bestseller=1, promotion, ids=a,b, sort, page, limit,
 *   spec.<key>=v1,v2 (options) | spec.<key>=min..max (range) | spec.<key>=1 (boolean)
 */
export const SPEC_PARAM_PREFIX = 'spec.';

type Source = URLSearchParams | string | Record<string, string | string[] | undefined>;

function toSearchParams(src: Source): URLSearchParams {
  if (src instanceof URLSearchParams) return src;
  if (typeof src === 'string') return new URLSearchParams(src.startsWith('?') ? src.slice(1) : src);
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(src)) {
    if (v == null) continue;
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, x));
    else sp.set(k, v);
  }
  return sp;
}

const num = (v: string | null): number | undefined => {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
const bool = (v: string | null): boolean | undefined => (v === '1' || v === 'true' ? true : undefined);
const list = (v: string | null): string[] | undefined => {
  if (!v) return undefined;
  const items = v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length ? Array.from(new Set(items)) : undefined;
};

export function parseSpecValue(raw: string): SpecFilterValue | undefined {
  if (raw === '1' || raw === 'true') return true;
  if (raw.includes('..')) {
    const [a, b] = raw.split('..');
    const min = num(a ?? null);
    const max = num(b ?? null);
    if (min === undefined && max === undefined) return undefined;
    return { ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) };
  }
  return list(raw);
}

export function serializeSpecValue(value: SpecFilterValue): string | undefined {
  if (value === true) return '1';
  if (value === false) return undefined;
  if (Array.isArray(value)) return value.length ? value.join(',') : undefined;
  const { min, max } = value;
  if (min === undefined && max === undefined) return undefined;
  return `${min ?? ''}..${max ?? ''}`;
}

export function parseProductListParams(src: Source): ProductListParams {
  const sp = toSearchParams(src);
  const sortRaw = sp.get('sort');
  const sort = (SORT_OPTIONS as readonly string[]).includes(sortRaw ?? '') ? (sortRaw as SortOption) : undefined;
  const specs: Record<string, SpecFilterValue> = {};
  sp.forEach((value, key) => {
    if (!key.startsWith(SPEC_PARAM_PREFIX)) return;
    const specKey = key.slice(SPEC_PARAM_PREFIX.length).replace(/[^a-z0-9_]/gi, '');
    if (!specKey) return;
    const parsed = parseSpecValue(value);
    if (parsed !== undefined) specs[specKey] = parsed;
  });
  const params: ProductListParams = {
    q: sp.get('q')?.trim() || undefined,
    category: sp.get('category') || undefined,
    brand: list(sp.get('brand')),
    minPrice: num(sp.get('minPrice')),
    maxPrice: num(sp.get('maxPrice')),
    rating: num(sp.get('rating')),
    inStock: bool(sp.get('inStock')),
    discounted: bool(sp.get('discounted')),
    featured: bool(sp.get('featured')),
    isNew: bool(sp.get('isNew')),
    bestseller: bool(sp.get('bestseller')),
    promotion: sp.get('promotion') || undefined,
    ids: list(sp.get('ids')),
    specs: Object.keys(specs).length ? specs : undefined,
    sort,
    page: num(sp.get('page')),
    limit: num(sp.get('limit')),
  };
  return stripUndefined(params);
}

export function productListParamsToSearch(
  params: ProductListParams,
  opts: { omitCategory?: boolean; omitPage1?: boolean } = { omitPage1: true },
): URLSearchParams {
  const sp = new URLSearchParams();
  const set = (k: string, v: string | number | undefined | null) => {
    if (v === undefined || v === null || v === '') return;
    sp.set(k, String(v));
  };
  set('q', params.q);
  if (!opts.omitCategory) set('category', params.category);
  if (params.brand?.length) set('brand', params.brand.join(','));
  set('minPrice', params.minPrice);
  set('maxPrice', params.maxPrice);
  set('rating', params.rating);
  if (params.inStock) set('inStock', '1');
  if (params.discounted) set('discounted', '1');
  if (params.featured) set('featured', '1');
  if (params.isNew) set('isNew', '1');
  if (params.bestseller) set('bestseller', '1');
  set('promotion', params.promotion);
  if (params.ids?.length) set('ids', params.ids.join(','));
  if (params.specs) {
    for (const key of Object.keys(params.specs).sort()) {
      const v = params.specs[key];
      if (v === undefined) continue;
      const s = serializeSpecValue(v);
      if (s !== undefined) sp.set(`${SPEC_PARAM_PREFIX}${key}`, s);
    }
  }
  if (params.sort && params.sort !== 'recommended') set('sort', params.sort);
  if (params.page && !(opts.omitPage1 && params.page === 1)) set('page', params.page);
  set('limit', params.limit);
  return sp;
}

/** Number of active filters (for "Filters (3)" badges). Excludes q, category, sort and paging. */
export function countActiveFilters(params: ProductListParams): number {
  let n = 0;
  if (params.brand?.length) n += params.brand.length;
  if (params.minPrice !== undefined || params.maxPrice !== undefined) n += 1;
  if (params.rating) n += 1;
  if (params.inStock) n += 1;
  if (params.discounted) n += 1;
  if (params.featured) n += 1;
  if (params.isNew) n += 1;
  if (params.bestseller) n += 1;
  if (params.specs) n += Object.keys(params.specs).length;
  return n;
}

/** Generic query-string builder for API calls (arrays → comma lists, booleans → 1). */
export function toQueryString(params: Record<string, unknown> | undefined | null): string {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '' || v === false) continue;
    if (Array.isArray(v)) {
      if (v.length) sp.set(k, v.join(','));
    } else if (v === true) sp.set(k, '1');
    else if (v instanceof Date) sp.set(k, v.toISOString());
    else if (typeof v === 'object') continue;
    else sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function stripUndefined<T extends object>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out as T;
}
