import type { ImageRef } from '@vero/types';
import { Image, type ImageContentFit, type ImageContentPosition } from 'expo-image';
import { memo, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { imageForWidth, imageUri, type ImageSize } from '../lib/images';
import { useTheme } from '../theme/theme';
import { Image as ImageIcon } from './icons';

export interface SmartImageProps {
  image?: ImageRef | null;
  /** direct URI (avatars, notification images) */
  uri?: string | null;
  size?: ImageSize;
  /** rendered width in dp — picks the rendition automatically */
  width?: number;
  style?: StyleProp<ViewStyle>;
  contentFit?: ImageContentFit;
  contentPosition?: ImageContentPosition;
  /** light grey well behind product photos */
  well?: boolean;
  alt?: string;
  recyclingKey?: string;
  priority?: 'low' | 'normal' | 'high';
}

/** expo-image with memory+disk cache, rendition picking, the product-photo well and a fallback glyph. */
export const SmartImage = memo(function SmartImage({
  image,
  uri,
  size = 'medium',
  width,
  style,
  contentFit = 'contain',
  contentPosition,
  well = true,
  alt,
  recyclingKey,
  priority,
}: SmartImageProps) {
  const { colors, dark } = useTheme();
  const reduced = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const source = uri ?? (width ? imageForWidth(image, width) : imageUri(image, size));
  const bg = well ? colors.imageWell : colors.muted;
  return (
    <View
      style={[styles.box, { backgroundColor: bg }, style]}
      accessible={!!alt}
      accessibilityRole={alt ? 'image' : undefined}
      accessibilityLabel={alt}
    >
      {source && !failed ? (
        <Image
          source={{ uri: source }}
          style={[StyleSheet.absoluteFill, well && dark ? styles.dim : null]}
          contentFit={contentFit}
          contentPosition={contentPosition}
          cachePolicy="memory-disk"
          transition={reduced ? 0 : 150}
          recyclingKey={recyclingKey ?? source}
          priority={priority}
          onError={() => setFailed(true)}
          accessible={false}
        />
      ) : (
        <View style={styles.fallback}>
          <ImageIcon size={26} color={dark && !well ? colors.mutedForeground : '#A0A0AA'} strokeWidth={1.5} />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  box: { overflow: 'hidden' },
  fallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: { opacity: 0.94 },
});
