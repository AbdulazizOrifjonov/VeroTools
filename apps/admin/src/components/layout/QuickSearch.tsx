import { useQuery } from '@tanstack/react-query';
import { useApi, useSession } from '@vero/api-client';
import { cn, Dialog, DialogContent, DialogDescription, DialogTitle, Spinner, useDebouncedValue } from '@vero/ui';
import { CornerDownLeftIcon, PackageIcon, SearchIcon, ShoppingCartIcon, UserRoundIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useFormat } from '../../lib/format';
import { StatusBadge } from '../common/badges';
import { Kbd } from '../common/Kbd';
import { Thumb } from '../common/Thumb';

interface Hit {
  key: string;
  group: 'orders' | 'products' | 'customers';
  href: string;
  title: ReactNode;
  subtitle?: ReactNode;
  aside?: ReactNode;
  icon: ReactNode;
}

/** Opens with ⌘K / Ctrl+K or "/" — searches orders (number / phone / name), products (name / SKU) and customers. */
export function QuickSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const f = useFormat();
  const api = useApi();
  const navigate = useNavigate();
  const { can } = useSession();
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const term = useDebouncedValue(q.trim(), 250);
  const active = open && term.length >= 2;

  useEffect(() => {
    if (!open) {
      setQ('');
      setCursor(0);
    }
  }, [open]);

  const orders = useQuery({
    queryKey: ['admin', 'orders', 'quick', term],
    queryFn: () => api.admin.orders.list({ q: term, limit: 5 }),
    enabled: active && can('orders.read'),
    staleTime: 10_000,
  });
  const products = useQuery({
    queryKey: ['admin', 'products', 'quick', term],
    queryFn: () => api.admin.products.list({ q: term, limit: 5 }),
    enabled: active && can('products.read'),
    staleTime: 10_000,
  });
  const customers = useQuery({
    queryKey: ['admin', 'customers', 'quick', term],
    queryFn: () => api.admin.customers.list({ q: term, limit: 5 }),
    enabled: active && can('customers.read'),
    staleTime: 10_000,
  });

  const hits = useMemo<Hit[]>(() => {
    if (!active) return [];
    const out: Hit[] = [];
    for (const o of orders.data?.items ?? []) {
      out.push({
        key: `o${o.id}`,
        group: 'orders',
        href: `/orders/${o.id}`,
        title: <span className="tabular">№ {o.number}</span>,
        subtitle: `${o.customer.name} · ${f.phone(o.customer.phone)}`,
        aside: (
          <span className="flex items-center gap-2">
            <span className="text-xs font-semibold tabular">{f.money(o.total)}</span>
            <StatusBadge kind="order" value={o.status} size="sm" />
          </span>
        ),
        icon: <ShoppingCartIcon className="size-4" />,
      });
    }
    for (const p of products.data?.items ?? []) {
      out.push({
        key: `p${p.id}`,
        group: 'products',
        href: `/products/${p.id}`,
        title: f.loc(p.name),
        subtitle: [p.sku, p.brand].filter(Boolean).join(' · '),
        aside: <span className="text-xs font-semibold tabular">{f.money(p.price)}</span>,
        icon: <Thumb src={p.image?.thumb ?? p.image?.url} size="xs" />,
      });
    }
    for (const c of customers.data?.items ?? []) {
      out.push({
        key: `c${c.id}`,
        group: 'customers',
        href: `/customers/${c.id}`,
        title: `${c.firstName} ${c.lastName}`.trim(),
        subtitle: [f.phone(c.phone), c.email].filter(Boolean).join(' · '),
        aside: <span className="text-xs text-muted-foreground tabular">{t('common.items', { count: c.ordersCount })}</span>,
        icon: <UserRoundIcon className="size-4" />,
      });
    }
    return out;
  }, [active, orders.data, products.data, customers.data, f, t]);

  const loading = active && (orders.isFetching || products.isFetching || customers.isFetching);
  const go = (hit: Hit | undefined) => {
    if (!hit) return;
    onOpenChange(false);
    void navigate(hit.href);
  };

  useEffect(() => setCursor(0), [term]);

  const groups: Array<{ key: Hit['group']; label: string; all: string }> = [
    { key: 'orders', label: t('quickSearch.orders'), all: `/orders?q=${encodeURIComponent(term)}` },
    { key: 'products', label: t('quickSearch.products'), all: `/products?q=${encodeURIComponent(term)}` },
    { key: 'customers', label: t('quickSearch.customers'), all: `/customers?q=${encodeURIComponent(term)}` },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="top-[12vh] max-w-[calc(100%-1.5rem)] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl sm:p-0">
        <DialogTitle className="sr-only">{t('quickSearch.title')}</DialogTitle>
        <DialogDescription className="sr-only">{t('quickSearch.hint')}</DialogDescription>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const next = Math.max(0, Math.min(hits.length - 1, cursor + (e.key === 'ArrowDown' ? 1 : -1)));
                setCursor(next);
                listRef.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: 'nearest' });
              } else if (e.key === 'Enter') {
                e.preventDefault();
                go(hits[cursor]);
              }
            }}
            placeholder={t('quickSearch.placeholder')}
            className="h-14 w-full min-w-0 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/75"
            role="combobox"
            aria-expanded={hits.length > 0}
            aria-controls="quick-search-results"
            aria-activedescendant={hits[cursor] ? `qs-${hits[cursor]!.key}` : undefined}
            aria-label={t('quickSearch.title')}
          />
          {loading ? <Spinner size="sm" className="text-muted-foreground" label={t('quickSearch.searching')} /> : null}
        </div>
        <div className="max-h-[min(60vh,28rem)] overflow-y-auto">
          {!active ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">{q.trim().length ? t('quickSearch.typeMore') : t('shell.searchHint')}</p>
          ) : hits.length === 0 && !loading ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t('quickSearch.nothing', { q: term })}</p>
          ) : (
            <ul ref={listRef} id="quick-search-results" role="listbox" className="p-2">
              {groups.map((g) => {
                const items = hits.filter((h) => h.group === g.key);
                if (!items.length) return null;
                return (
                  <li key={g.key} role="presentation" className="mb-1">
                    <div className="flex items-center justify-between px-2 pt-2 pb-1">
                      <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{g.label}</span>
                      <button
                        type="button"
                        onClick={() => {
                          onOpenChange(false);
                          void navigate(g.all);
                        }}
                        className="text-[11px] font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {t('quickSearch.showAll')}
                      </button>
                    </div>
                    <ul role="group" aria-label={g.label}>
                      {items.map((hit) => {
                        const index = hits.indexOf(hit);
                        return (
                          <li
                            key={hit.key}
                            id={`qs-${hit.key}`}
                            data-index={index}
                            role="option"
                            aria-selected={index === cursor}
                            onMouseMove={() => setCursor(index)}
                            onClick={() => go(hit)}
                            className={cn('flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2', index === cursor && 'bg-accent')}
                          >
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground" aria-hidden="true">
                              {hit.icon}
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate text-sm font-semibold text-foreground">{hit.title}</span>
                              {hit.subtitle ? <span className="truncate text-xs text-muted-foreground">{hit.subtitle}</span> : null}
                            </span>
                            {hit.aside}
                            {index === cursor ? <CornerDownLeftIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="flex items-center gap-2 border-t border-border bg-surface px-4 py-2 text-[11px] text-muted-foreground">
          <PackageIcon className="size-3.5" aria-hidden="true" />
          {t('quickSearch.hint')}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Search button in the top bar (shows the shortcut on desktop). */
export function QuickSearchTrigger({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation();
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-8 w-full max-w-72 min-w-0 items-center gap-2 rounded-md border border-input bg-surface-elevated px-2.5 text-[13px] text-muted-foreground shadow-xs transition-colors hover:border-[color-mix(in_oklab,var(--input),var(--foreground)_14%)] focus-visible:outline-2 focus-visible:outline-ring"
      aria-label={t('quickSearch.title')}
      aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}
    >
      <SearchIcon className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-start">{t('shell.search')}</span>
      <Kbd className="hidden md:inline-flex">{isMac ? '⌘K' : 'Ctrl K'}</Kbd>
    </button>
  );
}
