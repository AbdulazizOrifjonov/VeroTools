import { useScrollToTop } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEngagement, useHome, useSession, useSettings } from '@vero/api-client';
import { useRootNavigation } from '../../navigation/hooks';
import type { HomeStackParamList, ListingParams } from '../../navigation/types';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hrefToRoute, openHref, type RouteTarget } from '../../lib/links';
import { useTheme } from '../../theme/theme';
import { HeroCarousel } from '../../features/home/HeroCarousel';
import {
  Advantages,
  BannerStrip,
  BrandsRail,
  CategoryGrid,
  PromotionsRail,
  ReviewsRail,
} from '../../features/home/sections';
import { ProductRail, ProductRailSkeleton } from '../../features/product/ProductRail';
import { ErrorState, IconButton, Logo, Skeleton, Text } from '../../ui';
import { Bell, Search } from '../../ui/icons';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const home = useHome();
  const settings = useSettings();
  const session = useSession();
  const engagement = useEngagement();
  const root = useRootNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const go = useCallback(
    (target: RouteTarget) => {
      // local navigate: product lists stay inside the Home tab
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigation as any).navigate(target.name, target.params);
    },
    [navigation],
  );
  const openUrl = useCallback((url: string) => openHref(url, go), [go]);
  const list = useCallback(
    (params: ListingParams) => navigation.navigate('ProductList', params),
    [navigation],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([home.refetch(), settings.refetch(), engagement.refetch()]);
    setRefreshing(false);
  };

  const d = home.data;
  const unread = session.isAuthenticated ? (engagement.data?.unreadNotifications ?? 0) : 0;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Logo size={38} />
        <Pressable
          onPress={() => root.navigate('Search')}
          accessibilityRole="search"
          accessibilityLabel={t('shop:search.placeholder')}
          style={({ pressed }) => [
            styles.search,
            { backgroundColor: colors.fill, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Search size={18} color={colors.mutedForeground} />
          <Text variant="callout" color="mutedForeground" numberOfLines={1} style={styles.flex}>
            {t('shop:search.placeholder')}
          </Text>
        </Pressable>
        {session.isAuthenticated ? (
          <IconButton
            icon={Bell}
            label={t('common:a11y.notifications')}
            badge={unread}
            onPress={() => {
              const route = hrefToRoute('/account/notifications');
              if (route) go(route);
            }}
          />
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.link}
            colors={[colors.primary]}
          />
        }
      >
        {home.isPending ? (
          <HomeSkeleton />
        ) : home.isError || !d ? (
          <ErrorState error={home.error} onRetry={() => void home.refetch()} retrying={home.isFetching} />
        ) : (
          <>
            <HeroCarousel banners={d.hero} onOpen={openUrl} />
            <CategoryGrid
              categories={d.categories}
              onOpen={(c) => list({ category: c.slug, title: c.name })}
              onAll={() =>
                go({ name: 'Tabs', params: { screen: 'CatalogTab', params: { screen: 'Catalog' } } })
              }
            />
            <PromotionsRail
              promotions={d.promotions}
              onOpen={(p) => list({ promotion: p.slug, title: p.name })}
              onAll={() => navigation.navigate('Promotions')}
            />
            <ProductRail
              title={t('home.featured')}
              products={d.featured}
              action={t('common:actions.seeAll')}
              onAction={() => list({ preset: { featured: true }, title: t('home.featured') })}
            />
            <BannerStrip banners={d.secondary} onOpen={openUrl} />
            <ProductRail
              title={t('shop:home.new')}
              products={d.newArrivals}
              action={t('common:actions.seeAll')}
              onAction={() => list({ preset: { isNew: true, sort: 'newest' }, title: t('shop:home.new') })}
            />
            <ProductRail
              title={t('shop:home.bestsellers')}
              products={d.bestsellers}
              action={t('common:actions.seeAll')}
              onAction={() =>
                list({ preset: { bestseller: true, sort: 'popular' }, title: t('shop:home.bestsellers') })
              }
            />
            <BannerStrip banners={d.middle} onOpen={openUrl} />
            <ProductRail
              title={t('shop:home.discounted')}
              products={d.discounted}
              action={t('common:actions.seeAll')}
              onAction={() =>
                list({ preset: { discounted: true, sort: 'discount' }, title: t('shop:home.discounted') })
              }
            />
            <ProductRail title={t('shop:home.recommended')} products={d.recommended} />
            <BrandsRail
              brands={d.brands}
              onOpen={(b) => list({ brand: b.slug, title: b.name })}
              onAll={() => navigation.navigate('Brands')}
            />
            <Advantages items={settings.data?.advantages ?? []} />
            <ReviewsRail
              reviews={d.reviews}
              onOpen={(r) => root.navigate('Product', { slug: r.product.slug })}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function HomeSkeleton() {
  return (
    <View style={{ gap: 24 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <Skeleton height={320} radius={16} />
      </View>
      <View style={{ paddingHorizontal: 16, flexDirection: 'row', gap: 10 }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ flex: 1, gap: 8, alignItems: 'center' }}>
            <Skeleton height={72} radius={16} />
            <Skeleton width="80%" height={10} />
          </View>
        ))}
      </View>
      <ProductRailSkeleton />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  search: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  content: { paddingTop: 16, paddingBottom: 32, gap: 28 },
});
