import { useAdminList, useSession } from '@vero/api-client';
import { INVENTORY_MOVEMENT_TYPES, type AdminInventoryMovement } from '@vero/types';
import { Button } from '@vero/ui';
import { ArrowLeftRightIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Page, PageHeader, usePageMeta } from '../../components/common/page';
import { DataTable, type DataColumn } from '../../components/data-table/DataTable';
import { DateRangeFilter, FilterSelect } from '../../components/data-table/toolbar';
import { dateInputToIso, endOfDayExclusiveIso } from '../../lib/dates';
import { useFormat } from '../../lib/format';
import { useListState } from '../../lib/url-state';
import { ProductFilter } from '../catalog/product-picker';
import { BeforeAfter, MovementReference, MovementTypeBadge, SignedQuantity, movementAffects } from './movement-ui';

const FILTERS = ['type', 'product', 'from', 'to'] as const;

export default function MovementsPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const { can } = useSession();
  usePageMeta(t('inventory.title'), t('inventory.movements.title'));
  const list = useListState({ filters: FILTERS, defaultLimit: 50 });

  const params = useMemo(() => {
    const p = { ...list.params };
    delete p.from;
    delete p.to;
    if (list.filters.from) p.from = dateInputToIso(list.filters.from);
    if (list.filters.to) p.to = endOfDayExclusiveIso(list.filters.to);
    return p;
  }, [list.params, list.filters.from, list.filters.to]);
  const query = useAdminList('movements', (api, p) => api.admin.inventory.movements(p), params);

  const columns = useMemo<DataColumn<AdminInventoryMovement>[]>(
    () => [
      {
        id: 'date',
        header: t('inventory.movements.date'),
        meta: { alwaysVisible: true },
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="tabular">{f.date(row.original.createdAt)}</span>
            <span className="text-xs text-muted-foreground tabular">{f.date(row.original.createdAt, 'time')}</span>
          </div>
        ),
      },
      {
        id: 'product',
        header: t('inventory.product'),
        meta: { cellClassName: 'whitespace-normal' },
        cell: ({ row }) => {
          const m = row.original;
          return (
            <div className="flex max-w-72 min-w-48 flex-col gap-0.5">
              {can('products.read') ? (
                <Link to={`/products/${m.product.id}`} className="line-clamp-2 font-medium text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                  {f.loc(m.product.name)}
                </Link>
              ) : (
                <span className="line-clamp-2 font-medium">{f.loc(m.product.name)}</span>
              )}
              <span className="text-xs text-muted-foreground">
                <span className="font-mono">{m.sku}</span>
                {m.variant ? ` · ${f.loc(m.variant.name)}` : ''}
              </span>
            </div>
          );
        },
      },
      { id: 'type', header: t('inventory.movements.type'), cell: ({ row }) => <MovementTypeBadge type={row.original.type} /> },
      { id: 'quantity', header: t('inventory.movements.quantity'), meta: { align: 'end' }, cell: ({ row }) => <SignedQuantity value={row.original.quantity} /> },
      {
        id: 'change',
        header: t('inventory.movements.beforeAfter'),
        meta: { align: 'end' },
        cell: ({ row }) => {
          const m = row.original;
          const affects = movementAffects(m.type);
          if (affects === 'incoming') return <span className="text-muted-foreground">—</span>;
          return (
            <span className="inline-flex flex-col items-end">
              {affects === 'reserved' ? <BeforeAfter before={m.reservedBefore} after={m.reservedAfter} /> : <BeforeAfter before={m.stockBefore} after={m.stockAfter} />}
              <span className="text-[11px] text-muted-foreground">{affects === 'reserved' ? t('inventory.reserved') : t('inventory.onHand')}</span>
            </span>
          );
        },
      },
      { id: 'onHand', header: t('inventory.movements.change'), meta: { align: 'end', defaultHidden: true }, cell: ({ row }) => <BeforeAfter before={row.original.stockBefore} after={row.original.stockAfter} /> },
      { id: 'reserved', header: t('inventory.movements.reservedChange'), meta: { align: 'end', defaultHidden: true }, cell: ({ row }) => <BeforeAfter before={row.original.reservedBefore} after={row.original.reservedAfter} /> },
      { id: 'reference', header: t('inventory.movements.reference'), cell: ({ row }) => <MovementReference movement={row.original} /> },
      {
        id: 'reason',
        header: t('inventory.movements.reason'),
        meta: { cellClassName: 'whitespace-normal' },
        cell: ({ row }) => (row.original.reason ? <span className="line-clamp-2 block max-w-56 min-w-32 text-[13px]">{row.original.reason}</span> : <span className="text-muted-foreground">—</span>),
      },
      { id: 'user', header: t('inventory.movements.user'), cell: ({ row }) => row.original.user?.name || <span className="text-muted-foreground">{t('inventory.movements.system')}</span> },
    ],
    [t, f, can],
  );

  const filtered = list.activeFilterCount > 0;

  return (
    <Page>
      <PageHeader
        back={{ to: '/inventory', label: t('inventory.title') }}
        title={t('inventory.movements.title')}
        description={t('inventory.movements.description')}
      />
      <DataTable
        id="movements"
        label={t('inventory.movements.title')}
        columns={columns}
        data={query.data?.items}
        getRowId={(m) => m.id}
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
        filtered={filtered}
        onResetFilters={list.reset}
        empty={{ title: t('inventory.movements.empty'), icon: <ArrowLeftRightIcon /> }}
        toolbar={
          <>
            <div className="w-full sm:w-72">
              <ProductFilter value={list.filters.product} onChange={(v) => list.setFilter('product', v)} placeholder={t('inventory.movements.allProducts')} className="h-8 text-[13px]" />
            </div>
            <FilterSelect label={t('inventory.movements.type')} value={list.filters.type} onChange={(v) => list.setFilter('type', v)} options={INVENTORY_MOVEMENT_TYPES.map((ty) => ({ value: ty, label: t(`enums.movement.${ty}`) }))} />
            <DateRangeFilter from={list.filters.from} to={list.filters.to} onChange={(r) => list.setFilters({ from: r.from, to: r.to })} />
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
