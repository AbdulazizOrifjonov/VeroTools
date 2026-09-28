import { useScrollToTop } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCategories } from '@vero/api-client';
import type { CategoryNode } from '@vero/types';
import { memo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useRootNavigation } from '../../navigation/hooks';
import type { CatalogStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/theme';
import { DynamicIcon, ErrorState, Skeleton, SmartImage, Text } from '../../ui';
import { ChevronRight, Search } from '../../ui/icons';

type Props = NativeStackScreenProps<CatalogStackParamList, 'Catalog'>;

export const CategoryRow = memo(function CategoryRow({
  category,
  onPress,
}: {
  category: CategoryNode | (Omit<CategoryNode, 'children'> & { children?: CategoryNode[] });
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const childCount = category.children?.length ?? 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${category.name}, ${t('shop:catalog.found', { count: category.productCount })}`}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.pressed : 'transparent' }]}
    >
      <View style={[styles.thumb, { backgroundColor: colors.fill }]}>
        {category.image ? (
          <SmartImage
            image={category.image}
            size="thumb"
            well={false}
            contentFit="contain"
            style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]}
          />
        ) : (
          <DynamicIcon name={category.icon} size={24} color={colors.link} strokeWidth={1.8} />
        )}
      </View>
      <View style={styles.rowText}>
        <Text variant="body" weight="semibold" numberOfLines={2}>
          {category.name}
        </Text>
        <Text variant="footnote" color="mutedForeground" tabular>
          {childCount ? `${t('catalog.subcategories', { count: childCount })} · ` : ''}
          {t('shop:catalog.found', { count: category.productCount })}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.mutedForeground} />
    </Pressable>
  );
});

/** Catalog tab: root categories → subcategories (drill-down) → product list. */
export function CatalogScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const root = useRootNavigation();
  const categories = useCategories();
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<FlatList<CategoryNode>>(null);
  useScrollToTop(listRef);

  const open = (c: CategoryNode) => {
    if (c.children.some((x) => x.productCount > 0))
      navigation.navigate('Category', { slug: c.slug, title: c.name });
    else navigation.navigate('ProductList', { category: c.slug, title: c.name });
  };

  const searchBar = (
    <Pressable
      onPress={() => root.navigate('Search')}
      accessibilityRole="search"
      accessibilityLabel={t('shop:search.placeholder')}
      style={({ pressed }) => [styles.search, { backgroundColor: colors.fill, opacity: pressed ? 0.8 : 1 }]}
    >
      <Search size={18} color={colors.mutedForeground} />
      <Text variant="callout" color="mutedForeground" numberOfLines={1}>
        {t('shop:search.placeholder')}
      </Text>
    </Pressable>
  );

  if (categories.isPending) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background, padding: 16, gap: 18 }]}>
        <Skeleton height={44} radius={12} />
        {Array.from({ length: 8 }, (_, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <Skeleton width={56} height={56} radius={14} />
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton width="70%" height={14} />
              <Skeleton width="40%" height={10} />
            </View>
          </View>
        ))}
      </View>
    );
  }
  if (categories.isError) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <ErrorState
          error={categories.error}
          onRetry={() => void categories.refetch()}
          retrying={categories.isFetching}
        />
      </View>
    );
  }

  const data = categories.data.filter((c) => c.productCount > 0);

  return (
    <FlatList
      ref={listRef}
      style={{ backgroundColor: colors.background }}
      data={data}
      keyExtractor={(c) => c.id}
      ListHeaderComponent={
        <View style={{ padding: 16, paddingBottom: 8, gap: 16 }}>
          {searchBar}
          <Pressable
            onPress={() => navigation.navigate('ProductList', { title: t('common:nav.allProducts') })}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.all,
              { borderColor: colors.border, backgroundColor: pressed ? colors.pressed : colors.card },
            ]}
          >
            <Text variant="headline" style={styles.flex}>
              {t('common:nav.allProducts')}
            </Text>
            <ChevronRight size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>
      }
      renderItem={({ item }) => <CategoryRow category={item} onPress={() => open(item)} />}
      ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: colors.border }]} />}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await categories.refetch();
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
  flex: { flex: 1 },
  search: {
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  all: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 72,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rowText: { flex: 1, gap: 3 },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 86 },
});
