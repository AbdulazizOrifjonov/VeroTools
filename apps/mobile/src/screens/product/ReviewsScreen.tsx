import { FlashList } from '@shopify/flash-list';
import { useApi, useProduct, useSession } from '@vero/api-client';
import { uniqueBy } from '@vero/utils';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import type { RootScreenProps } from '../../navigation/types';
import { useTheme } from '../../theme/theme';
import { RatingSummary, ReviewItem } from '../../features/product/ReviewItems';
import { BottomBar, Button, Chip, EmptyState, ErrorState, Skeleton } from '../../ui';
import { Image as ImageIcon, MessageSquareText } from '../../ui/icons';

type Sort = 'newest' | 'rating_desc' | 'rating_asc';

/** All reviews of a product: distribution filter, with photos, sorting, infinite list, "write a review". */
export function ReviewsScreen({ navigation, route }: RootScreenProps<'Reviews'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const api = useApi();
  const { isAuthenticated } = useSession();
  const { slug } = route.params;
  const product = useProduct(slug);
  const productId = route.params.productId ?? product.data?.id;
  const name = route.params.name ?? product.data?.name ?? '';
  const [sort, setSort] = useState<Sort>('newest');
  const [rating, setRating] = useState<number | undefined>();
  const [withPhotos, setWithPhotos] = useState(false);

  const reviews = useInfiniteQuery({
    queryKey: ['reviews', productId, { sort, rating, withPhotos, infinite: true }],
    queryFn: ({ pageParam }) =>
      api.catalog.reviews(productId!, {
        page: pageParam,
        limit: 10,
        sort,
        rating,
        withPhotos: withPhotos || undefined,
      }),
    enabled: !!productId,
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.pages ? last.meta.page + 1 : undefined),
  });
  const items = useMemo(
    () => uniqueBy(reviews.data?.pages.flatMap((p) => p.items) ?? [], (r) => r.id),
    [reviews.data],
  );
  const p = product.data;

  const header = (
    <View style={{ gap: 14, paddingTop: 16 }}>
      {p && p.reviewCount > 0 ? (
        <RatingSummary
          average={p.rating}
          count={p.reviewCount}
          distribution={p.ratingDistribution}
          onFilter={setRating}
          activeRating={rating}
        />
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip
          label={t('shop:reviews.sortNewest')}
          selected={sort === 'newest'}
          onPress={() => setSort('newest')}
        />
        <Chip
          label={t('shop:reviews.sortHigh')}
          selected={sort === 'rating_desc'}
          onPress={() => setSort('rating_desc')}
        />
        <Chip
          label={t('shop:reviews.sortLow')}
          selected={sort === 'rating_asc'}
          onPress={() => setSort('rating_asc')}
        />
        <Chip
          label={t('shop:reviews.withPhotos')}
          icon={ImageIcon}
          selected={withPhotos}
          onPress={() => setWithPhotos((v) => !v)}
        />
        {rating ? <Chip label={`${rating} ★`} selected onRemove={() => setRating(undefined)} /> : null}
      </ScrollView>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {reviews.isPending ? (
        <View style={{ padding: 16, gap: 14 }}>
          <Skeleton height={110} radius={12} />
          <Skeleton height={90} />
          <Skeleton height={90} />
        </View>
      ) : reviews.isError && !items.length ? (
        <ErrorState error={reviews.error} onRetry={() => void reviews.refetch()} />
      ) : (
        <FlashList
          data={items}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => <ReviewItem review={item} />}
          ListHeaderComponent={header}
          ListEmptyComponent={<EmptyState compact icon={MessageSquareText} title={t('shop:reviews.empty')} />}
          ListFooterComponent={
            reviews.isFetchingNextPage ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator color={colors.link} />
              </View>
            ) : (
              <View style={{ height: 24 }} />
            )
          }
          onEndReached={() => {
            if (reviews.hasNextPage && !reviews.isFetchingNextPage) void reviews.fetchNextPage();
          }}
          contentContainerStyle={styles.list}
        />
      )}
      <BottomBar>
        <Button
          title={isAuthenticated ? t('shop:reviews.write') : t('shop:reviews.loginToWrite')}
          style={{ flex: 1 }}
          disabled={!productId}
          onPress={() =>
            isAuthenticated
              ? productId && navigation.navigate('WriteReview', { productId, slug, name })
              : navigation.navigate('Login')
          }
        />
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16 },
});
