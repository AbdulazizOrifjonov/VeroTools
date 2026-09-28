import type { ImageRef } from '@vero/types';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useTheme } from '../../theme/theme';
import { SmartImage, Text } from '../../ui';

/** Swipeable product photos (light well; square on phones, capped height on tablets). Tap opens the zoom viewer. */
export const ProductGallery = memo(function ProductGallery({
  images,
  width,
  height = width,
  name,
  onOpen,
}: {
  images: ImageRef[];
  width: number;
  height?: number;
  name: string;
  onOpen: (index: number) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);
  const list = images.length ? images : [undefined];

  const onEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) =>
      setIndex(Math.round(e.nativeEvent.contentOffset.x / width)),
    [width],
  );

  const renderItem = useCallback<ListRenderItem<ImageRef | undefined>>(
    ({ item, index: i }) => (
      <Pressable
        onPress={() => item && onOpen(i)}
        accessibilityRole="imagebutton"
        accessibilityLabel={`${t('common:a11y.image', { name })} ${i + 1}/${list.length}. ${t('common:a11y.zoomImage')}`}
        style={{ width, height }}
      >
        <SmartImage
          image={item}
          size="full"
          style={{ width, height }}
          priority={i === 0 ? 'high' : 'normal'}
        />
      </Pressable>
    ),
    [width, height, onOpen, t, name, list.length],
  );

  return (
    <View>
      <FlatList
        data={list}
        horizontal
        pagingEnabled
        keyExtractor={(img, i) => img?.id ?? img?.url ?? String(i)}
        renderItem={renderItem}
        onMomentumScrollEnd={onEnd}
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        initialNumToRender={1}
        windowSize={3}
      />
      {list.length > 1 ? (
        <>
          <View style={styles.dots} pointerEvents="none">
            {list.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === index ? colors.primary : 'rgba(20,20,22,0.22)',
                    width: i === index ? 16 : 6,
                  },
                ]}
              />
            ))}
          </View>
          <View style={styles.counter} pointerEvents="none">
            <Text variant="caption" weight="bold" tabular style={{ color: '#3F3F47' }}>
              {index + 1}/{list.length}
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: { height: 6, borderRadius: 3 },
  counter: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
});
