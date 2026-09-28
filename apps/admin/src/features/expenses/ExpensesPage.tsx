import { useAdminList, useAdminMutation, useAdminQuery, useSession } from '@vero/api-client';
import { CURRENCIES, EXPENSE_PAYMENT_METHODS, EXPENSE_STATUSES, type AdminExpense, type AdminMedia } from '@vero/types';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Form,
  Input,
  Skeleton,
  toast,
} from '@vero/ui';
import { expenseInputSchema } from '@vero/validation';
import { EllipsisIcon, FileTextIcon, PaperclipIcon, PencilIcon, PlusIcon, TagsIcon, Trash2Icon, WalletIcon, XIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { z } from 'zod';
import { BarList } from '../../components/charts/chart-kit';
import { StatusBadge } from '../../components/common/badges';
import { ConfirmDialog, useConfirm, useDialogTarget } from '../../components/common/ConfirmDialog';
import { Page, PageHeader, Panel, StatTile, usePageMeta } from '../../components/common/page';
import { PeriodPicker, usePeriodState } from '../../components/common/PeriodPicker';
import { DataTable, type DataColumn } from '../../components/data-table/DataTable';
import { FilterSelect, SearchInput } from '../../components/data-table/toolbar';
import { DateTimeField, NumberField, SelectField, TextareaField, TextField } from '../../components/form/fields';
import { FieldGrid } from '../../components/form/form-kit';
import { UploadDropzone } from '../../components/media/UploadDropzone';
import { handleFormError, toastError } from '../../lib/errors';
import { useFormat } from '../../lib/format';
import { formResolver } from '../../lib/forms';
import { assetUrl } from '../../lib/images';
import { ATTACHMENT_ACCEPT, uploadExpenseAttachments } from '../../lib/upload';
import { useListState } from '../../lib/url-state';

type Attachment = { media: string; url: string; name: string; mime: string };
type Input = z.input<typeof expenseInputSchema>;
type Output = z.output<typeof expenseInputSchema>;
type Values = Omit<Input, 'amount' | 'exchangeRate' | 'attachments' | 'date'> & { amount: number | ''; exchangeRate: number | ''; date: string; attachments: Attachment[] };

function toValues(e?: AdminExpense | null, defaultCategory = ''): Values {
  return {
    title: e?.title ?? '',
    category: e?.category.id ?? defaultCategory,
    description: e?.description ?? '',
    amount: e?.amount ?? '',
    currency: e?.currency ?? 'UZS',
    exchangeRate: e?.exchangeRate ?? 1,
    date: e?.date ?? new Date().toISOString(),
    paymentMethod: e?.paymentMethod ?? 'cash',
    responsible: e?.responsible ?? '',
    attachments: e?.attachments ?? [],
    status: e?.status ?? 'PAID',
    notes: e?.notes ?? '',
  };
}

function ExpenseDialog({ expense, open, onOpenChange }: { expense: AdminExpense | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const f = useFormat();
  const isNew = !expense;
  const categories = useAdminQuery(['expenseCategories'], (api) => api.admin.expenseCategories.list(), { staleTime: 60_000 });
  const firstActive = categories.data?.find((c) => c.isActive)?.id ?? '';
  const form = useForm<Values, unknown, Output>({ resolver: formResolver<Values, typeof expenseInputSchema>(expenseInputSchema, (v) => ({ ...v, exchangeRate: v.currency === 'UZS' ? 1 : v.exchangeRate })), defaultValues: toValues(expense, firstActive) });
  useEffect(() => {
    if (open) form.reset(toValues(expense, firstActive));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when the dialog opens for a record
  }, [open, expense?.id]);
  useEffect(() => {
    if (open && isNew && !form.getValues('category') && firstActive) form.setValue('category', firstActive);
  }, [open, isNew, firstActive, form]);
  const [currency, amount, rate, attachments] = useWatch({ control: form.control, name: ['currency', 'amount', 'exchangeRate', 'attachments'] }) as [string, number | '', number | '', Attachment[]];
  const amountUzs = currency === 'UZS' ? Number(amount || 0) : Math.round(Number(amount || 0) * Number(rate || 0));
  const options = (categories.data ?? []).filter((c) => c.isActive || c.id === expense?.category.id).map((c) => ({ value: c.id, label: f.loc(c.name) }));

  const create = useAdminMutation((api, v: Output) => api.admin.expenses.create(v), { invalidate: ['expenses', 'analytics', 'reports', 'media'] });
  const update = useAdminMutation((api, v: Output) => api.admin.expenses.update(expense!.id, v), { invalidate: ['expenses', 'analytics', 'reports', 'media'] });
  const pending = create.isPending || update.isPending;
  const submit = form.handleSubmit(async (values) => {
    try {
      if (isNew) await create.mutateAsync(values);
      else await update.mutateAsync(values);
      toast.success(isNew ? t('expenses.form.created') : t('expenses.form.saved'));
      onOpenChange(false);
    } catch (error) {
      handleFormError(t, form, error);
    }
  });

  const addAttachments = (items: AdminMedia[]) => {
    const current = form.getValues('attachments');
    const next = [...current, ...items.filter((m) => !current.some((a) => a.media === m.id)).map((m) => ({ media: m.id, url: m.url, name: m.originalName || m.filename, mime: m.mime }))].slice(0, 10);
    form.setValue('attachments', next, { shouldDirty: true });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent size="lg" closeLabel={t('common.close')}>
        <DialogHeader>
          <DialogTitle>{isNew ? t('expenses.form.createTitle') : t('expenses.form.editTitle')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void submit(e)} noValidate className="flex min-h-0 flex-1 flex-col gap-5">
            <DialogBody className="flex flex-col gap-5">
              <TextField name="title" label={t('expenses.form.title')} required maxLength={160} placeholder={t('expenses.form.titlePlaceholder')} />
              <FieldGrid>
                <SelectField name="category" label={t('expenses.form.category')} required options={options} />
                <DateTimeField name="date" label={t('expenses.form.date')} required dateOnly />
              </FieldGrid>
              <FieldGrid cols={3}>
                <NumberField name="amount" label={t('expenses.form.amount')} required decimal={currency !== 'UZS'} suffix={currency} />
                <SelectField name="currency" label={t('expenses.form.currency')} options={CURRENCIES.map((c) => ({ value: c, label: t(`enums.currency.${c}`) }))} />
                {currency !== 'UZS' ? <NumberField name="exchangeRate" label={t('expenses.form.exchangeRate', { currency })} required decimal /> : <div />}
              </FieldGrid>
              {currency !== 'UZS' ? <p className="-mt-3 text-[13px] font-medium tabular">{t('expenses.form.amountUzs', { amount: f.money(amountUzs) })}</p> : null}
              <FieldGrid cols={3}>
                <SelectField name="paymentMethod" label={t('expenses.form.paymentMethod')} options={EXPENSE_PAYMENT_METHODS.map((m) => ({ value: m, label: t(`enums.expensePayment.${m}`) }))} />
                <SelectField name="status" label={t('expenses.form.status')} options={EXPENSE_STATUSES.map((s) => ({ value: s, label: t(`status.expense.${s}`) }))} />
                <TextField name="responsible" label={t('expenses.form.responsible')} optional maxLength={120} />
              </FieldGrid>
              <TextareaField name="description" label={t('expenses.form.description')} optional rows={2} maxLength={2000} />
              <div className="flex flex-col gap-2" role="group" aria-label={t('expenses.form.attachments')}>
                <span className="text-sm font-semibold">{t('expenses.form.attachments')}</span>
                {attachments.length ? (
                  <ul className="flex flex-col gap-1.5">
                    {attachments.map((a) => (
                      <li key={a.media} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-[13px]">
                        {a.mime.startsWith('image/') ? <img src={assetUrl(a.url)} alt="" className="size-8 rounded-xs object-cover" /> : <FileTextIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
                        <a href={assetUrl(a.url)} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate hover:underline">
                          {a.name}
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="size-7"
                          aria-label={t('expenses.form.removeAttachment', { name: a.name })}
                          onClick={() => form.setValue('attachments', attachments.filter((x) => x.media !== a.media), { shouldDirty: true })}
                        >
                          <XIcon />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {attachments.length < 10 ? <UploadDropzone<AdminMedia> compact accept={ATTACHMENT_ACCEPT} upload={(files, onProgress) => uploadExpenseAttachments(files, onProgress)} onUploaded={addAttachments} hint={t('expenses.form.attachmentsHint')} /> : null}
              </div>
              <TextareaField name="notes" label={t('expenses.form.notes')} optional rows={2} maxLength={2000} />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" loading={pending}>
                {isNew ? t('common.create') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const FILTERS = ['category', 'status', 'paymentMethod', 'min', 'max'] as const;

export default function ExpensesPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const { can } = useSession();
  usePageMeta(t('expenses.title'));
  const period = usePeriodState('thisMonth');
  const list = useListState({ filters: FILTERS, defaultSort: '-date' });
  const categories = useAdminQuery(['expenseCategories'], (api) => api.admin.expenseCategories.list(), { staleTime: 60_000 });
  const params = useMemo(() => ({ ...list.params, ...period.query }), [list.params, period.query]);
  const summaryParams = useMemo(() => {
    const { page: _p, limit: _l, sort: _s, ...rest } = params;
    void _p;
    void _l;
    void _s;
    return rest;
  }, [params]);
  const query = useAdminList('expenses', (api, p) => api.admin.expenses.list(p), params);
  const summary = useAdminQuery(['expenses', 'summary', summaryParams], (api) => api.admin.expenses.summary(summaryParams));
  const dialog = useDialogTarget<AdminExpense | null>();
  const del = useConfirm<AdminExpense>();
  const remove = useAdminMutation((api, id: string) => api.admin.expenses.remove(id), { invalidate: ['expenses', 'analytics', 'reports', 'media'] });
  const canUpdate = can('expenses.update');
  const [minDraft, setMinDraft] = useState(list.filters.min);
  const [maxDraft, setMaxDraft] = useState(list.filters.max);
  useEffect(() => setMinDraft(list.filters.min), [list.filters.min]);
  useEffect(() => setMaxDraft(list.filters.max), [list.filters.max]);

  const columns = useMemo<DataColumn<AdminExpense>[]>(
    () => [
      {
        id: 'title',
        header: t('expenses.columns.title'),
        meta: { alwaysVisible: true, sortKey: 'title', cellClassName: 'whitespace-normal' },
        cell: ({ row }) => (
          <div className="flex max-w-80 min-w-48 flex-col">
            {canUpdate ? (
              <button type="button" onClick={() => dialog.ask(row.original)} className="line-clamp-1 text-start font-semibold text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                {row.original.title}
              </button>
            ) : (
              <span className="line-clamp-1 font-semibold">{row.original.title}</span>
            )}
            {row.original.description ? <span className="line-clamp-1 text-xs text-muted-foreground">{row.original.description}</span> : null}
          </div>
        ),
      },
      {
        id: 'category',
        header: t('expenses.columns.category'),
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: row.original.category.color }} aria-hidden="true" />
            {f.loc(row.original.category.name)}
          </span>
        ),
      },
      { id: 'date', header: t('expenses.columns.date'), meta: { sortKey: 'date' }, cell: ({ row }) => <span className="tabular">{f.date(row.original.date)}</span> },
      {
        id: 'amount',
        header: t('expenses.columns.amount'),
        meta: { align: 'end', sortKey: 'amountUzs' },
        cell: ({ row }) => (
          <div className="flex flex-col items-end">
            <span className="font-semibold">{f.money(row.original.amountUzs)}</span>
            {row.original.currency !== 'UZS' ? (
              <span className="text-xs text-muted-foreground tabular">
                {f.number(row.original.amount, 2)} {row.original.currency} × {f.number(row.original.exchangeRate, 2)}
              </span>
            ) : null}
          </div>
        ),
      },
      { id: 'paymentMethod', header: t('expenses.columns.paymentMethod'), cell: ({ row }) => t(`enums.expensePayment.${row.original.paymentMethod}`) },
      { id: 'responsible', header: t('expenses.columns.responsible'), cell: ({ row }) => row.original.responsible || <span className="text-muted-foreground">—</span> },
      { id: 'status', header: t('expenses.columns.status'), cell: ({ row }) => <StatusBadge kind="expense" value={row.original.status} size="sm" /> },
      {
        id: 'attachments',
        header: t('expenses.columns.attachments'),
        cell: ({ row }) =>
          row.original.attachments.length ? (
            <span className="flex items-center gap-1">
              {row.original.attachments.slice(0, 3).map((a) => (
                <a key={a.media} href={assetUrl(a.url)} target="_blank" rel="noopener noreferrer" title={a.name} className="inline-flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground" aria-label={a.name}>
                  <PaperclipIcon className="size-3.5" />
                </a>
              ))}
              {row.original.attachments.length > 3 ? <span className="text-xs text-muted-foreground">+{row.original.attachments.length - 3}</span> : null}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('table.actions')}</span>,
        meta: { align: 'end', alwaysVisible: true },
        cell: ({ row }) =>
          canUpdate || can('expenses.delete') ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`${t('table.rowActions')}: ${row.original.title}`}>
                  <EllipsisIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {canUpdate ? (
                  <DropdownMenuItem onSelect={() => dialog.ask(row.original)}>
                    <PencilIcon aria-hidden="true" />
                    {t('common.edit')}
                  </DropdownMenuItem>
                ) : null}
                {can('expenses.delete') ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => del.ask(row.original)}>
                      <Trash2Icon aria-hidden="true" />
                      {t('common.delete')}
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null,
      },
    ],
    [t, f, can, canUpdate, dialog.ask, del.ask],
  );

  const filtered = list.activeFilterCount > 0 || !!list.q;
  const s = summary.data;
  const top = s?.byCategory[0];

  return (
    <Page>
      <PageHeader
        title={t('expenses.title')}
        description={t('expenses.description')}
        actions={
          <>
            <Button variant="outline" asChild leftIcon={<TagsIcon />}>
              <Link to="/expense-categories">{t('expenseCategories.title')}</Link>
            </Button>
            {can('expenses.create') ? (
              <Button leftIcon={<PlusIcon />} onClick={() => dialog.ask(null)}>
                {t('expenses.add')}
              </Button>
            ) : null}
          </>
        }
      />
      <PeriodPicker state={period} />
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="grid grid-cols-2 gap-3 xl:col-span-1 xl:grid-cols-1">
          {!s ? (
            Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : (
            <>
              <StatTile label={t('expenses.summary.total')} value={f.money(s.total)} hint={t('expenses.summary.cancelledExcluded')} icon={<WalletIcon />} />
              <StatTile label={t('expenses.summary.average')} value={s.count ? f.money(s.total / s.count) : '—'} hint={t('expenses.summary.count', { count: s.count })} />
              <StatTile className="col-span-2 xl:col-span-1" label={t('expenses.summary.top')} value={top ? f.loc(top.name) : '—'} hint={top ? f.money(top.amount) : undefined} />
            </>
          )}
        </div>
        <Panel className="xl:col-span-2" title={t('expenses.summary.byCategory')}>
          {!s ? <Skeleton className="h-48 rounded-lg" /> : <BarList items={s.byCategory} label={(c) => f.loc(c.name)} value={(c) => c.amount} format={f.money} colorOf={(c) => c.color} aside={(c) => `${f.percent(s.total ? (c.amount / s.total) * 100 : 0)} · ${t('expenses.summary.count', { count: c.count })}`} />}
        </Panel>
      </div>
      <DataTable
        id="expenses"
        label={t('expenses.title')}
        columns={columns}
        data={query.data?.items}
        getRowId={(e) => e.id}
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
        rowClassName={(e) => (e.status === 'CANCELLED' ? 'opacity-60' : undefined)}
        empty={{ title: t('expenses.empty'), description: t('expenses.emptyHint'), icon: <WalletIcon /> }}
        toolbar={
          <>
            <SearchInput value={list.q} onChange={list.setQ} placeholder={t('expenses.searchPlaceholder')} className="sm:w-64" />
            <FilterSelect label={t('expenses.filters.category')} value={list.filters.category} onChange={(v) => list.setFilter('category', v)} options={(categories.data ?? []).map((c) => ({ value: c.id, label: f.loc(c.name) }))} />
            <FilterSelect label={t('expenses.filters.status')} value={list.filters.status} onChange={(v) => list.setFilter('status', v)} options={EXPENSE_STATUSES.map((st) => ({ value: st, label: t(`status.expense.${st}`) }))} />
            <FilterSelect label={t('expenses.filters.paymentMethod')} value={list.filters.paymentMethod} onChange={(v) => list.setFilter('paymentMethod', v)} options={EXPENSE_PAYMENT_METHODS.map((m) => ({ value: m, label: t(`enums.expensePayment.${m}`) }))} />
            <form
              className="flex items-center gap-1"
              aria-label={t('expenses.filters.amount')}
              onSubmit={(e) => {
                e.preventDefault();
                list.setFilters({ min: minDraft.replace(/\D/g, ''), max: maxDraft.replace(/\D/g, '') });
              }}
            >
              <Input value={minDraft} onChange={(e) => setMinDraft(e.target.value)} onBlur={() => list.setFilter('min', minDraft.replace(/\D/g, ''))} inputMode="numeric" placeholder={`${t('expenses.filters.amount')} ${t('expenses.filters.min')}`} aria-label={`${t('expenses.filters.amount')} ${t('expenses.filters.min')}`} className="h-8 w-32 text-[13px]" />
              <span className="text-muted-foreground">–</span>
              <Input value={maxDraft} onChange={(e) => setMaxDraft(e.target.value)} onBlur={() => list.setFilter('max', maxDraft.replace(/\D/g, ''))} inputMode="numeric" placeholder={t('expenses.filters.max')} aria-label={`${t('expenses.filters.amount')} ${t('expenses.filters.max')}`} className="h-8 w-28 text-[13px]" />
            </form>
            {filtered ? (
              <Button variant="ghost" size="sm" onClick={list.reset}>
                {t('table.resetFilters')}
              </Button>
            ) : null}
          </>
        }
      />
      <ExpenseDialog expense={dialog.target} open={dialog.open} onOpenChange={dialog.onOpenChange} />
      <ConfirmDialog
        open={del.open}
        onOpenChange={del.onOpenChange}
        title={del.target ? t('expenses.deleteTitle', { title: del.target.title }) : ''}
        description={t('expenses.deleteText')}
        onConfirm={async () => {
          if (!del.target) return;
          try {
            await remove.mutateAsync(del.target.id);
            toast.success(t('form.deleted'));
          } catch (error) {
            toastError(t, error);
            throw error;
          }
        }}
      />
    </Page>
  );
}
