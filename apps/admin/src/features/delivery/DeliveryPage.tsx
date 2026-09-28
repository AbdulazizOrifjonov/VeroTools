import { zodResolver } from '@hookform/resolvers/zod';
import { useAdminList, useAdminMutation, useSession } from '@vero/api-client';
import { UZ_REGIONS, type LocalizedText } from '@vero/config';
import type { AdminDeliveryZone, AdminPickupPoint } from '@vero/types';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from '@vero/ui';
import { deliveryZoneInputSchema, pickupPointInputSchema } from '@vero/validation';
import { EllipsisIcon, MapIcon, MapPinIcon, PencilIcon, PlusIcon, StoreIcon, Trash2Icon, TruckIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { ActiveBadge } from '../../components/common/badges';
import { ConfirmDialog, useConfirm, useDialogTarget } from '../../components/common/ConfirmDialog';
import { Page, PageHeader, usePageMeta } from '../../components/common/page';
import { DataTable, type DataColumn } from '../../components/data-table/DataTable';
import { MoneyField, NumberField, PhoneField, SelectField, SwitchField, TextField } from '../../components/form/fields';
import { FieldGrid } from '../../components/form/form-kit';
import { LocalizedField } from '../../components/form/LocalizedField';
import { MultiSelectField } from '../../components/form/pickers';
import { handleFormError, toastError } from '../../lib/errors';
import { useFormat } from '../../lib/format';
import { formResolver } from '../../lib/forms';
import { useSearchParamState } from '../../lib/url-state';

const L = (v?: Partial<LocalizedText>): LocalizedText => ({ uz: v?.uz ?? '', ru: v?.ru ?? '', en: v?.en ?? '' });

function useRegionName() {
  const f = useFormat();
  return useMemo(() => {
    const map = new Map(UZ_REGIONS.map((r) => [r.code, r.name]));
    return (code: string) => (map.has(code) ? f.loc(map.get(code)) : code);
  }, [f]);
}

/* ------------------------------------------------------------------ zones */

type ZoneValues = z.input<typeof deliveryZoneInputSchema>;
type ZoneOutput = z.output<typeof deliveryZoneInputSchema>;

function zoneValues(z?: AdminDeliveryZone | null): ZoneValues {
  return {
    code: z?.code ?? '',
    name: L(z?.name),
    regions: z?.regions ?? [],
    price: z?.price ?? ('' as unknown as number),
    freeThreshold: z?.freeThreshold ?? 0,
    minDays: z?.minDays ?? 1,
    maxDays: z?.maxDays ?? 3,
    priority: z?.priority ?? 0,
    isActive: z?.isActive ?? true,
  };
}

function ZoneDialog({ zone, open, onOpenChange }: { zone: AdminDeliveryZone | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const f = useFormat();
  const isNew = !zone;
  const form = useForm<ZoneValues, unknown, ZoneOutput>({ resolver: zodResolver(deliveryZoneInputSchema), defaultValues: zoneValues(zone) });
  useEffect(() => {
    if (open) form.reset(zoneValues(zone));
  }, [open, zone, form]);
  const regionOptions = useMemo(() => UZ_REGIONS.map((r) => ({ value: r.code, label: f.loc(r.name) })), [f]);
  const create = useAdminMutation((api, v: ZoneOutput) => api.admin.deliveryZones.create(v), { invalidate: ['deliveryZones'] });
  const update = useAdminMutation((api, v: ZoneOutput) => api.admin.deliveryZones.update(zone!.id, v), { invalidate: ['deliveryZones'] });
  const pending = create.isPending || update.isPending;
  const submit = form.handleSubmit(async (values) => {
    try {
      if (isNew) await create.mutateAsync(values);
      else await update.mutateAsync(values);
      toast.success(isNew ? t('delivery.zones.form.created') : t('delivery.zones.form.saved'));
      onOpenChange(false);
    } catch (error) {
      handleFormError(t, form, error);
    }
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent size="lg" closeLabel={t('common.close')}>
        <DialogHeader>
          <DialogTitle>{isNew ? t('delivery.zones.form.createTitle') : t('delivery.zones.form.editTitle')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void submit(e)} noValidate className="flex min-h-0 flex-1 flex-col gap-5">
            <DialogBody className="flex flex-col gap-5">
              <TextField name="code" label={t('delivery.zones.form.code')} required maxLength={40} description={t('delivery.zones.form.codeHint')} className="sm:max-w-xs [&_input]:font-mono" autoComplete="off" />
              <LocalizedField name="name" label={t('delivery.zones.form.name')} required="all" maxLength={80} />
              <MultiSelectField name="regions" label={t('delivery.zones.form.regions')} required description={t('delivery.zones.form.regionsHint')} options={regionOptions} />
              <FieldGrid>
                <MoneyField name="price" label={t('delivery.zones.form.price')} required />
                <MoneyField name="freeThreshold" label={t('delivery.zones.form.freeThreshold')} description={t('delivery.zones.form.freeThresholdHint')} />
              </FieldGrid>
              <FieldGrid cols={3}>
                <NumberField name="minDays" label={t('delivery.zones.form.minDays')} required suffix={t('common.days')} />
                <NumberField name="maxDays" label={t('delivery.zones.form.maxDays')} required suffix={t('common.days')} />
                <NumberField name="priority" label={t('delivery.zones.form.priority')} />
              </FieldGrid>
              <SwitchField name="isActive" label={t('delivery.zones.form.active')} />
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

function ZonesTab() {
  const { t } = useTranslation();
  const f = useFormat();
  const { can } = useSession();
  const regionName = useRegionName();
  const query = useAdminList('deliveryZones', (api) => api.admin.deliveryZones.list());
  const dialog = useDialogTarget<AdminDeliveryZone | null>();
  const del = useConfirm<AdminDeliveryZone>();
  const remove = useAdminMutation((api, id: string) => api.admin.deliveryZones.remove(id), { invalidate: ['deliveryZones'] });
  const canEdit = can('delivery.update');

  const columns = useMemo<DataColumn<AdminDeliveryZone>[]>(
    () => [
      {
        id: 'zone',
        header: t('delivery.zones.columns.zone'),
        meta: { alwaysVisible: true },
        cell: ({ row }) => (
          <div className="flex flex-col">
            {canEdit ? (
              <button type="button" onClick={() => dialog.ask(row.original)} className="text-start font-semibold text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                {f.loc(row.original.name)}
              </button>
            ) : (
              <span className="font-semibold">{f.loc(row.original.name)}</span>
            )}
            <code className="font-mono text-xs text-muted-foreground">{row.original.code}</code>
          </div>
        ),
      },
      {
        id: 'regions',
        header: t('delivery.zones.columns.regions'),
        meta: { cellClassName: 'whitespace-normal' },
        cell: ({ row }) => {
          const regions = row.original.regions;
          return (
            <div className="flex max-w-96 flex-wrap gap-1" title={regions.map(regionName).join(', ')}>
              {regions.slice(0, 4).map((r) => (
                <Badge key={r} variant="secondary" size="sm">
                  {regionName(r)}
                </Badge>
              ))}
              {regions.length > 4 ? (
                <Badge variant="outline" size="sm">
                  {t('delivery.zones.regionsMore', { count: regions.length - 4 })}
                </Badge>
              ) : null}
            </div>
          );
        },
      },
      { id: 'price', header: t('delivery.zones.columns.price'), meta: { align: 'end' }, cell: ({ row }) => <span className="font-semibold">{f.money(row.original.price)}</span> },
      { id: 'free', header: t('delivery.zones.columns.free'), meta: { align: 'end' }, cell: ({ row }) => (row.original.freeThreshold ? f.money(row.original.freeThreshold) : <span className="text-muted-foreground">{t('delivery.zones.noFree')}</span>) },
      {
        id: 'days',
        header: t('delivery.zones.columns.days'),
        cell: ({ row }) => (row.original.maxDays === 0 ? t('delivery.zones.sameDay') : t('delivery.zones.daysValue', { min: row.original.minDays, max: row.original.maxDays })),
      },
      { id: 'priority', header: t('delivery.zones.columns.priority'), meta: { align: 'end' }, cell: ({ row }) => <span className="text-muted-foreground">{row.original.priority}</span> },
      { id: 'status', header: t('delivery.zones.columns.status'), cell: ({ row }) => <ActiveBadge active={row.original.isActive} /> },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('table.actions')}</span>,
        meta: { align: 'end', alwaysVisible: true },
        cell: ({ row }) =>
          canEdit ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`${t('table.rowActions')}: ${f.loc(row.original.name)}`}>
                  <EllipsisIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onSelect={() => dialog.ask(row.original)}>
                  <PencilIcon aria-hidden="true" />
                  {t('common.edit')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => del.ask(row.original)}>
                  <Trash2Icon aria-hidden="true" />
                  {t('common.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null,
      },
    ],
    [t, f, canEdit, regionName, dialog.ask, del.ask],
  );

  return (
    <>
      <DataTable
        id="delivery-zones"
        label={t('delivery.tabs.zones')}
        columns={columns}
        data={query.data?.items}
        getRowId={(z) => z.id}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        hidePagination
        empty={{ title: t('delivery.zones.empty'), description: t('delivery.zones.emptyHint'), icon: <TruckIcon /> }}
        toolbarEnd={
          canEdit ? (
            <Button size="sm" leftIcon={<PlusIcon />} onClick={() => dialog.ask(null)}>
              {t('delivery.zones.add')}
            </Button>
          ) : undefined
        }
        toolbar={<span className="text-[13px] text-muted-foreground tabular">{t('table.total', { count: query.data?.items.length ?? 0 })}</span>}
      />
      <ZoneDialog zone={dialog.target} open={dialog.open} onOpenChange={dialog.onOpenChange} />
      <ConfirmDialog
        open={del.open}
        onOpenChange={del.onOpenChange}
        title={del.target ? t('delivery.zones.deleteTitle', { name: f.loc(del.target.name) }) : ''}
        description={t('delivery.zones.deleteText')}
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
    </>
  );
}

/* ------------------------------------------------------------ pickup points */

type PointValues = Omit<z.input<typeof pickupPointInputSchema>, 'location'> & { location: { lat: number | ''; lng: number | '' } };
type PointOutput = z.output<typeof pickupPointInputSchema>;

function pointValues(p?: AdminPickupPoint | null): PointValues {
  return {
    code: p?.code ?? '',
    name: L(p?.name),
    address: L(p?.address),
    region: p?.region ?? 'tashkent-city',
    city: p?.city ?? '',
    phone: p?.phone ?? '',
    workingHours: L(p?.workingHours),
    location: { lat: p?.location.lat ?? '', lng: p?.location.lng ?? '' },
    isActive: p?.isActive ?? true,
  };
}

function PointDialog({ point, open, onOpenChange }: { point: AdminPickupPoint | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const f = useFormat();
  const isNew = !point;
  const form = useForm<PointValues, unknown, PointOutput>({ resolver: formResolver<PointValues, typeof pickupPointInputSchema>(pickupPointInputSchema), defaultValues: pointValues(point) });
  useEffect(() => {
    if (open) form.reset(pointValues(point));
  }, [open, point, form]);
  const create = useAdminMutation((api, v: PointOutput) => api.admin.pickupPoints.create(v), { invalidate: ['pickupPoints'] });
  const update = useAdminMutation((api, v: PointOutput) => api.admin.pickupPoints.update(point!.id, v), { invalidate: ['pickupPoints'] });
  const pending = create.isPending || update.isPending;
  const submit = form.handleSubmit(async (values) => {
    try {
      if (isNew) await create.mutateAsync(values);
      else await update.mutateAsync(values);
      toast.success(isNew ? t('delivery.pickup.form.created') : t('delivery.pickup.form.saved'));
      onOpenChange(false);
    } catch (error) {
      handleFormError(t, form, error);
    }
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent size="lg" closeLabel={t('common.close')}>
        <DialogHeader>
          <DialogTitle>{isNew ? t('delivery.pickup.form.createTitle') : t('delivery.pickup.form.editTitle')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void submit(e)} noValidate className="flex min-h-0 flex-1 flex-col gap-5">
            <DialogBody className="flex flex-col gap-5">
              <FieldGrid>
                <TextField name="code" label={t('delivery.pickup.form.code')} required maxLength={40} description={t('delivery.zones.form.codeHint')} className="[&_input]:font-mono" autoComplete="off" />
                <PhoneField name="phone" label={t('delivery.pickup.form.phone')} required />
              </FieldGrid>
              <LocalizedField name="name" label={t('delivery.pickup.form.name')} required="all" maxLength={120} />
              <LocalizedField name="address" label={t('delivery.pickup.form.address')} required="all" multiline rows={2} maxLength={300} />
              <FieldGrid>
                <SelectField name="region" label={t('delivery.pickup.form.region')} required options={UZ_REGIONS.map((r) => ({ value: r.code, label: f.loc(r.name) }))} />
                <TextField name="city" label={t('delivery.pickup.form.city')} required maxLength={80} />
              </FieldGrid>
              <LocalizedField name="workingHours" label={t('delivery.pickup.form.workingHours')} required="default" maxLength={120} placeholder={t('delivery.pickup.form.workingHoursPlaceholder')} />
              <div className="flex flex-col gap-2">
                <FieldGrid>
                  <NumberField name="location.lat" label={t('delivery.pickup.form.lat')} required decimal allowNegative />
                  <NumberField name="location.lng" label={t('delivery.pickup.form.lng')} required decimal allowNegative />
                </FieldGrid>
                <p className="text-xs text-muted-foreground">{t('delivery.pickup.form.coordsHint')}</p>
              </div>
              <SwitchField name="isActive" label={t('delivery.pickup.form.active')} />
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

function PickupTab() {
  const { t } = useTranslation();
  const f = useFormat();
  const { can } = useSession();
  const regionName = useRegionName();
  const query = useAdminList('pickupPoints', (api) => api.admin.pickupPoints.list());
  const dialog = useDialogTarget<AdminPickupPoint | null>();
  const del = useConfirm<AdminPickupPoint>();
  const remove = useAdminMutation((api, id: string) => api.admin.pickupPoints.remove(id), { invalidate: ['pickupPoints'] });
  const canEdit = can('delivery.update');

  const columns = useMemo<DataColumn<AdminPickupPoint>[]>(
    () => [
      {
        id: 'point',
        header: t('delivery.pickup.columns.point'),
        meta: { alwaysVisible: true },
        cell: ({ row }) => (
          <div className="flex flex-col">
            {canEdit ? (
              <button type="button" onClick={() => dialog.ask(row.original)} className="text-start font-semibold text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                {f.loc(row.original.name)}
              </button>
            ) : (
              <span className="font-semibold">{f.loc(row.original.name)}</span>
            )}
            <code className="font-mono text-xs text-muted-foreground">{row.original.code}</code>
          </div>
        ),
      },
      {
        id: 'address',
        header: t('delivery.pickup.columns.address'),
        meta: { cellClassName: 'whitespace-normal' },
        cell: ({ row }) => (
          <div className="flex max-w-80 min-w-48 flex-col gap-0.5">
            <span className="line-clamp-2">{f.loc(row.original.address)}</span>
            <a
              href={`https://yandex.uz/maps/?pt=${row.original.location.lng},${row.original.location.lat}&z=16&l=map`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              <MapIcon className="size-3" aria-hidden="true" />
              {t('delivery.pickup.map')}
            </a>
          </div>
        ),
      },
      {
        id: 'region',
        header: t('delivery.pickup.columns.region'),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span>{regionName(row.original.region)}</span>
            <span className="text-xs text-muted-foreground">{row.original.city}</span>
          </div>
        ),
      },
      { id: 'phone', header: t('delivery.pickup.columns.phone'), cell: ({ row }) => <span className="tabular">{f.phone(row.original.phone)}</span> },
      { id: 'hours', header: t('delivery.pickup.columns.hours'), meta: { cellClassName: 'whitespace-normal' }, cell: ({ row }) => <span className="line-clamp-2 max-w-52 text-[13px]">{f.loc(row.original.workingHours)}</span> },
      { id: 'status', header: t('delivery.pickup.columns.status'), cell: ({ row }) => <ActiveBadge active={row.original.isActive} /> },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('table.actions')}</span>,
        meta: { align: 'end', alwaysVisible: true },
        cell: ({ row }) =>
          canEdit ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`${t('table.rowActions')}: ${f.loc(row.original.name)}`}>
                  <EllipsisIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onSelect={() => dialog.ask(row.original)}>
                  <PencilIcon aria-hidden="true" />
                  {t('common.edit')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => del.ask(row.original)}>
                  <Trash2Icon aria-hidden="true" />
                  {t('common.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null,
      },
    ],
    [t, f, canEdit, regionName, dialog.ask, del.ask],
  );

  return (
    <>
      <DataTable
        id="pickup-points"
        label={t('delivery.tabs.pickup')}
        columns={columns}
        data={query.data?.items}
        getRowId={(p) => p.id}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        hidePagination
        empty={{ title: t('delivery.pickup.empty'), description: t('delivery.pickup.emptyHint'), icon: <MapPinIcon /> }}
        toolbarEnd={
          canEdit ? (
            <Button size="sm" leftIcon={<PlusIcon />} onClick={() => dialog.ask(null)}>
              {t('delivery.pickup.add')}
            </Button>
          ) : undefined
        }
        toolbar={<span className="text-[13px] text-muted-foreground tabular">{t('table.total', { count: query.data?.items.length ?? 0 })}</span>}
      />
      <PointDialog point={dialog.target} open={dialog.open} onOpenChange={dialog.onOpenChange} />
      <ConfirmDialog
        open={del.open}
        onOpenChange={del.onOpenChange}
        title={del.target ? t('delivery.pickup.deleteTitle', { name: f.loc(del.target.name) }) : ''}
        description={t('delivery.pickup.deleteText')}
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
    </>
  );
}

export default function DeliveryPage() {
  const { t } = useTranslation();
  usePageMeta(t('delivery.title'));
  const [tab, setTab] = useSearchParamState('tab', 'zones');
  return (
    <Page>
      <PageHeader title={t('delivery.title')} description={t('delivery.description')} />
      <Tabs value={tab} onValueChange={(v) => setTab(v)} className="gap-4">
        <TabsList>
          <TabsTrigger value="zones">
            <TruckIcon aria-hidden="true" />
            {t('delivery.tabs.zones')}
          </TabsTrigger>
          <TabsTrigger value="pickup">
            <StoreIcon aria-hidden="true" />
            {t('delivery.tabs.pickup')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="zones">
          <ZonesTab />
        </TabsContent>
        <TabsContent value="pickup">
          <PickupTab />
        </TabsContent>
      </Tabs>
    </Page>
  );
}
