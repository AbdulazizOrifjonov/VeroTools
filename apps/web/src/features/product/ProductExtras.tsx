import { useAddresses, useDeliveryOptions, useSession, useSettings } from '@vero/api-client';
import { UZ_REGIONS, type Language } from '@vero/config';
import {
  cn,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  NativeSelect,
  NativeSelectOption,
  Skeleton,
} from '@vero/ui';
import { calcInstallment, formatUzPhone } from '@vero/utils';
import { CalendarClockIcon, CheckIcon, ClockIcon, MapPinIcon, PhoneIcon, ShieldCheckIcon, StoreIcon, TruckIcon } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormat } from '../../hooks/use-format';
import { useLang } from '../../hooks/use-lang';
import { readString, writeString } from '../../lib/storage';

const REGION_KEY = 'ot.deliveryRegion';

export function regionOptions(lang: Language) {
  return UZ_REGIONS.map((r) => ({ value: r.code, label: r.name[lang] }));
}

/** Courier price / timing for the chosen region and the pickup points. */
export function DeliveryEstimate({ amount }: { amount: number }) {
  const { t } = useTranslation();
  const f = useFormat();
  const lang = useLang();
  const id = useId();
  const { isAuthenticated } = useSession();
  const addresses = useAddresses();
  const [region, setRegion] = useState<string>(() => readString(REGION_KEY) ?? 'tashkent-city');
  const [pickupOpen, setPickupOpen] = useState(false);

  // signed-in customers see the estimate for their default address first
  useEffect(() => {
    if (!isAuthenticated || readString(REGION_KEY)) return;
    const def = addresses.data?.find((a) => a.isDefault) ?? addresses.data?.[0];
    if (def) setRegion(def.region);
  }, [isAuthenticated, addresses.data]);

  const options = useDeliveryOptions(region, amount);
  const courier = options.data?.courier;
  const points = options.data?.pickupPoints ?? [];

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:p-5">
      <h2 id={`${id}-title`} className="flex items-center gap-2 text-sm font-bold">
        <TruckIcon className="size-[18px] text-muted-foreground" aria-hidden="true" />
        {t('common:product.delivery')}
      </h2>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-region`} className="text-xs font-semibold text-muted-foreground">
          {t('product.deliveryTo')}
        </label>
        <NativeSelect
          id={`${id}-region`}
          selectSize="sm"
          value={region}
          onChange={(e) => {
            setRegion(e.target.value);
            writeString(REGION_KEY, e.target.value);
          }}
        >
          {regionOptions(lang).map((r) => (
            <NativeSelectOption key={r.value} value={r.value}>
              {r.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      {options.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : options.isError ? (
        <p className="text-sm text-muted-foreground">{t('shop:product.deliveryText')}</p>
      ) : (
        <ul className="flex flex-col gap-3 text-sm">
          <li className="flex gap-3">
            <TruckIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            {courier ? (
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-semibold">{t('shop:checkout.courierTitle')}</span>
                  <span className={cn('font-bold tabular-nums', courier.isFree && 'text-success')}>
                    {courier.isFree ? t('common:labels.free') : f.price(courier.price)}
                  </span>
                </div>
                <span className="text-muted-foreground">
                  {t('product.deliveryWindow', { from: f.date(courier.estimatedFrom, 'dayMonth'), to: f.date(courier.estimatedTo, 'dayMonth') })}
                </span>
                {!courier.isFree && courier.freeThreshold > 0 ? (
                  <span className="text-xs text-muted-foreground">{t('product.freeFrom', { amount: f.price(courier.freeThreshold) })}</span>
                ) : null}
              </div>
            ) : (
              <span className="text-muted-foreground">{t('shop:checkout.deliveryUnavailable')}</span>
            )}
          </li>
          {points.length ? (
            <li className="flex gap-3">
              <StoreIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-semibold">{t('shop:checkout.pickupTitle')}</span>
                  <span className="font-bold text-success">{t('common:labels.free')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPickupOpen(true)}
                  className="w-fit rounded-sm text-start text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring dark:text-brand"
                >
                  {t('product.pickupPoints', { count: points.length })}
                </button>
              </div>
            </li>
          ) : null}
        </ul>
      )}
      <Dialog open={pickupOpen} onOpenChange={setPickupOpen}>
        <DialogContent closeLabel={t('common:actions.close')} size="lg">
          <DialogHeader>
            <DialogTitle>{t('shop:contact.pickupPoints')}</DialogTitle>
            <DialogDescription>{t('shop:product.pickupText')}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <PickupPointList points={points} />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export function PickupPointList({ points }: { points: Array<{ id: string; name: string; address: string; workingHours: string; phone: string; location: { lat: number; lng: number } }> }) {
  const { t } = useTranslation();
  return (
    <ul className="flex flex-col divide-y divide-border">
      {points.map((p) => (
        <li key={p.id} className="flex flex-col gap-1.5 py-3.5 first:pt-0 last:pb-0">
          <span className="font-semibold">{p.name}</span>
          <span className="flex gap-2 text-sm text-muted-foreground">
            <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {p.address}
          </span>
          <span className="flex gap-2 text-sm text-muted-foreground">
            <ClockIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {p.workingHours}
          </span>
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <a href={`tel:${p.phone}`} className="inline-flex items-center gap-2 font-semibold tabular-nums hover:text-primary dark:hover:text-brand">
              <PhoneIcon className="size-4 text-muted-foreground" aria-hidden="true" />
              {formatUzPhone(p.phone)}
            </a>
            <a
              href={`https://www.openstreetmap.org/?mlat=${p.location.lat}&mlon=${p.location.lng}#map=17/${p.location.lat}/${p.location.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline dark:text-brand"
            >
              {t('shop:contact.map')}
            </a>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Installment plans from the store settings with the monthly payment for this price. */
export function InstallmentCalculator({ amount }: { amount: number }) {
  const { t } = useTranslation();
  const f = useFormat();
  const settings = useSettings();
  const inst = settings.data?.installment;
  const [months, setMonths] = useState<number | null>(null);
  if (!inst?.enabled || !inst.plans.length) return null;
  const eligible = amount >= inst.minAmount;
  const plan = inst.plans.find((p) => p.months === months) ?? inst.plans[0]!;
  const calc = calcInstallment(amount, plan);

  return (
    <section aria-labelledby="installment-title" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:p-5">
      <h2 id="installment-title" className="flex items-center gap-2 text-sm font-bold">
        <CalendarClockIcon className="size-[18px] text-muted-foreground" aria-hidden="true" />
        {t('shop:product.installmentCalc')}
      </h2>
      {eligible ? (
        <>
          <div role="radiogroup" aria-label={t('shop:product.installmentCalc')} className="flex flex-wrap gap-2">
            {inst.plans.map((p) => {
              const active = p.months === plan.months;
              return (
                <button
                  key={p.months}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setMonths(p.months)}
                  className={cn(
                    'inline-flex h-9 items-center rounded-md border px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    active ? 'border-primary bg-brand-soft text-brand-soft-foreground' : 'border-input bg-surface-elevated hover:bg-accent',
                  )}
                >
                  {t('shop:product.installmentMonths', { count: p.months })}
                </button>
              );
            })}
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">{t('shop:product.installmentMonthly')}</dt>
              <dd className="text-lg font-bold tabular-nums">{f.price(calc.monthlyPayment)}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">{t('shop:product.installmentTotal')}</dt>
              <dd className="text-lg font-bold tabular-nums">{f.price(calc.total)}</dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">
            {calc.markupPercent > 0 ? t('shop:checkout.installmentMarkup', { percent: calc.markupPercent }) : t('shop:checkout.installmentNoMarkup')}
            {' · '}
            {t('shop:product.installmentNote')}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t('shop:checkout.minAmount', { amount: f.price(inst.minAmount) })}</p>
      )}
    </section>
  );
}

/** Warranty period + store guarantees from the settings. */
export function WarrantyAndTrust({ warrantyMonths }: { warrantyMonths: number }) {
  const { t } = useTranslation();
  const settings = useSettings();
  const bullets = settings.data?.trustBullets ?? [];
  return (
    <section aria-labelledby="warranty-title" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:p-5">
      <h2 id="warranty-title" className="flex items-center gap-2 text-sm font-bold">
        <ShieldCheckIcon className="size-[18px] text-muted-foreground" aria-hidden="true" />
        {warrantyMonths > 0 ? t('shop:product.officialWarranty', { count: warrantyMonths }) : t('common:product.noWarranty')}
      </h2>
      {warrantyMonths > 0 ? <p className="text-sm text-muted-foreground">{t('shop:product.warrantyText')}</p> : null}
      {bullets.length ? (
        <ul className="flex flex-col gap-2 border-t border-border pt-3 text-sm">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2.5">
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

