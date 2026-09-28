import { useAddresses, usePickupPoints } from '@vero/api-client';
import type { DeliveryOptionsDTO } from '@vero/types';
import { Alert, AlertDescription, Badge, Button, Checkbox, cn, Form, Label, RadioCard, RadioGroup, Skeleton } from '@vero/ui';
import { checkoutAddressSchema } from '@vero/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftIcon, ArrowRightIcon, ClockIcon, MapPinIcon, PhoneIcon, PlusIcon, StoreIcon, TruckIcon } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { formatUzPhone } from '@vero/utils';
import { ErrorState } from '../../components/common/states';
import { useFormat } from '../../hooks/use-format';
import { useLang } from '../../hooks/use-lang';
import { AddressFields, formatAddress } from '../address/address';
import { EMPTY_ADDRESS, type CheckoutDraft } from './state';

export function DeliveryStep({
  draft,
  update,
  options,
  optionsLoading,
  onBack,
  onNext,
  notice,
}: {
  draft: CheckoutDraft;
  update: (patch: Partial<CheckoutDraft> | ((d: CheckoutDraft) => Partial<CheckoutDraft>)) => void;
  /** delivery options for the region of the selected / typed address */
  options: DeliveryOptionsDTO | undefined;
  optionsLoading: boolean;
  onBack: () => void;
  onNext: () => void;
  /** error from the order API (DELIVERY_UNAVAILABLE …) */
  notice?: string | null;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const lang = useLang();
  const addresses = useAddresses();
  const pickupPoints = usePickupPoints();
  const saveId = useId();
  const [error, setError] = useState<string | null>(null);
  const d = draft.delivery;
  const saved = addresses.data ?? [];
  const addressId = d.addressId ?? (saved.find((a) => a.isDefault)?.id ?? saved[0]?.id ?? 'new');
  const usingNew = addressId === 'new' || !saved.length;

  const form = useForm({
    resolver: zodResolver(checkoutAddressSchema),
    defaultValues: { ...EMPTY_ADDRESS, ...(d.address ?? {}) },
  });

  // choose the default saved address once the list is loaded
  useEffect(() => {
    if (!d.addressId && saved.length) update((x) => ({ delivery: { ...x.delivery, addressId } }));
  }, [d.addressId, saved.length, addressId, update]);

  useEffect(() => {
    const sub = form.watch((v) =>
      update((x) => ({
        delivery: {
          ...x.delivery,
          address: {
            region: v.region ?? '',
            city: v.city ?? '',
            district: v.district ?? '',
            street: v.street ?? '',
            house: v.house ?? '',
            apartment: v.apartment ?? '',
            comment: v.comment ?? '',
          },
        },
      })),
    );
    return () => sub.unsubscribe();
  }, [form, update]);

  const setDelivery = (patch: Partial<CheckoutDraft['delivery']>) => {
    setError(null);
    update((x) => ({ delivery: { ...x.delivery, ...patch } }));
  };

  const courier = options?.courier ?? null;

  const next = () => {
    setError(null);
    if (d.method === 'pickup') {
      if (!d.pickupPointId) {
        setError(t('validation:pickupRequired'));
        return;
      }
      onNext();
      return;
    }
    if (usingNew) {
      void form.handleSubmit(() => {
        if (!courier && !optionsLoading) {
          setError(t('shop:checkout.deliveryUnavailable'));
          return;
        }
        if (d.addressId !== 'new') setDelivery({ addressId: 'new' });
        onNext();
      })();
      return;
    }
    if (!courier && !optionsLoading) {
      setError(t('shop:checkout.deliveryUnavailable'));
      return;
    }
    onNext();
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold tracking-tight">{t('shop:checkout.deliveryTitle')}</h2>
      </div>
      {notice ? (
        <Alert variant="danger">
          <AlertDescription className="text-foreground">{notice}</AlertDescription>
        </Alert>
      ) : null}
      <RadioGroup
        value={d.method}
        onValueChange={(v) => setDelivery({ method: v as 'courier' | 'pickup' })}
        className="grid gap-3 sm:grid-cols-2"
        aria-label={t('shop:checkout.deliveryTitle')}
      >
        <RadioCard value="courier">
          <span className="flex items-center gap-2 font-semibold">
            <TruckIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            {t('shop:checkout.courierTitle')}
          </span>
          <span className="text-xs text-muted-foreground">{t('checkout.courierHint')}</span>
        </RadioCard>
        <RadioCard value="pickup">
          <span className="flex items-center gap-2 font-semibold">
            <StoreIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            {t('shop:checkout.pickupTitle')}
          </span>
          <span className="text-xs text-muted-foreground">{t('shop:checkout.pickupDesc')}</span>
        </RadioCard>
      </RadioGroup>

      {d.method === 'courier' ? (
        <section aria-labelledby="addr-title" className="flex flex-col gap-4">
          <h3 id="addr-title" className="text-base font-bold">
            {t('shop:checkout.addressTitle')}
          </h3>
          {addresses.isPending ? (
            <Skeleton className="h-24 w-full rounded-lg" />
          ) : addresses.isError ? (
            <ErrorState compact error={addresses.error} onRetry={() => void addresses.refetch()} />
          ) : saved.length ? (
            <RadioGroup value={usingNew ? 'new' : addressId} onValueChange={(v) => setDelivery({ addressId: v })} className="gap-2.5" aria-label={t('shop:checkout.savedAddresses')}>
              {saved.map((a) => (
                <RadioCard key={a.id} value={a.id}>
                  <span className="flex flex-wrap items-center gap-2 font-semibold">
                    {a.label || `${a.firstName} ${a.lastName}`}
                    {a.isDefault ? (
                      <Badge variant="secondary" size="sm">
                        {t('shop:addresses.default')}
                      </Badge>
                    ) : null}
                  </span>
                  <span className="text-sm text-muted-foreground">{formatAddress(a, lang, t)}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {a.firstName} {a.lastName} · {formatUzPhone(a.phone)}
                  </span>
                </RadioCard>
              ))}
              <RadioCard value="new">
                <span className="flex items-center gap-2 font-semibold">
                  <PlusIcon className="size-4" aria-hidden="true" />
                  {t('shop:checkout.newAddress')}
                </span>
              </RadioCard>
            </RadioGroup>
          ) : null}
          {usingNew ? (
            <Form {...form}>
              <form onSubmit={(e) => e.preventDefault()} noValidate className="flex flex-col gap-4 rounded-xl border border-border p-4 sm:p-5">
                <AddressFields control={form.control} setValue={form.setValue} />
                <div className="flex items-center gap-2.5">
                  <Checkbox id={saveId} checked={d.saveAddress} onCheckedChange={(v) => setDelivery({ saveAddress: v === true })} />
                  <Label htmlFor={saveId} className="font-medium">
                    {t('shop:checkout.saveAddress')}
                  </Label>
                </div>
              </form>
            </Form>
          ) : null}
          <div className="rounded-lg bg-surface p-3.5 text-sm" aria-live="polite">
            {optionsLoading ? (
              <Skeleton className="h-4 w-2/3" />
            ) : courier ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex flex-col">
                  <span className="font-semibold">{t('shop:checkout.courierDesc', { zone: courier.zoneName, min: courier.minDays, max: courier.maxDays })}</span>
                  <span className="text-xs text-muted-foreground">
                    {t('shop:checkout.courierEstimate', { from: f.date(courier.estimatedFrom, 'dayMonth'), to: f.date(courier.estimatedTo, 'dayMonth') })}
                  </span>
                </span>
                <span className={cn('font-bold tabular-nums', courier.isFree && 'text-success')}>{courier.isFree ? t('shop:checkout.freeDelivery') : f.price(courier.price)}</span>
                {!courier.isFree && courier.freeThreshold > 0 ? (
                  <span className="w-full text-xs text-muted-foreground">{t('product.freeFrom', { amount: f.price(courier.freeThreshold) })}</span>
                ) : null}
              </div>
            ) : options ? (
              <span className="text-danger">{t('shop:checkout.deliveryUnavailable')}</span>
            ) : (
              <span className="text-muted-foreground">{t('shop:checkout.selectRegionFirst')}</span>
            )}
          </div>
        </section>
      ) : (
        <section aria-labelledby="pickup-title" className="flex flex-col gap-3">
          <h3 id="pickup-title" className="text-base font-bold">
            {t('shop:checkout.choosePickup')}
          </h3>
          {pickupPoints.isPending ? (
            <Skeleton className="h-32 w-full rounded-lg" />
          ) : pickupPoints.isError ? (
            <ErrorState compact error={pickupPoints.error} onRetry={() => void pickupPoints.refetch()} />
          ) : (
            <RadioGroup value={d.pickupPointId ?? ''} onValueChange={(v) => setDelivery({ pickupPointId: v })} className="gap-2.5" aria-label={t('shop:checkout.choosePickup')}>
              {pickupPoints.data.map((p) => (
                <RadioCard key={p.id} value={p.id}>
                  <span className="font-semibold">{p.name}</span>
                  <span className="flex gap-1.5 text-sm text-muted-foreground">
                    <MapPinIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    {p.address}
                  </span>
                  <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <ClockIcon className="size-3.5" aria-hidden="true" />
                      {p.workingHours}
                    </span>
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      <PhoneIcon className="size-3.5" aria-hidden="true" />
                      {formatUzPhone(p.phone)}
                    </span>
                  </span>
                </RadioCard>
              ))}
            </RadioGroup>
          )}
          <p className="text-xs text-muted-foreground">{t('shop:checkout.pickupNoAddress')}</p>
        </section>
      )}

      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button variant="ghost" onClick={onBack} leftIcon={<ArrowLeftIcon aria-hidden="true" />}>
          {t('common:actions.back')}
        </Button>
        <Button size="lg" onClick={next} rightIcon={<ArrowRightIcon aria-hidden="true" />}>
          {t('common:actions.continue')}
        </Button>
      </div>
    </div>
  );
}
