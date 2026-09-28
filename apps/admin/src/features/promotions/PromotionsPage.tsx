import { useAdminList, useAdminMutation, useSession } from '@vero/api-client';
import type { LocalizedText } from '@vero/config';
import { COUPON_TYPES, PROMOTION_TYPES, type AdminPromotion } from '@vero/types';
import {
  Alert,
  AlertDescription,
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
  type BadgeVariant,
} from '@vero/ui';
import { promotionInputSchema } from '@vero/validation';
import { BadgePercentIcon, EllipsisIcon, HomeIcon, InfoIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { ConfirmDialog, useConfirm, useDialogTarget } from '../../components/common/ConfirmDialog';
import { Page, PageHeader, usePageMeta } from '../../components/common/page';
import { Thumb } from '../../components/common/Thumb';
import { DataTable, type DataColumn } from '../../components/data-table/DataTable';
import { SearchInput } from '../../components/data-table/toolbar';
import { DateTimeField, MoneyField, NumberField, SelectField, SlugField, SwitchField } from '../../components/form/fields';
import { FieldGrid } from '../../components/form/form-kit';
import { LocalizedField } from '../../components/form/LocalizedField';
import { MultiSelectField } from '../../components/form/pickers';
import { ImageField, imageToForm, type FormImage } from '../../components/media/ImageFields';
import { handleFormError, toastError } from '../../lib/errors';
import { useFormat } from '../../lib/format';
import { formResolver, slugFrom } from '../../lib/forms';
import { useListState } from '../../lib/url-state';
import { useBrandOptions, useCategoryOptions } from '../catalog/catalog-data';
import { ProductsMultiField } from '../catalog/product-picker';

const STATE_VARIANT: Record<AdminPromotion['state'], BadgeVariant> = { active: 'success', scheduled: 'info', ended: 'muted', inactive: 'muted' };

type Input = z.input<typeof promotionInputSchema>;
type Output = z.output<typeof promotionInputSchema>;
type Values = Omit<Input, 'image' | 'discountValue' | 'startsAt' | 'endsAt' | 'name' | 'description'> & {
  name: LocalizedText;
  description: LocalizedText;
  discountValue: number | '';
  startsAt: string;
  endsAt: string;
  image: FormImage | null;
};

const L = (v?: Partial<LocalizedText>): LocalizedText => ({ uz: v?.uz ?? '', ru: v?.ru ?? '', en: v?.en ?? '' });

function toValues(p?: AdminPromotion | null): Values {
  return {
    name: L(p?.name),
    slug: p?.slug ?? '',
    description: L(p?.description),
    type: p?.type ?? 'CAMPAIGN',
    discountType: p?.discountType ?? 'percent',
    discountValue: p?.discountValue ?? '',
    products: p?.products ?? [],
    categories: p?.categories ?? [],
    brands: p?.brands ?? [],
    startsAt: p?.startsAt ?? '',
    endsAt: p?.endsAt ?? '',
    priority: p?.priority ?? 0,
    isActive: p?.isActive ?? true,
    showOnHome: p?.showOnHome ?? true,
    image: imageToForm(p?.image),
  };
}

function PromotionDialog({ promotion, open, onOpenChange }: { promotion: AdminPromotion | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const f = useFormat();
  const isNew = !promotion;
  const categories = useCategoryOptions();
  const brands = useBrandOptions();
  const form = useForm<Values, unknown, Output>({ resolver: formResolver<Values, typeof promotionInputSchema>(promotionInputSchema), defaultValues: toValues(promotion) });
  const [slugTouched, setSlugTouched] = useState(false);
  useEffect(() => {
    if (!open) return;
    form.reset(toValues(promotion));
    setSlugTouched(!!promotion);
  }, [open, promotion, form]);
  const nameEn = useWatch({ control: form.control, name: 'name.en' });
  const nameUz = useWatch({ control: form.control, name: 'name.uz' });
  useEffect(() => {
    if (promotion || slugTouched || !open) return;
    form.setValue('slug', slugFrom(nameEn || nameUz), { shouldDirty: false });
  }, [nameEn, nameUz, slugTouched, open, promotion, form]);
  const discountType = useWatch({ control: form.control, name: 'discountType' });

  const create = useAdminMutation((api, v: Output) => api.admin.promotions.create(v), { invalidate: ['promotions', 'products'] });
  const update = useAdminMutation((api, v: Output) => api.admin.promotions.update(promotion!.id, v), { invalidate: ['promotions', 'products'] });
  const pending = create.isPending || update.isPending;
  const submit = form.handleSubmit(async (values) => {
    try {
      if (isNew) await create.mutateAsync(values);
      else await update.mutateAsync(values);
      toast.success(isNew ? t('promotions.form.created') : t('promotions.form.saved'));
      onOpenChange(false);
    } catch (error) {
      handleFormError(t, form, error);
    }
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent size="lg" closeLabel={t('common.close')}>
        <DialogHeader>
          <DialogTitle>{isNew ? t('promotions.form.createTitle') : t('promotions.form.editTitle')}</DialogTitle>
          {promotion ? <DialogDescription>{`${f.loc(promotion.name)} · ${t('promotions.affected', { count: promotion.productCount })}`}</DialogDescription> : null}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void submit(e)} noValidate className="flex min-h-0 flex-1 flex-col gap-5">
            <DialogBody className="flex flex-col gap-5">
              <LocalizedField name="name" label={t('promotions.form.name')} required="all" maxLength={120} />
              <FieldGrid>
                <div onInput={() => setSlugTouched(true)}>
                  <SlugField name="slug" label={t('common.slug')} onGenerate={() => slugFrom(form.getValues('name.en') || form.getValues('name.uz'))} />
                </div>
                <SelectField name="type" label={t('promotions.form.type')} required options={PROMOTION_TYPES.map((ty) => ({ value: ty, label: t(`enums.promotionType.${ty}`) }))} />
              </FieldGrid>
              <LocalizedField name="description" label={t('promotions.form.description')} multiline rows={3} maxLength={2000} />
              <FieldGrid cols={3}>
                <SelectField name="discountType" label={t('promotions.form.discountType')} required options={COUPON_TYPES.map((ty) => ({ value: ty, label: t(`enums.couponType.${ty}`) }))} />
                {discountType === 'percent' ? (
                  <NumberField name="discountValue" label={t('promotions.form.discountValue')} required suffix="%" description={t('promotions.form.discountHint')} />
                ) : (
                  <MoneyField name="discountValue" label={t('promotions.form.discountValue')} required />
                )}
                <NumberField name="priority" label={t('promotions.form.priority')} />
              </FieldGrid>
              <p className="-mt-3 text-xs text-muted-foreground">{t('promotions.form.priorityHint')}</p>
              <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-3.5">
                <legend className="px-1 text-sm font-semibold">{t('promotions.form.targets')}</legend>
                <p className="text-xs text-muted-foreground">{t('promotions.form.targetsHint')}</p>
                <ProductsMultiField name="products" label={t('promotions.form.products')} />
                <MultiSelectField name="categories" label={t('promotions.form.categories')} options={categories.options} />
                <MultiSelectField name="brands" label={t('promotions.form.brands')} options={brands.options} />
              </fieldset>
              <FieldGrid>
                <DateTimeField name="startsAt" label={t('promotions.form.startsAt')} required />
                <DateTimeField name="endsAt" label={t('promotions.form.endsAt')} required />
              </FieldGrid>
              <ImageField name="image" label={t('promotions.form.image')} folder="promotions" aspect="wide" />
              <FieldGrid>
                <SwitchField name="isActive" label={t('promotions.form.active')} description={t('promotions.form.activeHint')} />
                <SwitchField name="showOnHome" label={t('promotions.form.showOnHome')} />
              </FieldGrid>
              <Alert variant="info" icon={<InfoIcon />}>
                <AlertDescription>{t('promotions.form.repricingHint')}</AlertDescription>
              </Alert>
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

export default function PromotionsPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const { can } = useSession();
  usePageMeta(t('promotions.title'));
  const list = useListState({});
  const query = useAdminList('promotions', (api, p) => api.admin.promotions.list(p), list.params);
  const dialog = useDialogTarget<AdminPromotion | null>();
  const del = useConfirm<AdminPromotion>();
  const remove = useAdminMutation((api, id: string) => api.admin.promotions.remove(id), { invalidate: ['promotions', 'products'] });
  const canUpdate = can('promotions.update');

  const columns = useMemo<DataColumn<AdminPromotion>[]>(
    () => [
      {
        id: 'promotion',
        header: t('promotions.columns.promotion'),
        meta: { alwaysVisible: true, cellClassName: 'whitespace-normal' },
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="flex min-w-60 items-center gap-3">
              <Thumb src={p.image?.thumb ?? p.image?.url} size="md" alt="" />
              <div className="flex min-w-0 flex-col gap-0.5">
                {canUpdate ? (
                  <button type="button" onClick={() => dialog.ask(p)} className="line-clamp-2 text-start font-semibold text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                    {f.loc(p.name)}
                  </button>
                ) : (
                  <span className="line-clamp-2 font-semibold">{f.loc(p.name)}</span>
                )}
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="truncate font-mono">/{p.slug}</span>
                  {p.showOnHome ? (
                    <span className="inline-flex items-center gap-0.5" title={t('promotions.onHome')}>
                      <HomeIcon className="size-3" aria-hidden="true" />
                      <span className="sr-only">{t('promotions.onHome')}</span>
                    </span>
                  ) : null}
                </span>
              </div>
            </div>
          );
        },
      },
      { id: 'type', header: t('promotions.columns.type'), cell: ({ row }) => t(`enums.promotionType.${row.original.type}`) },
      {
        id: 'discount',
        header: t('promotions.columns.discount'),
        meta: { align: 'end' },
        cell: ({ row }) => <span className="font-semibold">{row.original.discountType === 'percent' ? `−${f.number(row.original.discountValue)}%` : `−${f.money(row.original.discountValue)}`}</span>,
      },
      {
        id: 'targets',
        header: t('promotions.columns.targets'),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{t('promotions.affected', { count: row.original.productCount })}</span>
            <span className="text-xs text-muted-foreground">{t('promotions.targetsValue', { products: row.original.products.length, categories: row.original.categories.length, brands: row.original.brands.length })}</span>
          </div>
        ),
      },
      {
        id: 'period',
        header: t('promotions.columns.period'),
        cell: ({ row }) => (
          <div className="flex flex-col text-[13px] tabular">
            <span>{f.datetime(row.original.startsAt)}</span>
            <span className="text-muted-foreground">{f.datetime(row.original.endsAt)}</span>
          </div>
        ),
      },
      { id: 'priority', header: t('promotions.columns.priority'), meta: { align: 'end' }, cell: ({ row }) => <span className="text-muted-foreground">{row.original.priority}</span> },
      {
        id: 'state',
        header: t('promotions.columns.state'),
        cell: ({ row }) => (
          <Badge variant={STATE_VARIANT[row.original.state]} size="sm" dot>
            {t(`status.promotion.${row.original.state}`)}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('table.actions')}</span>,
        meta: { align: 'end', alwaysVisible: true },
        cell: ({ row }) =>
          canUpdate || can('promotions.delete') ? (
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
                {can('promotions.delete') ? (
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

  return (
    <Page>
      <PageHeader
        title={t('promotions.title')}
        description={t('promotions.description')}
        actions={
          can('promotions.create') ? (
            <Button leftIcon={<PlusIcon />} onClick={() => dialog.ask(null)}>
              {t('promotions.add')}
            </Button>
          ) : undefined
        }
      />
      <DataTable
        id="promotions"
        label={t('promotions.title')}
        columns={columns}
        data={query.data?.items}
        getRowId={(p) => p.id}
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
        empty={{ title: t('promotions.empty'), description: t('promotions.emptyHint'), icon: <BadgePercentIcon /> }}
        toolbar={<SearchInput value={list.q} onChange={list.setQ} placeholder={t('promotions.searchPlaceholder')} className="sm:w-72" />}
      />
      <PromotionDialog promotion={dialog.target} open={dialog.open} onOpenChange={dialog.onOpenChange} />
      <ConfirmDialog
        open={del.open}
        onOpenChange={del.onOpenChange}
        title={del.target ? t('promotions.deleteTitle', { name: f.loc(del.target.name) }) : ''}
        description={t('promotions.deleteText')}
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
