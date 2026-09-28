import { useAdminList, useAdminMutation, useSession } from '@vero/api-client';
import type { LocalizedText } from '@vero/config';
import { COUPON_SCOPES, COUPON_TYPES, type AdminCoupon } from '@vero/types';
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
  type BadgeVariant,
} from '@vero/ui';
import { couponInputSchema } from '@vero/validation';
import { EllipsisIcon, PencilIcon, PlusIcon, ShuffleIcon, TicketPercentIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { ConfirmDialog, useConfirm, useDialogTarget } from '../../components/common/ConfirmDialog';
import { CopyButton } from '../../components/common/CopyButton';
import { Page, PageHeader, usePageMeta } from '../../components/common/page';
import { DataTable, type DataColumn } from '../../components/data-table/DataTable';
import { FilterSelect, SearchInput } from '../../components/data-table/toolbar';
import { DateTimeField, MoneyField, NumberField, SelectField, SwitchField, TextField } from '../../components/form/fields';
import { FieldGrid } from '../../components/form/form-kit';
import { LocalizedField } from '../../components/form/LocalizedField';
import { MultiSelectField } from '../../components/form/pickers';
import { handleFormError, toastError } from '../../lib/errors';
import { useFormat } from '../../lib/format';
import { emptyToUndefined, formResolver } from '../../lib/forms';
import { useListState } from '../../lib/url-state';
import { useBrandOptions, useCategoryOptions } from '../catalog/catalog-data';
import { ProductsMultiField } from '../catalog/product-picker';

type CouponState = 'active' | 'expired' | 'inactive' | 'scheduled' | 'exhausted';
const STATE_VARIANT: Record<CouponState, BadgeVariant> = { active: 'success', scheduled: 'info', expired: 'muted', inactive: 'muted', exhausted: 'warning' };

/** Same rules the API applies when a shopper enters the code. */
function couponState(c: AdminCoupon, now = Date.now()): CouponState {
  if (!c.isActive) return 'inactive';
  if (c.expiresAt && new Date(c.expiresAt).getTime() <= now) return 'expired';
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return 'scheduled';
  if (c.usageLimit && c.usedCount >= c.usageLimit) return 'exhausted';
  return 'active';
}

type Input = z.input<typeof couponInputSchema>;
type Output = z.output<typeof couponInputSchema>;
type Values = Omit<Input, 'value' | 'maxDiscount' | 'usageLimit' | 'perUserLimit' | 'minOrderAmount' | 'startsAt' | 'expiresAt' | 'description'> & {
  description: LocalizedText;
  value: number | '';
  maxDiscount: number | '';
  minOrderAmount: number | '';
  usageLimit: number | '';
  perUserLimit: number | '';
  startsAt: string;
  expiresAt: string;
};

function toValues(c?: AdminCoupon | null): Values {
  return {
    code: c?.code ?? '',
    description: { uz: c?.description.uz ?? '', ru: c?.description.ru ?? '', en: c?.description.en ?? '' },
    type: c?.type ?? 'percent',
    value: c?.value ?? '',
    maxDiscount: c?.maxDiscount ?? '',
    scope: c?.scope ?? 'all',
    products: c?.products ?? [],
    categories: c?.categories ?? [],
    brands: c?.brands ?? [],
    minOrderAmount: c?.minOrderAmount ?? 0,
    firstOrderOnly: c?.firstOrderOnly ?? false,
    startsAt: c?.startsAt ?? '',
    expiresAt: c?.expiresAt ?? '',
    usageLimit: c?.usageLimit ?? '',
    perUserLimit: c?.perUserLimit ?? '',
    isActive: c?.isActive ?? true,
  };
}

/** Only the target list of the chosen scope is kept; empty optional numbers are "not set". */
function prepare(v: Values) {
  return {
    ...v,
    maxDiscount: v.type === 'percent' ? emptyToUndefined(v.maxDiscount) : undefined,
    minOrderAmount: v.minOrderAmount === '' ? 0 : v.minOrderAmount,
    usageLimit: emptyToUndefined(v.usageLimit),
    perUserLimit: emptyToUndefined(v.perUserLimit),
    products: v.scope === 'products' ? v.products : [],
    categories: v.scope === 'categories' ? v.categories : [],
    brands: v.scope === 'brands' ? v.brands : [],
  };
}

function randomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `VERO-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')}`;
}

function CouponDialog({ coupon, open, onOpenChange }: { coupon: AdminCoupon | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const isNew = !coupon;
  const categories = useCategoryOptions();
  const brands = useBrandOptions();
  const form = useForm<Values, unknown, Output>({ resolver: formResolver<Values, typeof couponInputSchema>(couponInputSchema, prepare), defaultValues: toValues(coupon) });
  useEffect(() => {
    if (open) form.reset(toValues(coupon));
  }, [open, coupon, form]);
  const type = useWatch({ control: form.control, name: 'type' });
  const scope = useWatch({ control: form.control, name: 'scope' });
  const create = useAdminMutation((api, v: Output) => api.admin.coupons.create(v), { invalidate: ['coupons'] });
  const update = useAdminMutation((api, v: Output) => api.admin.coupons.update(coupon!.id, v), { invalidate: ['coupons'] });
  const pending = create.isPending || update.isPending;
  const submit = form.handleSubmit(async (values) => {
    try {
      if (isNew) await create.mutateAsync(values);
      else await update.mutateAsync(values);
      toast.success(isNew ? t('coupons.form.created') : t('coupons.form.saved'));
      onOpenChange(false);
    } catch (error) {
      handleFormError(t, form, error);
    }
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent size="lg" closeLabel={t('common.close')}>
        <DialogHeader>
          <DialogTitle>{isNew ? t('coupons.form.createTitle') : t('coupons.form.editTitle')}</DialogTitle>
          {coupon ? <DialogDescription>{t('coupons.form.usedCount', { count: coupon.usedCount })}</DialogDescription> : null}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void submit(e)} noValidate className="flex min-h-0 flex-1 flex-col gap-5">
            <DialogBody className="flex flex-col gap-5">
              <div className="flex items-start gap-2">
                <TextField name="code" label={t('coupons.form.code')} required maxLength={40} description={t('coupons.form.codeHint')} className="flex-1 [&_input]:font-mono [&_input]:uppercase" autoComplete="off" />
                <Button type="button" variant="outline" className="mt-6" leftIcon={<ShuffleIcon />} onClick={() => form.setValue('code', randomCode(), { shouldDirty: true, shouldValidate: form.formState.isSubmitted })}>
                  {t('coupons.form.generate')}
                </Button>
              </div>
              <LocalizedField name="description" label={t('coupons.form.description')} description={t('coupons.form.descriptionHint')} maxLength={300} />
              <FieldGrid cols={3}>
                <SelectField name="type" label={t('coupons.form.type')} required options={COUPON_TYPES.map((ty) => ({ value: ty, label: t(`enums.couponType.${ty}`) }))} />
                {type === 'percent' ? (
                  <NumberField name="value" label={t('coupons.form.percentValue')} required suffix="%" />
                ) : (
                  <MoneyField name="value" label={t('coupons.form.value')} required />
                )}
                {type === 'percent' ? <MoneyField name="maxDiscount" label={t('coupons.form.maxDiscount')} optional description={t('coupons.form.maxDiscountHint')} /> : <div />}
              </FieldGrid>
              <div className="flex flex-col gap-3 rounded-lg border border-border p-3.5">
                <SelectField name="scope" label={t('coupons.form.scope')} options={COUPON_SCOPES.map((s) => ({ value: s, label: t(`enums.couponScope.${s}`) }))} />
                {scope === 'products' ? <ProductsMultiField name="products" label={t('coupons.form.products')} description={t('coupons.form.scopeHint')} /> : null}
                {scope === 'categories' ? <MultiSelectField name="categories" label={t('coupons.form.categories')} description={t('coupons.form.scopeHint')} options={categories.options} /> : null}
                {scope === 'brands' ? <MultiSelectField name="brands" label={t('coupons.form.brands')} description={t('coupons.form.scopeHint')} options={brands.options} /> : null}
              </div>
              <FieldGrid>
                <MoneyField name="minOrderAmount" label={t('coupons.form.minOrderAmount')} />
                <SwitchField name="firstOrderOnly" label={t('coupons.form.firstOrderOnly')} description={t('coupons.form.firstOrderOnlyHint')} />
              </FieldGrid>
              <FieldGrid>
                <DateTimeField name="startsAt" label={t('coupons.form.startsAt')} optional />
                <DateTimeField name="expiresAt" label={t('coupons.form.expiresAt')} optional />
              </FieldGrid>
              <FieldGrid>
                <NumberField name="usageLimit" label={t('coupons.form.usageLimit')} optional description={t('coupons.form.usageLimitHint')} />
                <NumberField name="perUserLimit" label={t('coupons.form.perUserLimit')} optional />
              </FieldGrid>
              <SwitchField name="isActive" label={t('coupons.form.active')} description={t('coupons.form.activeHint')} />
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

const FILTERS = ['status', 'scope'] as const;

export default function CouponsPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const { can } = useSession();
  usePageMeta(t('coupons.title'));
  const list = useListState({ filters: FILTERS });
  const query = useAdminList('coupons', (api, p) => api.admin.coupons.list(p), list.params);
  const dialog = useDialogTarget<AdminCoupon | null>();
  const del = useConfirm<AdminCoupon>();
  const remove = useAdminMutation((api, id: string) => api.admin.coupons.remove(id), { invalidate: ['coupons'] });
  const canUpdate = can('coupons.update');

  const columns = useMemo<DataColumn<AdminCoupon>[]>(
    () => [
      {
        id: 'code',
        header: t('coupons.columns.code'),
        meta: { alwaysVisible: true },
        cell: ({ row }) => (
          <div className="flex min-w-40 flex-col gap-0.5">
            <span className="flex items-center gap-1">
              {canUpdate ? (
                <button type="button" onClick={() => dialog.ask(row.original)} className="font-mono font-semibold text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                  {row.original.code}
                </button>
              ) : (
                <span className="font-mono font-semibold">{row.original.code}</span>
              )}
              <CopyButton value={row.original.code} />
            </span>
            {f.loc(row.original.description) ? <span className="line-clamp-1 max-w-48 text-xs text-muted-foreground">{f.loc(row.original.description)}</span> : null}
          </div>
        ),
      },
      {
        id: 'discount',
        header: t('coupons.columns.discount'),
        meta: { align: 'end' },
        cell: ({ row }) => (
          <div className="flex flex-col items-end">
            <span className="font-semibold">{row.original.type === 'percent' ? `${f.number(row.original.value)}%` : f.money(row.original.value)}</span>
            {row.original.maxDiscount ? <span className="text-xs text-muted-foreground">{t('coupons.upTo', { amount: f.money(row.original.maxDiscount) })}</span> : null}
          </div>
        ),
      },
      {
        id: 'scope',
        header: t('coupons.columns.scope'),
        cell: ({ row }) => {
          const c = row.original;
          const count = c.scope === 'products' ? c.products.length : c.scope === 'categories' ? c.categories.length : c.scope === 'brands' ? c.brands.length : 0;
          return (
            <div className="flex flex-col">
              <span>
                {t(`enums.couponScope.${c.scope}`)}
                {c.scope !== 'all' ? <span className="text-muted-foreground"> · {count}</span> : null}
              </span>
              <span className="text-xs text-muted-foreground">
                {c.minOrderAmount ? `${t('coupons.columns.minOrder')}: ${f.money(c.minOrderAmount)}` : null}
                {c.minOrderAmount && c.firstOrderOnly ? ' · ' : null}
                {c.firstOrderOnly ? t('coupons.firstOrder') : null}
              </span>
            </div>
          );
        },
      },
      {
        id: 'validity',
        header: t('coupons.columns.validity'),
        cell: ({ row }) => {
          const c = row.original;
          return (
            <span className="text-[13px] tabular" title={[c.startsAt ? f.datetime(c.startsAt) : '', c.expiresAt ? f.datetime(c.expiresAt) : ''].filter(Boolean).join(' – ')}>
              {c.startsAt || c.expiresAt ? `${c.startsAt ? f.date(c.startsAt) : '…'} – ${c.expiresAt ? f.date(c.expiresAt) : '…'}` : t('coupons.always')}
            </span>
          );
        },
      },
      {
        id: 'usage',
        header: t('coupons.columns.usage'),
        meta: { align: 'end', defaultHidden: true },
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex flex-col items-end">
              <span className="font-semibold tabular">
                {f.number(c.usedCount)}
                <span className="font-normal text-muted-foreground"> / {c.usageLimit ? f.number(c.usageLimit) : '∞'}</span>
              </span>
              {c.perUserLimit ? <span className="text-xs text-muted-foreground">{t('coupons.perUser', { count: c.perUserLimit })}</span> : null}
            </div>
          );
        },
      },
      {
        id: 'status',
        header: t('coupons.columns.status'),
        cell: ({ row }) => {
          const c = row.original;
          const state = couponState(c);
          return (
            <div className="flex flex-col items-start gap-1">
              <Badge variant={STATE_VARIANT[state]} size="sm" dot>
                {t(`status.coupon.${state}`)}
              </Badge>
              <span className="text-xs text-muted-foreground tabular" title={c.perUserLimit ? t('coupons.perUser', { count: c.perUserLimit }) : undefined}>
                {t('coupons.usedShort', { used: f.number(c.usedCount), limit: c.usageLimit ? f.number(c.usageLimit) : '∞' })}
              </span>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('table.actions')}</span>,
        meta: { align: 'end', alwaysVisible: true },
        cell: ({ row }) =>
          canUpdate || can('coupons.delete') ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`${t('table.rowActions')}: ${row.original.code}`}>
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
                {can('coupons.delete') ? (
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

  return (
    <Page>
      <PageHeader
        title={t('coupons.title')}
        description={t('coupons.description')}
        actions={
          can('coupons.create') ? (
            <Button leftIcon={<PlusIcon />} onClick={() => dialog.ask(null)}>
              {t('coupons.add')}
            </Button>
          ) : undefined
        }
      />
      <DataTable
        id="coupons"
        label={t('coupons.title')}
        columns={columns}
        data={query.data?.items}
        getRowId={(c) => c.id}
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
        empty={{ title: t('coupons.empty'), description: t('coupons.emptyHint'), icon: <TicketPercentIcon /> }}
        toolbar={
          <>
            <SearchInput value={list.q} onChange={list.setQ} placeholder={t('coupons.searchPlaceholder')} className="sm:w-64" />
            <FilterSelect label={t('coupons.filters.status')} value={list.filters.status} onChange={(v) => list.setFilter('status', v)} options={(['active', 'expired', 'inactive'] as const).map((s) => ({ value: s, label: t(`status.coupon.${s}`) }))} />
            <FilterSelect label={t('coupons.filters.scope')} value={list.filters.scope} onChange={(v) => list.setFilter('scope', v)} options={COUPON_SCOPES.map((s) => ({ value: s, label: t(`enums.couponScope.${s}`) }))} />
            {filtered ? (
              <Button variant="ghost" size="sm" onClick={list.reset}>
                {t('table.resetFilters')}
              </Button>
            ) : null}
          </>
        }
      />
      <CouponDialog coupon={dialog.target} open={dialog.open} onOpenChange={dialog.onOpenChange} />
      <ConfirmDialog
        open={del.open}
        onOpenChange={del.onOpenChange}
        title={del.target ? t('coupons.deleteTitle', { code: del.target.code }) : ''}
        description={t('coupons.deleteText')}
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
