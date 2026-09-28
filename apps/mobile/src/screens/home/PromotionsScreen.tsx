import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { usePromotions } from '@vero/api-client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, useWindowDimensions, View } from 'react-native';
import { PromotionCard } from '../../features/home/sections';
import type { HomeStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/theme';
import { EmptyState, ErrorState, Skeleton, Text } from '../../ui';
import { Tag } from '../../ui/icons';

type Props = NativeStackScreenProps<HomeStackParamList, 'Promotions'>;

/** Active promotions (discounts are applied automatically on the product page and in the cart). */
export function PromotionsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const promotions = usePromotions();
  const [refreshing, setRefreshing] = useState(false);
  const cols = width >= 700 ? 2 : 1;
  const cardWidth = Math.floor((width - 32 - (cols - 1) * 12) / cols);

  if (promotions.isPending) {
    return (
      <View style={{ padding: 16, gap: 14 }}>
        <Skeleton height={260} radius={14} />
        <Skeleton height={260} radius={14} />
      </View>
    );
  }
  if (promotions.isError)
    return (
      <ErrorState
        error={promotions.error}
        onRetry={() => void promotions.refetch()}
        retrying={promotions.isFetching}
      />
    );

  return (
    <FlatList
      key={cols}
      style={{ backgroundColor: colors.background }}
      data={promotions.data}
      numColumns={cols}
      keyExtractor={(p) => p.id}
      columnWrapperStyle={cols > 1 ? { gap: 12 } : undefined}
      contentContainerStyle={{ padding: 16, gap: 14 }}
      ListHeaderComponent={
        <Text variant="footnote" color="mutedForeground">
          {t('promotions.description')}
        </Text>
      }
      renderItem={({ item }) => (
        <PromotionCard
          promotion={item}
          width={cardWidth}
          onPress={() => navigation.navigate('ProductList', { promotion: item.slug, title: item.name })}
        />
      )}
      ListEmptyComponent={<EmptyState icon={Tag} title={t('shop:promotions.empty')} />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await promotions.refetch();
            setRefreshing(false);
          }}
          tintColor={colors.link}
          colors={[colors.primary]}
        />
      }
    />
  );
}
