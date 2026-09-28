import { useAdminList } from '@vero/api-client';
import { DELIVERY_METHODS, ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, type AdminOrderSummary } from '@vero/types';
import { Button } from '@vero/ui';
import { ShoppingCartIcon, StoreIcon, TruckIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { StatusBadge } from '../../components/common/badges';
import { Page, PageHeader, usePageMeta } from '../../components/common/page';
import { StatusTabs, useFilterCounts } from '../../components/common/StatusTabs';
import { DataTable, type DataColumn } from '../../components/data-table/DataTable';
import { DateRangeFilter, FilterSelect, SearchInput } from '../../components/data-table/toolbar';
import { dateInputToIso, endOfDayExclusiveIso } from '../../lib/dates';
import { useFormat } from '../../lib/format';
import { useListState } from '../../lib/url-state';

const FILTERS = ['status', 'paymentStatus', 'paymentMethod', 'deliveryMethod', 'from', 'to', 'customer'] as const;

export default function OrdersPage() {
  const { t } = useTranslation();
  const f = useFormat();
  usePageMeta(t('orders.title'));
  const list = useListState({ filters: FILTERS, defaultSort: '-createdAt' });

  // API expects ISO instants; the URL keeps calendar days (Tashkent)
  const apiParams = useMemo(() => {
    const p: Record<string, string | number> = { ...list.params } as Record<string, string | number>;
    delete p.from;
    delete p.to;
    if (list.filters.from) p.from = dateInputToIso(list.filters.from);
    if (list.filters.to) p.to = endOfDayExclusiveIso(list.filters.to);
    return p;
  }, [list.params, list.filters.from, list.filters.to]);

  const query = useAdminList('orders', (api, p) => api.admin.orders.list(p), apiParams);
  const counts = useFilterCounts('orders', (api, p) => api.admin.orders.list(p), apiParams, 'status', ORDER_STATUSES);

  const columns = useMemo<DataColumn<AdminOrderSummary>[]>(
    () => [
      {
        id: 'number',
        header: t('orders.columns.number'),
        meta: { sortKey: 'number', alwaysVisible: true },
        cell: ({ row }) => (
          <div className="flex flex-col">
            <Link to={`/orders/${row.original.id}`} className="font-semibold text-foreground tabular hover:underline focus-visible:outline-2 focus-visible:outline-ring">
              {row.original.number}
            </Link>
            <span className="text-xs text-muted-foreground">{t(`enums.source.${row.original.source}`)}</span>
          </div>
        ),
      },
      {
        id: 'createdAt',
        header: t('orders.columns.date'),
        meta: { sortKey: 'createdAt' },
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="tabular">{f.date(row.original.createdAt)}</span>
            <span className="text-xs text-muted-foreground tabular">{f.date(row.original.createdAt, 'time')}</span>
          </div>
        ),
      },
      {
        id: 'customer',
        header: t('orders.columns.customer'),
        cell: ({ row }) => (
          <div className="flex max-w-52 flex-col">
            <span className="truncate font-medium">{row.original.customer.name}</span>
            <span className="text-xs text-muted-foreground tabular">{f.phone(row.original.customer.phone)}</span>
          </div>
        ),
      },
      {
        id: 'items',
        header: t('orders.columns.items'),
        meta: { align: 'end' },
        cell: ({ row }) => f.number(row.original.itemsCount),
      },
      {
        id: 'total',
        header: t('orders.columns.total'),
        meta: { align: 'end', sortKey: 'total' },
        cell: ({ row }) => <span className="font-semibold">{f.money(row.original.total)}</span>,
      },
      {
        id: 'payment',
        header: t('orders.columns.payment'),
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-1">
            <span className="text-xs text-muted-foreground">{t(`common:paymentMethod.${row.original.paymentMethod}`)}</span>
            <StatusBadge kind="payment" value={row.original.paymentStatus} size="sm" />
          </div>
        ),
      },
      {
        id: 'delivery',
        header: t('orders.columns.delivery'),
        cell: ({ row }) => (
          <div className="flex max-w-44 items-center gap-1.5">
            {row.original.deliveryMethod === 'courier' ? <TruckIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /> : <StoreIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
            <span className="flex min-w-0 flex-col">
              <span className="truncate">{t(`common:deliveryMethod.${row.original.deliveryMethod}`)}</span>
              {row.original.region ? <span className="truncate text-xs text-muted-foreground">{row.original.region}</span> : null}
            </span>
          </div>
        ),
      },
      {
        id: 'status',
        header: t('orders.columns.status'),
        meta: { sortKey: 'status', alwaysVisible: true },
        cell: ({ row }) => <StatusBadge kind="order" value={row.original.status} />,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('table.actions')}</span>,
        meta: { align: 'end', alwaysVisible: true },
        cell: ({ row }) => (
          <Button variant="ghost" size="xs" asChild>
            <Link to={`/orders/${row.original.id}`} aria-label={`${t('orders.open')} ${row.original.number}`}>
              {t('common.open')}
            </Link>
          </Button>
        ),
      },
    ],
    [t, f],
  );

  const filtered = list.activeFilterCount > 0 || !!list.q;

  return (
    <Page>
      <PageHeader title={t('orders.title')} description={t('orders.description')} />

      <StatusTabs
        label={t('orders.statusTabs')}
        value={list.filters.status || ''}
        onChange={(key) => list.setFilter('status', key || null)}
        tabs={[{ key: '', label: t('orders.allStatuses') }, ...ORDER_STATUSES.map((s) => ({ key: s as string, label: t(`common:orderStatus.${s}`) }))].map((tab) => ({ ...tab, count: counts[tab.key] }))}
      />

      <DataTable
        id="orders"
        label={t('orders.title')}
        columns={columns}
        data={query.data?.items}
        getRowId={(o) => o.id}
        rowHref={(o) => `/orders/${o.id}`}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        page={list.page}
        limit={list.limit}
        total={query.data?.meta.total}
        pages={query.data?.meta.pages}
        onPageChange={list.setPage}
        onLimitChange={list.setLimit}
        sort={list.sort}
        onSortChange={list.setSort}
        filtered={filtered}
        onResetFilters={list.reset}
        empty={{ title: t('orders.empty'), description: t('orders.emptyHint'), icon: <ShoppingCartIcon /> }}
        toolbar={
          <>
            <SearchInput value={list.q} onChange={list.setQ} placeholder={t('orders.searchPlaceholder')} className="sm:w-72" />
            <FilterSelect label={t('orders.filters.paymentStatus')} value={list.filters.paymentStatus} onChange={(v) => list.setFilter('paymentStatus', v)} options={PAYMENT_STATUSES.map((s) => ({ value: s, label: t(`common:paymentStatus.${s}`) }))} />
            <FilterSelect label={t('orders.filters.paymentMethod')} value={list.filters.paymentMethod} onChange={(v) => list.setFilter('paymentMethod', v)} options={PAYMENT_METHODS.map((m) => ({ value: m, label: t(`common:paymentMethod.${m}`) }))} />
            <FilterSelect label={t('orders.filters.deliveryMethod')} value={list.filters.deliveryMethod} onChange={(v) => list.setFilter('deliveryMethod', v)} options={DELIVERY_METHODS.map((m) => ({ value: m, label: t(`common:deliveryMethod.${m}`) }))} />
            <DateRangeFilter from={list.filters.from} to={list.filters.to} onChange={(r) => list.setFilters({ from: r.from, to: r.to })} placeholder={t('orders.filters.period')} />
            {list.filters.customer ? (
              <Button variant="secondary" size="sm" onClick={() => list.setFilter('customer', null)} aria-label={t('orders.filters.customerClear')}>
                {t('orders.filters.customerOn')} ×
              </Button>
            ) : null}
            {filtered ? (
              <Button variant="ghost" size="sm" onClick={list.reset}>
                {t('table.resetFilters')}
              </Button>
            ) : null}
          </>
        }
      />
    </Page>
  );
}
