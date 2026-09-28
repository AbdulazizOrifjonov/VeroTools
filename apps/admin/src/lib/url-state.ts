import type { AdminListParams } from '@vero/types';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

/**
 * List-view state (page, page size, sort, search and filters) lives in the URL search params, so a view
 * can be shared, bookmarked and survives a reload. Empty values are removed from the URL.
 */
export interface ListState<F extends string> {
  page: number;
  limit: number;
  sort: string;
  q: string;
  filters: Record<F, string>;
  /** params for the API call (empty values stripped) */
  params: AdminListParams;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSort: (sort: string) => void;
  setQ: (q: string) => void;
  setFilter: (key: F, value: string | null | undefined) => void;
  setFilters: (values: Partial<Record<F | 'q', string | null | undefined>>) => void;
  /** clears the search and every filter */
  reset: () => void;
  /** clears the search and the given filters, keeping the rest (e.g. a status tab) */
  resetOnly: (keys: readonly F[]) => void;
  activeFilterCount: number;
}

export const PAGE_SIZES = [10, 20, 50, 100] as const;

export function useListState<F extends string = never>(options: {
  filters?: readonly F[];
  defaultLimit?: number;
  defaultSort?: string;
  /** filter values that apply when the URL has none (e.g. a default tab) */
  defaults?: Partial<Record<F, string>>;
}): ListState<F> {
  const [search, setSearch] = useSearchParams();
  const keys = options.filters ?? ([] as readonly F[]);
  const defaultLimit = options.defaultLimit ?? 20;
  const defaultSort = options.defaultSort ?? '';
  const defaults = options.defaults;

  const state = useMemo(() => {
    const pageRaw = Number(search.get('page'));
    const limitRaw = Number(search.get('limit'));
    const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const limit = (PAGE_SIZES as readonly number[]).includes(limitRaw) ? limitRaw : defaultLimit;
    const sort = search.get('sort') ?? defaultSort;
    const q = search.get('q') ?? '';
    const filters = Object.fromEntries(keys.map((k) => [k, search.get(k) ?? defaults?.[k] ?? ''])) as Record<F, string>;
    const params: AdminListParams = { page, limit };
    if (sort) params.sort = sort;
    if (q.trim()) params.q = q.trim();
    for (const k of keys) if (filters[k]) params[k] = filters[k];
    const activeFilterCount = keys.filter((k) => !!search.get(k)).length;
    return { page, limit, sort, q, filters, params, activeFilterCount };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, defaultLimit, defaultSort, keys.join(','), JSON.stringify(defaults ?? {})]);

  const update = useCallback(
    (mutate: (sp: URLSearchParams) => void, resetPage = true) => {
      setSearch(
        (prev) => {
          const next = new URLSearchParams(prev);
          mutate(next);
          if (resetPage) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSearch],
  );

  const setOrDelete = (sp: URLSearchParams, key: string, value: string | null | undefined) => {
    if (value === null || value === undefined || value === '') sp.delete(key);
    else sp.set(key, value);
  };

  return {
    ...state,
    setPage: (page) => update((sp) => setOrDelete(sp, 'page', page > 1 ? String(page) : null), false),
    setLimit: (limit) => update((sp) => setOrDelete(sp, 'limit', limit === defaultLimit ? null : String(limit))),
    setSort: (sort) => update((sp) => setOrDelete(sp, 'sort', sort === defaultSort ? null : sort)),
    setQ: (q) => update((sp) => setOrDelete(sp, 'q', q.trim() ? q : null)),
    setFilter: (key, value) => update((sp) => setOrDelete(sp, key, value)),
    setFilters: (values) =>
      update((sp) => {
        for (const [k, v] of Object.entries(values)) setOrDelete(sp, k, v as string | null | undefined);
      }),
    reset: () =>
      update((sp) => {
        for (const k of keys) sp.delete(k);
        sp.delete('q');
      }),
    resetOnly: (only) =>
      update((sp) => {
        for (const k of only) sp.delete(k);
        sp.delete('q');
      }),
  };
}

/** A single URL search param with a fallback (tabs, presets…). */
export function useSearchParamState(key: string, fallback = ''): [string, (value: string | null) => void] {
  const [search, setSearch] = useSearchParams();
  const value = search.get(key) ?? fallback;
  const set = useCallback(
    (next: string | null) =>
      setSearch(
        (prev) => {
          const sp = new URLSearchParams(prev);
          if (next === null || next === '' || next === fallback) sp.delete(key);
          else sp.set(key, next);
          return sp;
        },
        { replace: true },
      ),
    [key, fallback, setSearch],
  );
  return [value, set];
}
