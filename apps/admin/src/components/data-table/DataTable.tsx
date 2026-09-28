import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type Row,
  type RowSelectionState,
  type SortingState,
  type Updater,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  Button,
  Checkbox,
  cn,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@vero/ui';
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, Columns3Icon, InboxIcon, SearchXIcon, XIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ADMIN_STORAGE, readJson, writeJson } from '../../lib/storage';
import { ErrorState, InlineError } from '../common/states';
import { ListFooter } from './ListFooter';

export interface ColumnMeta {
  align?: 'start' | 'end' | 'center';
  /** API sort field — makes the column sortable (server side) */
  sortKey?: string;
  /** label in the column visibility menu (defaults to the header when it is a string) */
  label?: string;
  /** column can't be hidden */
  alwaysVisible?: boolean;
  /** hidden until the user turns it on */
  defaultHidden?: boolean;
  headerClassName?: string;
  cellClassName?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataColumn<T> = ColumnDef<T, any> & { meta?: ColumnMeta };

function metaOf<T>(column: Column<T, unknown>): ColumnMeta {
  return (column.columnDef.meta ?? {}) as ColumnMeta;
}

function columnLabel<T>(column: Column<T, unknown>): string {
  const meta = metaOf(column);
  if (meta.label) return meta.label;
  const header = column.columnDef.header;
  return typeof header === 'string' ? header : column.id;
}

const alignClass = (align?: ColumnMeta['align']) => (align === 'end' ? 'text-end' : align === 'center' ? 'text-center' : undefined);

export interface DataTableProps<T> {
  /** stable id for persisted column visibility */
  id: string;
  columns: DataColumn<T>[];
  data: T[] | undefined;
  getRowId: (row: T) => string;
  /** server pagination */
  page?: number;
  limit?: number;
  total?: number;
  pages?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  /** server sorting: "field" | "-field" */
  sort?: string;
  onSortChange?: (sort: string) => void;
  isLoading: boolean;
  isFetching?: boolean;
  error?: unknown;
  onRetry?: () => void;
  /** row selection + bulk actions */
  selectable?: boolean | ((row: T) => boolean);
  selection?: RowSelectionState;
  onSelectionChange?: (selection: RowSelectionState) => void;
  bulkActions?: (ids: string[], clear: () => void) => ReactNode;
  /** filters row (left) and extra buttons (right, next to the columns menu) */
  toolbar?: ReactNode;
  toolbarEnd?: ReactNode;
  /** true when filters/search are active — changes the empty state */
  filtered?: boolean;
  onResetFilters?: () => void;
  empty?: { title: ReactNode; description?: ReactNode; action?: ReactNode; icon?: ReactNode };
  /** whole-row navigation (the primary cell should also contain a real link for keyboard users) */
  rowHref?: (row: T) => string | undefined;
  /** whole-row click that opens something in place (a details drawer); the row must also contain a real button */
  onRowActivate?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  /** max height of the scroll area (sticky header) */
  maxHeight?: string;
  hideColumnToggle?: boolean;
  hidePagination?: boolean;
  /** accessible name of the table */
  label: string;
  className?: string;
  dense?: boolean;
}

/**
 * Admin data table (TanStack Table): server-side pagination / sorting, URL-driven filters (by the caller),
 * column visibility (persisted), row selection with bulk actions, sticky header, skeleton rows, empty and
 * error states. Wide tables scroll horizontally on narrow screens.
 */
export function DataTable<T>({
  id,
  columns,
  data,
  getRowId,
  page = 1,
  limit = 20,
  total,
  pages,
  onPageChange,
  onLimitChange,
  sort,
  onSortChange,
  isLoading,
  isFetching,
  error,
  onRetry,
  selectable,
  selection,
  onSelectionChange,
  bulkActions,
  toolbar,
  toolbarEnd,
  filtered,
  onResetFilters,
  empty,
  rowHref,
  onRowActivate,
  rowClassName,
  maxHeight = 'max-h-[max(24rem,calc(100dvh-17rem))]',
  hideColumnToggle,
  hidePagination,
  label,
  className,
  dense,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  /* ---------------- column visibility (persisted per table) */
  const defaultVisibility = useMemo<VisibilityState>(() => {
    const v: VisibilityState = {};
    for (const c of columns) {
      const colId = (c.id ?? (c as { accessorKey?: string }).accessorKey) as string | undefined;
      if (colId && c.meta?.defaultHidden) v[colId] = false;
    }
    return v;
  }, [columns]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => ({
    ...defaultVisibility,
    ...readJson<VisibilityState>(ADMIN_STORAGE.columns(id), {}),
  }));
  useEffect(() => {
    writeJson(ADMIN_STORAGE.columns(id), columnVisibility);
  }, [id, columnVisibility]);

  /* ---------------- selection */
  const [innerSelection, setInnerSelection] = useState<RowSelectionState>({});
  const rowSelection = selection ?? innerSelection;
  const setRowSelection = useCallback(
    (updater: Updater<RowSelectionState>) => {
      const next = typeof updater === 'function' ? updater(rowSelection) : updater;
      if (onSelectionChange) onSelectionChange(next);
      else setInnerSelection(next);
    },
    [rowSelection, onSelectionChange],
  );
  const clearSelection = useCallback(() => setRowSelection({}), [setRowSelection]);

  /* ---------------- sorting (server) */
  const sorting = useMemo<SortingState>(() => {
    if (!sort) return [];
    const desc = sort.startsWith('-');
    const key = desc ? sort.slice(1) : sort;
    const col = columns.find((c) => c.meta?.sortKey === key);
    const colId = col ? ((col.id ?? (col as { accessorKey?: string }).accessorKey) as string) : undefined;
    return colId ? [{ id: colId, desc }] : [];
  }, [sort, columns]);

  const selectionColumn = useMemo<DataColumn<T> | null>(() => {
    if (!selectable) return null;
    return {
      id: '__select',
      meta: { alwaysVisible: true, headerClassName: 'w-10 ps-4 pe-0', cellClassName: 'w-10 ps-4 pe-0' },
      header: ({ table }) => (
        <Checkbox
          aria-label={t('table.selectAll')}
          checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? 'indeterminate' : false}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
        />
      ),
      cell: ({ row }) =>
        row.getCanSelect() ? (
          <Checkbox aria-label={t('table.selectRow')} checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} />
        ) : null,
      enableSorting: false,
      enableHiding: false,
    };
  }, [selectable, t]);

  const allColumns = useMemo(() => (selectionColumn ? [selectionColumn, ...columns] : columns), [selectionColumn, columns]);

  const table = useReactTable({
    data: data ?? [],
    columns: allColumns,
    getRowId: (row) => getRowId(row),
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: pages ?? -1,
    enableRowSelection: typeof selectable === 'function' ? (row: Row<T>) => selectable(row.original) : !!selectable,
    enableSortingRemoval: true,
    state: { sorting, columnVisibility, rowSelection },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      const first = next[0];
      if (!first) return onSortChange?.('');
      const col = allColumns.find((c) => (c.id ?? (c as { accessorKey?: string }).accessorKey) === first.id);
      const key = col?.meta?.sortKey;
      if (key) onSortChange?.(first.desc ? `-${key}` : key);
    },
  });

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);
  const visibleColumns = table.getVisibleLeafColumns();
  const hideable = table.getAllLeafColumns().filter((c) => c.id !== '__select' && !metaOf(c).alwaysVisible && c.getCanHide());
  const rows = table.getRowModel().rows;
  const showSkeleton = isLoading && !data;
  const refreshing = !!isFetching && !showSkeleton;

  const onRowClick = (event: MouseEvent<HTMLTableRowElement>, row: T) => {
    const href = rowHref?.(row);
    if (!href && !onRowActivate) return;
    const target = event.target as HTMLElement;
    if (target.closest('a,button,input,select,textarea,label,[role="checkbox"],[role="menuitem"],[data-no-row-click]')) return;
    if (window.getSelection()?.toString()) return;
    if (!href) onRowActivate?.(row);
    else if (event.metaKey || event.ctrlKey) window.open(href, '_blank', 'noopener');
    else void navigate(href);
  };

  const columnMenu =
    !hideColumnToggle && hideable.length > 0 ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" leftIcon={<Columns3Icon />} aria-label={t('table.toggleColumns')}>
            <span className="hidden sm:inline">{t('table.columns')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-80 w-56">
          <DropdownMenuLabel>{t('table.toggleColumns')}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {hideable.map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(v) => column.toggleVisibility(!!v)}
              onSelect={(e) => e.preventDefault()}
            >
              {columnLabel(column)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null;

  return (
    <div className={cn('flex min-w-0 flex-col rounded-xl border border-border bg-card', className)}>
      {toolbar || toolbarEnd || columnMenu ? (
        <div className="flex flex-col gap-2 border-b border-border p-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{toolbar}</div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            {toolbarEnd}
            {columnMenu}
          </div>
        </div>
      ) : null}

      {selectedIds.length > 0 && bulkActions ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-brand-soft/50 px-3 py-2 dark:bg-brand-soft/60" role="region" aria-label={t('table.selected', { count: selectedIds.length })}>
          <span className="text-[13px] font-semibold text-foreground tabular">{t('table.selected', { count: selectedIds.length })}</span>
          <Button variant="ghost" size="xs" onClick={clearSelection} leftIcon={<XIcon />}>
            {t('table.clearSelection')}
          </Button>
          <div className="ms-auto flex flex-wrap items-center gap-2">{bulkActions(selectedIds, clearSelection)}</div>
        </div>
      ) : null}

      {error && data ? (
        <div className="border-b border-border p-3">
          <InlineError error={error} onRetry={onRetry} />
        </div>
      ) : null}

      {error && !data ? (
        <ErrorState error={error} onRetry={onRetry} className="py-12" />
      ) : (
        <div className="relative min-w-0">
          {refreshing ? (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden" role="status" aria-label={t('table.refreshing')}>
              <div className="h-full w-1/3 animate-route-progress bg-primary" />
            </div>
          ) : null}
          <Table stickyHeader containerClassName={maxHeight} aria-label={label} aria-busy={showSkeleton || refreshing || undefined} className={cn('text-[13px]', refreshing && '[&_tbody]:opacity-70')}>
            <TableHeader>
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id}>
                  {group.headers.map((header) => {
                    const meta = metaOf(header.column);
                    const sortable = !!meta.sortKey && !!onSortChange;
                    const sorted = header.column.getIsSorted();
                    return (
                      <TableHead
                        key={header.id}
                        scope="col"
                        aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : sortable ? 'none' : undefined}
                        className={cn('h-10 px-3 text-xs first:ps-4 last:pe-4', alignClass(meta.align), meta.headerClassName)}
                      >
                        {header.isPlaceholder ? null : sortable ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className={cn(
                              '-mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-0.5 font-semibold transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring',
                              sorted && 'text-foreground',
                              meta.align === 'end' && 'flex-row-reverse',
                            )}
                            aria-label={`${columnLabel(header.column)}: ${sorted === 'asc' ? t('table.sortedAsc') : sorted === 'desc' ? t('table.sortedDesc') : t('table.sortAsc')}`}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {sorted === 'asc' ? (
                              <ArrowUpIcon className="size-3.5 text-primary dark:text-brand" aria-hidden="true" />
                            ) : sorted === 'desc' ? (
                              <ArrowDownIcon className="size-3.5 text-primary dark:text-brand" aria-hidden="true" />
                            ) : (
                              <ArrowUpDownIcon className="size-3.5 opacity-50" aria-hidden="true" />
                            )}
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="transition-opacity duration-150">
              {showSkeleton ? (
                Array.from({ length: Math.min(limit, 10) }, (_, i) => (
                  <TableRow key={`s${i}`} className="hover:bg-transparent">
                    {visibleColumns.map((column, ci) => (
                      <TableCell key={column.id} className={cn('px-3 first:ps-4 last:pe-4', dense ? 'py-2' : 'py-3')}>
                        <Skeleton className={cn('h-4', column.id === '__select' ? 'w-4' : ci === 1 || (ci === 0 && !selectable) ? 'w-40' : 'w-16', metaOf(column).align === 'end' && 'ms-auto')} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={visibleColumns.length} className="p-0">
                    {filtered ? (
                      <EmptyState
                        size="sm"
                        titleAs="p"
                        icon={<SearchXIcon />}
                        title={t('table.noResultsTitle')}
                        description={t('table.noResultsText')}
                        action={
                          onResetFilters ? (
                            <Button variant="outline" size="sm" onClick={onResetFilters}>
                              {t('table.resetFilters')}
                            </Button>
                          ) : undefined
                        }
                      />
                    ) : (
                      <EmptyState size="sm" titleAs="p" icon={empty?.icon ?? <InboxIcon />} title={empty?.title ?? t('table.emptyTitle')} description={empty?.description} action={empty?.action} />
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const clickable = !!rowHref?.(row.original) || !!onRowActivate;
                  return (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() ? 'selected' : undefined}
                      onClick={clickable ? (e) => onRowClick(e, row.original) : undefined}
                      className={cn(clickable && 'cursor-pointer', rowClassName?.(row.original))}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const meta = metaOf(cell.column);
                        return (
                          <TableCell key={cell.id} className={cn('px-3 first:ps-4 last:pe-4', dense ? 'py-2' : 'py-2.5', alignClass(meta.align), meta.align === 'end' && 'tabular', meta.cellClassName)}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {!hidePagination && total !== undefined && !(error && !data) ? (
        <ListFooter page={page} limit={limit} total={total} pages={pages} onPageChange={onPageChange} onLimitChange={onLimitChange} />
      ) : null}
    </div>
  );
}
