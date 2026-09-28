import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useBrands } from '@vero/api-client';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, useWindowDimensions, View } from 'react-native';
import { BrandTile } from '../../features/home/sections';
import type { HomeStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/theme';
import { EmptyState, ErrorState, Skeleton, Text, TextField } from '../../ui';
import { Search, Tag } from '../../ui/icons';

type Props = NativeStackScreenProps<HomeStackParamList, 'Brands'>;

/** All brands with a quick search. */
export function BrandsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const brands = useBrands({ limit: 100 });
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const cols = width >= 700 ? 4 : 2;
  const tile = Math.floor((width - 32 - (cols - 1) * 10) / cols);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (brands.data?.items ?? []).filter(
      (b) => b.productCount > 0 && (!q || b.name.toLowerCase().includes(q)),
    );
  }, [brands.data, query]);

  if (brands.isPending) {
    return (
      <View style={{ padding: 16, gap: 10, flexDirection: 'row', flexWrap: 'wrap' }}>
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} width={tile} height={64} radius={12} />
        ))}
      </View>
    );
  }
  if (brands.isError)
    return (
      <ErrorState error={brands.error} onRetry={() => void brands.refetch()} retrying={brands.isFetching} />
    );

  return (
    <FlatList
      key={cols}
      style={{ backgroundColor: colors.background }}
      data={list}
      numColumns={cols}
      keyExtractor={(b) => b.id}
      columnWrapperStyle={{ gap: 10 }}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: 10, paddingBottom: 6 }}>
          <Text variant="footnote" color="mutedForeground">
            {t('brands.description')}
          </Text>
          <TextField
            icon={Search}
            value={query}
            onChangeText={setQuery}
            placeholder={t('brands.searchPlaceholder')}
            clearable
            autoCorrect={false}
          />
        </View>
      }
      renderItem={({ item }) => (
        <View style={{ gap: 4, width: tile }}>
          <BrandTile
            brand={item}
            width={tile}
            onPress={() => navigation.navigate('ProductList', { brand: item.slug, title: item.name })}
          />
          <Text variant="caption" color="mutedForeground" align="center" numberOfLines={1}>
            {item.name} · {item.productCount}
          </Text>
        </View>
      )}
      ListEmptyComponent={<EmptyState compact icon={Tag} title={t('common:status.noResults')} />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await brands.refetch();
            setRefreshing(false);
          }}
          tintColor={colors.link}
          colors={[colors.primary]}
        />
      }
    />
  );
}
