import { StackActions, useNavigation } from '@react-navigation/native';
import type { ProductCard as ProductCardDTO } from '@vero/types';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFormat } from '../../lib/format';
import { useTheme } from '../../theme/theme';
import { Badge, IconButton, PriceText, RatingStars, SmartImage, Text } from '../../ui';
import { Check, Heart, ShoppingCart, Zap } from '../../ui/icons';
import { useAddToCartAction, useCartQuantity, useInstallmentFrom, useWishlistToggle } from './actions';

export interface ProductCardProps {
  product: ProductCardDTO;
  width: number;
  /** hide the add-to-cart button (compact rails) */
  compact?: boolean;
}

/** Catalogue tile: photo well, badges, wishlist heart, name, rating, price, add to cart. */
export const ProductCard = memo(function ProductCard({
  product: p,
  width,
  compact = false,
}: ProductCardProps) {
  const { t } = useTranslation();
  const f = useFormat();
  const { colors, dark } = useTheme();
  const navigation = useNavigation();
  const wishlist = useWishlistToggle();
  const cart = useAddToCartAction();
  const inCart = useCartQuantity(p.id);
  const installmentFrom = useInstallmentFrom();
  const inWishlist = wishlist.isActive(p.id);
  const out = p.stock.status === 'out_of_stock' || p.stock.available <= 0;
  const installment = !out ? installmentFrom(p.price) : null;

  const open = useCallback(() => {
    // push: a related product opened from a product page gets its own screen (navigate would only swap params)
    navigation.dispatch(StackActions.push('Product', { slug: p.slug }));
  }, [navigation, p.slug]);

  const onCart = () => {
    if (p.hasVariants) {
      open();
      return;
    }
    if (inCart > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigation as any).navigate('Tabs', { screen: 'CartTab' }, { pop: true });
      return;
    }
    cart.add({ productId: p.id, quantity: 1 });
  };

  const adding = cart.pendingProductId === p.id;
  const cartLabel = out
    ? t('common:product.outOfStock')
    : p.hasVariants
      ? t('productCard.chooseOption')
      : inCart > 0
        ? t('common:actions.inCart')
        : t('common:actions.addToCart');

  return (
    <View style={{ width }}>
      <Pressable
        onPress={open}
        accessibilityRole="link"
        accessibilityLabel={`${p.name}, ${f.price(p.price)}${out ? `, ${t('common:product.outOfStock')}` : ''}`}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      >
        <View>
          <SmartImage
            image={p.image}
            width={width}
            style={[styles.image, { width, height: width }]}
            recyclingKey={p.id}
          />
          <View style={styles.badges} pointerEvents="none">
            {p.discountPercent > 0 ? <Badge label={`−${p.discountPercent}%`} tone="sale" size="sm" /> : null}
            {p.promotion?.type === 'FLASH_SALE' ? (
              <Badge label={t('home.flash')} tone="dark" icon={Zap} size="sm" />
            ) : null}
            {p.flags.isNew ? <Badge label={t('common:product.new')} tone="dark" size="sm" /> : null}
            {!p.flags.isNew && p.flags.bestseller ? (
              <Badge label={t('common:product.bestseller')} tone="brand" size="sm" />
            ) : null}
          </View>
          <IconButton
            icon={Heart}
            label={inWishlist ? t('common:actions.removeFromWishlist') : t('common:actions.addToWishlist')}
            active={inWishlist}
            activeColor={colors.brand}
            variant="overlay"
            size={34}
            iconSize={17}
            style={styles.heart}
            onPress={() => wishlist.toggle(p.id)}
          />
          {out ? (
            <View
              style={[
                styles.outBar,
                { backgroundColor: dark ? 'rgba(14,14,16,0.72)' : 'rgba(255,255,255,0.85)' },
              ]}
              pointerEvents="none"
            >
              <Text variant="caption" weight="bold" color="mutedForeground">
                {t('common:product.outOfStock')}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.body}>
          {p.brand ? (
            <Text variant="overline" color="mutedForeground" numberOfLines={1} uppercase>
              {p.brand.name}
            </Text>
          ) : null}
          <Text variant="subhead" weight="semibold" numberOfLines={2} style={styles.name}>
            {p.name}
          </Text>
          {/* fixed-height rows keep all cards of a grid row aligned */}
          <View style={styles.ratingRow}>
            {p.reviewCount > 0 ? (
              <>
                <RatingStars value={p.rating} size={11} />
                <Text variant="caption" color="mutedForeground" tabular>
                  {p.rating.toFixed(1)} · {p.reviewCount}
                </Text>
              </>
            ) : null}
          </View>
          <View style={styles.priceBox}>
            <PriceText amount={p.price} oldAmount={p.oldPrice} size="sm" />
          </View>
          <Text
            variant="caption"
            color="mutedForeground"
            numberOfLines={1}
            tabular
            style={styles.installment}
          >
            {installment
              ? t('common:product.installmentFrom', { amount: f.price(installment.monthlyPayment) })
              : ' '}
          </Text>
        </View>
      </Pressable>
      {!compact ? (
        <Pressable
          onPress={onCart}
          disabled={out || adding}
          accessibilityRole="button"
          accessibilityLabel={`${cartLabel}: ${p.name}`}
          accessibilityState={{ disabled: out, busy: adding }}
          style={({ pressed }) => [
            styles.cartBtn,
            {
              backgroundColor: out
                ? colors.fill
                : inCart > 0
                  ? colors.successSoft
                  : pressed
                    ? colors.primaryHover
                    : colors.primary,
              opacity: adding ? 0.7 : 1,
            },
          ]}
        >
          {inCart > 0 && !p.hasVariants ? (
            <Check size={16} color={colors.success} strokeWidth={2.6} />
          ) : !out ? (
            <ShoppingCart size={16} color={colors.primaryForeground} strokeWidth={2.2} />
          ) : null}
          <Text
            variant="subhead"
            weight="bold"
            numberOfLines={1}
            style={{
              color: out
                ? colors.mutedForeground
                : inCart > 0 && !p.hasVariants
                  ? colors.success
                  : colors.primaryForeground,
            }}
          >
            {cartLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  image: { borderRadius: 12 },
  badges: { position: 'absolute', top: 8, left: 8, gap: 4, alignItems: 'flex-start' },
  heart: { position: 'absolute', top: 6, right: 6 },
  outBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 5,
    alignItems: 'center',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  body: { paddingTop: 10, gap: 3 },
  name: { minHeight: 36 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 15 },
  priceBox: { marginTop: 4, minHeight: 36, justifyContent: 'flex-end' },
  installment: { minHeight: 14 },
  cartBtn: {
    marginTop: 10,
    height: 38,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
});
