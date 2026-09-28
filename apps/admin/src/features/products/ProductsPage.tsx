import { useAdminList, useAdminMutation, useSession } from '@vero/api-client';
import { PRODUCT_STATUSES, type AdminProductListItem, type ProductStatus } from '@vero/types';
import {
  Badge,
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  toast,
} from '@vero/ui';
import { ArchiveIcon, BoxesIcon, CopyIcon, EllipsisIcon, EyeOffIcon, PackageIcon, PencilIcon, PlusIcon, SendIcon, StarIcon, Trash2Icon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { StatusBadge } from '../../components/common/badges';
import { ConfirmDialog, useConfirm } from '../../components/common/ConfirmDialog';
import { Page, PageHeader, usePageMeta } from '../../components/common/page';
import { Thumb } from '../../components/common/Thumb';
import { DataTable, type DataColumn } from '../../components/data-table/DataTable';
import { FilterSelect, SearchInput } from '../../components/data-table/toolbar';
import { Combobox } from '../../components/form/pickers';
import { apiErrorCode, toastError } from '../../lib/errors';
import { useFormat } from '../../lib/format';
import { useListState } from '../../lib/url-state';
import { useBrandOptions, useCategoryOptions } from '../catalog/catalog-data';

const FILTERS = ['status', 'category', 'brand', 'stock', 'flag'] as const;
const FLAGS = ['featured', 'isNew', 'bestseller', 'discounted'] as const;

export default function ProductsPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const navigate = useNavigate();
  const { can } = useSession();
  usePageMeta(t('products.title'));
  const list = useListState({ filters: FILTERS, defaultSort: '-updatedAt' });
  const query = useAdminList('products', (api, p) => api.admin.products.list(p), list.params);
  const categories = useCategoryOptions();
  const brands = useBrandOptions();
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const del = useConfirm<AdminProductListItem>();
  const bulkDelete = useConfirm<string[]>();

  // the list DTO carries the Uzbek category name only — localise it through the category tree
  const categoryName = useMemo(() => {
    const map = new Map<string, string>();
    for (const { node } of categories.flat) map.set(node.name.uz, f.loc(node.name));
    return (uz: string | undefined) => (uz ? (map.get(uz) ?? uz) : '—');
  }, [categories.flat, f]);

  const setStatus = useAdminMutation((api, v: { id: string; status: ProductStatus }) => api.admin.products.setStatus(v.id, v.status), { invalidate: ['products'] });
  const duplicate = useAdminMutation((api, id: string) => api.admin.products.duplicate(id), { invalidate: ['products', 'inventory'] });
  const remove = useAdminMutation((api, id: string) => api.admin.products.remove(id), { invalidate: ['products', 'inventory'] });
  const bulkStatus = useAdminMutation((api, v: { ids: string[]; status: ProductStatus }) => api.admin.products.bulkStatus(v.ids, v.status), { invalidate: ['products'] });
  const bulkRemove = useAdminMutation((api, ids: string[]) => api.admin.products.bulkDelete(ids), { invalidate: ['products', 'inventory'] });

  const changeStatus = async (id: string, status: ProductStatus) => {
    try {
      await setStatus.mutateAsync({ id, status });
      toast.success(t('products.statusChanged'));
    } catch (error) {
      toastError(t, error);
    }
  };

  const columns = useMemo<DataColumn<AdminProductListItem>[]>(() => {
    const cols: DataColumn<AdminProductListItem>[] = [
      {
        id: 'product',
        header: t('products.columns.product'),
        meta: { alwaysVisible: true, cellClassName: 'whitespace-normal' },
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="flex min-w-60 items-center gap-3">
              <Thumb src={p.image?.thumb ?? p.image?.url} size="md" alt="" />
              <div className="flex min-w-0 flex-col gap-0.5">
                <Link to={`/products/${p.id}`} className="line-clamp-2 font-medium text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                  {f.loc(p.name)}
                </Link>
                <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="font-mono">{p.sku}</span>
                  {p.hasVariants ? (
                    <Badge variant="outline" size="sm" className="w-fit">
                      {t('products.variantsBadge')}
                    </Badge>
                  ) : null}
                </span>
              </div>
            </div>
          );
        },
      },
      { id: 'sku', header: t('products.columns.sku'), meta: { sortKey: 'sku', defaultHidden: true }, cell: ({ row }) => <span className="font-mono text-xs">{row.original.sku}</span> },
      {
        id: 'category',
        header: t('products.columns.categoryBrand'),
        meta: { cellClassName: 'whitespace-normal' },
        cell: ({ row }) => (
          <div className="flex max-w-44 min-w-32 flex-col gap-0.5">
            <span className="line-clamp-2">{categoryName(row.original.category)}</span>
            {row.original.brand ? <span className="truncate text-xs text-muted-foreground">{row.original.brand}</span> : null}
          </div>
        ),
      },
      {
        id: 'price',
        header: t('products.columns.price'),
        meta: { align: 'end', sortKey: 'price' },
        cell: ({ row }) => (
          <div className="flex flex-col items-end">
            {row.original.hasVariants ? (
              <span className="text-xs text-muted-foreground">
                <Trans t={t} i18nKey="products.priceFrom" values={{ price: f.money(row.original.price) }} components={{ b: <span className="text-sm font-semibold text-foreground" /> }} />
              </span>
            ) : (
              <span className="font-semibold">{f.money(row.original.price)}</span>
            )}
            {row.original.oldPrice && row.original.oldPrice > row.original.price ? <span className="text-xs text-muted-foreground line-through">{f.money(row.original.oldPrice)}</span> : null}
          </div>
        ),
      },
    ];
    if (can(['analytics.read', 'expenses.read'], 'any')) {
      cols.push({
        id: 'cost',
        header: t('products.columns.cost'),
        meta: { align: 'end' },
        cell: ({ row }) => {
          const p = row.original;
          // the list price of a product with variants is the cheapest variant, the cost is the base one — no honest margin
          const margin = !p.hasVariants && p.price > 0 && p.costPrice > 0 ? ((p.price - p.costPrice) / p.price) * 100 : null;
          return (
            <div className="flex flex-col items-end">
              <span className="text-muted-foreground">{p.costPrice ? f.money(p.costPrice) : '—'}</span>
              {margin !== null ? (
                <span className={cn('text-xs font-semibold', margin < 0 ? 'text-danger' : margin < 10 ? 'text-warning' : 'text-success')}>{f.percent(margin)}</span>
              ) : p.hasVariants ? (
                <span className="text-xs text-muted-foreground">{t('products.marginVaries')}</span>
              ) : null}
            </div>
          );
        },
      });
    }
    cols.push(
      {
        id: 'stock',
        header: t('products.columns.stock'),
        meta: { sortKey: 'stock.available' },
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-1">
            <StatusBadge kind="stock" value={row.original.stock.status} size="sm" />
            <span className="text-xs text-muted-foreground tabular">{t('products.stockCell', { available: row.original.stock.available, reserved: row.original.stock.reserved })}</span>
          </div>
        ),
      },
      { id: 'status', header: t('products.columns.status'), meta: { alwaysVisible: true }, cell: ({ row }) => <StatusBadge kind="product" value={row.original.status} /> },
      {
        id: 'flags',
        header: t('products.columns.flags'),
        meta: { defaultHidden: true },
        cell: ({ row }) => {
          const flags = FLAGS.filter((k) => row.original.flags[k]);
          return flags.length ? (
            <div className="flex max-w-40 flex-wrap gap-1">
              {flags.map((k) => (
                <Badge key={k} variant={k === 'discounted' ? 'brand' : 'secondary'} size="sm">
                  {t(`products.flags.${k}`)}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      { id: 'sold', header: t('products.columns.sold'), meta: { align: 'end', sortKey: 'soldCount' }, cell: ({ row }) => f.number(row.original.soldCount) },
      {
        id: 'rating',
        header: t('products.columns.rating'),
        meta: { align: 'end', sortKey: 'rating.average', defaultHidden: true },
        cell: ({ row }) =>
          row.original.rating ? (
            <span className="inline-flex items-center gap-1">
              <StarIcon className="size-3.5 fill-rating text-rating" aria-hidden="true" />
              {f.number(row.original.rating, 1)}
            </span>
          ) : (
            '—'
          ),
      },
      {
        id: 'updatedAt',
        header: t('products.columns.updated'),
        meta: { sortKey: 'updatedAt', defaultHidden: true },
        cell: ({ row }) => <span className="text-muted-foreground tabular">{f.date(row.original.updatedAt)}</span>,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('table.actions')}</span>,
        meta: { align: 'end', alwaysVisible: true },
        cell: ({ row }) => {
          const p = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`${t('table.rowActions')}: ${f.loc(p.name)}`}>
                  <EllipsisIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={() => void navigate(`/products/${p.id}`)}>
                  <PencilIcon aria-hidden="true" />
                  {t('products.actions.edit')}
                </DropdownMenuItem>
                {can('products.create') ? (
                  <DropdownMenuItem
                    onSelect={async () => {
                      try {
                        const copy = await duplicate.mutateAsync(p.id);
                        toast.success(t('products.duplicated'), { action: { label: t('common.open'), onClick: () => void navigate(`/products/${copy.id}`) } });
                      } catch (error) {
                        toastError(t, error);
                      }
                    }}
                  >
                    <CopyIcon aria-hidden="true" />
                    {t('products.actions.duplicate')}
                  </DropdownMenuItem>
                ) : null}
                {can('inventory.read') ? (
                  <DropdownMenuItem onSelect={() => void navigate(`/inventory?q=${encodeURIComponent(p.sku)}`)}>
                    <BoxesIcon aria-hidden="true" />
                    {t('products.actions.inventory')}
                  </DropdownMenuItem>
                ) : null}
                {can('products.update') ? (
                  <>
                    <DropdownMenuSeparator />
                    {p.status !== 'published' ? (
                      <DropdownMenuItem onSelect={() => void changeStatus(p.id, 'published')}>
                        <SendIcon aria-hidden="true" />
                        {t('products.actions.publish')}
                      </DropdownMenuItem>
                    ) : null}
                    {p.status !== 'draft' ? (
                      <DropdownMenuItem onSelect={() => void changeStatus(p.id, 'draft')}>
                        <EyeOffIcon aria-hidden="true" />
                        {t('products.actions.draft')}
                      </DropdownMenuItem>
                    ) : null}
                    {p.status !== 'archived' ? (
                      <DropdownMenuItem onSelect={() => void changeStatus(p.id, 'archived')}>
                        <ArchiveIcon aria-hidden="true" />
                        {t('products.actions.archive')}
                      </DropdownMenuItem>
                    ) : null}
                  </>
                ) : null}
                {can('products.delete') ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => del.ask(p)}>
                      <Trash2Icon aria-hidden="true" />
                      {t('products.actions.delete')}
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    );
    return cols;
  }, [t, f, can, categoryName, navigate, duplicate, del]);

  const filtered = list.activeFilterCount > 0 || !!list.q;
  const canBulk = can('products.update') || can('products.delete');

  const runBulkStatus = async (ids: string[], status: ProductStatus, clear: () => void) => {
    try {
      const r = await bulkStatus.mutateAsync({ ids, status });
      toast.success(t('products.bulk.updated', { count: r.updated }));
      clear();
    } catch (error) {
      toastError(t, error);
    }
  };

  return (
    <Page>
      <PageHeader
        title={t('products.title')}
        description={t('products.description')}
        actions={
          can('products.create') ? (
            <Button asChild leftIcon={<PlusIcon />}>
              <Link to="/products/new">{t('products.add')}</Link>
            </Button>
          ) : undefined
        }
      />
      <DataTable
        id="products"
        label={t('products.title')}
        columns={columns}
        data={query.data?.items}
        getRowId={(p) => p.id}
        rowHref={(p) => `/products/${p.id}`}
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
        selectable={canBulk}
        selection={selection}
        onSelectionChange={setSelection}
        bulkActions={(ids, clear) => (
          <>
            {can('products.update') ? (
              <>
                <Button size="xs" variant="outline" leftIcon={<SendIcon />} loading={bulkStatus.isPending} onClick={() => void runBulkStatus(ids, 'published', clear)}>
                  {t('products.bulk.publish')}
                </Button>
                <Button size="xs" variant="outline" leftIcon={<EyeOffIcon />} onClick={() => void runBulkStatus(ids, 'draft', clear)}>
                  {t('products.bulk.draft')}
                </Button>
                <Button size="xs" variant="outline" leftIcon={<ArchiveIcon />} onClick={() => void runBulkStatus(ids, 'archived', clear)}>
                  {t('products.bulk.archive')}
                </Button>
              </>
            ) : null}
            {can('products.delete') ? (
              <Button size="xs" variant="destructive" leftIcon={<Trash2Icon />} onClick={() => bulkDelete.ask(ids)}>
                {t('products.bulk.delete')}
              </Button>
            ) : null}
          </>
        )}
        empty={{
          title: t('products.empty'),
          description: t('products.emptyHint'),
          icon: <PackageIcon />,
          action: can('products.create') ? (
            <Button asChild size="sm" leftIcon={<PlusIcon />}>
              <Link to="/products/new">{t('products.add')}</Link>
            </Button>
          ) : undefined,
        }}
        toolbar={
          <>
            <SearchInput value={list.q} onChange={list.setQ} placeholder={t('products.searchPlaceholder')} />
            <FilterSelect label={t('products.filters.status')} value={list.filters.status} onChange={(v) => list.setFilter('status', v)} options={PRODUCT_STATUSES.map((s) => ({ value: s, label: t(`status.product.${s}`) }))} />
            <div className="w-52">
              <Combobox value={list.filters.category} onChange={(v) => list.setFilter('category', v)} options={categories.options} placeholder={t('products.filters.allCategories')} className="h-8 text-[13px]" />
            </div>
            <div className="w-40">
              <Combobox value={list.filters.brand} onChange={(v) => list.setFilter('brand', v)} options={brands.options} placeholder={t('products.filters.allBrands')} className="h-8 text-[13px]" />
            </div>
            <FilterSelect
              label={t('products.filters.stock')}
              value={list.filters.stock}
              onChange={(v) => list.setFilter('stock', v)}
              options={[
                { value: 'in', label: t('products.filters.stockIn') },
                { value: 'low', label: t('products.filters.stockLow') },
                { value: 'out', label: t('products.filters.stockOut') },
              ]}
            />
            <FilterSelect label={t('products.filters.flag')} value={list.filters.flag} onChange={(v) => list.setFilter('flag', v)} options={FLAGS.map((k) => ({ value: k, label: t(`products.flags.${k}`) }))} />
            {filtered ? (
              <Button variant="ghost" size="sm" onClick={list.reset}>
                {t('table.resetFilters')}
              </Button>
            ) : null}
          </>
        }
      />

      <ConfirmDialog
        open={del.open}
        onOpenChange={del.onOpenChange}
        title={t('products.deleteTitle')}
        description={del.target ? t('products.deleteText', { name: f.loc(del.target.name) }) : undefined}
        onConfirm={async () => {
          if (!del.target) return;
          try {
            await remove.mutateAsync(del.target.id);
            toast.success(t('form.deleted'));
          } catch (error) {
            if (apiErrorCode(error) === 'IN_USE') toast.error(t('products.deleteInUse'));
            else toastError(t, error);
            throw error;
          }
        }}
      />
      <ConfirmDialog
        open={bulkDelete.open}
        onOpenChange={bulkDelete.onOpenChange}
        title={t('products.bulk.confirmDelete', { count: bulkDelete.target?.length ?? 0 })}
        description={t('products.bulk.confirmDeleteText')}
        onConfirm={async () => {
          const ids = bulkDelete.target ?? [];
          try {
            const r = await bulkRemove.mutateAsync(ids);
            toast.success(t('products.bulk.deleted', { count: r.deleted, total: ids.length }), r.deleted < ids.length ? { description: t('products.bulk.deletedSkipped') } : undefined);
            setSelection({});
          } catch (error) {
            toastError(t, error);
            throw error;
          }
        }}
      />
    </Page>
  );
}
