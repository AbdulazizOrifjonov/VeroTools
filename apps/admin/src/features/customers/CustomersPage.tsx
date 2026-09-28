import { useAdminList } from '@vero/api-client';
import type { AdminCustomer } from '@vero/types';
import { Button } from '@vero/ui';
import { UsersIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { StatusBadge } from '../../components/common/badges';
import { Page, PageHeader, usePageMeta } from '../../components/common/page';
import { PersonAvatar } from '../../components/common/PersonAvatar';
import { DataTable, type DataColumn } from '../../components/data-table/DataTable';
import { FilterSelect, SearchInput } from '../../components/data-table/toolbar';
import { imageRefThumb } from '../../lib/images';
import { useFormat } from '../../lib/format';
import { useListState } from '../../lib/url-state';

const FILTERS = ['status', 'hasOrders'] as const;

export default function CustomersPage() {
  const { t } = useTranslation();
  const f = useFormat();
  usePageMeta(t('customers.title'));
  const list = useListState({ filters: FILTERS, defaultSort: '-createdAt' });
  const query = useAdminList('customers', (api, p) => api.admin.customers.list(p), list.params);

  const columns = useMemo<DataColumn<AdminCustomer>[]>(
    () => [
      {
        id: 'customer',
        header: t('customers.columns.customer'),
        meta: { alwaysVisible: true, sortKey: 'firstName' },
        cell: ({ row }) => {
          const c = row.original;
          const name = `${c.firstName} ${c.lastName}`.trim();
          return (
            <div className="flex min-w-52 items-center gap-3">
              <PersonAvatar name={name} src={imageRefThumb(c.avatar)} />
              <div className="flex min-w-0 flex-col">
                <Link to={`/customers/${c.id}`} className="truncate font-semibold text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                  {name || f.phone(c.phone)}
                </Link>
                <span className="truncate text-xs text-muted-foreground">{c.email ?? t('customers.noEmail')}</span>
              </div>
            </div>
          );
        },
      },
      { id: 'phone', header: t('customers.columns.phone'), cell: ({ row }) => <span className="tabular">{f.phone(row.original.phone)}</span> },
      { id: 'status', header: t('customers.columns.status'), cell: ({ row }) => <StatusBadge kind="user" value={row.original.status} size="sm" /> },
      { id: 'orders', header: t('customers.columns.orders'), meta: { align: 'end', sortKey: 'stats.ordersCount' }, cell: ({ row }) => f.number(row.original.ordersCount) },
      {
        id: 'spent',
        header: t('customers.columns.spent'),
        meta: { align: 'end', sortKey: 'stats.totalSpent' },
        cell: ({ row }) => <span className={row.original.totalSpent ? 'font-semibold' : 'text-muted-foreground'}>{f.money(row.original.totalSpent)}</span>,
      },
      {
        id: 'lastOrder',
        header: t('customers.columns.lastOrder'),
        cell: ({ row }) => (row.original.lastOrderAt ? <span className="tabular">{f.date(row.original.lastOrderAt)}</span> : <span className="text-muted-foreground">—</span>),
      },
      { id: 'createdAt', header: t('customers.columns.registered'), meta: { sortKey: 'createdAt' }, cell: ({ row }) => <span className="text-muted-foreground tabular">{f.date(row.original.createdAt)}</span> },
      {
        id: 'lastLogin',
        header: t('customers.columns.lastLogin'),
        meta: { sortKey: 'lastLoginAt', defaultHidden: true },
        cell: ({ row }) => (row.original.lastLoginAt ? <span className="text-muted-foreground tabular">{f.relative(row.original.lastLoginAt)}</span> : <span className="text-muted-foreground">{t('customers.never')}</span>),
      },
      { id: 'language', header: t('customers.columns.language'), meta: { defaultHidden: true }, cell: ({ row }) => t(`common.languageNames.${row.original.language}`) },
      {
        id: 'open',
        header: () => <span className="sr-only">{t('table.actions')}</span>,
        meta: { align: 'end', alwaysVisible: true },
        cell: ({ row }) => (
          <Button variant="ghost" size="xs" asChild>
            <Link to={`/customers/${row.original.id}`}>{t('common.open')}</Link>
          </Button>
        ),
      },
    ],
    [t, f],
  );

  const filtered = list.activeFilterCount > 0 || !!list.q;

  return (
    <Page>
      <PageHeader title={t('customers.title')} description={t('customers.description')} />
      <DataTable
        id="customers"
        label={t('customers.title')}
        columns={columns}
        data={query.data?.items}
        getRowId={(c) => c.id}
        rowHref={(c) => `/customers/${c.id}`}
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
        rowClassName={(c) => (c.status === 'blocked' ? 'opacity-70' : undefined)}
        empty={{ title: t('customers.empty'), description: t('customers.emptyHint'), icon: <UsersIcon /> }}
        toolbar={
          <>
            <SearchInput value={list.q} onChange={list.setQ} placeholder={t('customers.searchPlaceholder')} className="sm:w-80" />
            <FilterSelect label={t('customers.filters.status')} value={list.filters.status} onChange={(v) => list.setFilter('status', v)} options={(['active', 'blocked'] as const).map((s) => ({ value: s, label: t(`status.user.${s}`) }))} />
            <FilterSelect
              label={t('customers.filters.hasOrders')}
              value={list.filters.hasOrders}
              onChange={(v) => list.setFilter('hasOrders', v)}
              options={[
                { value: '1', label: t('customers.filters.withOrders') },
                { value: '0', label: t('customers.filters.withoutOrders') },
              ]}
            />
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
