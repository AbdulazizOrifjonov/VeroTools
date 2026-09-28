import { useOrder } from '@vero/api-client';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFormat } from '../../lib/format';
import { isNotFound } from '../../lib/errors';
import { toast } from '../../lib/toast';
import type { RootScreenProps } from '../../navigation/types';
import { useTheme } from '../../theme/theme';
import {
  DeliveryInfo,
  OrderItemsList,
  OrderStatusBadge,
  OrderTotals,
  PaymentPanel,
} from '../../features/orders/order-ui';
import { Button, Card, EmptyState, ErrorState, LoadingView, ScreenScroll, StateIcon, Text } from '../../ui';
import { CircleCheck, Copy, PackageSearch } from '../../ui/icons';

const POLL_MS = 3000;
const POLL_ATTEMPTS = 20;

/** Order placed: number (copy), status, payment action (Click / Payme), delivery, items and totals. */
export function CheckoutSuccessScreen({ navigation, route }: RootScreenProps<'CheckoutSuccess'>) {
  const { t } = useTranslation();
  const f = useFormat();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const order = useOrder(route.params.orderId);
  const [polling, setPolling] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const data = order.data;
  const awaitingOnline =
    !!data &&
    data.payment.status === 'PENDING' &&
    (data.payment.provider === 'click' || data.payment.provider === 'payme');

  // after returning from the payment page the provider callback may take a moment: poll a little
  const { refetch, isFetching } = order;
  useEffect(() => {
    if (!polling || !awaitingOnline || isFetching) return;
    if (attempts >= POLL_ATTEMPTS) {
      setPolling(false);
      return;
    }
    const id = setTimeout(() => {
      setAttempts((a) => a + 1);
      void refetch();
    }, POLL_MS);
    return () => clearTimeout(id);
  }, [polling, awaitingOnline, isFetching, attempts, refetch]);

  if (order.isPending) return <LoadingView style={{ backgroundColor: colors.background }} />;
  if (order.isError || !data) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        {isNotFound(order.error) ? (
          <EmptyState
            icon={PackageSearch}
            title={t('success.orderNotFound')}
            description={t('success.orderNotFoundText')}
            action={
              <Button
                title={t('common:nav.orders')}
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
          <ErrorState error={order.error} onRetry={() => void order.refetch()} />
        )}
      </View>
    );
  }

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(data.number);
      toast.success(t('common:actions.copied'));
    } catch {
      toast.error(t('common:status.error'));
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenScroll bottomInset contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}>
        <View style={styles.hero}>
          <StateIcon icon={CircleCheck} tone="success" />
          <Text variant="title1" align="center" accessibilityRole="header">
            {t('shop:checkout.successTitle')}
          </Text>
          <Text variant="callout" color="mutedForeground" align="center">
            {t('shop:checkout.successText', { number: data.number })}
          </Text>
          <Pressable
            onPress={() => void copy()}
            accessibilityRole="button"
            accessibilityLabel={`${t('common:actions.copy')}: ${data.number}`}
            style={({ pressed }) => [
              styles.number,
              { borderColor: colors.border, backgroundColor: pressed ? colors.pressed : colors.surface },
            ]}
          >
            <Text variant="title3" tabular selectable>
              {data.number}
            </Text>
            <Copy size={17} color={colors.mutedForeground} />
          </Pressable>
          <View style={styles.meta}>
            <OrderStatusBadge status={data.status} />
            <Text variant="footnote" color="mutedForeground" tabular>
              {t('shop:orders.placedOn', { date: f.date(data.createdAt, 'datetime') })}
            </Text>
          </View>
        </View>

        <PaymentPanel
          order={data}
          checking={polling && awaitingOnline}
          timedOut={!polling && attempts >= POLL_ATTEMPTS && awaitingOnline}
          onReturned={() => {
            setAttempts(0);
            setPolling(true);
            void order.refetch();
          }}
          onRefresh={awaitingOnline && !polling ? () => void order.refetch() : undefined}
          refreshing={order.isFetching}
        />

        <Card style={{ gap: 14 }}>
          <View style={{ gap: 4 }}>
            <Text variant="headline">{t('common:labels.status')}</Text>
            <Text variant="footnote" color="mutedForeground">
              {t(`common:orderStatusHint.${data.status}`)}
            </Text>
            <Text variant="caption" color="mutedForeground">
              {t('shop:orders.liveUpdate')}
            </Text>
          </View>
          <View style={{ gap: 4 }}>
            <Text variant="headline">{t('shop:orders.delivery')}</Text>
            <DeliveryInfo order={data} />
          </View>
          <View style={{ gap: 2 }}>
            <Text variant="headline">{t('shop:orders.recipient')}</Text>
            <Text variant="callout">
              {data.customer.firstName} {data.customer.lastName}
            </Text>
            <Text variant="footnote" color="mutedForeground" tabular>
              {f.phone(data.customer.phone)}
            </Text>
          </View>
        </Card>

        <Card style={{ gap: 6 }}>
          <Text variant="headline">{t('shop:orders.items', { count: data.itemsCount })}</Text>
          <OrderItemsList order={data} />
          <OrderTotals order={data} />
        </Card>

        <View style={{ gap: 10 }}>
          <Button
            title={t('shop:checkout.trackOrder')}
            size="lg"
            onPress={() => navigation.replace('Order', { id: data.id })}
          />
          <Button
            title={t('common:actions.continueShopping')}
            variant="outline"
            size="lg"
            onPress={() => navigation.navigate('Tabs', { screen: 'HomeTab' }, { pop: true })}
          />
        </View>
        <Text variant="caption" color="mutedForeground" align="center">
          {t('shop:checkout.syncNote')}
        </Text>
      </ScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: 16 },
  hero: { alignItems: 'center', gap: 10, paddingBottom: 4 },
  number: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
});
