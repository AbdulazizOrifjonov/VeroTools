import type { BannerDTO } from '@vero/types';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AppState,
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { imageUri } from '../../lib/images';
import { useTheme } from '../../theme/theme';
import { SmartImage, Text } from '../../ui';
import { ArrowRight } from '../../ui/icons';

const AUTO_MS = 6000;

/** Title / subtitle / CTA over the banner art (`textTheme` = background of the art: dark → light text). */
export function BannerOverlay({ banner, size = 'lg' }: { banner: BannerDTO; size?: 'lg' | 'md' }) {
  const { colors } = useTheme();
  const light = banner.textTheme === 'dark';
  return (
    <View style={[styles.overlay, size === 'md' && styles.overlayMd]} pointerEvents="none">
      <Text
        variant={size === 'lg' ? 'title1' : 'title3'}
        weight="extrabold"
        numberOfLines={3}
        style={{ color: light ? '#FFFFFF' : '#0E0E10', maxWidth: '85%' }}
      >
        {banner.title}
      </Text>
      {banner.subtitle ? (
        <Text
          variant={size === 'lg' ? 'callout' : 'footnote'}
          numberOfLines={3}
          style={{ color: light ? 'rgba(255,255,255,0.82)' : '#3F3F47', maxWidth: '85%' }}
        >
          {banner.subtitle}
        </Text>
      ) : null}
      {banner.buttonText && banner.buttonUrl ? (
        <View style={[styles.cta, { backgroundColor: colors.primary }, size === 'md' && styles.ctaMd]}>
          <Text variant="subhead" weight="bold" style={{ color: colors.primaryForeground }}>
            {banner.buttonText}
          </Text>
          <ArrowRight size={15} color={colors.primaryForeground} />
        </View>
      ) : null}
    </View>
  );
}

/** Home hero: paging carousel of banners (mobile artwork on phones), auto-advance unless reduce motion is on. */
export const HeroCarousel = memo(function HeroCarousel({
  banners,
  onOpen,
}: {
  banners: BannerDTO[];
  onOpen: (url: string) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width, height: windowHeight } = useWindowDimensions();
  const reduced = useReducedMotion();
  const listRef = useRef<FlatList<BannerDTO>>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const tablet = width >= 700;
  const itemWidth = width;
  const cardWidth = width - 32;

  const aspect = (b: BannerDTO) => {
    const img = tablet ? (b.imageDesktop ?? b.imageMobile) : (b.imageMobile ?? b.imageDesktop);
    return img?.width && img.height ? img.width / img.height : tablet ? 2.8 : 1;
  };
  const first = banners[0];
  const cardHeight = Math.min(
    Math.round(cardWidth / (first ? aspect(first) : 1)),
    Math.round(windowHeight * 0.5),
  );

  useEffect(() => {
    if (reduced || paused || banners.length < 2) return;
    const id = setInterval(() => {
      if (AppState.currentState !== 'active') return;
      setIndex((i) => {
        const next = (i + 1) % banners.length;
        listRef.current?.scrollToOffset({ offset: next * itemWidth, animated: true });
        return next;
      });
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [reduced, paused, banners.length, itemWidth]);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const i = Math.round(e.nativeEvent.contentOffset.x / itemWidth);
      setIndex(Math.max(0, Math.min(banners.length - 1, i)));
    },
    [itemWidth, banners.length],
  );

  const renderItem = useCallback<ListRenderItem<BannerDTO>>(
    ({ item, index: i }) => {
      const img = tablet ? (item.imageDesktop ?? item.imageMobile) : (item.imageMobile ?? item.imageDesktop);
      return (
        <View style={{ width: itemWidth, paddingHorizontal: 16 }}>
          <Pressable
            onPress={() => item.buttonUrl && onOpen(item.buttonUrl)}
            disabled={!item.buttonUrl}
            accessibilityRole={item.buttonUrl ? 'link' : 'image'}
            accessibilityLabel={[item.title, item.subtitle, t('common:a11y.slide', { index: i + 1 })]
              .filter(Boolean)
              .join('. ')}
            style={({ pressed }) => [
              styles.card,
              {
                width: cardWidth,
                height: cardHeight,
                backgroundColor: item.textTheme === 'dark' ? '#18181B' : '#F0F0F2',
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <SmartImage
              uri={imageUri(img, tablet ? 'full' : 'medium')}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition="bottom"
              well={false}
              priority={i === 0 ? 'high' : 'normal'}
            />
            <BannerOverlay banner={item} />
          </Pressable>
        </View>
      );
    },
    [itemWidth, cardWidth, cardHeight, tablet, onOpen, t],
  );

  if (!banners.length) return null;

  return (
    <View accessibilityLabel={t('home.heroLabel')}>
      <FlatList
        ref={listRef}
        data={banners}
        keyExtractor={(b) => b.id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        onScrollBeginDrag={() => setPaused(true)}
        onScrollEndDrag={() => setPaused(false)}
        getItemLayout={(_, i) => ({ length: itemWidth, offset: itemWidth * i, index: i })}
        decelerationRate="fast"
      />
      {banners.length > 1 ? (
        <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {banners.map((b, i) => (
            <View
              key={b.id}
              style={[
                styles.dot,
                { backgroundColor: i === index ? colors.primary : colors.input, width: i === index ? 18 : 6 },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: 16, overflow: 'hidden' },
  overlay: { position: 'absolute', left: 20, right: 20, top: 20, gap: 8, alignItems: 'flex-start' },
  overlayMd: { left: 16, right: 16, top: 16, gap: 6 },
  cta: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  ctaMd: { height: 34, paddingHorizontal: 12, marginTop: 4 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
  dot: { height: 6, borderRadius: 3 },
});
