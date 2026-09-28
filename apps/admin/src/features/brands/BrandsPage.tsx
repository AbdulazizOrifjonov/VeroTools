import { useAdminList, useAdminMutation, useSession } from '@vero/api-client';
import type { LocalizedText } from '@vero/config';
import type { AdminBrand } from '@vero/types';
import {
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
import { brandInputSchema } from '@vero/validation';
import { AwardIcon, EllipsisIcon, ExternalLinkIcon, PackageIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import type { z } from 'zod';
import { ActiveBadge } from '../../components/common/badges';
import { ConfirmDialog, useConfirm, useDialogTarget } from '../../components/common/ConfirmDialog';
import { Page, PageHeader, usePageMeta } from '../../components/common/page';
import { Thumb } from '../../components/common/Thumb';
import { DataTable, type DataColumn } from '../../components/data-table/DataTable';
import { SearchInput } from '../../components/data-table/toolbar';
import { SlugField, SwitchField, TextField } from '../../components/form/fields';
import { FieldGrid } from '../../components/form/form-kit';
import { LocalizedField } from '../../components/form/LocalizedField';
import { ImageField, imageToForm, type FormImage } from '../../components/media/ImageFields';
import { apiErrorCode, handleFormError, toastError } from '../../lib/errors';
import { useFormat } from '../../lib/format';
import { formResolver, slugFrom } from '../../lib/forms';
import { useListState } from '../../lib/url-state';

type Input = z.input<typeof brandInputSchema>;
type Output = z.output<typeof brandInputSchema>;
type Values = Omit<Input, 'logo'> & { logo: FormImage | null };

const L = (v?: Partial<LocalizedText>): LocalizedText => ({ uz: v?.uz ?? '', ru: v?.ru ?? '', en: v?.en ?? '' });

function toValues(b?: AdminBrand): Values {
  return { name: b?.name ?? '', slug: b?.slug ?? '', description: L(b?.description), country: L(b?.country), website: b?.website ?? '', logo: imageToForm(b?.logo), isActive: b?.isActive ?? true };
}

function BrandDialog({ brand, open, onOpenChange }: { brand: AdminBrand | null | undefined; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const isNew = !brand;
  const form = useForm<Values, unknown, Output>({ resolver: formResolver<Values, typeof brandInputSchema>(brandInputSchema), defaultValues: toValues(brand ?? undefined) });
  const [slugTouched, setSlugTouched] = useState(false);
  useEffect(() => {
    if (!open) return;
    form.reset(toValues(brand ?? undefined));
    setSlugTouched(!!brand);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when the dialog opens for a record
  }, [open, brand?.id]);
  const name = useWatch({ control: form.control, name: 'name' });
  useEffect(() => {
    if (brand || slugTouched || !open) return;
    form.setValue('slug', slugFrom(name), { shouldDirty: false });
  }, [name, slugTouched, open, brand, form]);

  const create = useAdminMutation((api, v: Output) => api.admin.brands.create(v), { invalidate: ['brands', 'products'] });
  const update = useAdminMutation((api, v: Output) => api.admin.brands.update(brand!.id, v), { invalidate: ['brands', 'products'] });
  const pending = create.isPending || update.isPending;
  const submit = form.handleSubmit(async (values) => {
    try {
      if (isNew) await create.mutateAsync(values);
      else await update.mutateAsync(values);
      toast.success(isNew ? t('brands.form.created') : t('brands.form.saved'));
      onOpenChange(false);
    } catch (error) {
      handleFormError(t, form, error);
    }
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent size="lg" closeLabel={t('common.close')}>
        <DialogHeader>
          <DialogTitle>{isNew ? t('brands.form.createTitle') : t('brands.form.editTitle')}</DialogTitle>
          {brand ? <DialogDescription>{brand.name}</DialogDescription> : null}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void submit(e)} noValidate className="flex min-h-0 flex-1 flex-col gap-5">
            <DialogBody className="flex flex-col gap-5">
              <FieldGrid>
                <TextField name="name" label={t('brands.form.name')} required maxLength={80} description={t('brands.form.nameHint')} />
                <div onInput={() => setSlugTouched(true)}>
                  <SlugField name="slug" label={t('common.slug')} onGenerate={() => slugFrom(form.getValues('name'))} />
                </div>
              </FieldGrid>
              <ImageField name="logo" label={t('brands.form.logo')} folder="brands" aspect="wide" />
              <LocalizedField name="country" label={t('brands.form.country')} maxLength={80} />
              <TextField name="website" label={t('brands.form.website')} type="url" placeholder="https://" maxLength={500} description={t('brands.form.websiteHint')} />
              <LocalizedField name="description" label={t('brands.form.description')} multiline rows={4} maxLength={3000} />
              <SwitchField name="isActive" label={t('brands.form.active')} description={t('brands.form.activeHint')} />
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

export default function BrandsPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const navigate = useNavigate();
  const { can } = useSession();
  usePageMeta(t('brands.title'));
  const list = useListState({ defaultLimit: 20 });
  const query = useAdminList('brands', (api, p) => api.admin.brands.list(p), list.params);
  const dialog = useDialogTarget<AdminBrand | null>();
  const del = useConfirm<AdminBrand>();
  const remove = useAdminMutation((api, id: string) => api.admin.brands.remove(id), { invalidate: ['brands', 'products'] });
  const canUpdate = can('brands.update');

  const columns = useMemo<DataColumn<AdminBrand>[]>(
    () => [
      {
        id: 'brand',
        header: t('brands.columns.brand'),
        meta: { alwaysVisible: true },
        cell: ({ row }) => {
          const b = row.original;
          return (
            <div className="flex min-w-48 items-center gap-3">
              <Thumb src={b.logo?.thumb ?? b.logo?.url} size="md" alt="" />
              <div className="flex min-w-0 flex-col">
                {canUpdate ? (
                  <button type="button" onClick={() => dialog.ask(b)} className="truncate text-start font-semibold text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                    {b.name}
                  </button>
                ) : (
                  <span className="truncate font-semibold">{b.name}</span>
                )}
                <span className="truncate font-mono text-xs text-muted-foreground">/{b.slug}</span>
              </div>
            </div>
          );
        },
      },
      { id: 'country', header: t('brands.columns.country'), cell: ({ row }) => f.loc(row.original.country) || <span className="text-muted-foreground">—</span> },
      {
        id: 'website',
        header: t('brands.columns.website'),
        cell: ({ row }) =>
          row.original.website ? (
            <a href={row.original.website} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-48 items-center gap-1 truncate text-foreground underline-offset-2 hover:underline">
              <span className="truncate">{row.original.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
              <ExternalLinkIcon className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
            </a>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: 'products',
        header: t('brands.columns.products'),
        meta: { align: 'end' },
        cell: ({ row }) =>
          can('products.read') && row.original.productCount ? (
            <Link to={`/products?brand=${row.original.id}`} className="font-semibold text-foreground tabular underline-offset-2 hover:underline">
              {f.number(row.original.productCount)}
            </Link>
          ) : (
            <span className="text-muted-foreground tabular">{f.number(row.original.productCount)}</span>
          ),
      },
      { id: 'status', header: t('brands.columns.status'), cell: ({ row }) => <ActiveBadge active={row.original.isActive} /> },
      { id: 'updatedAt', header: t('brands.columns.updated'), meta: { defaultHidden: true }, cell: ({ row }) => <span className="text-muted-foreground tabular">{f.date(row.original.updatedAt)}</span> },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('table.actions')}</span>,
        meta: { align: 'end', alwaysVisible: true },
        cell: ({ row }) => {
          const b = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`${t('table.rowActions')}: ${b.name}`}>
                  <EllipsisIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {canUpdate ? (
                  <DropdownMenuItem onSelect={() => dialog.ask(b)}>
                    <PencilIcon aria-hidden="true" />
                    {t('common.edit')}
                  </DropdownMenuItem>
                ) : null}
                {can('products.read') ? (
                  <DropdownMenuItem onSelect={() => void navigate(`/products?brand=${b.id}`)}>
                    <PackageIcon aria-hidden="true" />
                    {t('brands.viewProducts')}
                  </DropdownMenuItem>
                ) : null}
                {can('brands.delete') ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => del.ask(b)}>
                      <Trash2Icon aria-hidden="true" />
                      {t('common.delete')}
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [t, f, can, canUpdate, navigate, dialog.ask, del.ask],
  );

  return (
    <Page>
      <PageHeader
        title={t('brands.title')}
        description={t('brands.description')}
        actions={
          can('brands.create') ? (
            <Button leftIcon={<PlusIcon />} onClick={() => dialog.ask(null)}>
              {t('brands.add')}
            </Button>
          ) : undefined
        }
      />
      <DataTable
        id="brands"
        label={t('brands.title')}
        columns={columns}
        data={query.data?.items}
        getRowId={(b) => b.id}
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
        filtered={!!list.q}
        onResetFilters={list.reset}
        empty={{ title: t('brands.empty'), description: t('brands.emptyHint'), icon: <AwardIcon /> }}
        toolbar={<SearchInput value={list.q} onChange={list.setQ} placeholder={t('brands.searchPlaceholder')} className="sm:w-72" />}
      />
      <BrandDialog brand={dialog.target} open={dialog.open} onOpenChange={dialog.onOpenChange} />
      <ConfirmDialog
        open={del.open}
        onOpenChange={del.onOpenChange}
        title={del.target ? t('brands.deleteTitle', { name: del.target.name }) : ''}
        description={t('brands.deleteText')}
        onConfirm={async () => {
          if (!del.target) return;
          try {
            await remove.mutateAsync(del.target.id);
            toast.success(t('form.deleted'));
          } catch (error) {
            if (apiErrorCode(error) === 'IN_USE') toast.error(t('brands.deleteInUse'));
            else toastError(t, error);
            throw error;
          }
        }}
      />
    </Page>
  );
}
