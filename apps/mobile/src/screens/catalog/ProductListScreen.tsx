import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import {
  useBrand,
  useCategories,
  useCategory,
  useFacets,
  useInfiniteProducts,
  usePromotion,
} from '@vero/api-client';
import { LIMITS } from '@vero/config';
import {
  SORT_OPTIONS,
  type CategoryNode,
  type ProductCard as ProductCardDTO,
  type ProductListParams,
  type SortOption,
} from '@vero/types';
import { uniqueBy } from '@vero/utils';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFormat } from '../../lib/format';
import { activeChips, cleanParams, countFilters, withoutFilters } from '../../features/catalog/listing';
import { FiltersSheet } from '../../features/catalog/FiltersSheet';
import { ProductCard } from '../../features/product/ProductCard';
import { GRID_GAP, useGrid } from '../../features/product/grid';
import type { ListingParams, RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/theme';
import {
  Badge,
  Button,
  Chip,
  Countdown,
  EmptyState,
  ErrorState,
  SelectSheet,
  Skeleton,
  SmartImage,
  Text,
} from '../../ui';
import { ArrowUpDown, PackageSearch, SlidersHorizontal, X } from '../../ui/icons';

function findNode(nodes: CategoryNode[] | undefined, slug: string): CategoryNode | undefined {
  for (const n of nodes ?? []) {
    if (n.slug === slug) return n;
    const inner = findNode(n.children, slug);
    if (inner) return inner;
  }
  return undefined;
}

/** Product list for a category / brand / promotion / search query / home rail: filters, sort, infinite grid. */
export function ProductListScreen() {
  const { t } = useTranslation();
  const f = useFormat();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'ProductList'>>();
  const p: ListingParams = route.params ?? {};
  const { columns, cardWidth } = useGrid();

  // scope that defines this list (never removed by "clear filters")
  const fixed = useMemo<ProductListParams>(
    () =>
      cleanParams({
        category: p.category,
        brand: p.brand ? [p.brand] : undefined,
        promotion: p.promotion,
        q: p.q,
        ...(p.preset ?? {}),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.category, p.brand, p.promotion, p.q, JSON.stringify(p.preset)],
  );
  const [filters, setFilters] = useState<ProductListParams>(() => cleanParams({ ...(p.initial ?? {}) }));
  const [sort, setSort] = useState<SortOption>(
    p.preset?.sort ?? p.initial?.sort ?? (p.q ? 'popular' : 'recommended'),
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const params = useMemo(
    () => cleanParams({ ...filters, ...fixed, sort, limit: LIMITS.pageSizeDefault }),
    [filters, fixed, sort],
  );
  const products = useInfiniteProducts(params);
  const facets = useFacets(params);

  const category = useCategory(p.category);
  const tree = useCategories();
  const brand = useBrand(p.brand);
  const promotion = usePromotion(p.promotion);
  const node = p.category ? findNode(tree.data, p.category) : undefined;

  const title =
    (p.category && (category.data?.name ?? node?.name)) ||
    (p.brand && brand.data?.name) ||
    (p.promotion && promotion.data?.name) ||
    (p.q ? t('shop:search.resultsFor', { query: p.q }) : undefined) ||
    p.title ||
    t('common:nav.allProducts');

  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  const items = useMemo(
    () => uniqueBy(products.data?.pages.flatMap((pg) => pg.items) ?? [], (x) => x.id),
    [products.data],
  );
  const total = products.data?.pages[0]?.meta.total;
  const filterCount = countFilters(params, fixed);
  const chips = useMemo(
    () => activeChips(params, fixed, facets.data, t, f.price),
    [params, fixed, facets.data, t, f.price],
  );

  const applyFilters = useCallback(
    (next: ProductListParams) => {
      // strip the scope and sort (they live in their own state)
      const rest = { ...next };
      delete rest.sort;
      delete rest.limit;
      delete rest.page;
      for (const k of ['q', 'promotion'] as const) if (fixed[k] !== undefined) delete rest[k];
      if (fixed.category) delete rest.category;
      if (fixed.brand) delete rest.brand;
      if (fixed.featured) delete rest.featured;
      if (fixed.isNew) delete rest.isNew;
      if (fixed.bestseller) delete rest.bestseller;
      if (fixed.discounted) delete rest.discounted;
      setFilters(cleanParams(rest));
    },
    [fixed],
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([products.refetch(), facets.refetch()]);
    setRefreshing(false);
  };

  // reset filters when the scope changes (navigating to another category in the same screen instance)
  useEffect(() => {
    setFilters(cleanParams({ ...(p.initial ?? {}) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixed]);

  const renderItem = useCallback<ListRenderItem<ProductCardDTO>>(
    ({ item }) => (
      <View style={styles.cell}>
        <ProductCard product={item} width={cardWidth} />
      </View>
    ),
    [cardWidth],
  );

  const subcategories = node?.children.filter((c) => c.productCount > 0) ?? [];
  const promo = promotion.data;

  const header = (
    <View style={styles.headerBlock}>
      {promo ? (
        <View style={[styles.promo, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {promo.image ? (
            <SmartImage
              image={promo.image}
              size="medium"
              well={false}
              contentFit="cover"
              style={styles.promoImage}
            />
          ) : null}
          <View style={{ padding: 14, gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Badge
                tone="sale"
                label={
                  promo.discountType === 'percent'
                    ? t('shop:promotions.discountPercent', { value: promo.discountValue })
                    : t('shop:promotions.discountFixed', { amount: f.price(promo.discountValue) })
                }
              />
              <Text variant="footnote" color="mutedForeground">
                {promo.isActive
                  ? t('shop:promotions.until', { date: f.date(promo.endsAt, 'dayMonth') })
                  : t('shop:promotions.ended')}
              </Text>
            </View>
            {promo.description ? (
              <Text variant="callout" color="mutedForeground">
                {promo.description}
              </Text>
            ) : null}
            {promo.isActive && new Date(promo.endsAt).getTime() - Date.now() < 14 * 86_400_000 ? (
              <Countdown endsAt={promo.endsAt} />
            ) : null}
          </View>
        </View>
      ) : null}
      {brand.data?.description ? (
        <Text variant="callout" color="mutedForeground" numberOfLines={4} style={{ paddingHorizontal: 16 }}>
          {brand.data.description}
        </Text>
      ) : null}
      {subcategories.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {subcategories.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              count={c.productCount}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onPress={() => (navigation as any).push('ProductList', { category: c.slug, title: c.name })}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {/* toolbar */}
      <View
        style={[styles.toolbar, { borderBottomColor: colors.border, backgroundColor: colors.background }]}
      >
        <Pressable
          onPress={() => setFiltersOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={
            filterCount ? t('shop:catalog.filtersCount', { count: filterCount }) : t('shop:catalog.filters')
          }
          style={({ pressed }) => [
            styles.toolBtn,
            {
              borderColor: filterCount ? colors.primary : colors.border,
              backgroundColor: pressed ? colors.pressed : colors.card,
            },
          ]}
        >
          <SlidersHorizontal size={17} color={filterCount ? colors.link : colors.foreground} />
          <Text variant="subhead" weight="bold" color={filterCount ? 'link' : 'foreground'}>
            {t('shop:catalog.filters')}
          </Text>
          {filterCount ? (
            <View style={[styles.countPill, { backgroundColor: colors.primary }]}>
              <Text variant="caption" weight="bold" color="primaryForeground" tabular>
                {filterCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          onPress={() => setSortOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${t('common:actions.sort')}: ${t(`common:sort.${sort}`)}`}
          style={({ pressed }) => [
            styles.toolBtn,
            styles.flex,
            { borderColor: colors.border, backgroundColor: pressed ? colors.pressed : colors.card },
          ]}
        >
          <ArrowUpDown size={17} color={colors.foreground} />
          <Text variant="subhead" weight="semibold" numberOfLines={1} style={styles.flex}>
            {t(`common:sort.${sort}`)}
          </Text>
        </Pressable>
      </View>
      {chips.length ? (
        <View style={[styles.chipsBar, { borderBottomColor: colors.border }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {chips.map((c) => (
              <Chip
                key={c.key}
                label={c.label}
                selected
                onRemove={() => applyFilters(c.remove(params))}
                accessibilityLabel={`${t('common:actions.remove')}: ${c.label}`}
              />
            ))}
            <Chip
              label={t('shop:catalog.clearFilters')}
              icon={X}
              onPress={() => applyFilters(withoutFilters(params, fixed))}
            />
          </ScrollView>
        </View>
      ) : null}

      {products.isPending ? (
        <GridSkeleton columns={columns} cardWidth={cardWidth} />
      ) : products.isError && !items.length ? (
        <ErrorState
          error={products.error}
          onRetry={() => void products.refetch()}
          retrying={products.isFetching}
        />
      ) : (
        <FlashList
          data={items}
          key={columns}
          numColumns={columns}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View>
              {header}
              {total !== undefined ? (
                <Text
                  variant="footnote"
                  color="mutedForeground"
                  style={styles.count}
                  accessibilityLiveRegion="polite"
                >
                  {t('shop:catalog.found', { count: total })}
                </Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon={PackageSearch}
              title={p.q ? t('shop:search.noResults', { query: p.q }) : t('shop:catalog.noProducts')}
              description={p.q ? t('shop:search.noResultsHint') : t('shop:catalog.noProductsHint')}
              action={
                filterCount ? (
                  <Button
                    title={t('shop:catalog.clearFilters')}
                    variant="outline"
                    onPress={() => applyFilters(withoutFilters(params, fixed))}
                  />
                ) : undefined
              }
            />
          }
          ListFooterComponent={
            products.isFetchingNextPage ? (
              <View style={styles.footer}>
                <ActivityIndicator color={colors.link} />
              </View>
            ) : products.isError ? (
              <View style={styles.footer}>
                <Button
                  title={t('common:actions.retry')}
                  variant="outline"
                  size="sm"
                  onPress={() => void products.fetchNextPage()}
                />
              </View>
            ) : (
              <View style={{ height: 24 }} />
            )
          }
          onEndReached={() => {
            if (products.hasNextPage && !products.isFetchingNextPage && !products.isError)
              void products.fetchNextPage();
          }}
          onEndReachedThreshold={0.6}
          contentContainerStyle={styles.gridContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.link}
              colors={[colors.primary]}
            />
          }
          maintainVisibleContentPosition={{ disabled: true }}
          drawDistance={600}
        />
      )}

      <FiltersSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        value={params}
        fixed={fixed}
        onApply={applyFilters}
        showCategory={!p.category}
        hideBrand={!!p.brand}
      />
      <SelectSheet
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        title={t('common:actions.sort')}
        value={sort}
        options={SORT_OPTIONS.map((o) => ({ value: o, label: t(`common:sort.${o}`) }))}
        onSelect={(v) => setSort(v as SortOption)}
        searchable={false}
      />
    </View>
  );
}

function GridSkeleton({ columns, cardWidth }: { columns: number; cardWidth: number }) {
  return (
    <View style={[styles.gridContent, { flexDirection: 'row', flexWrap: 'wrap', paddingTop: 16 }]}>
      {Array.from({ length: columns * 3 }, (_, i) => (
        <View key={i} style={[styles.cell, { gap: 8 }]}>
          <Skeleton width={cardWidth} height={cardWidth} radius={12} />
          <Skeleton width={cardWidth * 0.5} height={10} />
          <Skeleton width={cardWidth * 0.9} height={14} />
          <Skeleton width={cardWidth * 0.6} height={16} />
          <Skeleton width={cardWidth} height={38} radius={10} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  countPill: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  chipsBar: { borderBottomWidth: StyleSheet.hairlineWidth },
  chipsRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  headerBlock: { gap: 12, paddingTop: 4 },
  promo: {
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  promoImage: { width: '100%', aspectRatio: 3, borderRadius: 0 },
  count: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  gridContent: { paddingHorizontal: 16 - GRID_GAP / 2 },
  cell: { paddingHorizontal: GRID_GAP / 2, paddingBottom: 22 },
  footer: { paddingVertical: 24, alignItems: 'center' },
});
