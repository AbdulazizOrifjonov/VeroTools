import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCategories } from '@vero/api-client';
import type { CategoryNode } from '@vero/types';
import { useLayoutEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import type { CatalogStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/theme';
import { EmptyState, ErrorState, LoadingView, Text } from '../../ui';
import { ChevronRight, PackageSearch } from '../../ui/icons';
import { CategoryRow } from './CatalogScreen';

type Props = NativeStackScreenProps<CatalogStackParamList, 'Category'>;

function findNode(nodes: CategoryNode[] | undefined, slug: string): CategoryNode | undefined {
  for (const n of nodes ?? []) {
    if (n.slug === slug) return n;
    const inner = findNode(n.children, slug);
    if (inner) return inner;
  }
  return undefined;
}

/** Subcategories of a category (with product counts) + "all products in <category>". */
export function CategoryScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tree = useCategories();
  const node = useMemo(() => findNode(tree.data, route.params.slug), [tree.data, route.params.slug]);

  useLayoutEffect(() => {
    if (node) navigation.setOptions({ title: node.name });
  }, [navigation, node]);

  if (tree.isPending) return <LoadingView style={{ backgroundColor: colors.background }} />;
  if (tree.isError) return <ErrorState error={tree.error} onRetry={() => void tree.refetch()} />;
  if (!node)
    return (
      <EmptyState
        icon={PackageSearch}
        title={t('shop:notFound.title')}
        description={t('shop:notFound.text')}
      />
    );

  const children = node.children.filter((c) => c.productCount > 0);
  const open = (c: CategoryNode) => {
    if (c.children.some((x) => x.productCount > 0))
      navigation.push('Category', { slug: c.slug, title: c.name });
    else navigation.navigate('ProductList', { category: c.slug, title: c.name });
  };

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      data={children}
      keyExtractor={(c) => c.id}
      ListHeaderComponent={
        <View style={{ padding: 16, paddingBottom: 8 }}>
          <Pressable
            onPress={() => navigation.navigate('ProductList', { category: node.slug, title: node.name })}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.all,
              { backgroundColor: pressed ? colors.brandSoft : colors.brandSoft },
            ]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="headline" color="brandSoftForeground">
                {t('catalog.allIn', { name: node.name })}
              </Text>
              <Text variant="footnote" color="brandSoftForeground" tabular>
                {t('shop:catalog.found', { count: node.productCount })}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.brandSoftForeground} />
          </Pressable>
        </View>
      }
      renderItem={({ item }) => <CategoryRow category={item} onPress={() => open(item)} />}
      ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: colors.border }]} />}
      ListEmptyComponent={<EmptyState compact title={t('catalog.noSubcategories')} />}
      contentContainerStyle={{ paddingBottom: 24 }}
    />
  );
}

const styles = StyleSheet.create({
  all: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 86 },
});
