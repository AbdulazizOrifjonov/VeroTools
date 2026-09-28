import { useProduct } from '@vero/api-client';
import type { ImageRef } from '@vero/types';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  StyleSheet,
  useWindowDimensions,
  View,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { imageUri } from '../../lib/images';
import type { RootScreenProps } from '../../navigation/types';
import { IconButton, Text } from '../../ui';
import { X } from '../../ui/icons';

const MAX_SCALE = 4;

/** One photo with pinch-to-zoom, pan while zoomed and double-tap to zoom in / out. */
const ZoomableImage = memo(function ZoomableImage({
  image,
  width,
  height,
  onZoomChange,
}: {
  image: ImageRef;
  width: number;
  height: number;
  onZoomChange: (zoomed: boolean) => void;
}) {
  const [isZoomed, setIsZoomed] = useState(false);
  const report = useCallback(
    (z: boolean) => {
      setIsZoomed(z);
      onZoomChange(z);
    },
    [onZoomChange],
  );
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const clampPan = (s: number) => {
    'worklet';
    const maxX = ((s - 1) * width) / 2;
    const maxY = ((s - 1) * height) / 2;
    tx.value = Math.min(maxX, Math.max(-maxX, tx.value));
    ty.value = Math.min(maxY, Math.max(-maxY, ty.value));
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(MAX_SCALE, Math.max(1, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1.01) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        tx.value = withTiming(0);
        ty.value = withTiming(0);
        savedTx.value = 0;
        savedTy.value = 0;
      } else clampPan(scale.value);
      runOnJS(report)(savedScale.value > 1.01);
    });

  const pan = Gesture.Pan()
    .enabled(isZoomed)
    .minPointers(1)
    .averageTouches(true)
    .onStart(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    })
    .onUpdate((e) => {
      if (scale.value <= 1) return;
      tx.value = savedTx.value + e.translationX;
      ty.value = savedTy.value + e.translationY;
      clampPan(scale.value);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e) => {
      if (scale.value > 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        tx.value = withTiming(0);
        ty.value = withTiming(0);
        runOnJS(report)(false);
      } else {
        const next = 2.5;
        scale.value = withTiming(next);
        savedScale.value = next;
        // zoom towards the tapped point
        tx.value = withTiming(
          Math.max(
            -((next - 1) * width) / 2,
            Math.min(((next - 1) * width) / 2, (width / 2 - e.x) * (next - 1)),
          ),
        );
        ty.value = withTiming(
          Math.max(
            -((next - 1) * height) / 2,
            Math.min(((next - 1) * height) / 2, (height / 2 - e.y) * (next - 1)),
          ),
        );
        runOnJS(report)(true);
      }
    });

  // pan only takes over while zoomed, so the horizontal list keeps swiping otherwise
  const gesture = Gesture.Simultaneous(pinch, Gesture.Exclusive(doubleTap, pan));

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ width, height, overflow: 'hidden', justifyContent: 'center' }}>
        <Animated.View style={[{ width, height }, style]}>
          <Image
            source={{ uri: imageUri(image, 'full') }}
            style={{ width, height }}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
});

/** Full-screen photo viewer (pinch / double-tap zoom, swipe between photos). */
export function GalleryScreen({ navigation, route }: RootScreenProps<'Gallery'>) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const product = useProduct(route.params.slug);
  const [index, setIndex] = useState(route.params.index ?? 0);
  const [zoomed, setZoomed] = useState(false);

  const images = useMemo(() => {
    const p = product.data;
    if (!p) return [] as ImageRef[];
    const variant = route.params.variantId
      ? p.variants.find((v) => v.id === route.params.variantId)
      : undefined;
    const list = [...(variant?.image ? [variant.image] : []), ...p.images];
    return list.filter((img, i) => list.findIndex((x) => x.url === img.url) === i);
  }, [product.data, route.params.variantId]);

  const onEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) =>
      setIndex(Math.round(e.nativeEvent.contentOffset.x / width)),
    [width],
  );
  const renderItem = useCallback<ListRenderItem<ImageRef>>(
    ({ item }) => <ZoomableImage image={item} width={width} height={height} onZoomChange={setZoomed} />,
    [width, height],
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        scrollEnabled={!zoomed}
        initialScrollIndex={Math.min(index, Math.max(0, images.length - 1))}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        keyExtractor={(img, i) => img.id ?? `${img.url}-${i}`}
        renderItem={renderItem}
        onMomentumScrollEnd={onEnd}
        showsHorizontalScrollIndicator={false}
      />
      <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <IconButton
          icon={X}
          label={t('common:actions.close')}
          onPress={() => navigation.goBack()}
          color="#FFFFFF"
          style={styles.close}
        />
        {images.length > 1 ? (
          <Text variant="subhead" weight="bold" tabular style={{ color: '#FFFFFF' }}>
            {index + 1} / {images.length}
          </Text>
        ) : null}
        <View style={{ width: 44 }} />
      </View>
      <View style={[styles.hint, { paddingBottom: insets.bottom + 16 }]} pointerEvents="none">
        <Text variant="footnote" style={{ color: 'rgba(255,255,255,0.7)' }} align="center">
          {t('gallery.hint')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  top: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  close: { backgroundColor: 'rgba(255,255,255,0.14)' },
  hint: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
