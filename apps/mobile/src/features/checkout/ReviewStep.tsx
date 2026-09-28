import { useAddresses, usePickupPoints } from '@vero/api-client';
import type { CartDTO, CheckoutQuote, PaymentMethodDTO } from '@vero/types';
import { formatUzPhone } from '@vero/utils';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFormat } from '../../lib/format';
import { useRootNavigation } from '../../navigation/hooks';
import { useTheme } from '../../theme/theme';
import { Button, Card, Checkbox, Notice, SmartImage, Text, TextField } from '../../ui';
import { CircleAlert, Pencil, TriangleAlert } from '../../ui/icons';
import { formatAddress } from '../address/AddressFields';
import { CouponBox } from '../cart/CouponBox';
import type { CheckoutDraft, DraftUpdate } from './state';

export interface StockProblem {
  name: string;
  available: number;
  requested: number;
}

function Block({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={[styles.block, { borderColor: colors.border }]}>
      <View style={styles.blockHead}>
        <Text variant="overline" color="mutedForeground" uppercase style={{ flex: 1 }}>
          {title}
        </Text>
        <Pressable
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel={`${t('shop:checkout.edit')}: ${title}`}
          hitSlop={10}
          style={styles.edit}
        >
          <Pencil size={14} color={colors.link} />
          <Text variant="footnote" weight="bold" color="link">
            {t('shop:checkout.edit')}
          </Text>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

export function ReviewStep({
  draft,
  update,
  quote,
  cart,
  paymentMethod,
  goTo,
  stockProblems,
  notice,
  accepted,
  setAccepted,
  termsError,
}: {
  draft: CheckoutDraft;
  update: DraftUpdate;
  quote: CheckoutQuote | undefined;
  cart: CartDTO | undefined;
  paymentMethod: PaymentMethodDTO | undefined;
  goTo: (step: number) => void;
  stockProblems: StockProblem[] | null;
  notice?: string | null;
  accepted: boolean;
  setAccepted: (v: boolean) => void;
  termsError: boolean;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const root = useRootNavigation();
  const addresses = useAddresses();
  const pickupPoints = usePickupPoints();
  const c = draft.customer;
  const d = draft.delivery;
  const saved = addresses.data?.find((a) => a.id === d.addressId);
  const point = pickupPoints.data?.find((p) => p.id === d.pickupPointId);
  const items = (quote?.items ?? cart?.items ?? []).filter((i) => i.isAvailable);

  return (
    <View style={{ gap: 16 }}>
      <Text variant="title3">{t('shop:checkout.reviewTitle')}</Text>
      {stockProblems?.length ? (
        <Notice tone="danger" icon={TriangleAlert} title={t('shop:checkout.stockError')}>
          <View style={{ gap: 4 }}>
            {stockProblems.map((p, i) => (
              <Text key={i} variant="footnote">
                • {p.name} —{' '}
                {p.available > 0
                  ? t('checkout.stockAvailable', { available: p.available, requested: p.requested })
                  : t('common:product.outOfStock')}
              </Text>
            ))}
            <Button
              title={t('common:actions.goToCart')}
              variant="outline"
              size="sm"
              style={{ alignSelf: 'flex-start', marginTop: 6 }}
              onPress={() => root.navigate('Tabs', { screen: 'CartTab' }, { pop: true })}
            />
          </View>
        </Notice>
      ) : null}
      {notice ? (
        <Notice tone="danger" icon={CircleAlert}>
          {notice}
        </Notice>
      ) : null}

      <Block title={t('shop:checkout.recipient')} onEdit={() => goTo(0)}>
        {c ? (
          <View style={{ gap: 2 }}>
            <Text variant="subhead" weight="bold">
              {c.firstName} {c.lastName}
            </Text>
            <Text variant="footnote" color="mutedForeground" tabular>
              {formatUzPhone(c.phone)}
            </Text>
            {c.email ? (
              <Text variant="footnote" color="mutedForeground">
                {c.email}
              </Text>
            ) : null}
          </View>
        ) : null}
      </Block>
      <Block title={t(`common:deliveryMethod.${d.method}`)} onEdit={() => goTo(1)}>
        {d.method === 'pickup' ? (
          point ? (
            <View style={{ gap: 2 }}>
              <Text variant="subhead" weight="bold">
                {point.name}
              </Text>
              <Text variant="footnote" color="mutedForeground">
                {point.address}
              </Text>
              <Text variant="footnote" color="mutedForeground">
                {point.workingHours}
              </Text>
            </View>
          ) : null
        ) : saved ? (
          <View style={{ gap: 2 }}>
            <Text variant="subhead" weight="bold">
              {saved.label || `${saved.firstName} ${saved.lastName}`}
            </Text>
            <Text variant="footnote" color="mutedForeground">
              {formatAddress(saved, f.lang, t)}
            </Text>
          </View>
        ) : d.address ? (
          <Text variant="footnote" color="mutedForeground">
            {formatAddress(d.address, f.lang, t)}
          </Text>
        ) : null}
        {quote?.delivery && quote.delivery.maxDays ? (
          <Text variant="caption" color="mutedForeground">
            {t('shop:cart.estimatedDelivery', { min: quote.delivery.minDays, max: quote.delivery.maxDays })}
          </Text>
        ) : null}
      </Block>
      <Block title={t('shop:checkout.paymentTitle')} onEdit={() => goTo(2)}>
        <Text variant="subhead" weight="bold">
          {paymentMethod?.name ??
            (draft.payment.method ? t(`common:paymentMethod.${draft.payment.method}`) : '—')}
        </Text>
        {quote?.installment ? (
          <Text variant="footnote" color="mutedForeground" tabular>
            {t('shop:checkout.installmentPlan', {
              months: quote.installment.months,
              amount: f.price(quote.installment.monthlyPayment),
            })}
          </Text>
        ) : null}
        {paymentMethod?.online ? (
          <Text variant="caption" color="mutedForeground">
            {t('shop:checkout.redirectNote')}
          </Text>
        ) : null}
      </Block>

      <Card padded={false}>
        <View style={{ padding: 14, paddingBottom: 4 }}>
          <Text variant="headline">
            {t('shop:cart.items', { count: items.reduce((s, i) => s + i.quantity, 0) })}
          </Text>
        </View>
        {items.map((i) => (
          <View key={i.id} style={styles.item}>
            <SmartImage image={i.image} size="thumb" style={styles.thumb} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="footnote" weight="semibold" numberOfLines={2}>
                {i.name}
              </Text>
              {i.variantName ? (
                <Text variant="caption" color="mutedForeground">
                  {i.variantName}
                </Text>
              ) : null}
              <Text variant="caption" color="mutedForeground" tabular>
                {t('shop:orders.qty', { count: i.quantity, price: f.price(i.price) })}
              </Text>
            </View>
            <Text variant="subhead" weight="bold" tabular>
              {f.price(i.lineTotal)}
            </Text>
          </View>
        ))}
      </Card>

      {cart ? (
        <Card>
          <CouponBox cart={cart} />
        </Card>
      ) : null}

      <TextField
        label={t('shop:checkout.comment')}
        value={draft.comment}
        onChangeText={(v) => update({ comment: v })}
        placeholder={t('shop:checkout.commentPlaceholder')}
        multiline
        maxLength={500}
      />

      <View style={{ gap: 6 }}>
        <Checkbox
          checked={accepted}
          onChange={setAccepted}
          error={termsError}
          accessibilityLabel={t('shop:auth.acceptTerms')}
          label={
            <Text variant="callout">
              {t('auth.acceptPrefix')}{' '}
              <Text
                variant="callout"
                weight="bold"
                color="link"
                onPress={() => root.navigate('Page', { slug: 'terms' })}
                accessibilityRole="link"
              >
                {t('auth.termsLink')}
              </Text>{' '}
              {t('auth.and')}{' '}
              <Text
                variant="callout"
                weight="bold"
                color="link"
                onPress={() => root.navigate('Page', { slug: 'privacy' })}
                accessibilityRole="link"
              >
                {t('auth.privacyLink')}
              </Text>
              {t('auth.acceptSuffix')}
            </Text>
          }
        />
        {termsError ? (
          <Text variant="footnote" color="danger" weight="medium" accessibilityRole="alert">
            {t('validation:acceptTerms')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Totals from the checkout quote (all numbers come from the API). */
export function QuoteSummary({
  quote,
  deliveryKnown,
}: {
  quote: CheckoutQuote | undefined;
  deliveryKnown: boolean;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const { colors } = useTheme();
  if (!quote) return null;
  const discount = quote.productDiscount + quote.couponDiscount;
  return (
    <Card style={{ gap: 10 }}>
      <Text variant="headline">{t('shop:cart.summary')}</Text>
      <View style={styles.row}>
        <Text variant="callout" color="mutedForeground">
          {t('shop:orders.subtotal')}
        </Text>
        <Text variant="callout" weight="semibold" tabular>
          {f.price(quote.oldSubtotal || quote.subtotal)}
        </Text>
      </View>
      {discount > 0 ? (
        <View style={styles.row}>
          <Text variant="callout" color="mutedForeground">
            {t('shop:orders.discount')}
            {quote.coupon ? ` (${quote.coupon.code})` : ''}
          </Text>
          <Text variant="callout" weight="semibold" color="success" tabular>
            −{f.price(discount)}
          </Text>
        </View>
      ) : null}
      <View style={styles.row}>
        <Text variant="callout" color="mutedForeground">
          {t('shop:orders.deliveryFee')}
        </Text>
        <Text variant="callout" weight="semibold" tabular>
          {!deliveryKnown
            ? t('shop:cart.deliveryAtCheckout')
            : quote.deliveryFee > 0
              ? f.price(quote.deliveryFee)
              : t('common:labels.free')}
        </Text>
      </View>
      <View
        style={[
          styles.row,
          { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 10 },
        ]}
      >
        <Text variant="headline">{t('shop:orders.total')}</Text>
        <Text variant="title3" tabular>
          {f.price(quote.total)}
        </Text>
      </View>
      {quote.installment ? (
        <View style={[styles.row, { backgroundColor: colors.brandSoft, borderRadius: 10, padding: 10 }]}>
          <Text variant="footnote" weight="semibold" color="brandSoftForeground">
            {t('checkout.installmentFor', { count: quote.installment.months })}
          </Text>
          <Text variant="footnote" weight="bold" color="brandSoftForeground" tabular>
            {f.price(quote.installment.monthlyPayment)} / {t('common:units.month')}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  block: { borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: 12, padding: 14, gap: 6 },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  edit: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 28 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  thumb: { width: 52, height: 52, borderRadius: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
});
