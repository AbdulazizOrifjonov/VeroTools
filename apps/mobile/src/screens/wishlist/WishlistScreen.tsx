import { FlashList } from '@shopify/flash-list';
import { useScrollToTop } from '@react-navigation/native';
import { useAddToCart, useSession, useWishlist } from '@vero/api-client';
import type { WishlistItemDTO } from '@vero/types';
import { memo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useFormat } from '../../lib/format';
import { haptic } from '../../lib/haptics';
import { toast } from '../../lib/toast';
import { useRootNavigation } from '../../navigation/hooks';
import { useTheme } from '../../theme/theme';
import {
  cartErrorText,
  useAddToCartAction,
  useCartQuantity,
  useWishlistToggle,
} from '../../features/product/actions';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  Notice,
  PriceText,
  Skeleton,
  SmartImage,
  Text,
} from '../../ui';
import { Check, Heart, Info, ShoppingCart, TrendingUp, X } from '../../ui/icons';

const WishlistRow = memo(function WishlistRow({ item }: { item: WishlistItemDTO }) {
  const { t } = useTranslation();
  const f = useFormat();
  const { colors } = useTheme();
  const root = useRootNavigation();
  const wishlist = useWishlistToggle();
  const cart = useAddToCartAction();
  const inCart = useCartQuantity(item.productId);
  const p = item.product;
  const out = p.stock.status === 'out_of_stock' || p.stock.available <= 0;
  const cheaper = item.priceChange < 0;
  const pricier = item.priceChange > 0;
  const open = () => root.navigate('Product', { slug: p.slug });

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Pressable onPress={open} accessibilityRole="link" accessibilityLabel={p.name}>
        <SmartImage image={p.image} size="thumb" style={styles.thumb} />
      </Pressable>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Text variant="subhead" weight="semibold" numberOfLines={2} style={{ flex: 1 }} onPress={open}>
            {p.name}
          </Text>
          <IconButton
            icon={X}
            label={t('common:actions.removeFromWishlist')}
            size={32}
            iconSize={16}
            color={colors.mutedForeground}
            onPress={() => wishlist.toggle(p.id)}
          />
        </View>
        <PriceText amount={p.price} oldAmount={p.oldPrice} size="sm" inline />
        {cheaper || pricier ? (
          <Badge
            tone={cheaper ? 'success' : 'danger'}
            icon={cheaper ? undefined : TrendingUp}
            size="sm"
            label={
              cheaper
                ? t('common:product.priceDropped', { amount: f.price(-item.priceChange) })
                : t('common:product.priceRaised', { amount: f.price(item.priceChange) })
            }
          />
        ) : null}
        <Text variant="caption" color="mutedForeground" tabular>
          {t('shop:wishlist.priceAtAdd', { amount: f.price(item.priceAtAdd) })}
        </Text>
        <View style={{ marginTop: 6 }}>
          {out ? (
            <Text variant="footnote" weight="bold" color="mutedForeground">
              {t('common:product.outOfStock')}
            </Text>
          ) : p.hasVariants ? (
            <Button
              title={t('productCard.chooseOption')}
              size="sm"
              variant="secondary"
              onPress={open}
              style={{ alignSelf: 'flex-start' }}
            />
          ) : inCart > 0 ? (
            <Button
              title={t('common:actions.inCart')}
              size="sm"
              variant="soft"
              icon={Check}
              onPress={() => root.navigate('Tabs', { screen: 'CartTab' }, { pop: true })}
              style={{ alignSelf: 'flex-start' }}
            />
          ) : (
            <Button
              title={t('common:actions.addToCart')}
              size="sm"
              icon={ShoppingCart}
              loading={cart.pendingProductId === p.id}
              onPress={() => cart.add({ productId: p.id })}
              style={{ alignSelf: 'flex-start' }}
            />
          )}
        </View>
      </View>
    </View>
  );
});

/** Wishlist (synced with the account): price change since added, add to cart, remove. */
export function WishlistScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const root = useRootNavigation();
  const { isAuthenticated } = useSession();
  const wishlist = useWishlist();
  const addToCart = useAddToCart();
  const [refreshing, setRefreshing] = useState(false);
  const [moving, setMoving] = useState(false);
  const listRef = useRef(null);
  useScrollToTop(listRef);

  const items = wishlist.data?.items ?? [];
  const movable = items.filter((i) => !i.product.hasVariants && i.product.stock.available > 0);

  const moveAll = async () => {
    setMoving(true);
    let failed: unknown = null;
    for (const i of movable) {
      try {
        await addToCart.mutateAsync({ productId: i.productId, quantity: 1 });
      } catch (e) {
        failed = e;
      }
    }
    setMoving(false);
    if (failed) toast.error(cartErrorText(t, failed));
    else {
      haptic.success();
      toast.success(t('shop:wishlist.movedToCart'), {
        action: {
          label: t('common:actions.goToCart'),
          onPress: () => root.navigate('Tabs', { screen: 'CartTab' }, { pop: true }),
        },
      });
    }
  };

  if (wishlist.isPending) {
    return (
      <View style={{ flex: 1, padding: 16, gap: 16, backgroundColor: colors.background }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
            <Skeleton width={96} height={96} radius={12} />
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton height={14} />
              <Skeleton width="50%" height={16} />
              <Skeleton width={120} height={34} radius={10} />
            </View>
          </View>
        ))}
      </View>
    );
  }
  if (wishlist.isError)
    return (
      <ErrorState
        error={wishlist.error}
        onRetry={() => void wishlist.refetch()}
        retrying={wishlist.isFetching}
      />
    );

  return (
    <FlashList
      ref={listRef}
      style={{ backgroundColor: colors.background }}
      data={items}
      keyExtractor={(i) => i.productId}
      renderItem={({ item }) => <WishlistRow item={item} />}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
      ListHeaderComponent={
        items.length ? (
          <View style={{ gap: 12, paddingTop: 12, paddingBottom: 4 }}>
            <View style={styles.head}>
              <Text variant="subhead" color="mutedForeground" tabular style={{ flex: 1 }}>
                {t('shop:wishlist.count', { count: wishlist.data?.count ?? items.length })}
              </Text>
              {movable.length ? (
                <Button
                  title={t('shop:wishlist.moveAllToCart')}
                  variant="outline"
                  size="sm"
                  icon={ShoppingCart}
                  onPress={() => void moveAll()}
                  loading={moving}
                />
              ) : null}
            </View>
            {!isAuthenticated ? (
              <Notice tone="neutral" icon={Info}>
                <Text variant="footnote">{t('wishlist.guestNote')}</Text>
              </Notice>
            ) : null}
          </View>
        ) : null
      }
      ListEmptyComponent={
        <EmptyState
          icon={Heart}
          title={t('shop:wishlist.empty')}
          description={t('shop:wishlist.emptyHint')}
          action={
            <Button
              title={t('common:actions.continueShopping')}
              onPress={() => root.navigate('Tabs', { screen: 'CatalogTab' }, { pop: true })}
            />
          }
        />
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await wishlist.refetch();
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
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  thumb: { width: 96, height: 96, borderRadius: 12 },
});
