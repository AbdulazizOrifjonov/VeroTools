import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  isApiError,
  useProduct,
  useProductQuestions,
  useProductReviews,
  useProductsByIds,
  useRelatedProducts,
  useSession,
  useSettings,
} from '@vero/api-client';
import { localizedPath, STORE_ROUTES } from '@vero/config';
import type { ProductDetail, ProductVariant } from '@vero/types';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  Share,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WEB_URL } from '../../config/env';
import { useFormat } from '../../lib/format';
import { openHref } from '../../lib/links';
import { useRecentlyViewed } from '../../lib/recent';
import { toast } from '../../lib/toast';
import type { RootScreenProps, RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/theme';
import { DeliveryEstimate } from '../../features/product/DeliveryEstimate';
import { ProductGallery } from '../../features/product/Gallery';
import { InstallmentSheet } from '../../features/product/InstallmentSheet';
import { ProductRail } from '../../features/product/ProductRail';
import { QuestionItem, RatingSummary, ReviewItem } from '../../features/product/ReviewItems';
import { SpecsList } from '../../features/product/Specs';
import {
  useAddToCartAction,
  useCartLine,
  useCompareToggle,
  useInstallmentFrom,
  useSetLineQuantity,
  useWishlistToggle,
} from '../../features/product/actions';
import {
  Badge,
  BottomBar,
  Button,
  Countdown,
  Divider,
  EmptyState,
  ErrorState,
  IconButton,
  Markdown,
  PriceText,
  QuantityStepper,
  RadioCard,
  RatingStars,
  Skeleton,
  Text,
} from '../../ui';
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  Check,
  ChevronRight,
  Heart,
  PackageSearch,
  Scale,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Timer,
  Zap,
} from '../../ui/icons';

export interface Offer {
  price: number;
  oldPrice?: number;
  discountPercent: number;
  available: number;
  status: ProductDetail['stock']['status'];
  sku: string;
}

export function offerOf(product: ProductDetail, variant: ProductVariant | null): Offer {
  const src = variant ?? product;
  return {
    price: src.price,
    oldPrice: src.oldPrice,
    discountPercent: src.discountPercent,
    available: src.stock.available,
    status: src.stock.status,
    sku: src.sku,
  };
}

function Section({
  title,
  children,
  onLayout,
  action,
}: {
  title: string;
  children: ReactNode;
  onLayout?: (e: LayoutChangeEvent) => void;
  action?: ReactNode;
}) {
  return (
    <View style={styles.section} onLayout={onLayout}>
      <View style={styles.sectionHead}>
        <Text variant="title3" accessibilityRole="header" style={{ flex: 1 }}>
          {title}
        </Text>
        {action}
      </View>
      {children}
    </View>
  );
}

function StockLine({ status, available }: { status: Offer['status']; available: number }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const color =
    status === 'out_of_stock' ? colors.danger : status === 'low_stock' ? colors.warning : colors.success;
  const label =
    status === 'out_of_stock'
      ? t('common:product.outOfStock')
      : status === 'low_stock'
        ? t('common:product.lowStock', { count: available })
        : t('common:product.inStock');
  return (
    <View style={styles.stockLine}>
      <View style={[styles.stockDot, { backgroundColor: color }]} />
      <Text variant="subhead" weight="semibold" style={{ color }}>
        {label}
      </Text>
      {status === 'in_stock' ? (
        <Text variant="footnote" color="mutedForeground" tabular>
          · {t('common:product.available', { count: available })}
        </Text>
      ) : null}
    </View>
  );
}

/** Product page: gallery, price, variants, stock, delivery, installment, description, specs, reviews, Q&A. */
export function ProductScreen({ navigation, route }: RootScreenProps<'Product'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height: windowHeight } = useWindowDimensions();
  const product = useProduct(route.params.slug);
  const p = product.data;

  if (product.isPending) return <ProductSkeleton onBack={() => navigation.goBack()} />;
  if (product.isError || !p) {
    const notFound = isApiError(product.error) && product.error.status === 404;
    return (
      <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={{ paddingHorizontal: 8 }}>
          <IconButton icon={ArrowLeft} label={t('common:actions.back')} onPress={() => navigation.goBack()} />
        </View>
        {notFound ? (
          <EmptyState
            icon={PackageSearch}
            title={t('shop:notFound.productTitle')}
            description={t('shop:notFound.productText')}
            action={
              <Button
                title={t('common:actions.goHome')}
                onPress={() => navigation.navigate('Tabs', { screen: 'HomeTab' }, { pop: true })}
              />
            }
          />
        ) : (
          <ErrorState
            error={product.error}
            onRetry={() => void product.refetch()}
            retrying={product.isFetching}
          />
        )}
      </View>
    );
  }
  return (
    <ProductView key={p.id} product={p} width={width} galleryHeight={galleryHeightFor(width, windowHeight)} />
  );
}

function ProductView({
  product: p,
  width,
  galleryHeight,
}: {
  product: ProductDetail;
  width: number;
  galleryHeight: number;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useSession();
  const navigation = useRootNav();
  const params = useRouteParams();
  const settings = useSettings();
  const wishlist = useWishlistToggle();
  const compare = useCompareToggle();
  const cartAction = useAddToCartAction();
  const lineQty = useSetLineQuantity();
  const installmentFrom = useInstallmentFrom();
  const pushRecent = useRecentlyViewed((s) => s.push);
  const recentIds = useRecentlyViewed((s) => s.items);
  const related = useRelatedProducts(p.id);
  const reviews = useProductReviews(p.id, { limit: 3, sort: 'newest' });
  const questions = useProductQuestions(p.id, { limit: 2 });
  const recentOthers = useMemo(() => recentIds.filter((id) => id !== p.id).slice(0, 10), [recentIds, p.id]);
  const recent = useProductsByIds(recentOthers);

  const needsVariant = p.variants.length > 0;
  const [variantId, setVariantId] = useState<string | null>(() => {
    if (!needsVariant) return null;
    const requested = p.variants.find((v) => v.id === params.variant);
    return (requested ?? p.variants.find((v) => v.stock.available > 0) ?? p.variants[0])!.id;
  });
  const variant = p.variants.find((v) => v.id === variantId) ?? null;
  const offer = offerOf(p, variant);
  const line = useCartLine(p.id, needsVariant ? (variant?.id ?? '__none__') : undefined);
  const inCart = line?.quantity ?? 0;
  const out = offer.status === 'out_of_stock' || offer.available <= 0;
  const maxAddable = Math.max(0, offer.available - inCart);
  const [qty, setQty] = useState(1);
  const [installmentOpen, setInstallmentOpen] = useState(false);
  const installment = !out ? installmentFrom(offer.price) : null;
  const saving = offer.oldPrice && offer.oldPrice > offer.price ? offer.oldPrice - offer.price : 0;
  const promoActive = !!p.promotion && new Date(p.promotion.endsAt).getTime() > Date.now();
  const [descExpanded, setDescExpanded] = useState(false);

  const images = useMemo(() => {
    const list = [...(variant?.image ? [variant.image] : []), ...p.images];
    return list.filter((img, i) => list.findIndex((x) => x.url === img.url) === i);
  }, [p.images, variant?.image]);

  useEffect(() => {
    pushRecent(p.id);
  }, [p.id, pushRecent]);

  // scroll-linked header
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const headerBg = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [galleryHeight - 140, galleryHeight - 60], [0, 1], 'clamp'),
  }));
  const reviewsY = useRef(0);
  const scrollToReviews = () =>
    scrollRef.current?.scrollTo({ y: Math.max(0, reviewsY.current - 80), animated: true });

  // ?review=1 (e-mail / order "write a review" links)
  const reviewRequested = useRef(params.review === true);
  useEffect(() => {
    if (!reviewRequested.current) return;
    reviewRequested.current = false;
    const id = setTimeout(() => {
      if (isAuthenticated)
        navigation.navigate('WriteReview', { productId: p.id, slug: p.slug, name: p.name });
      else scrollToReviews();
    }, 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const share = async () => {
    const url = `${WEB_URL}${localizedPath(f.lang, STORE_ROUTES.product(p.slug))}`;
    try {
      await Share.share({ title: p.name, message: `${p.name}\n${url}`, url });
    } catch {
      toast.error(t('common:status.error'));
    }
  };

  const add = () =>
    cartAction.add({
      productId: p.id,
      variantId: variant?.id,
      quantity: Math.min(qty, Math.max(1, maxAddable)),
    });
  const buyNow = async () => {
    try {
      if (maxAddable > 0 && inCart === 0) {
        await cartAction.addAsync({
          productId: p.id,
          variantId: variant?.id,
          quantity: Math.min(qty, Math.max(1, maxAddable)),
        });
      }
      if (isAuthenticated) navigation.navigate('Checkout');
      else navigation.navigate('Login', { next: 'Checkout' });
    } catch (error) {
      toast.error(
        isApiError(error)
          ? t(`errors:${error.code}`, { defaultValue: t('errors:UNKNOWN') })
          : t('errors:UNKNOWN'),
      );
    }
  };

  const openGallery = (index: number) =>
    navigation.navigate('Gallery', { slug: p.slug, index, variantId: variant?.id });
  const inWishlist = wishlist.isActive(p.id);
  const inCompare = compare.isActive(p.id);
  const trust = settings.data?.trustBullets ?? [];

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View style={{ paddingTop: insets.top }}>
          <ProductGallery
            images={images}
            width={width}
            height={galleryHeight}
            name={p.name}
            onOpen={openGallery}
          />
        </View>

        <View style={styles.main}>
          <View style={styles.badges}>
            {offer.discountPercent > 0 ? <Badge label={`−${offer.discountPercent}%`} tone="sale" /> : null}
            {p.promotion?.type === 'FLASH_SALE' && promoActive ? (
              <Badge label={t('home.flash')} tone="dark" icon={Zap} />
            ) : null}
            {p.flags.isNew ? <Badge label={t('common:product.new')} tone="dark" /> : null}
            {p.flags.bestseller ? <Badge label={t('common:product.bestseller')} tone="brand" /> : null}
          </View>
          <View style={styles.brandRow}>
            {p.brand ? (
              <Pressable
                onPress={() => navigation.push('ProductList', { brand: p.brand!.slug, title: p.brand!.name })}
                accessibilityRole="link"
                hitSlop={8}
              >
                <Text variant="subhead" weight="extrabold" color="link" uppercase>
                  {p.brand.name}
                </Text>
              </Pressable>
            ) : null}
            <Text variant="footnote" color="mutedForeground" tabular selectable>
              {t('common:product.sku')}: {offer.sku}
            </Text>
          </View>
          <Text variant="title2" accessibilityRole="header">
            {p.name}
          </Text>
          <Pressable
            onPress={scrollToReviews}
            accessibilityRole="button"
            style={styles.ratingRow}
            hitSlop={6}
          >
            {p.reviewCount > 0 ? (
              <>
                <RatingStars value={p.rating} size={15} />
                <Text variant="subhead" weight="bold" tabular>
                  {p.rating.toFixed(1)}
                </Text>
                <Text variant="subhead" color="mutedForeground">
                  {t('common:product.reviews', { count: p.reviewCount })}
                </Text>
              </>
            ) : (
              <Text variant="subhead" color="mutedForeground">
                {t('common:product.noReviews')}
              </Text>
            )}
            {p.questionCount > 0 ? (
              <Text variant="subhead" color="mutedForeground">
                · {t('product.questionsCount', { count: p.questionCount })}
              </Text>
            ) : null}
          </Pressable>

          <View style={[styles.priceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.priceRow}>
              <PriceText amount={offer.price} oldAmount={offer.oldPrice} size="xl" inline />
            </View>
            {saving ? (
              <Text variant="subhead" weight="bold" color="success">
                {t('common:product.youSave', { amount: f.price(saving) })}
              </Text>
            ) : null}
            {installment ? (
              <Pressable
                onPress={() => setInstallmentOpen(true)}
                accessibilityRole="button"
                style={styles.installRow}
              >
                <CalendarClock size={18} color={colors.link} />
                <Text variant="subhead" weight="semibold" style={styles.flex}>
                  {t('common:product.installmentFrom', { amount: f.price(installment.monthlyPayment) })}
                </Text>
                <Text variant="subhead" weight="bold" color="link">
                  {t('product.calculate')}
                </Text>
                <ChevronRight size={16} color={colors.link} />
              </Pressable>
            ) : null}
            {p.promotion && promoActive ? (
              <Pressable
                onPress={() =>
                  navigation.push('ProductList', { promotion: p.promotion!.slug, title: p.promotion!.name })
                }
                accessibilityRole="link"
                style={[styles.promo, { backgroundColor: colors.brandSoft }]}
              >
                <View style={styles.promoHead}>
                  {p.promotion.type === 'FLASH_SALE' ? (
                    <Zap size={16} color={colors.brandSoftForeground} />
                  ) : (
                    <Timer size={16} color={colors.brandSoftForeground} />
                  )}
                  <Text
                    variant="subhead"
                    weight="bold"
                    color="brandSoftForeground"
                    numberOfLines={2}
                    style={styles.flex}
                  >
                    {p.promotion.name}
                  </Text>
                </View>
                <View style={styles.promoHead}>
                  <Text variant="footnote" color="brandSoftForeground" style={styles.flex}>
                    {t('shop:product.promoEnds')}
                  </Text>
                  <Countdown endsAt={p.promotion.endsAt} />
                </View>
              </Pressable>
            ) : null}
          </View>

          {needsVariant ? (
            <View
              style={{ gap: 10 }}
              accessibilityRole="radiogroup"
              accessibilityLabel={t('shop:product.selectVariant')}
            >
              <Text variant="headline">{t('shop:product.selectVariant')}</Text>
              {p.variants.map((v) => {
                const vOut = v.stock.status === 'out_of_stock' || v.stock.available <= 0;
                return (
                  <RadioCard
                    key={v.id}
                    selected={variant?.id === v.id}
                    onPress={() => {
                      setVariantId(v.id);
                      setQty(1);
                    }}
                    title={v.name}
                    right={
                      <Text variant="subhead" weight="bold" tabular>
                        {f.price(v.price)}
                      </Text>
                    }
                    description={
                      vOut
                        ? t('common:product.outOfStock')
                        : v.stock.status === 'low_stock'
                          ? t('common:product.lowStock', { count: v.stock.available })
                          : t('common:product.inStock')
                    }
                  />
                );
              })}
            </View>
          ) : null}

          <View style={styles.stockRow}>
            <StockLine status={offer.status} available={offer.available} />
            {inCart > 0 ? (
              <Pressable
                onPress={() => navigation.navigate('Tabs', { screen: 'CartTab' }, { pop: true })}
                accessibilityRole="link"
                style={styles.inCart}
              >
                <Check size={15} color={colors.success} strokeWidth={2.6} />
                <Text variant="subhead" weight="bold" color="success">
                  {t('product.inCart', { count: inCart })}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {!out && maxAddable > 1 && inCart === 0 ? (
            <View style={styles.qtyRow}>
              <Text variant="subhead" weight="semibold" style={styles.flex}>
                {t('common:product.quantity')}
              </Text>
              <QuantityStepper
                value={Math.min(qty, maxAddable)}
                min={1}
                max={Math.max(1, maxAddable)}
                onChange={setQty}
              />
            </View>
          ) : null}

          {!out ? (
            <Button
              title={t('common:actions.buyNow')}
              variant="graphite"
              size="lg"
              onPress={() => void buyNow()}
              loading={cartAction.isPending}
            />
          ) : null}

          <View style={styles.actionsRow}>
            <Button
              title={inWishlist ? t('product.inWishlist') : t('common:nav.wishlist')}
              icon={Heart}
              variant={inWishlist ? 'soft' : 'outline'}
              size="sm"
              style={styles.flex}
              onPress={() => wishlist.toggle(p.id)}
              accessibilityLabel={
                inWishlist ? t('common:actions.removeFromWishlist') : t('common:actions.addToWishlist')
              }
            />
            <Button
              title={t('common:nav.compare')}
              icon={Scale}
              variant={inCompare ? 'soft' : 'outline'}
              size="sm"
              style={styles.flex}
              onPress={() => compare.toggle(p.id)}
              accessibilityLabel={
                inCompare ? t('common:actions.removeFromCompare') : t('common:actions.addToCompare')
              }
            />
          </View>
        </View>

        <Divider />
        <Section title={t('shop:product.tabs.delivery')}>
          <DeliveryEstimate subtotal={offer.price} />
        </Section>

        <Divider />
        <Section title={t('shop:product.tabs.warranty')}>
          <View style={{ gap: 10 }}>
            <View style={styles.trustRow}>
              <ShieldCheck size={20} color={colors.link} />
              <Text variant="subhead" weight="semibold" style={styles.flex}>
                {p.warrantyMonths
                  ? t('shop:product.officialWarranty', { count: p.warrantyMonths })
                  : t('common:product.noWarranty')}
              </Text>
            </View>
            {p.warrantyMonths ? (
              <Text variant="footnote" color="mutedForeground">
                {t('shop:product.warrantyText')}
              </Text>
            ) : null}
            {trust.map((b) => (
              <View key={b} style={styles.trustRow}>
                <BadgeCheck size={18} color={colors.success} />
                <Text variant="callout" style={styles.flex}>
                  {b}
                </Text>
              </View>
            ))}
          </View>
        </Section>

        {p.description ? (
          <>
            <Divider />
            <Section title={t('shop:product.tabs.description')}>
              <View style={!descExpanded ? styles.collapsed : null}>
                <Markdown onLinkPress={(href) => openHref(href)}>{p.description}</Markdown>
              </View>
              {p.description.length > 420 ? (
                <Button
                  title={descExpanded ? t('common:actions.showLess') : t('common:actions.showMore')}
                  variant="ghost"
                  size="sm"
                  onPress={() => setDescExpanded((e) => !e)}
                  style={{ alignSelf: 'flex-start', marginLeft: -12 }}
                  accessibilityState={{ expanded: descExpanded }}
                />
              ) : null}
            </Section>
          </>
        ) : null}

        <Divider />
        <Section title={t('shop:product.tabs.specs')}>
          <SpecsList specs={p.specs} />
        </Section>

        <Divider />
        <Section
          title={t('shop:reviews.title')}
          onLayout={(e) => {
            reviewsY.current = e.nativeEvent.layout.y;
          }}
        >
          {p.reviewCount > 0 ? (
            <RatingSummary average={p.rating} count={p.reviewCount} distribution={p.ratingDistribution} />
          ) : null}
          {reviews.isPending ? (
            <View style={{ gap: 10, paddingTop: 8 }}>
              <Skeleton height={14} width="40%" />
              <Skeleton height={48} />
            </View>
          ) : reviews.data?.items.length ? (
            <View>
              {reviews.data.items.map((r) => (
                <ReviewItem key={r.id} review={r} />
              ))}
            </View>
          ) : (
            <Text variant="callout" color="mutedForeground">
              {t('shop:reviews.empty')}
            </Text>
          )}
          <View style={styles.sectionActions}>
            {p.reviewCount > (reviews.data?.items.length ?? 0) ? (
              <Button
                title={`${t('common:actions.showAll')} (${p.reviewCount})`}
                variant="outline"
                onPress={() =>
                  navigation.navigate('Reviews', { productId: p.id, slug: p.slug, name: p.name })
                }
              />
            ) : null}
            <Button
              title={isAuthenticated ? t('shop:reviews.write') : t('shop:reviews.loginToWrite')}
              variant="secondary"
              onPress={() =>
                isAuthenticated
                  ? navigation.navigate('WriteReview', { productId: p.id, slug: p.slug, name: p.name })
                  : navigation.navigate('Login')
              }
            />
          </View>
        </Section>

        <Divider />
        <Section title={t('shop:questions.title')}>
          {questions.data?.items.length ? (
            <View>
              {questions.data.items.map((q) => (
                <QuestionItem key={q.id} question={q} />
              ))}
            </View>
          ) : questions.isPending ? (
            <Skeleton height={48} />
          ) : (
            <Text variant="callout" color="mutedForeground">
              {t('shop:questions.empty')}
            </Text>
          )}
          <Button
            title={
              p.questionCount > 0
                ? `${t('shop:questions.title')} (${p.questionCount})`
                : t('shop:questions.ask')
            }
            variant="outline"
            onPress={() => navigation.navigate('Questions', { productId: p.id, name: p.name })}
          />
        </Section>

        {related.data?.length ? (
          <View style={styles.rail}>
            <ProductRail title={t('shop:product.related')} products={related.data} />
          </View>
        ) : null}
        {recent.data?.length ? (
          <View style={styles.rail}>
            <ProductRail
              title={t('shop:product.recentlyViewed')}
              products={recent.data.filter((x) => x.id !== p.id)}
              compact
            />
          </View>
        ) : null}
      </Animated.ScrollView>

      {/* floating header: solid after the gallery */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]} pointerEvents="box-none">
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: colors.background,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.border,
            },
            headerBg,
          ]}
        />
        <IconButton
          icon={ArrowLeft}
          label={t('common:actions.back')}
          variant="overlay"
          size={40}
          onPress={() => navigation.goBack()}
        />
        <Animated.View style={[styles.flex, headerBg]} pointerEvents="none">
          <Text variant="headline" numberOfLines={1} align="center">
            {p.name}
          </Text>
        </Animated.View>
        <IconButton
          icon={Share2}
          label={t('common:actions.share')}
          variant="overlay"
          size={40}
          onPress={() => void share()}
        />
        <IconButton
          icon={Heart}
          label={inWishlist ? t('common:actions.removeFromWishlist') : t('common:actions.addToWishlist')}
          active={inWishlist}
          activeColor={colors.brand}
          variant="overlay"
          size={40}
          onPress={() => wishlist.toggle(p.id)}
        />
      </View>

      <BottomBar>
        {inCart > 0 && line ? (
          <>
            <QuantityStepper
              value={line.quantity}
              min={0}
              max={Math.max(line.quantity, line.maxQuantity)}
              onChange={(v) => lineQty.setQuantity(line.id, v)}
              loading={lineQty.isPending}
            />
            <Button
              title={t('common:actions.goToCart')}
              icon={ShoppingCart}
              style={styles.flex}
              onPress={() => navigation.navigate('Tabs', { screen: 'CartTab' }, { pop: true })}
            />
          </>
        ) : (
          <>
            <View style={styles.flex}>
              <PriceText amount={offer.price} oldAmount={offer.oldPrice} size="md" />
            </View>
            <Button
              title={
                out
                  ? t('common:product.outOfStock')
                  : needsVariant && !variant
                    ? t('shop:product.selectVariant')
                    : t('common:actions.addToCart')
              }
              icon={out ? undefined : ShoppingCart}
              size="lg"
              style={styles.addBtn}
              disabled={out || (needsVariant && !variant) || maxAddable <= 0}
              loading={cartAction.isPending}
              onPress={add}
            />
          </>
        )}
      </BottomBar>

      <InstallmentSheet
        visible={installmentOpen}
        onClose={() => setInstallmentOpen(false)}
        price={offer.price}
      />
    </View>
  );
}

function useRootNav() {
  return useNavigation<NativeStackNavigationProp<RootStackParamList>>();
}
function useRouteParams() {
  return useRoute<RouteProp<RootStackParamList, 'Product'>>().params;
}

/** Square photos on phones; on tablets a square gallery would fill the whole screen. */
function galleryHeightFor(width: number, windowHeight: number): number {
  return Math.min(width, 560, Math.round(windowHeight * 0.6));
}

function ProductSkeleton({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  return (
    <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Skeleton width={width} height={galleryHeightFor(width, height)} radius={0} />
      <View style={{ padding: 16, gap: 12 }}>
        <Skeleton width={90} height={12} />
        <Skeleton height={22} />
        <Skeleton width="70%" height={22} />
        <Skeleton width={140} height={14} />
        <Skeleton height={96} radius={14} />
      </View>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <IconButton
          icon={ArrowLeft}
          label={t('common:actions.back')}
          variant="overlay"
          size={40}
          onPress={onBack}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  main: { padding: 16, gap: 14 },
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', minHeight: 28 },
  priceCard: { borderRadius: 14, padding: 14, gap: 10, borderWidth: StyleSheet.hairlineWidth },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  installRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 36 },
  promo: { borderRadius: 12, padding: 12, gap: 8 },
  promoHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  stockLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stockDot: { width: 8, height: 8, borderRadius: 4 },
  inCart: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  section: { padding: 16, gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionActions: { gap: 10, paddingTop: 4 },
  trustRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  collapsed: { maxHeight: 260, overflow: 'hidden' },
  rail: { paddingTop: 12 },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  addBtn: { flex: 1.4 },
});
