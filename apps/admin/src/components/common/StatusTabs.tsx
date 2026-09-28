import { useQueries } from '@tanstack/react-query';
import { useApi, type AdminResource, type VeroApi } from '@vero/api-client';
import type { AdminListParams, Paginated } from '@vero/types';
import { Badge, cn } from '@vero/ui';
import { useFormat } from '../../lib/format';

export interface StatusTab {
  /** '' = all */
  key: string;
  label: string;
  count?: number;
}

/** Underlined tab bar with live counters (status filters of list pages). Keeps the choice in the URL via the caller. */
export function StatusTabs({ label, tabs, value, onChange, className }: { label: string; tabs: StatusTab[]; value: string; onChange: (key: string) => void; className?: string }) {
  const f = useFormat();
  return (
    <nav aria-label={label} className={cn('-mb-1 overflow-x-auto no-scrollbar', className)}>
      <ul className="flex min-w-max items-center gap-1 border-b border-border">
        {tabs.map((tab) => {
          const active = value === tab.key;
          return (
            <li key={tab.key || 'all'}>
              <button
                type="button"
                onClick={() => onChange(tab.key)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-10 items-center gap-2 px-3 text-[13px] font-semibold whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                  active && 'text-foreground after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-brand',
                )}
              >
                {tab.label}
                <Badge variant={active ? 'brand' : 'muted'} size="sm" className="tabular">
                  {tab.count === undefined ? '·' : f.number(tab.count)}
                </Badge>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Totals per filter value (one `limit=1` request each, reading `meta.total`), respecting the other active
 * filters. Keys live under ['admin', resource] so mutations of the resource refresh them too.
 */
export function useFilterCounts<T>(
  resource: AdminResource,
  fetcher: (api: VeroApi, params: AdminListParams) => Promise<Paginated<T>>,
  base: AdminListParams,
  field: string,
  values: readonly string[],
): Record<string, number | undefined> {
  const api = useApi();
  const { page: _p, limit: _l, sort: _s, [field]: _f, ...rest } = base;
  void _p;
  void _l;
  void _s;
  void _f;
  const keys = ['', ...values];
  const results = useQueries({
    queries: keys.map((value) => {
      const params: AdminListParams = { ...rest, ...(value ? { [field]: value } : {}), page: 1, limit: 1 };
      return { queryKey: ['admin', resource, 'count', params], queryFn: () => fetcher(api, params), staleTime: 15_000 };
    }),
  });
  return Object.fromEntries(keys.map((k, i) => [k, results[i]?.data?.meta.total]));
}
