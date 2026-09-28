import { zodResolver } from '@hookform/resolvers/zod';
import { useAdminMutation, useAdminQuery, useSession } from '@vero/api-client';
import type { AdminExpenseCategory } from '@vero/types';
import {
  Badge,
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
  toast,
} from '@vero/ui';
import { expenseCategoryInputSchema } from '@vero/validation';
import { EllipsisIcon, LockIcon, PencilIcon, PlusIcon, TagsIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { ActiveBadge } from '../../components/common/badges';
import { ConfirmDialog, useConfirm, useDialogTarget } from '../../components/common/ConfirmDialog';
import { Page, PageHeader, usePageMeta } from '../../components/common/page';
import { DataTable, type DataColumn } from '../../components/data-table/DataTable';
import { ColorField, SwitchField, TextField } from '../../components/form/fields';
import { FieldGrid } from '../../components/form/form-kit';
import { LocalizedField } from '../../components/form/LocalizedField';
import { apiErrorCode, handleFormError, toastError } from '../../lib/errors';
import { useFormat } from '../../lib/format';

type Values = z.input<typeof expenseCategoryInputSchema>;
type Output = z.output<typeof expenseCategoryInputSchema>;

function toValues(c?: AdminExpenseCategory | null): Values {
  return { code: c?.code ?? '', name: { uz: c?.name.uz ?? '', ru: c?.name.ru ?? '', en: c?.name.en ?? '' }, color: c?.color ?? '#75757F', isActive: c?.isActive ?? true };
}

function CategoryDialog({ category, open, onOpenChange }: { category: AdminExpenseCategory | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const isNew = !category;
  const form = useForm<Values, unknown, Output>({ resolver: zodResolver(expenseCategoryInputSchema), defaultValues: toValues(category) });
  useEffect(() => {
    if (open) form.reset(toValues(category));
  }, [open, category, form]);
  const create = useAdminMutation((api, v: Output) => api.admin.expenseCategories.create(v), { invalidate: ['expenseCategories', 'expenses'] });
  const update = useAdminMutation((api, v: Output) => api.admin.expenseCategories.update(category!.id, v), { invalidate: ['expenseCategories', 'expenses'] });
  const pending = create.isPending || update.isPending;
  const submit = form.handleSubmit(async (values) => {
    try {
      if (isNew) await create.mutateAsync(values);
      else await update.mutateAsync(values);
      toast.success(isNew ? t('expenseCategories.form.created') : t('expenseCategories.form.saved'));
      onOpenChange(false);
    } catch (error) {
      handleFormError(t, form, error);
    }
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent size="md" closeLabel={t('common.close')}>
        <DialogHeader>
          <DialogTitle>{isNew ? t('expenseCategories.form.createTitle') : t('expenseCategories.form.editTitle')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void submit(e)} noValidate className="flex min-h-0 flex-1 flex-col gap-5">
            <DialogBody className="flex flex-col gap-5">
              <FieldGrid>
                <TextField
                  name="code"
                  label={t('expenseCategories.form.code')}
                  required
                  maxLength={31}
                  disabled={!!category?.isSystem}
                  description={category?.isSystem ? t('expenseCategories.form.codeLocked') : t('expenseCategories.form.codeHint')}
                  className="[&_input]:font-mono [&_input]:uppercase"
                  autoComplete="off"
                />
                <ColorField name="color" label={t('expenseCategories.form.color')} />
              </FieldGrid>
              <LocalizedField name="name" label={t('expenseCategories.form.name')} required="all" maxLength={60} />
              <SwitchField name="isActive" label={t('expenseCategories.form.active')} description={t('expenseCategories.form.activeHint')} />
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

export default function ExpenseCategoriesPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const { can } = useSession();
  usePageMeta(t('expenseCategories.title'));
  const query = useAdminQuery(['expenseCategories'], (api) => api.admin.expenseCategories.list(), { staleTime: 30_000 });
  const dialog = useDialogTarget<AdminExpenseCategory | null>();
  const del = useConfirm<AdminExpenseCategory>();
  const remove = useAdminMutation((api, id: string) => api.admin.expenseCategories.remove(id), { invalidate: ['expenseCategories', 'expenses'] });
  const canUpdate = can('expenses.update');
  const canDelete = can('expenses.delete');

  const columns = useMemo<DataColumn<AdminExpenseCategory>[]>(
    () => [
      {
        id: 'name',
        header: t('expenseCategories.columns.name'),
        meta: { alwaysVisible: true },
        cell: ({ row }) => (
          <span className="flex items-center gap-2.5">
            <span className="size-3 shrink-0 rounded-full" style={{ background: row.original.color }} aria-hidden="true" />
            {canUpdate ? (
              <button type="button" onClick={() => dialog.ask(row.original)} className="font-semibold text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                {f.loc(row.original.name)}
              </button>
            ) : (
              <span className="font-semibold">{f.loc(row.original.name)}</span>
            )}
            {row.original.isSystem ? (
              <Badge variant="muted" size="sm" className="gap-1">
                <LockIcon className="size-3" aria-hidden="true" />
                {t('expenseCategories.system')}
              </Badge>
            ) : null}
          </span>
        ),
      },
      { id: 'code', header: t('expenseCategories.columns.code'), cell: ({ row }) => <code className="font-mono text-xs">{row.original.code}</code> },
      { id: 'color', header: t('expenseCategories.columns.color'), cell: ({ row }) => <code className="font-mono text-xs text-muted-foreground uppercase">{row.original.color}</code> },
      { id: 'status', header: t('expenseCategories.columns.status'), cell: ({ row }) => <ActiveBadge active={row.original.isActive} /> },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('table.actions')}</span>,
        meta: { align: 'end', alwaysVisible: true },
        cell: ({ row }) =>
          canUpdate || (canDelete && !row.original.isSystem) ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`${t('table.rowActions')}: ${f.loc(row.original.name)}`}>
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
                {canDelete && !row.original.isSystem ? (
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
    [t, f, canUpdate, canDelete, dialog.ask, del.ask],
  );

  return (
    <Page>
      <PageHeader
        back={{ to: '/expenses', label: t('expenses.title') }}
        title={t('expenseCategories.title')}
        description={t('expenseCategories.description')}
        actions={
          can('expenses.create') ? (
            <Button leftIcon={<PlusIcon />} onClick={() => dialog.ask(null)}>
              {t('expenseCategories.add')}
            </Button>
          ) : undefined
        }
      />
      <DataTable
        id="expense-categories"
        label={t('expenseCategories.title')}
        columns={columns}
        data={query.data}
        getRowId={(c) => c.id}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        hidePagination
        hideColumnToggle
        empty={{ title: t('expenseCategories.empty'), icon: <TagsIcon /> }}
      />
      <CategoryDialog category={dialog.target} open={dialog.open} onOpenChange={dialog.onOpenChange} />
      <ConfirmDialog
        open={del.open}
        onOpenChange={del.onOpenChange}
        title={del.target ? t('expenseCategories.deleteTitle', { name: f.loc(del.target.name) }) : ''}
        description={t('expenseCategories.deleteText')}
        onConfirm={async () => {
          if (!del.target) return;
          try {
            await remove.mutateAsync(del.target.id);
            toast.success(t('form.deleted'));
          } catch (error) {
            const code = apiErrorCode(error);
            if (code === 'IN_USE') toast.error(t('expenseCategories.deleteInUse'));
            else if (code === 'SYSTEM_PROTECTED') toast.error(t('expenseCategories.deleteSystem'));
            else toastError(t, error);
            throw error;
          }
        }}
      />
    </Page>
  );
}
