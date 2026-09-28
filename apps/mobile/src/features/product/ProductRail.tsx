import type { ProductCard as ProductCardDTO } from '@vero/types';
import { memo, useCallback } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View, type ListRenderItem } from 'react-native';
import { SectionHeader, Skeleton } from '../../ui';
import { ProductCard } from './ProductCard';

/** Card width for horizontal rails (≈2.3 cards visible on phones, more on tablets). */
export function useRailCardWidth(): number {
  const { width } = useWindowDimensions();
  if (width >= 900) return 200;
  if (width >= 600) return 184;
  return Math.round(Math.min(176, (width - 16 - 12 * 2) / 2.25));
}

export const ProductRail = memo(function ProductRail({
  title,
  products,
  action,
  onAction,
  compact,
}: {
  title: string;
  products: ProductCardDTO[];
  action?: string;
  onAction?: () => void;
  compact?: boolean;
}) {
  const cardWidth = useRailCardWidth();
  const renderItem = useCallback<ListRenderItem<ProductCardDTO>>(
    ({ item }) => <ProductCard product={item} width={cardWidth} compact={compact} />,
    [cardWidth, compact],
  );
  if (!products.length) return null;
  return (
    <View style={styles.section}>
      <SectionHeader title={title} action={action} onAction={onAction} />
      <FlatList
        horizontal
        data={products}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={Separator}
        initialNumToRender={4}
        windowSize={5}
        removeClippedSubviews
        accessibilityLabel={title}
      />
    </View>
  );
});

function Separator() {
  return <View style={{ width: 12 }} />;
}

export function ProductRailSkeleton() {
  const cardWidth = useRailCardWidth();
  return (
    <View style={styles.section}>
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <Skeleton width={160} height={20} />
      </View>
      <View style={[styles.content, { flexDirection: 'row', gap: 12 }]}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ width: cardWidth, gap: 8 }}>
            <Skeleton width={cardWidth} height={cardWidth} radius={12} />
            <Skeleton width="60%" height={10} />
            <Skeleton width="95%" height={14} />
            <Skeleton width="45%" height={16} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingTop: 8 },
  content: { paddingHorizontal: 16 },
});
