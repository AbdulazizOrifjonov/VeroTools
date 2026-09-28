import { useScrollToTop } from '@react-navigation/native';
import {
  useAddToCart,
  useCart,
  useClearCart,
  useRemoveCartItem,
  useSession,
  useToggleWishlist,
  useEngagement,
} from '@vero/api-client';
import type { CartDTO, CartItemDTO } from '@vero/types';
import { memo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { confirm } from '../../lib/dialogs';
import { useFormat } from '../../lib/format';
import { errorMessage } from '../../lib/i18n';
import { toast } from '../../lib/toast';
import { useRootNavigation } from '../../navigation/hooks';
import { useTheme } from '../../theme/theme';
import { CouponBox } from '../../features/cart/CouponBox';
import { cartErrorText, useSetLineQuantity } from '../../features/product/actions';
import {
  BottomBar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Notice,
  PriceText,
  QuantityStepper,
  Skeleton,
  SmartImage,
  Text,
} from '../../ui';
import { Heart, Info, ShoppingCart, Trash2, TriangleAlert, Truck } from '../../ui/icons';

const CartLine = memo(function CartLine({ item }: { item: CartItemDTO }) {
  const { t } = useTranslation();
  const f = useFormat();
  const { colors } = useTheme();
  const root = useRootNavigation();
  const setQty = useSetLineQuantity();
  const removeItem = useRemoveCartItem();
  const addToCart = useAddToCart();
  const wishlist = useToggleWishlist();
  const engagement = useEngagement();
  const inWishlist = !!engagement.data?.wishlistIds.includes(item.productId);
  const busy = removeItem.isPending || (setQty.isPending && setQty.pendingLine === item.id);

  const remove = (silentUndo = false) =>
    removeItem.mutate(item.id, {
      onSuccess: () => {
        if (silentUndo) return;
        toast.info(t('shop:cart.removed'), {
          action: {
            label: t('shop:cart.undo'),
            onPress: () =>
              addToCart.mutate(
                { productId: item.productId, variantId: item.variantId, quantity: item.quantity },
                { onError: (e) => toast.error(cartErrorText(t, e)) },
              ),
          },
        });
      },
      onError: (e) => toast.error(errorMessage(t, e)),
    });

  const moveToWishlist = () => {
    const done = () => {
      remove(true);
      toast.success(t('cart.movedToWishlist'));
    };
    if (inWishlist) done();
    else
      wishlist.mutate(
        { productId: item.productId, active: false },
        { onSuccess: done, onError: (e) => toast.error(errorMessage(t, e)) },
      );
  };

  const warning = item.warning ? t(`shop:cart.warning.${item.warning}`, { count: item.maxQuantity }) : null;
  const unavailable = !item.isAvailable;

  return (
    <View style={[styles.line, { borderBottomColor: colors.border, opacity: busy ? 0.6 : 1 }]}>
      <Pressable
        onPress={() => root.navigate('Product', { slug: item.slug, variant: item.variantId })}
        accessibilityRole="link"
        accessibilityLabel={item.name}
      >
        <SmartImage image={item.image} size="thumb" style={[styles.thumb, unavailable && { opacity: 0.5 }]} />
      </Pressable>
      <View style={styles.lineBody}>
        <Pressable
          onPress={() => root.navigate('Product', { slug: item.slug, variant: item.variantId })}
          accessibilityRole="link"
        >
          <Text variant="subhead" weight="semibold" numberOfLines={2}>
            {item.name}
          </Text>
        </Pressable>
        {item.variantName ? (
          <Text variant="footnote" color="mutedForeground" numberOfLines={1}>
            {item.variantName}
          </Text>
        ) : null}
        <Text variant="footnote" color="mutedForeground" tabular>
          {t('shop:cart.perItem', { amount: f.price(item.price) })}
        </Text>
        {warning ? (
          <View style={styles.warn}>
            <TriangleAlert size={14} color={unavailable ? colors.danger : colors.warning} />
            <Text
              variant="footnote"
              weight="semibold"
              style={{ color: unavailable ? colors.danger : colors.warning, flex: 1 }}
            >
              {warning}
            </Text>
          </View>
        ) : null}
        <View style={styles.lineFoot}>
          {!unavailable ? (
            <QuantityStepper
              size="sm"
              value={item.quantity}
              min={1}
              max={Math.max(1, item.maxQuantity)}
              onChange={(v) => setQty.setQuantity(item.id, v)}
            />
          ) : (
            <View />
          )}
          <PriceText
            amount={item.lineTotal}
            oldAmount={item.lineOldTotal > item.lineTotal ? item.lineOldTotal : undefined}
            size="sm"
            style={{ alignItems: 'flex-end' }}
          />
        </View>
        <View style={styles.lineActions}>
          <Pressable
            onPress={moveToWishlist}
            accessibilityRole="button"
            hitSlop={8}
            style={styles.lineAction}
            disabled={busy}
          >
            <Heart size={15} color={colors.mutedForeground} />
            <Text variant="footnote" weight="semibold" color="mutedForeground">
              {t('cart.moveToWishlist')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => remove()}
            accessibilityRole="button"
            accessibilityLabel={t('common:a11y.removeItem', { name: item.name })}
            hitSlop={8}
            style={styles.lineAction}
            disabled={busy}
          >
            <Trash2 size={15} color={colors.mutedForeground} />
            <Text variant="footnote" weight="semibold" color="mutedForeground">
              {t('common:actions.remove')}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
});

function Summary({ cart }: { cart: CartDTO }) {
  const { t } = useTranslation();
  const f = useFormat();
  const { colors } = useTheme();
  const tt = cart.totals;
  const progress = tt.freeDeliveryThreshold > 0 ? Math.min(1, tt.total / tt.freeDeliveryThreshold) : 1;
  return (
    <Card style={{ gap: 12 }}>
      <Text variant="title3">{t('shop:cart.summary')}</Text>
      <View style={styles.sumRow}>
        <Text variant="callout" color="mutedForeground">
          {t('shop:cart.subtotal', { count: tt.itemsCount })}
        </Text>
        <Text variant="callout" weight="semibold" tabular>
          {f.price(tt.oldSubtotal || tt.subtotal)}
        </Text>
      </View>
      {tt.productDiscount > 0 ? (
        <View style={styles.sumRow}>
          <Text variant="callout" color="mutedForeground">
            {t('shop:cart.productDiscount')}
          </Text>
          <Text variant="callout" weight="semibold" color="success" tabular>
            −{f.price(tt.productDiscount)}
          </Text>
        </View>
      ) : null}
      {tt.couponDiscount > 0 ? (
        <View style={styles.sumRow}>
          <Text variant="callout" color="mutedForeground">
            {t('shop:cart.couponDiscount')}
          </Text>
          <Text variant="callout" weight="semibold" color="success" tabular>
            −{f.price(tt.couponDiscount)}
          </Text>
        </View>
      ) : null}
      <View style={styles.sumRow}>
        <Text variant="callout" color="mutedForeground">
          {t('shop:cart.delivery')}
        </Text>
        <Text variant="callout" color="mutedForeground">
          {t('shop:cart.deliveryAtCheckout')}
        </Text>
      </View>
      <View style={[styles.sumRow, styles.totalRow, { borderTopColor: colors.border }]}>
        <Text variant="headline">{t('shop:cart.total')}</Text>
        <Text variant="title2" tabular>
          {f.price(tt.total)}
        </Text>
      </View>
      {tt.freeDeliveryThreshold > 0 ? (
        <View style={{ gap: 8 }}>
          <View style={styles.freeRow}>
            <Truck size={17} color={tt.amountToFreeDelivery > 0 ? colors.mutedForeground : colors.success} />
            <Text
              variant="footnote"
              weight="semibold"
              color={tt.amountToFreeDelivery > 0 ? 'foreground' : 'success'}
              style={{ flex: 1 }}
            >
              {tt.amountToFreeDelivery > 0
                ? t('shop:cart.freeDeliveryLeft', { amount: f.price(tt.amountToFreeDelivery) })
                : t('shop:cart.freeDeliveryReached')}
            </Text>
          </View>
          <View
            style={[styles.progress, { backgroundColor: colors.fill }]}
            accessibilityRole="progressbar"
            accessibilityLabel={t('cart.freeDeliveryProgress')}
            accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress * 100}%`,
                  backgroundColor: tt.amountToFreeDelivery > 0 ? colors.primary : colors.success,
                },
              ]}
            />
          </View>
          <Text variant="caption" color="mutedForeground">
            {t('cart.freeDeliveryNote')}
          </Text>
        </View>
      ) : null}
      {cart.estimatedDelivery ? (
        <Text variant="footnote" color="mutedForeground">
          {t('shop:cart.estimatedDelivery', {
            min: cart.estimatedDelivery.minDays,
            max: cart.estimatedDelivery.maxDays,
          })}
        </Text>
      ) : null}
    </Card>
  );
}

/** Cart tab: lines with steppers limited by stock, API warnings, promo code, summary and checkout. */
export function CartScreen() {
  const { t } = useTranslation();
  const f = useFormat();
  const { colors } = useTheme();
  const root = useRootNavigation();
  const { isAuthenticated } = useSession();
  const cart = useCart();
  const clear = useClearCart();
  const removeItem = useRemoveCartItem();
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<FlatList<CartItemDTO>>(null);
  useScrollToTop(listRef);

  const items = cart.data?.items ?? [];
  const unavailable = items.filter((i) => !i.isAvailable);
  const orderable = items.some((i) => i.isAvailable);

  const onClear = async () => {
    const ok = await confirm(
      t('shop:cart.clear'),
      t('shop:cart.clearConfirm'),
      t('shop:cart.clear'),
      t('common:actions.cancel'),
    );
    if (ok) clear.mutate(undefined, { onError: (e) => toast.error(errorMessage(t, e)) });
  };

  const checkout = () => {
    if (isAuthenticated) root.navigate('Checkout');
    else root.navigate('Login', { next: 'Checkout' });
  };

  if (cart.isPending) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background, padding: 16, gap: 18 }]}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
            <Skeleton width={84} height={84} radius={12} />
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton height={14} />
              <Skeleton width="60%" height={12} />
              <Skeleton width={110} height={34} radius={10} />
            </View>
          </View>
        ))}
        <Skeleton height={180} radius={14} />
      </View>
    );
  }
  if (cart.isError || !cart.data) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <ErrorState error={cart.error} onRetry={() => void cart.refetch()} retrying={cart.isFetching} />
      </View>
    );
  }
  if (!items.length) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <EmptyState
          icon={ShoppingCart}
          title={t('shop:cart.empty')}
          description={t('shop:cart.emptyHint')}
          action={
            <Button
              title={t('common:actions.continueShopping')}
              onPress={() => root.navigate('Tabs', { screen: 'CatalogTab' }, { pop: true })}
            />
          }
        />
      </View>
    );
  }

  const data = cart.data;
  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => <CartLine item={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await cart.refetch();
              setRefreshing(false);
            }}
            tintColor={colors.link}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 12, paddingBottom: 4 }}>
            <View style={styles.headRow}>
              <Text variant="subhead" color="mutedForeground" tabular style={{ flex: 1 }}>
                {t('shop:cart.items', { count: data.totals.itemsCount })}
              </Text>
              <Button
                title={t('shop:cart.clear')}
                variant="ghost"
                size="sm"
                icon={Trash2}
                onPress={() => void onClear()}
                loading={clear.isPending}
              />
            </View>
            {!isAuthenticated ? (
              <Notice tone="neutral" icon={Info}>
                <Text variant="footnote">{t('shop:cart.guestNote')}</Text>
              </Notice>
            ) : null}
            {unavailable.length ? (
              <Notice tone="danger" icon={TriangleAlert} title={t('shop:cart.hasUnavailable')}>
                <Button
                  title={t('shop:cart.removeUnavailable')}
                  variant="outline"
                  size="sm"
                  style={{ alignSelf: 'flex-start', marginTop: 4 }}
                  loading={removeItem.isPending}
                  onPress={() => unavailable.forEach((i) => removeItem.mutate(i.id))}
                />
              </Notice>
            ) : null}
          </View>
        }
        ListFooterComponent={
          <View style={{ gap: 16, paddingTop: 16 }}>
            <Card>
              <CouponBox cart={data} />
            </Card>
            <Summary cart={data} />
          </View>
        }
      />
      <BottomBar>
        <View style={styles.flex}>
          <Text variant="footnote" color="mutedForeground">
            {t('shop:cart.total')}
          </Text>
          <Text variant="title3" tabular>
            {f.price(data.totals.total)}
          </Text>
        </View>
        <Button
          title={isAuthenticated ? t('common:actions.checkout') : t('cart.signInToCheckout')}
          size="lg"
          style={{ flex: 1.4 }}
          disabled={!orderable}
          onPress={checkout}
        />
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: 16, paddingBottom: 24 },
  headRow: { flexDirection: 'row', alignItems: 'center' },
  line: { flexDirection: 'row', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  thumb: { width: 84, height: 84, borderRadius: 12 },
  lineBody: { flex: 1, gap: 4 },
  warn: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 2 },
  lineFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 6,
  },
  lineActions: { flexDirection: 'row', gap: 18, marginTop: 6 },
  lineAction: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 28 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  totalRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, marginTop: 2 },
  freeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progress: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
});
