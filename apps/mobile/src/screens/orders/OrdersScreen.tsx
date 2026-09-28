import { FlashList } from '@shopify/flash-list';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSession } from '@vero/api-client';
import type { OrderSummary } from '@vero/types';
import { uniqueBy } from '@vero/utils';
import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFormat } from '../../lib/format';
import { useRootNavigation } from '../../navigation/hooks';
import type { OrdersFilter, ProfileStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/theme';
import { OrderStatusBadge, PaymentStatusBadge } from '../../features/orders/order-ui';
import { useInfiniteOrders } from '../../features/orders/hooks';
import { Button, Chip, EmptyState, ErrorState, Skeleton, SmartImage, Text } from '../../ui';
import { ChevronRight, LogIn, Package } from '../../ui/icons';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Orders'>;

const FILTERS: OrdersFilter[] = ['all', 'active', 'completed', 'cancelled'];

export const OrderCard = memo(function OrderCard({
  order,
  onPress,
}: {
  order: OrderSummary;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const { colors } = useTheme();
  const payOnReceipt =
    order.paymentStatus === 'PENDING' &&
    (order.paymentMethod === 'cash' || order.paymentMethod === 'card_on_delivery');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t('shop:orders.number', { number: order.number })}, ${t(`common:orderStatus.${order.status}`)}, ${f.price(order.total)}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pressed ? colors.pressed : colors.card, borderColor: colors.border },
      ]}
    >
      <View style={{ gap: 2 }}>
        {/* "№ …" keeps the number and a long status ("Tasdiqlash kutilmoqda") on one line on phones */}
        <View style={styles.cardHead}>
          <Text variant="headline" tabular numberOfLines={1} style={{ flexShrink: 1 }}>
            № {order.number}
          </Text>
          <OrderStatusBadge status={order.status} size="sm" />
        </View>
        <Text variant="caption" color="mutedForeground" tabular numberOfLines={1}>
          {t('shop:orders.placedOn', { date: f.date(order.createdAt, 'datetime') })}
        </Text>
      </View>
      <View style={styles.previews}>
        {order.preview.slice(0, 4).map((p, i) => (
          <SmartImage key={i} image={p.image} size="thumb" style={styles.preview} alt={p.name} />
        ))}
        {order.itemsCount > 4 ? (
          <View style={[styles.preview, styles.more, { backgroundColor: colors.fill }]}>
            <Text variant="subhead" weight="bold" color="mutedForeground" tabular>
              +{order.itemsCount - 4}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.cardFoot}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="footnote" color="mutedForeground">
            {t('shop:orders.items', { count: order.itemsCount })} ·{' '}
            {t(`common:deliveryMethod.${order.deliveryMethod}`)}
          </Text>
          <View style={styles.payRow}>
            <Text variant="footnote" color="mutedForeground" numberOfLines={1}>
              {t(`common:paymentMethod.${order.paymentMethod}`)}
            </Text>
            {!payOnReceipt ? <PaymentStatusBadge status={order.paymentStatus} /> : null}
          </View>
        </View>
        <Text variant="title3" tabular>
          {f.price(order.total)}
        </Text>
        <ChevronRight size={18} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
});

/** Order history with status filter, infinite scroll and live updates (realtime). */
export function OrdersScreen({ route }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const root = useRootNavigation();
  const { isAuthenticated, isReady } = useSession();
  const [filter, setFilter] = useState<OrdersFilter>(route.params?.status ?? 'all');
  const orders = useInfiniteOrders(filter === 'all' ? undefined : filter);
  const [refreshing, setRefreshing] = useState(false);
  const items = useMemo(
    () => uniqueBy(orders.data?.pages.flatMap((p) => p.items) ?? [], (o) => o.id),
    [orders.data],
  );

  if (isReady && !isAuthenticated) {
    return (
      <EmptyState
        icon={LogIn}
        title={t('shop:auth.loginTitle')}
        description={t('shop:auth.benefits')}
        action={<Button title={t('shop:auth.signIn')} onPress={() => root.navigate('Login')} />}
      />
    );
  }

  const filters = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
      {FILTERS.map((f) => (
        <Chip
          key={f}
          label={t(`shop:orders.filter${f[0]!.toUpperCase()}${f.slice(1)}`)}
          selected={filter === f}
          onPress={() => setFilter(f)}
        />
      ))}
    </ScrollView>
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
        {filters}
      </View>
      {orders.isPending ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={150} radius={14} />
          ))}
        </View>
      ) : orders.isError && !items.length ? (
        <ErrorState error={orders.error} onRetry={() => void orders.refetch()} retrying={orders.isFetching} />
      ) : (
        <FlashList
          data={items}
          keyExtractor={(o) => o.id}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
              <OrderCard order={item} onPress={() => root.navigate('Order', { id: item.id })} />
            </View>
          )}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
          ListEmptyComponent={
            <EmptyState
              icon={Package}
              title={t('shop:orders.empty')}
              description={t('shop:orders.emptyHint')}
              action={
                <Button
                  title={t('common:actions.continueShopping')}
                  onPress={() => root.navigate('Tabs', { screen: 'CatalogTab' }, { pop: true })}
                />
              }
            />
          }
          ListFooterComponent={
            orders.isFetchingNextPage ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator color={colors.link} />
              </View>
            ) : null
          }
          onEndReached={() => {
            if (orders.hasNextPage && !orders.isFetchingNextPage) void orders.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await orders.refetch();
                setRefreshing(false);
              }}
              tintColor={colors.link}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  filters: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  previews: { flexDirection: 'row', gap: 8 },
  preview: { width: 52, height: 52, borderRadius: 10 },
  more: { alignItems: 'center', justifyContent: 'center' },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
