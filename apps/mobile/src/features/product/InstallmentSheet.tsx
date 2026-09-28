import { useSettings } from '@vero/api-client';
import { calcInstallment } from '@vero/utils';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useFormat } from '../../lib/format';
import { useTheme } from '../../theme/theme';
import { BottomSheet, Notice, RadioCard, Text } from '../../ui';
import { Info } from '../../ui/icons';

/** Installment calculator: monthly payment and total for every plan from the store settings. */
export function InstallmentSheet({
  visible,
  onClose,
  price,
}: {
  visible: boolean;
  onClose: () => void;
  price: number;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const { colors } = useTheme();
  const settings = useSettings();
  const inst = settings.data?.installment;
  const plans = inst?.plans ?? [];
  const [months, setMonths] = useState<number | null>(null);
  const selected = plans.find((p) => p.months === months) ?? plans[plans.length - 1];
  const calc = selected ? calcInstallment(price, selected) : null;

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('shop:product.installmentCalc')}>
      {inst && price < inst.minAmount ? (
        <Notice tone="info" icon={Info}>
          {t('shop:checkout.minAmount', { amount: f.price(inst.minAmount) })}
        </Notice>
      ) : null}
      <View style={{ gap: 10 }}>
        {plans.map((plan) => {
          const c = calcInstallment(price, plan);
          return (
            <RadioCard
              key={plan.months}
              selected={selected?.months === plan.months}
              onPress={() => setMonths(plan.months)}
              title={t('shop:product.installmentMonths', { count: plan.months })}
              description={
                plan.markupPercent
                  ? t('shop:checkout.installmentMarkup', { percent: plan.markupPercent })
                  : t('shop:checkout.installmentNoMarkup')
              }
              right={
                <Text variant="headline" tabular>
                  {f.price(c.monthlyPayment)}
                  <Text variant="footnote" color="mutedForeground">{` / ${t('common:units.month')}`}</Text>
                </Text>
              }
            />
          );
        })}
      </View>
      {calc ? (
        <View style={[styles.summary, { backgroundColor: colors.surface }]}>
          <View style={styles.row}>
            <Text variant="callout" color="mutedForeground">
              {t('shop:product.installmentMonthly')}
            </Text>
            <Text variant="headline" tabular>
              {f.price(calc.monthlyPayment)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text variant="callout" color="mutedForeground">
              {t('shop:product.installmentTotal')}
            </Text>
            <Text variant="headline" tabular>
              {f.price(calc.total)}
            </Text>
          </View>
        </View>
      ) : null}
      <Text variant="footnote" color="mutedForeground">
        {t('shop:product.installmentNote')} {t('shop:checkout.installmentReview')}
      </Text>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  summary: { borderRadius: 12, padding: 14, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
});
