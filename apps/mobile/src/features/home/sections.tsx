import type {
  BannerDTO,
  BrandSummary,
  CategorySummary,
  HomeReview,
  PromotionDTO,
  StoreAdvantage,
} from '@vero/types';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useFormat } from '../../lib/format';
import { imageUri } from '../../lib/images';
import { useTheme } from '../../theme/theme';
import { Badge, Countdown, DynamicIcon, RatingStars, SectionHeader, SmartImage, Text } from '../../ui';
import { LayoutGrid, Zap } from '../../ui/icons';
import { BannerOverlay } from './HeroCarousel';

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export const CategoryTile = memo(function CategoryTile({
  category,
  width,
  onPress,
}: {
  category: Pick<CategorySummary, 'id' | 'name' | 'icon' | 'image' | 'productCount'>;
  width: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${category.name}, ${t('shop:catalog.found', { count: category.productCount })}`}
      style={({ pressed }) => [styles.catTile, { width, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.catImage, { width: width - 8, height: width - 8, backgroundColor: colors.fill }]}>
        {category.image ? (
          <SmartImage
            image={category.image}
            size="thumb"
            well={false}
            style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]}
            contentFit="contain"
          />
        ) : (
          <DynamicIcon name={category.icon} size={28} color={colors.link} strokeWidth={1.7} />
        )}
      </View>
      {/* bleeds a few points into the grid gap so long single words ("Kompressorlar") are not split */}
      <Text variant="caption" weight="semibold" align="center" numberOfLines={2} style={styles.catLabel}>
        {category.name}
      </Text>
    </Pressable>
  );
});

export function CategoryGrid({
  categories,
  onOpen,
  onAll,
}: {
  categories: CategorySummary[];
  onOpen: (c: CategorySummary) => void;
  onAll: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 8 : width >= 600 ? 6 : 4;
  const tile = Math.floor((width - 32 - (cols - 1) * 8) / cols);
  const shown = categories.slice(0, cols * 2 - 1);
  if (!categories.length) return null;
  return (
    <View>
      <SectionHeader title={t('shop:home.categories')} action={t('common:actions.seeAll')} onAction={onAll} />
      <View style={styles.catGrid}>
        {shown.map((c) => (
          <CategoryTile key={c.id} category={c} width={tile} onPress={() => onOpen(c)} />
        ))}
        <Pressable
          onPress={onAll}
          accessibilityRole="button"
          accessibilityLabel={t('common:nav.allCategories')}
          style={({ pressed }) => [styles.catTile, { width: tile, opacity: pressed ? 0.7 : 1 }]}
        >
          <View
            style={[
              styles.catImage,
              { width: tile - 8, height: tile - 8, backgroundColor: colors.brandSoft },
            ]}
          >
            <LayoutGrid size={26} color={colors.link} strokeWidth={1.8} />
          </View>
          <Text
            variant="caption"
            weight="semibold"
            align="center"
            numberOfLines={2}
            style={{ fontSize: 12, lineHeight: 15 }}
          >
            {t('common:nav.allCategories')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Promotions                                                          */
/* ------------------------------------------------------------------ */

export const PromotionCard = memo(function PromotionCard({
  promotion: p,
  width,
  onPress,
}: {
  promotion: PromotionDTO;
  width: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const { colors } = useTheme();
  const endsSoon = new Date(p.endsAt).getTime() - Date.now() < 7 * 86_400_000;
  const discount =
    p.discountType === 'percent'
      ? t('shop:promotions.discountPercent', { value: p.discountValue })
      : t('shop:promotions.discountFixed', { amount: f.price(p.discountValue) });
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${p.name}. ${discount}. ${t('shop:promotions.until', { date: f.date(p.endsAt, 'dayMonth') })}`}
      style={({ pressed }) => [
        styles.promo,
        { width, backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={{ width: '100%', aspectRatio: 3 / 2 }}>
        <SmartImage
          image={p.image}
          width={width}
          well={false}
          contentFit="cover"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.promoBadges}>
          <Badge label={discount} tone="sale" />
          {p.type === 'FLASH_SALE' ? <Badge label={t('home.flash')} tone="dark" icon={Zap} /> : null}
        </View>
      </View>
      <View style={styles.promoBody}>
        <Text variant="headline" numberOfLines={2}>
          {p.name}
        </Text>
        {endsSoon ? (
          <View style={styles.promoTimer}>
            <Text variant="footnote" color="mutedForeground">
              {t('shop:product.promoEnds')}
            </Text>
            <Countdown endsAt={p.endsAt} variant="inline" />
          </View>
        ) : (
          <Text variant="footnote" color="mutedForeground">
            {t('shop:promotions.until', { date: f.date(p.endsAt, 'dayMonth') })}
          </Text>
        )}
      </View>
    </Pressable>
  );
});

export function PromotionsRail({
  promotions,
  onOpen,
  onAll,
}: {
  promotions: PromotionDTO[];
  onOpen: (p: PromotionDTO) => void;
  onAll: () => void;
}) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(300, Math.round(width * 0.74));
  if (!promotions.length) return null;
  return (
    <View>
      <SectionHeader title={t('shop:home.promotions')} action={t('common:actions.seeAll')} onAction={onAll} />
      <FlatList
        horizontal
        data={promotions}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <PromotionCard promotion={item} width={cardWidth} onPress={() => onOpen(item)} />
        )}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Secondary / middle banners                                          */
/* ------------------------------------------------------------------ */

export const BannerTile = memo(function BannerTile({
  banner,
  width,
  onPress,
}: {
  banner: BannerDTO;
  width: number;
  onPress: () => void;
}) {
  const img = banner.imageMobile ?? banner.imageDesktop;
  const ratio = img?.width && img.height ? img.width / img.height : 1.6;
  return (
    <Pressable
      onPress={onPress}
      disabled={!banner.buttonUrl}
      accessibilityRole={banner.buttonUrl ? 'link' : 'image'}
      accessibilityLabel={[banner.title, banner.subtitle].filter(Boolean).join('. ')}
      style={({ pressed }) => [
        styles.bannerTile,
        {
          width,
          height: Math.round(width / ratio),
          backgroundColor: banner.textTheme === 'dark' ? '#18181B' : '#F0F0F2',
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <SmartImage
        uri={imageUri(img, 'medium')}
        well={false}
        contentFit="cover"
        contentPosition="bottom"
        style={StyleSheet.absoluteFill}
      />
      <BannerOverlay banner={banner} size="md" />
    </Pressable>
  );
});

export function BannerStrip({ banners, onOpen }: { banners: BannerDTO[]; onOpen: (url: string) => void }) {
  const { width } = useWindowDimensions();
  if (!banners.length) return null;
  const single = banners.length === 1;
  const cardWidth = single ? width - 32 : Math.min(340, Math.round(width * 0.82));
  return (
    <FlatList
      horizontal
      data={banners}
      keyExtractor={(b) => b.id}
      renderItem={({ item }) => (
        <BannerTile
          banner={item}
          width={cardWidth}
          onPress={() => item.buttonUrl && onOpen(item.buttonUrl)}
        />
      )}
      ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      showsHorizontalScrollIndicator={false}
      scrollEnabled={!single}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Brands                                                              */
/* ------------------------------------------------------------------ */

export const BrandTile = memo(function BrandTile({
  brand,
  width = 132,
  onPress,
}: {
  brand: BrandSummary;
  width?: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${brand.name}, ${t('shop:catalog.found', { count: brand.productCount })}`}
      style={({ pressed }) => [
        styles.brand,
        { width, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      {brand.logo ? (
        <SmartImage
          image={brand.logo}
          size="thumb"
          well={false}
          contentFit="contain"
          style={[styles.brandLogo, { backgroundColor: 'transparent' }]}
        />
      ) : (
        <Text variant="headline" weight="extrabold" style={{ color: '#18181B' }} numberOfLines={1}>
          {brand.name}
        </Text>
      )}
    </Pressable>
  );
});

export function BrandsRail({
  brands,
  onOpen,
  onAll,
}: {
  brands: BrandSummary[];
  onOpen: (b: BrandSummary) => void;
  onAll: () => void;
}) {
  const { t } = useTranslation();
  if (!brands.length) return null;
  return (
    <View>
      <SectionHeader title={t('shop:home.brands')} action={t('shop:home.allBrands')} onAction={onAll} />
      <FlatList
        horizontal
        data={brands}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => <BrandTile brand={item} onPress={() => onOpen(item)} />}
        ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Advantages                                                          */
/* ------------------------------------------------------------------ */

export function Advantages({ items }: { items: StoreAdvantage[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const cols = width >= 700 ? 3 : 2;
  const tile = Math.floor((width - 32 - (cols - 1) * 10) / cols);
  if (!items.length) return null;
  return (
    <View>
      <SectionHeader title={t('shop:home.whyUs')} />
      <View style={styles.advGrid}>
        {items.map((a, i) => (
          <View
            key={i}
            style={[styles.adv, { width: tile, backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={[styles.advIcon, { backgroundColor: colors.brandSoft }]}>
              <DynamicIcon name={a.icon} size={20} color={colors.link} strokeWidth={1.9} />
            </View>
            <Text variant="headline" numberOfLines={2}>
              {a.title}
            </Text>
            <Text variant="footnote" color="mutedForeground" numberOfLines={5}>
              {a.text}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Reviews                                                             */
/* ------------------------------------------------------------------ */

export const HomeReviewCard = memo(function HomeReviewCard({
  review,
  width,
  onPress,
}: {
  review: HomeReview;
  width: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const f = useFormat();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${review.author.name}: ${review.comment}. ${review.product.name}`}
      style={({ pressed }) => [
        styles.review,
        { width, backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={styles.reviewHead}>
        <RatingStars value={review.rating} size={13} />
        <Text variant="caption" color="mutedForeground">
          {f.date(review.createdAt, 'short')}
        </Text>
      </View>
      <Text variant="callout" numberOfLines={5} style={{ flex: 1 }}>
        {review.comment}
      </Text>
      <Text variant="subhead" weight="bold">
        {review.author.name}
      </Text>
      <View style={[styles.reviewProduct, { borderTopColor: colors.border }]}>
        <SmartImage image={review.product.image} size="thumb" style={styles.reviewThumb} />
        <Text variant="footnote" color="mutedForeground" numberOfLines={2} style={{ flex: 1 }}>
          {review.product.name}
        </Text>
      </View>
    </Pressable>
  );
});

export function ReviewsRail({ reviews, onOpen }: { reviews: HomeReview[]; onOpen: (r: HomeReview) => void }) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(300, Math.round(width * 0.76));
  if (!reviews.length) return null;
  return (
    <View>
      <SectionHeader title={t('shop:home.reviews')} />
      <FlatList
        horizontal
        data={reviews}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <HomeReviewCard review={item} width={cardWidth} onPress={() => onOpen(item)} />
        )}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8, rowGap: 14 },
  catTile: { alignItems: 'center', gap: 6 },
  catImage: { borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  catLabel: { fontSize: 11, lineHeight: 14, letterSpacing: -0.1, marginHorizontal: -4, alignSelf: 'stretch' },
  promo: { borderRadius: 14, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  promoBadges: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 6 },
  promoBody: { padding: 12, gap: 6 },
  promoTimer: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  bannerTile: { borderRadius: 14, overflow: 'hidden' },
  brand: {
    height: 64,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  brandLogo: { width: '100%', height: 36 },
  advGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },
  adv: { borderRadius: 14, padding: 14, gap: 6, borderWidth: StyleSheet.hairlineWidth },
  advIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  review: { borderRadius: 14, padding: 14, gap: 8, borderWidth: StyleSheet.hairlineWidth, minHeight: 220 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewProduct: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  reviewThumb: { width: 40, height: 40, borderRadius: 8 },
});
