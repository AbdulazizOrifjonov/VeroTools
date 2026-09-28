import { useAdminList, useSession } from '@vero/api-client';
import type { AdminInventoryItem } from '@vero/types';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@vero/ui';
import { BellRingIcon, BoxesIcon, EllipsisIcon, ExternalLinkIcon, HistoryIcon, SlidersVerticalIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { StatusBadge } from '../../components/common/badges';
import { useDialogTarget } from '../../components/common/ConfirmDialog';
import { Page, PageHeader, usePageMeta } from '../../components/common/page';
import { StatusTabs, useFilterCounts } from '../../components/common/StatusTabs';
import { Thumb } from '../../components/common/Thumb';
import { DataTable, type DataColumn } from '../../components/data-table/DataTable';
import { SearchInput } from '../../components/data-table/toolbar';
import { useFormat } from '../../lib/format';
import { useListState } from '../../lib/url-state';
import { AdjustStockDialog, toAdjustTarget } from './AdjustStockDialog';
import { MinStockDialog, MovementsSheet } from './inventory-dialogs';

const FILTERS = ['stock', 'product'] as const;
const STOCK_FILTERS = ['in', 'low', 'out', 'reserved'] as const;

export default function InventoryPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const navigate = useNavigate();
  const { can } = useSession();
  usePageMeta(t('inventory.title'));
  const finance = can(['analytics.read', 'expenses.read'], 'any');
  const canUpdate = can('inventory.update');
  const list = useListState({ filters: FILTERS, defaultSort: '-updatedAt' });
  const query = useAdminList('inventory', (api, p) => api.admin.inventory.list(p), list.params);
  const counts = useFilterCounts('inventory', (api, p) => api.admin.inventory.list(p), list.params, 'stock', STOCK_FILTERS);

  const adjusting = useDialogTarget<AdminInventoryItem>();
  const minStock = useDialogTarget<AdminInventoryItem>();
  const history = useDialogTarget<AdminInventoryItem>();

  const columns = useMemo<DataColumn<AdminInventoryItem>[]>(() => {
    const cols: DataColumn<AdminInventoryItem>[] = [
      {
        id: 'product',
        header: t('inventory.product'),
        meta: { alwaysVisible: true, cellClassName: 'whitespace-normal' },
        cell: ({ row }) => {
          const i = row.original;
          return (
            <div className="flex min-w-60 items-center gap-3">
              <Thumb src={i.product.image?.thumb ?? i.product.image?.url} size="md" alt="" />
              <div className="flex min-w-0 flex-col gap-0.5">
                {can('products.read') ? (
                  <Link to={`/products/${i.product.id}`} className="line-clamp-2 font-medium text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                    {f.loc(i.product.name)}
                  </Link>
                ) : (
                  <span className="line-clamp-2 font-medium">{f.loc(i.product.name)}</span>
                )}
                <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                  <span className="font-mono">{i.sku}</span>
                  {i.variant ? <span>· {f.loc(i.variant.name)}</span> : null}
                  {i.product.status !== 'published' ? <span>· {t(`status.product.${i.product.status}`)}</span> : null}
                </span>
              </div>
            </div>
          );
        },
      },
      { id: 'onHand', header: t('inventory.onHand'), meta: { align: 'end', sortKey: 'onHand' }, cell: ({ row }) => <span className="font-semibold">{f.number(row.original.stock)}</span> },
      {
        id: 'reserved',
        header: t('inventory.reserved'),
        meta: { align: 'end', sortKey: 'reserved' },
        cell: ({ row }) => <span className={row.original.reserved ? 'text-foreground' : 'text-muted-foreground'}>{f.number(row.original.reserved)}</span>,
      },
      { id: 'available', header: t('inventory.available'), meta: { align: 'end' }, cell: ({ row }) => <span className="font-semibold">{f.number(row.original.available)}</span> },
      {
        id: 'incoming',
        header: t('inventory.incoming'),
        meta: { align: 'end' },
        cell: ({ row }) => <span className={row.original.incoming ? 'text-info' : 'text-muted-foreground'}>{row.original.incoming ? `+${f.number(row.original.incoming)}` : '0'}</span>,
      },
      { id: 'minStock', header: t('inventory.minStock'), meta: { align: 'end', sortKey: 'minStock' }, cell: ({ row }) => <span className="text-muted-foreground">{f.number(row.original.minStock)}</span> },
      { id: 'status', header: t('inventory.status'), cell: ({ row }) => <StatusBadge kind="stock" value={row.original.status} size="sm" /> },
    ];
    if (finance) {
      cols.push(
        { id: 'cost', header: t('inventory.cost'), meta: { align: 'end', defaultHidden: true }, cell: ({ row }) => <span className="text-muted-foreground">{f.money(row.original.costPrice)}</span> },
        { id: 'stockValue', header: t('inventory.stockValue'), meta: { align: 'end' }, cell: ({ row }) => f.money(row.original.stockValue) },
      );
    }
    cols.push(
      { id: 'updatedAt', header: t('inventory.updated'), meta: { sortKey: 'updatedAt', defaultHidden: true }, cell: ({ row }) => <span className="text-muted-foreground tabular">{f.datetime(row.original.updatedAt)}</span> },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('table.actions')}</span>,
        meta: { align: 'end', alwaysVisible: true },
        cell: ({ row }) => {
          const i = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              {canUpdate ? (
                <Button variant="outline" size="xs" leftIcon={<SlidersVerticalIcon />} onClick={() => adjusting.ask(i)}>
                  {t('inventory.actions.adjustShort')}
                </Button>
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={`${t('table.rowActions')}: ${i.sku}`}>
                    <EllipsisIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onSelect={() => history.ask(i)}>
                    <HistoryIcon aria-hidden="true" />
                    {t('inventory.actions.history')}
                  </DropdownMenuItem>
                  {canUpdate ? (
                    <DropdownMenuItem onSelect={() => minStock.ask(i)}>
                      <BellRingIcon aria-hidden="true" />
                      {t('inventory.actions.minStock')}
                    </DropdownMenuItem>
                  ) : null}
                  {can('products.read') ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => void navigate(`/products/${i.product.id}`)}>
                        <ExternalLinkIcon aria-hidden="true" />
                        {t('inventory.actions.product')}
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    );
    return cols;
  }, [t, f, can, finance, canUpdate, navigate, adjusting.ask, history.ask, minStock.ask]);

  const filtered = list.activeFilterCount > 0 || !!list.q;
  const tabs = [{ key: '', label: t('table.all') }, ...STOCK_FILTERS.map((k) => ({ key: k as string, label: t(`inventory.filter.${k}`) }))].map((tab) => ({ ...tab, count: counts[tab.key] }));

  return (
    <Page>
      <PageHeader
        title={t('inventory.title')}
        description={t('inventory.description')}
        actions={
          <Button variant="outline" asChild leftIcon={<HistoryIcon />}>
            <Link to="/inventory/movements">{t('inventory.movementsLink')}</Link>
          </Button>
        }
      />
      <StatusTabs label={t('inventory.stockFilter')} value={list.filters.stock || ''} onChange={(key) => list.setFilter('stock', key || null)} tabs={tabs} />
      <DataTable
        id="inventory"
        label={t('inventory.title')}
        columns={columns}
        data={query.data?.items}
        getRowId={(i) => i.id}
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
        rowClassName={(i) => (i.status === 'out_of_stock' ? 'bg-danger-soft/25 dark:bg-danger-soft/40' : undefined)}
        empty={{ title: t('inventory.empty'), description: t('inventory.emptyHint'), icon: <BoxesIcon /> }}
        toolbar={
          <>
            <SearchInput value={list.q} onChange={list.setQ} placeholder={t('inventory.searchPlaceholder')} className="sm:w-80" />
            {list.filters.product ? (
              <Button variant="secondary" size="sm" onClick={() => list.setFilter('product', null)}>
                {t('inventory.productFilterOn')} ×
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

      <AdjustStockDialog target={adjusting.target ? toAdjustTarget(adjusting.target) : null} open={adjusting.open} onOpenChange={adjusting.onOpenChange} />
      <MinStockDialog item={minStock.target} open={minStock.open} onOpenChange={minStock.onOpenChange} />
      <MovementsSheet item={history.target} open={history.open} onOpenChange={history.onOpenChange} />
    </Page>
  );
}
