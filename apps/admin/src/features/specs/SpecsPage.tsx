import { zodResolver } from '@hookform/resolvers/zod';
import { useAdminMutation, useSession } from '@vero/api-client';
import { SPEC_GROUPS, SPEC_TYPES, type AdminSpecDefinition } from '@vero/types';
import {
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
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
import { specDefinitionInputSchema } from '@vero/validation';
import { EllipsisIcon, PencilIcon, PlusIcon, SlidersHorizontalIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { ConfirmDialog, useConfirm, useDialogTarget } from '../../components/common/ConfirmDialog';
import { Page, PageHeader, usePageMeta } from '../../components/common/page';
import { DataTable, type DataColumn } from '../../components/data-table/DataTable';
import { FilterSelect, SearchInput } from '../../components/data-table/toolbar';
import { NumberField, SelectField, SwitchField, TextField } from '../../components/form/fields';
import { FieldGrid } from '../../components/form/form-kit';
import { LocalizedField } from '../../components/form/LocalizedField';
import { MultiSelectField } from '../../components/form/pickers';
import { apiErrorCode, handleFormError, toastError } from '../../lib/errors';
import { useFormat } from '../../lib/format';
import { useSearchParamState } from '../../lib/url-state';
import { useCategoryOptions, useSpecDefinitions } from '../catalog/catalog-data';

type Values = z.input<typeof specDefinitionInputSchema>;
type Output = z.output<typeof specDefinitionInputSchema>;

function toValues(s?: AdminSpecDefinition): Values {
  return {
    key: s?.key ?? '',
    label: { uz: s?.label.uz ?? '', ru: s?.label.ru ?? '', en: s?.label.en ?? '' },
    unit: s?.unit ?? '',
    type: s?.type ?? 'text',
    filterable: s?.filterable ?? false,
    group: s?.group ?? 'main',
    order: s?.order ?? 100,
    categories: s?.categories ?? [],
  };
}

function SpecDialog({ spec, open, onOpenChange }: { spec: AdminSpecDefinition | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const f = useFormat();
  const isNew = !spec;
  const categories = useCategoryOptions();
  const form = useForm<Values, unknown, Output>({ resolver: zodResolver(specDefinitionInputSchema), defaultValues: toValues(spec ?? undefined) });
  useEffect(() => {
    if (open) form.reset(toValues(spec ?? undefined));
  }, [open, spec, form]);
  const create = useAdminMutation((api, v: Output) => api.admin.specs.create(v), { invalidate: ['specs', 'categories'] });
  const update = useAdminMutation((api, v: Output) => api.admin.specs.update(spec!.id, v), { invalidate: ['specs', 'categories'] });
  const pending = create.isPending || update.isPending;
  const submit = form.handleSubmit(async (values) => {
    try {
      if (isNew) await create.mutateAsync(values);
      else await update.mutateAsync(values);
      toast.success(isNew ? t('specs.form.created') : t('specs.form.saved'));
      onOpenChange(false);
    } catch (error) {
      handleFormError(t, form, error);
    }
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent size="lg" closeLabel={t('common.close')}>
        <DialogHeader>
          <DialogTitle>{isNew ? t('specs.form.createTitle') : t('specs.form.editTitle')}</DialogTitle>
          {spec ? <DialogDescription>{f.loc(spec.label)}</DialogDescription> : null}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void submit(e)} noValidate className="flex min-h-0 flex-1 flex-col gap-5">
            <DialogBody className="flex flex-col gap-5">
              <FieldGrid>
                <TextField
                  name="key"
                  label={t('specs.form.key')}
                  required
                  disabled={!isNew}
                  maxLength={60}
                  placeholder="power_w"
                  description={isNew ? t('specs.form.keyHint') : t('specs.form.keyLocked')}
                  className="[&_input]:font-mono"
                />
                <TextField name="unit" label={t('specs.form.unit')} optional maxLength={20} description={t('specs.form.unitHint')} />
              </FieldGrid>
              <LocalizedField name="label" label={t('specs.form.label')} required="all" maxLength={80} />
              <FieldGrid cols={3}>
                <SelectField name="type" label={t('specs.form.type')} required options={SPEC_TYPES.map((ty) => ({ value: ty, label: t(`enums.specType.${ty}`) }))} />
                <SelectField name="group" label={t('specs.form.group')} options={SPEC_GROUPS.map((g) => ({ value: g, label: t(`enums.specGroup.${g}`) }))} />
                <NumberField name="order" label={t('specs.form.order')} />
              </FieldGrid>
              <SwitchField name="filterable" label={t('specs.form.filterable')} description={t('specs.form.filterableHint')} />
              <MultiSelectField name="categories" label={t('specs.form.categories')} description={t('specs.form.categoriesHint')} options={categories.options} />
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

const normalize = (s: string) => s.toLowerCase().replace(/['‘’ʻʼ`]/g, '');

export default function SpecsPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const { can } = useSession();
  usePageMeta(t('specs.title'));
  const specs = useSpecDefinitions();
  const [q, setQ] = useSearchParamState('q');
  const [group, setGroup] = useSearchParamState('group');
  const dialog = useDialogTarget<AdminSpecDefinition | null>();
  const del = useConfirm<AdminSpecDefinition>();
  const remove = useAdminMutation((api, id: string) => api.admin.specs.remove(id), { invalidate: ['specs', 'categories'] });
  const canEdit = can('products.update');
  const categories = useCategoryOptions();
  // categories that use a key: the category filter lists (specKeys) plus the definition's own references
  const usage = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const { node } of categories.flat) {
      for (const key of node.specKeys) map.set(key, (map.get(key) ?? new Set()).add(node.id));
    }
    return map;
  }, [categories.flat]);
  const usedIn = (s: AdminSpecDefinition) => new Set([...(usage.get(s.key) ?? []), ...s.categories]).size;

  // the API returns every definition at once (a few dozen) — filter and sort on the client
  const rows = useMemo(() => {
    const query = normalize(q.trim());
    return (specs.data ?? [])
      .filter((s) => !group || s.group === group)
      .filter((s) => !query || normalize(`${s.key} ${s.label.uz} ${s.label.ru} ${s.label.en}`).includes(query))
      .sort((a, b) => SPEC_GROUPS.indexOf(a.group) - SPEC_GROUPS.indexOf(b.group) || a.order - b.order || a.key.localeCompare(b.key));
  }, [specs.data, q, group]);

  const columns = useMemo<DataColumn<AdminSpecDefinition>[]>(
    () => [
      {
        id: 'label',
        header: t('specs.columns.label'),
        meta: { alwaysVisible: true },
        cell: ({ row }) => (
          <div className="flex min-w-44 flex-col">
            {canEdit ? (
              <button type="button" onClick={() => dialog.ask(row.original)} className="truncate text-start font-semibold text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                {f.loc(row.original.label)}
              </button>
            ) : (
              <span className="truncate font-semibold">{f.loc(row.original.label)}</span>
            )}
            <code className="font-mono text-xs text-muted-foreground">{row.original.key}</code>
          </div>
        ),
      },
      { id: 'type', header: t('specs.columns.type'), cell: ({ row }) => t(`enums.specType.${row.original.type}`) },
      { id: 'unit', header: t('specs.columns.unit'), cell: ({ row }) => row.original.unit || <span className="text-muted-foreground">—</span> },
      { id: 'group', header: t('specs.columns.group'), cell: ({ row }) => t(`enums.specGroup.${row.original.group}`) },
      {
        id: 'filterable',
        header: t('specs.columns.filterable'),
        cell: ({ row }) =>
          row.original.filterable ? (
            <Badge variant="info" size="sm">
              {t('specs.filterable')}
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: 'categories',
        header: t('specs.columns.categories'),
        meta: { align: 'end' },
        cell: ({ row }) => {
          const count = usedIn(row.original);
          return count ? t('specs.usedIn', { count }) : <span className="text-muted-foreground">—</span>;
        },
      },
      { id: 'order', header: t('specs.columns.order'), meta: { align: 'end' }, cell: ({ row }) => <span className="text-muted-foreground">{row.original.order}</span> },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('table.actions')}</span>,
        meta: { align: 'end', alwaysVisible: true },
        cell: ({ row }) =>
          canEdit || can('products.delete') ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`${t('table.rowActions')}: ${row.original.key}`}>
                  <EllipsisIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {canEdit ? (
                  <DropdownMenuItem onSelect={() => dialog.ask(row.original)}>
                    <PencilIcon aria-hidden="true" />
                    {t('common.edit')}
                  </DropdownMenuItem>
                ) : null}
                {can('products.delete') ? (
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- usedIn derives from `usage`
    [t, f, can, canEdit, dialog.ask, del.ask, usage],
  );

  return (
    <Page>
      <PageHeader
        title={t('specs.title')}
        description={t('specs.description')}
        actions={
          canEdit ? (
            <Button leftIcon={<PlusIcon />} onClick={() => dialog.ask(null)}>
              {t('specs.add')}
            </Button>
          ) : undefined
        }
      />
      <DataTable
        id="specs"
        label={t('specs.title')}
        columns={columns}
        data={specs.data ? rows : undefined}
        getRowId={(s) => s.id}
        isLoading={specs.isLoading}
        isFetching={specs.isFetching}
        error={specs.error}
        onRetry={() => void specs.refetch()}
        hidePagination
        total={rows.length}
        filtered={!!q || !!group}
        onResetFilters={() => {
          setQ(null);
          setGroup(null);
        }}
        empty={{ title: t('specs.empty'), description: t('specs.emptyHint'), icon: <SlidersHorizontalIcon /> }}
        toolbar={
          <>
            <SearchInput value={q} onChange={(v) => setQ(v || null)} placeholder={t('specs.searchPlaceholder')} className="sm:w-72" />
            <FilterSelect label={t('specs.columns.group')} value={group} onChange={(v) => setGroup(v || null)} options={SPEC_GROUPS.map((g) => ({ value: g, label: t(`enums.specGroup.${g}`) }))} />
            <span className="text-[13px] text-muted-foreground tabular">{t('table.total', { count: rows.length })}</span>
          </>
        }
      />
      <SpecDialog spec={dialog.target} open={dialog.open} onOpenChange={dialog.onOpenChange} />
      <ConfirmDialog
        open={del.open}
        onOpenChange={del.onOpenChange}
        title={del.target ? t('specs.deleteTitle', { name: f.loc(del.target.label) }) : ''}
        description={t('specs.deleteText')}
        onConfirm={async () => {
          if (!del.target) return;
          try {
            await remove.mutateAsync(del.target.id);
            toast.success(t('form.deleted'));
          } catch (error) {
            if (apiErrorCode(error) === 'IN_USE') toast.error(t('specs.deleteInUse'));
            else toastError(t, error);
            throw error;
          }
        }}
      />
    </Page>
  );
}
