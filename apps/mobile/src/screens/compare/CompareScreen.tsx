import { useClearCompare, useCompare, useToggleCompare } from '@vero/api-client';
import type { CompareGroup, CompareRow, ProductCard } from '@vero/types';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { confirm } from '../../lib/dialogs';
import { useFormat } from '../../lib/format';
import { errorMessage } from '../../lib/i18n';
import { toast } from '../../lib/toast';
import type { RootScreenProps } from '../../navigation/types';
import { useTheme } from '../../theme/theme';
import { useAddToCartAction, useCartQuantity } from '../../features/product/actions';
import {
  Button,
  Chip,
  EmptyState,
  ErrorState,
  IconButton,
  PriceText,
  RatingStars,
  Skeleton,
  SmartImage,
  SwitchRow,
  Text,
} from '../../ui';
import { Check, Scale, ShoppingCart, Trash2, X } from '../../ui/icons';

const LABEL_W = 116;
const COL_W = 156;
const ROW_H = 64;
const HEAD_H = 268;

function ProductHead({
  product,
  onRemove,
  onOpen,
}: {
  product: ProductCard;
  onRemove: () => void;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const cart = useAddToCartAction();
  const inCart = useCartQuantity(product.id);
  const out = product.stock.available <= 0;
  return (
    <View style={[styles.head, { borderRightColor: colors.border }]}>
      <Pressable onPress={onOpen} accessibilityRole="link" accessibilityLabel={product.name}>
        <SmartImage image={product.image} size="thumb" style={styles.headImg} />
      </Pressable>
      <IconButton
        icon={X}
        label={`${t('common:actions.removeFromCompare')}: ${product.name}`}
        variant="overlay"
        size={30}
        iconSize={15}
        style={styles.headRemove}
        onPress={onRemove}
      />
      <Text variant="footnote" weight="semibold" numberOfLines={3} onPress={onOpen} style={{ minHeight: 48 }}>
        {product.name}
      </Text>
      <PriceText amount={product.price} oldAmount={product.oldPrice} size="sm" />
      {out ? (
        <Text variant="caption" weight="bold" color="mutedForeground">
          {t('common:product.outOfStock')}
        </Text>
      ) : product.hasVariants ? (
        <Button title={t('productCard.chooseOption')} size="sm" variant="secondary" onPress={onOpen} />
      ) : (
        <Button
          title={inCart ? t('common:actions.inCart') : t('common:actions.addToCart')}
          icon={inCart ? Check : ShoppingCart}
          size="sm"
          variant={inCart ? 'soft' : 'primary'}
          loading={cart.pendingProductId === product.id}
          onPress={() => (inCart ? undefined : cart.add({ productId: product.id }))}
        />
      )}
    </View>
  );
}

/** Labels and values come localised and formatted from the API (values already include units). */
function rowLabel(row: CompareRow): string {
  return row.label;
}

/** Side-by-side comparison per category (only-differences toggle, remove / clear). */
export function CompareScreen({ navigation }: RootScreenProps<'Compare'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const f = useFormat();
  const compare = useCompare();
  const toggle = useToggleCompare();
  const clear = useClearCompare();
  const [groupIndex, setGroupIndex] = useState(0);
  const [onlyDiff, setOnlyDiff] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const groups = compare.data?.groups ?? [];
  const group: CompareGroup | undefined = groups[Math.min(groupIndex, groups.length - 1)];

  useEffect(() => {
    if (groupIndex >= groups.length && groups.length) setGroupIndex(0);
  }, [groups.length, groupIndex]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: groups.length
        ? () => (
            <IconButton
              icon={Trash2}
              label={t('shop:compare.clear')}
              onPress={async () => {
                const ok = await confirm(
                  t('shop:compare.clear'),
                  t('compare.clearConfirm'),
                  t('shop:compare.clear'),
                  t('common:actions.cancel'),
                );
                if (ok) clear.mutate(undefined, { onError: (e) => toast.error(errorMessage(t, e)) });
              }}
            />
          )
        : undefined,
    });
  }, [navigation, groups.length, t, clear]);

  const rows = useMemo(
    () => (group ? group.rows.filter((r) => !onlyDiff || r.isDifferent) : []),
    [group, onlyDiff],
  );

  if (compare.isPending) {
    return (
      <View style={{ flex: 1, padding: 16, gap: 12, backgroundColor: colors.background }}>
        <Skeleton height={36} width="60%" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Skeleton width={LABEL_W} height={HEAD_H} radius={12} />
          <Skeleton width={COL_W} height={HEAD_H} radius={12} />
          <Skeleton width={COL_W} height={HEAD_H} radius={12} />
        </View>
      </View>
    );
  }
  if (compare.isError)
    return (
      <ErrorState
        error={compare.error}
        onRetry={() => void compare.refetch()}
        retrying={compare.isFetching}
      />
    );
  if (!group) {
    return (
      <EmptyState
        icon={Scale}
        title={t('shop:compare.empty')}
        description={t('shop:compare.emptyHint')}
        action={
          <Button
            title={t('shop:compare.addMore')}
            onPress={() => navigation.navigate('Tabs', { screen: 'CatalogTab' }, { pop: true })}
          />
        }
      />
    );
  }

  const remove = (id: string) =>
    toggle.mutate({ productId: id, active: true }, { onError: (e) => toast.error(errorMessage(t, e)) });

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await compare.refetch();
            setRefreshing(false);
          }}
          tintColor={colors.link}
          colors={[colors.primary]}
        />
      }
    >
      {groups.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groups}>
          {groups.map((g, i) => (
            <Chip
              key={g.category.id}
              label={g.category.name}
              count={g.products.length}
              selected={i === groupIndex}
              onPress={() => setGroupIndex(i)}
            />
          ))}
        </ScrollView>
      ) : (
        <Text variant="headline" style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          {group.category.name}
        </Text>
      )}
      <View style={{ paddingHorizontal: 16 }}>
        <SwitchRow label={t('shop:compare.onlyDifferences')} value={onlyDiff} onChange={setOnlyDiff} />
      </View>
      <View style={[styles.table, { borderTopColor: colors.border }]}>
        {/* fixed label column */}
        <View style={{ width: LABEL_W }}>
          <View style={[styles.labelHead, { height: HEAD_H, borderBottomColor: colors.border }]}>
            <Text variant="caption" color="mutedForeground">
              {t('shop:catalog.found', { count: group.products.length })}
            </Text>
          </View>
          {rows.map((r) => (
            <View
              key={r.key}
              style={[
                styles.labelCell,
                {
                  borderBottomColor: colors.border,
                  backgroundColor: r.isDifferent ? colors.surface : colors.background,
                },
              ]}
            >
              <Text variant="caption" weight="semibold" color="mutedForeground" numberOfLines={3}>
                {rowLabel(r)}
              </Text>
            </View>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View style={[styles.headRow, { borderBottomColor: colors.border }]}>
              {group.products.map((p) => (
                <ProductHead
                  key={p.id}
                  product={p}
                  onRemove={() => remove(p.id)}
                  onOpen={() => navigation.navigate('Product', { slug: p.slug })}
                />
              ))}
            </View>
            {rows.map((r) => (
              <View
                key={r.key}
                style={[
                  styles.valueRow,
                  {
                    borderBottomColor: colors.border,
                    backgroundColor: r.isDifferent ? colors.surface : colors.background,
                  },
                ]}
              >
                {r.values.map((v, i) => {
                  const product = group.products[i];
                  return (
                    <View key={i} style={[styles.valueCell, { borderRightColor: colors.border }]}>
                      {r.key === 'rating' && product ? (
                        <View style={{ gap: 2 }}>
                          <RatingStars value={product.rating} size={12} />
                          <Text variant="caption" color="mutedForeground" tabular>
                            {product.reviewCount
                              ? `${product.rating.toFixed(1)} · ${product.reviewCount}`
                              : '—'}
                          </Text>
                        </View>
                      ) : r.key === 'price' && product ? (
                        <Text variant="footnote" weight="bold" tabular>
                          {f.price(product.price)}
                        </Text>
                      ) : (
                        <Text variant="footnote" numberOfLines={3} tabular>
                          {v ?? '—'}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
      {onlyDiff && !rows.length ? (
        <Text variant="callout" color="mutedForeground" align="center" style={{ padding: 20 }}>
          {t('shop:compare.sameValues')}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  groups: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  table: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 4 },
  labelHead: {
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  labelCell: {
    height: ROW_H,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headRow: { flexDirection: 'row', height: HEAD_H, borderBottomWidth: StyleSheet.hairlineWidth },
  head: { width: COL_W, padding: 10, gap: 6, borderRightWidth: StyleSheet.hairlineWidth },
  headImg: { width: COL_W - 20, height: 100, borderRadius: 10 },
  headRemove: { position: 'absolute', top: 14, right: 14 },
  valueRow: { flexDirection: 'row', height: ROW_H, borderBottomWidth: StyleSheet.hairlineWidth },
  valueCell: {
    width: COL_W,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
  },
});
