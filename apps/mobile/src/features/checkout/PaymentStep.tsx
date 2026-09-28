import { usePaymentMethods } from '@vero/api-client';
import type { PaymentMethod, PaymentMethodDTO } from '@vero/types';
import { calcInstallment } from '@vero/utils';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useFormat } from '../../lib/format';
import { useTheme } from '../../theme/theme';
import { Badge, ErrorState, Notice, RadioCard, Skeleton, Text } from '../../ui';
import { Banknote, CalendarClock, CircleAlert, CreditCard, Smartphone } from '../../ui/icons';
import type { StepHandle } from './ContactStep';
import type { CheckoutDraft, DraftUpdate } from './state';

function MethodIcon({ method }: { method: PaymentMethod }) {
  const { colors } = useTheme();
  const Icon =
    method === 'cash'
      ? Banknote
      : method === 'installment'
        ? CalendarClock
        : method === 'click' || method === 'payme'
          ? Smartphone
          : CreditCard;
  return <Icon size={18} color={colors.mutedForeground} />;
}

/** Payment methods available for the order total (online providers without credentials are not returned). */
export const PaymentStep = forwardRef<
  StepHandle,
  {
    draft: CheckoutDraft;
    update: DraftUpdate;
    total: number | undefined;
    onNext: () => void;
    notice?: string | null;
  }
>(function PaymentStep({ draft, update, total, onNext, notice }, ref) {
  const { t } = useTranslation();
  const f = useFormat();
  const methods = usePaymentMethods(total);
  const [error, setError] = useState<string | null>(null);
  const p = draft.payment;
  const list = methods.data ?? [];
  const selected = list.find((m) => m.code === p.method);

  // drop a selection that became unavailable (e.g. total below the installment minimum)
  useEffect(() => {
    if (selected && !selected.available) update({ payment: { method: null, installmentMonths: null } });
  }, [selected, update]);

  const setPayment = (patch: Partial<CheckoutDraft['payment']>) => {
    setError(null);
    update((d) => ({ payment: { ...d.payment, ...patch } }));
  };

  useImperativeHandle(ref, () => ({
    submit: () => {
      if (!selected || !selected.available) return setError(t('checkout.choosePayment'));
      if (selected.code === 'installment' && !p.installmentMonths)
        return setError(t('validation:installmentMonths'));
      onNext();
    },
  }));

  const reason = (m: PaymentMethodDTO) =>
    m.unavailableReason === 'MIN_AMOUNT' && m.minAmount
      ? t('shop:checkout.minAmount', { amount: f.price(m.minAmount) })
      : t('shop:checkout.methodUnavailable');

  const group = (title: string | null, items: PaymentMethodDTO[]) =>
    items.length ? (
      <View style={{ gap: 10 }}>
        {title ? (
          <Text variant="overline" color="mutedForeground" uppercase>
            {title}
          </Text>
        ) : null}
        {items.map((m) => (
          <RadioCard
            key={m.code}
            selected={p.method === m.code}
            disabled={!m.available}
            onPress={() =>
              setPayment({
                method: m.code,
                installmentMonths: m.code === 'installment' ? p.installmentMonths : null,
              })
            }
            icon={<MethodIcon method={m.code} />}
            title={m.name}
            description={m.description || undefined}
          >
            {/* below the description: a badge next to the title squeezes it on phones */}
            {!m.available ? (
              <Badge label={reason(m)} size="sm" style={{ alignSelf: 'flex-start', marginTop: 2 }} />
            ) : null}
            {m.online && m.available ? (
              <Text variant="caption" color="mutedForeground">
                {t('shop:checkout.redirectNote')}
              </Text>
            ) : null}
          </RadioCard>
        ))}
      </View>
    ) : null;

  const online = list.filter((m) => m.online);
  const onDelivery = list.filter((m) => !m.online && m.provider === 'cash');
  const other = list.filter((m) => !m.online && m.provider !== 'cash');
  const installment = selected?.code === 'installment' ? selected : undefined;

  return (
    <View style={{ gap: 16 }}>
      <Text variant="title3">{t('shop:checkout.paymentTitle')}</Text>
      {notice ? (
        <Notice tone="danger" icon={CircleAlert}>
          {notice}
        </Notice>
      ) : null}
      {methods.isPending ? (
        <View style={{ gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={64} radius={12} />
          ))}
        </View>
      ) : methods.isError ? (
        <ErrorState compact error={methods.error} onRetry={() => void methods.refetch()} />
      ) : (
        <View
          style={{ gap: 18 }}
          accessibilityRole="radiogroup"
          accessibilityLabel={t('shop:checkout.paymentTitle')}
        >
          {group(t('shop:checkout.paymentOnDelivery'), onDelivery)}
          {group(t('shop:checkout.paymentOnline'), online)}
          {group(onDelivery.length || online.length ? t('common:product.installment') : null, other)}
        </View>
      )}
      {installment?.installmentPlans?.length && total ? (
        <View style={{ gap: 10 }}>
          <Text variant="headline">{t('shop:product.installmentCalc')}</Text>
          {installment.installmentPlans.map((plan) => {
            const calc = calcInstallment(total, plan);
            return (
              <RadioCard
                key={plan.months}
                selected={p.installmentMonths === plan.months}
                onPress={() => setPayment({ installmentMonths: plan.months })}
                title={t('shop:product.installmentMonths', { count: plan.months })}
                description={
                  plan.markupPercent
                    ? t('shop:checkout.installmentMarkup', { percent: plan.markupPercent })
                    : t('shop:checkout.installmentNoMarkup')
                }
                right={
                  <Text variant="subhead" weight="bold" tabular>
                    {f.price(calc.monthlyPayment)}
                    <Text variant="footnote" color="mutedForeground">{` / ${t('common:units.month')}`}</Text>
                  </Text>
                }
              />
            );
          })}
          <Text variant="footnote" color="mutedForeground">
            {t('shop:checkout.installmentReview')}
          </Text>
        </View>
      ) : null}
      {error ? (
        <Text variant="subhead" weight="semibold" color="danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
});
