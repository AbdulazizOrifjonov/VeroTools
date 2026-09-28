import { usePayOrder, useSettings } from '@vero/api-client';
import { ORDER_TIMELINE, type OrderDetail, type OrderStatus, type PaymentStatus } from '@vero/types';
import * as WebBrowser from 'expo-web-browser';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useFormat } from '../../lib/format';
import { errorMessage } from '../../lib/i18n';
import { toast } from '../../lib/toast';
import { useRootNavigation } from '../../navigation/hooks';
import { useTheme } from '../../theme/theme';
import { Badge, Button, Notice, SmartImage, Text, type BadgeTone } from '../../ui';
import {
  Check,
  CircleX,
  CreditCard,
  ExternalLink,
  MapPin,
  Phone,
  RotateCw,
  Store,
  Truck,
  Undo2,
} from '../../ui/icons';
import { formatAddress } from '../address/AddressFields';

const ORDER_TONE: Record<OrderStatus, BadgeTone> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  PROCESSING: 'info',
  PACKED: 'info',
  SHIPPED: 'brand',
  DELIVERED: 'success',
  CANCELLED: 'neutral',
  RETURNED: 'neutral',
};

const PAYMENT_TONE: Record<PaymentStatus, BadgeTone> = {
  PENDING: 'warning',
  PAID: 'success',
  FAILED: 'danger',
  CANCELLED: 'neutral',
  REFUND_PENDING: 'warning',
  REFUNDED: 'neutral',
};

export function OrderStatusBadge({ status, size = 'md' }: { status: OrderStatus; size?: 'sm' | 'md' }) {
  const { t } = useTranslation();
  return <Badge label={t(`common:orderStatus.${status}`)} tone={ORDER_TONE[status]} size={size} dot />;
}

export function PaymentStatusBadge({ status, size = 'sm' }: { status: PaymentStatus; size?: 'sm' | 'md' }) {
  const { t } = useTranslation();
  return <Badge label={t(`common:paymentStatus.${status}`)} tone={PAYMENT_TONE[status]} size={size} />;
}

/** Customer-facing timeline PENDING → DELIVERED (8 statuses incl. the cancelled / returned branch) with dates. */
export const OrderTimeline = memo(function OrderTimeline({ order }: { order: OrderDetail }) {
  const { t } = useTranslation();
  const f = useFormat();
  const { colors } = useTheme();
  const history = order.statusHistory;
  const eventOf = (status: OrderStatus) => [...history].reverse().find((e) => e.status === status);
  const terminal = order.status === 'CANCELLED' || order.status === 'RETURNED';
  // pickup orders normally skip "shipped"
  const steps = ORDER_TIMELINE.filter(
    (s) => s !== 'SHIPPED' || order.deliveryMethod === 'courier' || !!eventOf('SHIPPED'),
  );
  const reachedIndex = terminal
    ? Math.max(-1, ...steps.map((s, i) => (eventOf(s) ? i : -1)))
    : Math.max(0, steps.indexOf(order.status));
  const visible = terminal ? steps.slice(0, reachedIndex + 1) : steps;
  const terminalEvent = terminal ? eventOf(order.status) : undefined;

  return (
    <View accessibilityLabel={t('shop:orders.timeline')}>
      {visible.map((status, i) => {
        const event = eventOf(status);
        const done = i < reachedIndex || (i === reachedIndex && (terminal || status === 'DELIVERED'));
        const current = !terminal && i === reachedIndex && status !== 'DELIVERED';
        const last = i === visible.length - 1 && !terminal;
        return (
          <View
            key={status}
            style={styles.tlRow}
            accessible
            accessibilityLabel={`${t(`common:orderStatus.${status}`)}${event ? `, ${f.date(event.at, 'datetime')}` : ''}`}
          >
            <View style={styles.tlRail}>
              <View
                style={[
                  styles.tlDot,
                  done && { backgroundColor: colors.primary, borderColor: colors.primary },
                  current && { backgroundColor: colors.brandSoft, borderColor: colors.primary },
                  !done && !current && { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                {done ? (
                  <Check size={13} color={colors.primaryForeground} strokeWidth={3} />
                ) : (
                  <Text variant="caption" weight="bold" color={current ? 'link' : 'mutedForeground'} tabular>
                    {i + 1}
                  </Text>
                )}
              </View>
              {!last ? (
                <View
                  style={[
                    styles.tlLine,
                    { backgroundColor: i < reachedIndex || terminal ? colors.primary : colors.border },
                  ]}
                />
              ) : null}
            </View>
            <View style={styles.tlBody}>
              <Text
                variant="subhead"
                weight="semibold"
                color={done || current ? 'foreground' : 'mutedForeground'}
              >
                {t(`common:orderStatus.${status}`)}
              </Text>
              {event ? (
                <Text variant="caption" color="mutedForeground" tabular>
                  {f.date(event.at, 'datetime')}
                </Text>
              ) : null}
              {current ? (
                <Text variant="caption" color="mutedForeground">
                  {t(`common:orderStatusHint.${status}`)}
                </Text>
              ) : null}
              {event?.note && (done || current) ? (
                <Text variant="caption" color="mutedForeground">
                  {event.note}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
      {terminal ? (
        <View style={styles.tlRow}>
          <View style={styles.tlRail}>
            <View style={[styles.tlDot, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}>
              {order.status === 'RETURNED' ? (
                <Undo2 size={13} color={colors.danger} />
              ) : (
                <CircleX size={13} color={colors.danger} />
              )}
            </View>
          </View>
          <View style={styles.tlBody}>
            <Text variant="subhead" weight="semibold">
              {t(`common:orderStatus.${order.status}`)}
            </Text>
            {terminalEvent ? (
              <Text variant="caption" color="mutedForeground" tabular>
                {f.date(terminalEvent.at, 'datetime')}
              </Text>
            ) : null}
            {order.cancelReason ? (
              <Text variant="caption" color="mutedForeground">
                {t('order.reason', { reason: order.cancelReason })}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
});

/** Items of an order (tap → product; "write a review" for delivered orders). */
export function OrderItemsList({ order, reviewable = false }: { order: OrderDetail; reviewable?: boolean }) {
  const { t } = useTranslation();
  const f = useFormat();
  const { colors } = useTheme();
  const root = useRootNavigation();
  return (
    <View>
      {order.items.map((i, idx) => (
        <View
          key={i.id}
          style={[
            styles.item,
            idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
          ]}
        >
          <Pressable
            onPress={() => root.navigate('Product', { slug: i.slug })}
            accessibilityRole="link"
            accessibilityLabel={i.name}
          >
            <SmartImage image={i.image} size="thumb" style={styles.thumb} />
          </Pressable>
          <View style={{ flex: 1, gap: 3 }}>
            <Text
              variant="subhead"
              weight="semibold"
              numberOfLines={2}
              onPress={() => root.navigate('Product', { slug: i.slug })}
            >
              {i.name}
            </Text>
            <Text variant="caption" color="mutedForeground">
              {i.variantName ? `${i.variantName} · ` : ''}
              {t('common:product.sku')}: {i.sku}
            </Text>
            <Text variant="caption" color="mutedForeground" tabular>
              {t('shop:orders.qty', { count: i.quantity, price: f.price(i.price) })}
            </Text>
            {i.warrantyMonths ? (
              <Text variant="caption" color="mutedForeground">
                {t('common:product.warrantyMonths', { count: i.warrantyMonths })}
              </Text>
            ) : null}
            {reviewable ? (
              i.reviewed ? (
                <View style={styles.reviewed}>
                  <Check size={14} color={colors.success} strokeWidth={2.6} />
                  <Text variant="caption" weight="bold" color="success">
                    {t('shop:orders.reviewed')}
                  </Text>
                </View>
              ) : (
                <Button
                  title={t('shop:orders.writeReview')}
                  variant="outline"
                  size="sm"
                  style={{ alignSelf: 'flex-start', marginTop: 4 }}
                  onPress={() =>
                    root.navigate('WriteReview', { productId: i.productId, slug: i.slug, name: i.name })
                  }
                />
              )
            ) : null}
          </View>
          <Text variant="subhead" weight="bold" tabular>
            {f.price(i.total)}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Amount breakdown (all numbers come from the API). */
export function OrderTotals({ order }: { order: OrderDetail }) {
  const { t } = useTranslation();
  const f = useFormat();
  const { colors } = useTheme();
  const discount = order.productDiscount + order.couponDiscount;
  return (
    <View style={{ gap: 8 }}>
      <View style={styles.row}>
        <Text variant="callout" color="mutedForeground">
          {t('shop:orders.subtotal')}
        </Text>
        <Text variant="callout" weight="semibold" tabular>
          {f.price(order.oldSubtotal || order.subtotal)}
        </Text>
      </View>
      {discount > 0 ? (
        <View style={styles.row}>
          <Text variant="callout" color="mutedForeground">
            {t('shop:orders.discount')}
            {order.coupon ? ` (${order.coupon.code})` : ''}
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
          {order.deliveryFee > 0 ? f.price(order.deliveryFee) : t('common:labels.free')}
        </Text>
      </View>
      <View
        style={[
          styles.row,
          {
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
            paddingTop: 10,
            marginTop: 2,
          },
        ]}
      >
        <Text variant="headline">{t('shop:orders.total')}</Text>
        <Text variant="title3" tabular>
          {f.price(order.total)}
        </Text>
      </View>
      {order.payment.installment ? (
        <View style={[styles.row, { backgroundColor: colors.brandSoft, borderRadius: 10, padding: 10 }]}>
          <Text variant="footnote" weight="semibold" color="brandSoftForeground">
            {t('checkout.installmentFor', { count: order.payment.installment.months })}
          </Text>
          <Text variant="footnote" weight="bold" color="brandSoftForeground" tabular>
            {f.price(order.payment.installment.monthlyPayment)} / {t('common:units.month')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Delivery method, address or pickup point, estimate, carrier and tracking number. */
export function DeliveryInfo({ order }: { order: OrderDetail }) {
  const { t } = useTranslation();
  const f = useFormat();
  const { colors } = useTheme();
  const d = order.delivery;
  const Icon = d.method === 'pickup' ? Store : Truck;
  const active = !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(order.status);
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.inline}>
        <Icon size={17} color={colors.mutedForeground} />
        <Text variant="subhead" weight="bold">
          {t(`common:deliveryMethod.${d.method}`)}
        </Text>
        {d.zoneName ? (
          <Text variant="subhead" color="mutedForeground">
            · {d.zoneName}
          </Text>
        ) : null}
      </View>
      {d.method === 'pickup' && d.pickupPoint ? (
        <>
          <Text variant="callout" weight="medium">
            {d.pickupPoint.name}
          </Text>
          <View style={styles.inline}>
            <MapPin size={14} color={colors.mutedForeground} />
            <Text variant="footnote" color="mutedForeground" style={{ flex: 1 }}>
              {d.pickupPoint.address}
            </Text>
          </View>
          <Text variant="footnote" color="mutedForeground">
            {d.pickupPoint.workingHours}
          </Text>
          {d.pickupPoint.phone ? (
            <Pressable
              onPress={() => void Linking.openURL(`tel:${d.pickupPoint!.phone}`)}
              accessibilityRole="link"
              style={styles.inline}
            >
              <Phone size={14} color={colors.link} />
              <Text variant="footnote" weight="semibold" color="link" tabular>
                {f.phone(d.pickupPoint.phone)}
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : d.address ? (
        <Text variant="footnote" color="mutedForeground">
          {formatAddress(d.address, f.lang, t)}
        </Text>
      ) : null}
      {d.estimatedFrom && d.estimatedTo && active ? (
        <Text variant="footnote" color="mutedForeground">
          {t('shop:orders.estimated', {
            date:
              d.estimatedFrom.slice(0, 10) === d.estimatedTo.slice(0, 10)
                ? f.date(d.estimatedTo, 'dayMonth')
                : `${f.date(d.estimatedFrom, 'dayMonth')} – ${f.date(d.estimatedTo, 'dayMonth')}`,
          })}
        </Text>
      ) : null}
      {d.carrier ? (
        <Text variant="footnote" color="mutedForeground">
          {t('shop:orders.carrier', { name: d.carrier })}
        </Text>
      ) : null}
      {d.trackingNumber ? (
        <Text variant="footnote" weight="semibold" tabular selectable>
          {t('shop:orders.tracking', { number: d.trackingNumber })}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Payment state and the next action. Online payments open the provider page returned by the API in the in-app
 * browser; afterwards the order is refetched — it is shown as paid only when the API reports PAID.
 */
export function PaymentPanel({
  order,
  checking = false,
  timedOut = false,
  onReturned,
  onRefresh,
  refreshing = false,
}: {
  order: OrderDetail;
  checking?: boolean;
  timedOut?: boolean;
  /** called after the payment page was closed (start polling the order) */
  onReturned?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const settings = useSettings();
  const pay = usePayOrder();
  const [opening, setOpening] = useState(false);
  const p = order.payment;
  const phone = settings.data?.store.phone;
  const methodName = t(`common:paymentMethod.${p.method}`);
  const cancelledOrder = order.status === 'CANCELLED' || order.status === 'RETURNED';

  if (p.status === 'PAID') {
    return (
      <Notice tone="success" title={t('shop:checkout.successPaid')}>
        <Text variant="footnote">
          {methodName}
          {p.paidAt ? ` · ${t('payment.paidAt', { date: f.date(p.paidAt, 'datetime') })}` : ''}
        </Text>
      </Notice>
    );
  }

  if (
    p.status === 'FAILED' ||
    p.status === 'CANCELLED' ||
    p.status === 'REFUND_PENDING' ||
    p.status === 'REFUNDED'
  ) {
    const failed = p.status === 'FAILED';
    return (
      <Notice tone={failed ? 'danger' : 'neutral'} title={t(`common:paymentStatus.${p.status}`)}>
        <View style={{ gap: 6 }}>
          <Text variant="footnote">{methodName}</Text>
          {failed && !cancelledOrder ? (
            <Text variant="footnote">
              {t('payment.failedHint')}{' '}
              {phone ? (
                <Text
                  variant="footnote"
                  weight="bold"
                  color="link"
                  onPress={() => void Linking.openURL(`tel:${phone}`)}
                >
                  {f.phone(phone)}
                </Text>
              ) : null}
            </Text>
          ) : null}
        </View>
      </Notice>
    );
  }

  if (cancelledOrder) {
    return (
      <Text variant="footnote" color="mutedForeground">
        {methodName} · {t('common:orderStatus.CANCELLED')}
      </Text>
    );
  }

  if (p.provider === 'cash') {
    return (
      <Notice tone="neutral" icon={CreditCard} title={methodName}>
        <Text variant="footnote">
          {order.deliveryMethod === 'pickup' ? t('payment.onReceiptPickup') : t('payment.onReceiptCourier')}
        </Text>
      </Notice>
    );
  }

  if (p.provider === 'installment') {
    return (
      <Notice
        tone="brand"
        title={`${methodName}${p.installment && p.installment.status !== 'NONE' ? ` · ${t(`common:installmentStatus.${p.installment.status}`)}` : ''}`}
      >
        <View style={{ gap: 4 }}>
          <Text variant="footnote">{t('shop:checkout.successInstallment')}</Text>
          {p.action?.type === 'instructions' ? <Text variant="footnote">{p.action.message}</Text> : null}
        </View>
      </Notice>
    );
  }

  // online provider (Click / Payme), awaiting payment
  const openPayment = async () => {
    try {
      setOpening(true);
      let url = p.action?.type === 'redirect' ? p.action.url : null;
      if (!url) {
        const res = await pay.mutateAsync(order.id);
        if (res.action.type === 'redirect') url = res.action.url;
        else if (res.action.type === 'instructions') toast.info(res.action.message);
      }
      if (url) {
        await WebBrowser.openAuthSessionAsync(url, 'verotools://orders');
        onReturned?.();
      }
    } catch (e) {
      toast.error(errorMessage(t, e));
    } finally {
      setOpening(false);
    }
  };

  return (
    <Notice
      tone={checking ? 'info' : 'warning'}
      title={checking ? t('payment.checking') : t('shop:checkout.successAwaitingPayment')}
    >
      <View style={{ gap: 8 }}>
        <Text variant="footnote">{methodName}</Text>
        {timedOut ? <Text variant="footnote">{t('payment.notConfirmedYet')}</Text> : null}
        {p.action?.type === 'instructions' ? <Text variant="footnote">{p.action.message}</Text> : null}
        <View style={{ gap: 8 }}>
          <Button
            title={
              opening
                ? t('shop:checkout.redirecting')
                : `${t('shop:checkout.payNow')} · ${f.price(order.total)}`
            }
            iconRight={ExternalLink}
            onPress={() => void openPayment()}
            loading={opening || pay.isPending}
          />
          {onRefresh ? (
            <Button
              title={t('payment.refreshStatus')}
              variant="outline"
              icon={RotateCw}
              onPress={onRefresh}
              loading={refreshing}
            />
          ) : null}
        </View>
      </View>
    </Notice>
  );
}

const styles = StyleSheet.create({
  tlRow: { flexDirection: 'row', gap: 12 },
  tlRail: { alignItems: 'center', width: 26 },
  tlDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tlLine: { width: 2, flex: 1, minHeight: 18, marginVertical: 2, borderRadius: 1 },
  tlBody: { flex: 1, gap: 2, paddingBottom: 16, paddingTop: 3 },
  item: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  thumb: { width: 64, height: 64, borderRadius: 10 },
  reviewed: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
});
