import { isApiError, useCancelOrder, useOrder, useReorder } from '@vero/api-client';
import type { OrderDetail } from '@vero/types';
import { useLayoutEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useFormat } from '../../lib/format';
import { isNotFound } from '../../lib/errors';
import { errorMessage } from '../../lib/i18n';
import { suppressRealtimeToast } from '../../lib/realtime-toasts';
import { toast } from '../../lib/toast';
import type { RootScreenProps } from '../../navigation/types';
import { useTheme } from '../../theme/theme';
import {
  DeliveryInfo,
  OrderItemsList,
  OrderStatusBadge,
  OrderTimeline,
  OrderTotals,
  PaymentPanel,
} from '../../features/orders/order-ui';
import {
  BottomSheet,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ScreenScroll,
  Skeleton,
  Text,
  TextField,
} from '../../ui';
import { CircleX, PackageSearch, RefreshCw } from '../../ui/icons';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card style={{ gap: 12 }}>
      <Text variant="headline" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </Card>
  );
}

function CancelSheet({
  order,
  visible,
  onClose,
}: {
  order: OrderDetail;
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const cancel = useCancelOrder();
  const [reason, setReason] = useState('');
  const submit = () => {
    suppressRealtimeToast(`order:${order.id}:CANCELLED`);
    suppressRealtimeToast('type:ORDER_CANCELLED');
    cancel.mutate(
      { id: order.id, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(t('shop:orders.cancelled'));
          setReason('');
          onClose();
        },
        onError: (e) => {
          toast.error(errorMessage(t, e));
          if (isApiError(e) && e.code === 'ORDER_CANNOT_CANCEL') onClose();
        },
      },
    );
  };
  return (
    <BottomSheet
      visible={visible}
      onClose={() => !cancel.isPending && onClose()}
      title={t('shop:orders.cancel')}
      subtitle={t('shop:orders.number', { number: order.number })}
      footer={
        <View style={{ gap: 8 }}>
          <Button
            title={t('shop:orders.cancel')}
            variant="destructive"
            size="lg"
            onPress={submit}
            loading={cancel.isPending}
          />
          <Button
            title={t('order.keepOrder')}
            variant="ghost"
            onPress={onClose}
            disabled={cancel.isPending}
          />
        </View>
      }
    >
      <Text variant="callout">{t('shop:orders.cancelConfirm')}</Text>
      <TextField
        label={t('shop:orders.cancelReason')}
        value={reason}
        onChangeText={setReason}
        multiline
        maxLength={300}
      />
    </BottomSheet>
  );
}

/** Order detail: status timeline (live), items (+ review), payment (pay online), delivery, cancel, reorder. */
export function OrderScreen({ navigation, route }: RootScreenProps<'Order'>) {
  const { t } = useTranslation();
  const f = useFormat();
  const { colors } = useTheme();
  const order = useOrder(route.params.id);
  const reorder = useReorder();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const data = order.data;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: data ? t('shop:orders.number', { number: data.number }) : t('shop:orders.details'),
    });
  }, [navigation, data, t]);

  if (order.isPending) {
    return (
      <View style={{ flex: 1, padding: 16, gap: 14, backgroundColor: colors.background }}>
        <Skeleton height={28} width="60%" />
        <Skeleton height={260} radius={14} />
        <Skeleton height={180} radius={14} />
      </View>
    );
  }
  if (order.isError || !data) {
    return isNotFound(order.error) ? (
      <EmptyState
        icon={PackageSearch}
        title={t('success.orderNotFound')}
        description={t('success.orderNotFoundText')}
        action={
          <Button
            title={t('shop:orders.title')}
            onPress={() =>
              navigation.navigate(
                'Tabs',
                { screen: 'ProfileTab', params: { screen: 'Orders' } },
                { pop: true },
              )
            }
          />
        }
      />
    ) : (
      <ErrorState error={order.error} onRetry={() => void order.refetch()} retrying={order.isFetching} />
    );
  }

  const onReorder = () =>
    reorder.mutate(data.id, {
      onSuccess: () =>
        toast.success(t('shop:orders.repeatDone'), {
          action: {
            label: t('common:actions.goToCart'),
            onPress: () => navigation.navigate('Tabs', { screen: 'CartTab' }, { pop: true }),
          },
        }),
      onError: (e) => toast.error(errorMessage(t, e)),
    });

  const delivered = data.status === 'DELIVERED';
  const awaitingOnline =
    data.payment.status === 'PENDING' &&
    (data.payment.provider === 'click' || data.payment.provider === 'payme');

  return (
    <>
      <ScreenScroll
        bottomInset
        onRefresh={async () => {
          setRefreshing(true);
          await order.refetch();
          setRefreshing(false);
        }}
        refreshing={refreshing}
        contentContainerStyle={{ gap: 14 }}
      >
        <View style={{ gap: 6 }}>
          <View style={styles.headRow}>
            <OrderStatusBadge status={data.status} />
            <Text variant="footnote" color="mutedForeground" tabular>
              {t('shop:orders.placedOn', { date: f.date(data.createdAt, 'datetime') })}
            </Text>
          </View>
          <Text variant="caption" color="mutedForeground">
            {t('shop:orders.liveUpdate')}
          </Text>
        </View>

        <View style={styles.actions}>
          {/* side by side only when both labels fit (tablets); stacked on phones */}
          <Button
            title={t('shop:orders.repeat')}
            variant="outline"
            icon={RefreshCw}
            onPress={onReorder}
            loading={reorder.isPending}
            style={styles.action}
          />
          {data.canCancel ? (
            <Button
              title={t('shop:orders.cancel')}
              variant="destructive"
              icon={CircleX}
              onPress={() => setCancelOpen(true)}
              style={styles.action}
            />
          ) : null}
        </View>

        <Section title={t('shop:orders.timeline')}>
          <OrderTimeline order={data} />
        </Section>

        <Section title={t('shop:orders.payment')}>
          <PaymentPanel
            order={data}
            onReturned={() => void order.refetch()}
            onRefresh={awaitingOnline ? () => void order.refetch() : undefined}
            refreshing={order.isFetching}
          />
          <OrderTotals order={data} />
        </Section>

        <Section title={t('shop:orders.items', { count: data.itemsCount })}>
          <OrderItemsList order={data} reviewable={delivered} />
        </Section>

        <Section title={t('shop:orders.delivery')}>
          <DeliveryInfo order={data} />
        </Section>

        <Section title={t('shop:orders.recipient')}>
          <View style={{ gap: 2 }}>
            <Text variant="callout" weight="semibold">
              {data.customer.firstName} {data.customer.lastName}
            </Text>
            <Text variant="footnote" color="mutedForeground" tabular>
              {f.phone(data.customer.phone)}
            </Text>
            {data.customer.email ? (
              <Text variant="footnote" color="mutedForeground">
                {data.customer.email}
              </Text>
            ) : null}
          </View>
          {data.comment ? (
            <View style={{ gap: 2 }}>
              <Text variant="subhead" weight="semibold">
                {t('shop:checkout.comment')}
              </Text>
              <Text variant="footnote" color="mutedForeground">
                {data.comment}
              </Text>
            </View>
          ) : null}
        </Section>
      </ScreenScroll>
      {data.canCancel ? (
        <CancelSheet order={data} visible={cancelOpen} onClose={() => setCancelOpen(false)} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  action: { flexGrow: 1, flexBasis: 260 },
});
