import { usePaymentMethods } from '@vero/api-client';
import type { PaymentMethod, PaymentMethodDTO } from '@vero/types';
import { Alert, AlertDescription, Badge, Button, cn, RadioCard, RadioGroup, Skeleton } from '@vero/ui';
import { calcInstallment } from '@vero/utils';
import { ArrowLeftIcon, ArrowRightIcon, BanknoteIcon, CalendarClockIcon, CreditCardIcon, SmartphoneIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorState } from '../../components/common/states';
import { useFormat } from '../../hooks/use-format';
import type { CheckoutDraft } from './state';

function MethodIcon({ method }: { method: PaymentMethod }) {
  const Icon = method === 'cash' ? BanknoteIcon : method === 'installment' ? CalendarClockIcon : method === 'click' || method === 'payme' ? SmartphoneIcon : CreditCardIcon;
  return <Icon className="size-4 text-muted-foreground" aria-hidden="true" />;
}

function reasonText(t: ReturnType<typeof useTranslation>['t'], m: PaymentMethodDTO, price: (n: number) => string): string {
  if (m.unavailableReason === 'MIN_AMOUNT' && m.minAmount) return t('shop:checkout.minAmount', { amount: price(m.minAmount) });
  if (m.unavailableReason === 'NOT_CONFIGURED' || m.unavailableReason === 'DISABLED') return t('shop:checkout.methodUnavailable');
  return t('shop:checkout.methodUnavailable');
}

export function PaymentStep({
  draft,
  update,
  total,
  onBack,
  onNext,
  notice,
}: {
  draft: CheckoutDraft;
  update: (patch: Partial<CheckoutDraft> | ((d: CheckoutDraft) => Partial<CheckoutDraft>)) => void;
  /** order total from the quote (payment availability depends on it) */
  total: number | undefined;
  onBack: () => void;
  onNext: () => void;
  notice?: string | null;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const methods = usePaymentMethods(total);
  const [error, setError] = useState<string | null>(null);
  const p = draft.payment;
  const list = methods.data ?? [];
  const selected = list.find((m) => m.code === p.method);

  // drop a selection that became unavailable (e.g. the total changed below the installment minimum)
  useEffect(() => {
    if (selected && !selected.available) update({ payment: { method: null, installmentMonths: null } });
  }, [selected, update]);

  const setPayment = (patch: Partial<CheckoutDraft['payment']>) => {
    setError(null);
    update((d) => ({ payment: { ...d.payment, ...patch } }));
  };

  const next = () => {
    if (!selected || !selected.available) {
      setError(t('checkout.choosePayment'));
      return;
    }
    if (selected.code === 'installment' && !p.installmentMonths) {
      setError(t('validation:installmentMonths'));
      return;
    }
    onNext();
  };

  const online = list.filter((m) => m.online);
  const onDelivery = list.filter((m) => !m.online && m.provider === 'cash');
  // installment (and any other offline provider) is neither "online" nor "on delivery"
  const other = list.filter((m) => !m.online && m.provider !== 'cash');

  const renderGroup = (title: string | null, items: PaymentMethodDTO[]) =>
    items.length ? (
      <div className="flex flex-col gap-2.5">
        {title ? <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3> : null}
        {items.map((m) => (
          <RadioCard key={m.code} value={m.code} disabled={!m.available} className={cn(!m.available && 'opacity-60')}>
            <span className="flex flex-wrap items-center gap-2 font-semibold">
              <MethodIcon method={m.code} />
              {m.name}
              {!m.available ? (
                <Badge variant="muted" size="sm">
                  {reasonText(t, m, f.price)}
                </Badge>
              ) : null}
            </span>
            {m.description ? <span className="text-sm text-muted-foreground">{m.description}</span> : null}
            {m.online && m.available ? <span className="text-xs text-muted-foreground">{t('shop:checkout.redirectNote')}</span> : null}
          </RadioCard>
        ))}
      </div>
    ) : null;

  const installment = selected?.code === 'installment' ? selected : undefined;

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-bold tracking-tight">{t('shop:checkout.paymentTitle')}</h2>
      {notice ? (
        <Alert variant="danger">
          <AlertDescription className="text-foreground">{notice}</AlertDescription>
        </Alert>
      ) : null}
      {methods.isPending ? (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : methods.isError ? (
        <ErrorState compact error={methods.error} onRetry={() => void methods.refetch()} />
      ) : (
        <RadioGroup
          value={p.method ?? ''}
          onValueChange={(v) => setPayment({ method: v as PaymentMethod, installmentMonths: v === 'installment' ? p.installmentMonths : null })}
          className="gap-5"
          aria-label={t('shop:checkout.paymentTitle')}
        >
          {renderGroup(t('shop:checkout.paymentOnDelivery'), onDelivery)}
          {renderGroup(t('shop:checkout.paymentOnline'), online)}
          {renderGroup(onDelivery.length || online.length ? t('common:product.installment') : null, other)}
        </RadioGroup>
      )}
      {installment?.installmentPlans?.length && total ? (
        <section aria-labelledby="plan-title" className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <h3 id="plan-title" className="text-sm font-bold">
            {t('shop:product.installmentCalc')}
          </h3>
          <RadioGroup
            value={p.installmentMonths ? String(p.installmentMonths) : ''}
            onValueChange={(v) => setPayment({ installmentMonths: Number(v) })}
            className="grid gap-2.5 sm:grid-cols-3"
            aria-label={t('shop:product.installmentCalc')}
          >
            {installment.installmentPlans.map((plan) => {
              const calc = calcInstallment(total, plan);
              return (
                <RadioCard key={plan.months} value={String(plan.months)} className="p-3">
                  <span className="font-semibold">{t('shop:product.installmentMonths', { count: plan.months })}</span>
                  <span className="text-sm font-bold tabular-nums">
                    {f.price(calc.monthlyPayment)} <span className="font-medium text-muted-foreground">/ {t('common:units.month')}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {plan.markupPercent ? t('shop:checkout.installmentMarkup', { percent: plan.markupPercent }) : t('shop:checkout.installmentNoMarkup')}
                  </span>
                </RadioCard>
              );
            })}
          </RadioGroup>
          <p className="text-xs text-muted-foreground">{t('shop:checkout.installmentReview')}</p>
        </section>
      ) : null}
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
