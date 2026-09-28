import { FlashList } from '@shopify/flash-list';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useSession,
  useUnreadNotifications,
} from '@vero/api-client';
import type { NotificationDTO, NotificationType } from '@vero/types';
import { uniqueBy } from '@vero/utils';
import { memo, useLayoutEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useInfiniteNotifications } from '../../features/orders/hooks';
import { useFormat } from '../../lib/format';
import { errorMessage } from '../../lib/i18n';
import { openHref } from '../../lib/links';
import { notificationHref } from '../../lib/push';
import { toast } from '../../lib/toast';
import { useRootNavigation } from '../../navigation/hooks';
import type { ProfileStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/theme';
import { Button, Chip, EmptyState, ErrorState, IconButton, Skeleton, Text } from '../../ui';
import {
  Bell,
  BellRing,
  CheckCheck,
  CircleCheck,
  CreditCard,
  LogIn,
  MessageSquareText,
  Package,
  Tag,
  Trash2,
  TrendingUp,
  type LucideIcon,
} from '../../ui/icons';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Notifications'>;

function iconFor(type: NotificationType): LucideIcon {
  if (type.startsWith('ORDER_')) return Package;
  if (type.startsWith('PAYMENT_')) return CreditCard;
  if (type === 'PRICE_DROP') return TrendingUp;
  if (type === 'BACK_IN_STOCK') return CircleCheck;
  if (type === 'PROMOTION' || type === 'DISCOUNT') return Tag;
  if (type.startsWith('REVIEW_') || type === 'QUESTION_ANSWERED') return MessageSquareText;
  return BellRing;
}

const NotificationRow = memo(function NotificationRow({
  n,
  onOpen,
  onDelete,
}: {
  n: NotificationDTO;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const { colors } = useTheme();
  const Icon = iconFor(n.type);
  const unread = !n.readAt;
  return (
    // the delete button is a sibling of the pressable row (nested buttons are invalid on the web)
    <View
      style={[
        styles.row,
        { backgroundColor: unread ? colors.brandSoft : 'transparent', borderBottomColor: colors.border },
      ]}
    >
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${unread ? `${t('shop:notifications.unread')}. ` : ''}${n.title}. ${n.body}`}
        style={({ pressed }) => [styles.main, { opacity: pressed ? 0.6 : 1 }]}
      >
        <View style={[styles.icon, { backgroundColor: unread ? colors.background : colors.fill }]}>
          <Icon size={19} color={unread ? colors.link : colors.mutedForeground} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={styles.titleRow}>
            <Text
              variant="subhead"
              weight={unread ? 'bold' : 'semibold'}
              style={{ flex: 1 }}
              numberOfLines={2}
            >
              {n.title}
            </Text>
            {unread ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
          </View>
          <Text variant="footnote" color="mutedForeground" numberOfLines={3}>
            {n.body}
          </Text>
          <Text variant="caption" color="mutedForeground">
            {t(`common:notificationType.${n.type}`)} · {f.relative(n.createdAt)}
          </Text>
        </View>
      </Pressable>
      <IconButton
        icon={Trash2}
        label={t('shop:notifications.delete')}
        size={36}
        iconSize={16}
        color={colors.mutedForeground}
        onPress={onDelete}
      />
    </View>
  );
});

/** Notifications (shared with the website): unread filter, mark read / all, delete, open the related order / product. */
export function NotificationsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const root = useRootNavigation();
  const { isAuthenticated } = useSession();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const list = useInfiniteNotifications(unreadOnly);
  const unread = useUnreadNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const remove = useDeleteNotification();
  const [refreshing, setRefreshing] = useState(false);
  const items = useMemo(
    () => uniqueBy(list.data?.pages.flatMap((p) => p.items) ?? [], (n) => n.id),
    [list.data],
  );
  const unreadCount = unread.data?.count ?? 0;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: unreadCount
        ? () => (
            // icon: a text button collides with the title on narrow phones
            <IconButton
              icon={CheckCheck}
              label={t('shop:notifications.markAllRead')}
              size={40}
              loading={markAll.isPending}
              onPress={() => markAll.mutate(undefined, { onError: (e) => toast.error(errorMessage(t, e)) })}
            />
          )
        : undefined,
    });
  }, [navigation, unreadCount, markAll, t]);

  if (!isAuthenticated) {
    return (
      <EmptyState
        icon={LogIn}
        title={t('shop:auth.loginTitle')}
        action={<Button title={t('shop:auth.signIn')} onPress={() => root.navigate('Login')} />}
      />
    );
  }

  const open = (n: NotificationDTO) => {
    if (!n.readAt) markRead.mutate(n.id);
    const href = notificationHref(n.data);
    if (href !== '/account/notifications')
      openHref(href, (target) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (root as any).navigate(target.name, target.params);
      });
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        style={{ flexGrow: 0, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}
      >
        <Chip label={t('common:labels.all')} selected={!unreadOnly} onPress={() => setUnreadOnly(false)} />
        <Chip
          label={t('shop:notifications.unread')}
          count={unreadCount || undefined}
          selected={unreadOnly}
          onPress={() => setUnreadOnly(true)}
        />
      </ScrollView>
      {list.isPending ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={76} radius={12} />
          ))}
        </View>
      ) : list.isError && !items.length ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} retrying={list.isFetching} />
      ) : (
        <FlashList
          data={items}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => (
            <NotificationRow
              n={item}
              onOpen={() => open(item)}
              onDelete={() => remove.mutate(item.id, { onError: (e) => toast.error(errorMessage(t, e)) })}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={Bell}
              title={t('shop:notifications.empty')}
              description={t('shop:notifications.emptyHint')}
            />
          }
          ListFooterComponent={
            list.isFetchingNextPage ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator color={colors.link} />
              </View>
            ) : null
          }
          onEndReached={() => {
            if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await Promise.all([list.refetch(), unread.refetch()]);
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
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-start',
  },
  main: { flex: 1, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
