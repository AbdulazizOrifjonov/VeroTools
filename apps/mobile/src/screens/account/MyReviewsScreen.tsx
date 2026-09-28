import { FlashList } from '@shopify/flash-list';
import { useMyReviews, useSession } from '@vero/api-client';
import type { ReviewDTO } from '@vero/types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useFormat } from '../../lib/format';
import { useRootNavigation } from '../../navigation/hooks';
import { useTheme } from '../../theme/theme';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  RatingStars,
  Skeleton,
  SmartImage,
  Text,
  type BadgeTone,
} from '../../ui';
import { LogIn, MessageSquareText } from '../../ui/icons';

const TONE: Record<string, BadgeTone> = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' };

function MyReview({ review }: { review: ReviewDTO }) {
  const { t } = useTranslation();
  const f = useFormat();
  const { colors } = useTheme();
  const root = useRootNavigation();
  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
      {review.product ? (
        <Pressable
          onPress={() => root.navigate('Product', { slug: review.product!.slug })}
          accessibilityRole="link"
          style={styles.product}
        >
          <SmartImage image={review.product.image} size="thumb" style={styles.thumb} />
          <Text variant="subhead" weight="semibold" numberOfLines={2} style={{ flex: 1 }}>
            {review.product.name}
          </Text>
        </Pressable>
      ) : null}
      <View style={styles.meta}>
        <RatingStars value={review.rating} size={13} />
        <Text variant="caption" color="mutedForeground">
          {f.date(review.createdAt, 'short')}
        </Text>
        {review.status ? (
          <Badge
            label={t(`shop:myReviews.status.${review.status}`)}
            tone={TONE[review.status] ?? 'neutral'}
            size="sm"
          />
        ) : null}
      </View>
      {review.title ? <Text variant="headline">{review.title}</Text> : null}
      <Text variant="callout">{review.comment}</Text>
      {review.reply ? (
        <View style={[styles.reply, { backgroundColor: colors.fill, borderLeftColor: colors.primary }]}>
          <Text variant="footnote" weight="bold" color="link">
            {t('shop:reviews.storeReply')}
          </Text>
          <Text variant="footnote">{review.reply.text}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** The customer's reviews with moderation status and store replies. */
export function MyReviewsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const root = useRootNavigation();
  const { isAuthenticated } = useSession();
  const reviews = useMyReviews();
  const [refreshing, setRefreshing] = useState(false);

  if (!isAuthenticated)
    return (
      <EmptyState
        icon={LogIn}
        title={t('shop:auth.loginTitle')}
        action={<Button title={t('shop:auth.signIn')} onPress={() => root.navigate('Login')} />}
      />
    );
  if (reviews.isPending) {
    return (
      <View style={{ padding: 16, gap: 12 }}>
        <Skeleton height={150} radius={14} />
        <Skeleton height={150} radius={14} />
      </View>
    );
  }
  if (reviews.isError)
    return (
      <ErrorState
        error={reviews.error}
        onRetry={() => void reviews.refetch()}
        retrying={reviews.isFetching}
      />
    );

  return (
    <FlashList
      style={{ backgroundColor: colors.background }}
      data={reviews.data}
      keyExtractor={(r) => r.id}
      renderItem={({ item }) => (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <MyReview review={item} />
        </View>
      )}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}
      ListEmptyComponent={
        <EmptyState
          icon={MessageSquareText}
          title={t('shop:myReviews.empty')}
          description={t('myReviews.emptyHint')}
          action={
            <Button
              title={t('common:nav.orders')}
              onPress={() =>
                root.navigate(
                  'Tabs',
                  { screen: 'ProfileTab', params: { screen: 'Orders', params: { status: 'completed' } } },
                  { pop: true },
                )
              }
            />
          }
        />
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await reviews.refetch();
            setRefreshing(false);
          }}
          tintColor={colors.link}
          colors={[colors.primary]}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 8 },
  product: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: { width: 48, height: 48, borderRadius: 8 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  reply: { borderLeftWidth: 3, borderRadius: 8, padding: 10, gap: 2 },
});
