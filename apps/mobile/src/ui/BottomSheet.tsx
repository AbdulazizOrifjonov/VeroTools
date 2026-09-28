import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/theme';
import { IconButton } from './IconButton';
import { X } from './icons';
import { Text } from './Text';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** sticky area under the content (buttons) */
  footer?: ReactNode;
  /** 'auto' sizes to the content (max 90 % of the screen), 'large' always uses 90 % */
  size?: 'auto' | 'large';
  /** wrap children in a ScrollView (default) — pass false for lists that scroll themselves */
  scroll?: boolean;
  headerRight?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

const DURATION = 220;

/** Modal bottom sheet: slide-up, drag the handle down or tap the backdrop to close, Android back closes it. */
export function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'auto',
  scroll = true,
  headerRight,
  contentStyle,
}: BottomSheetProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);
  const maxHeight = Math.round(windowHeight * 0.9);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      drag.value = 0;
      progress.value = withTiming(1, { duration: reduced ? 0 : DURATION, easing: Easing.out(Easing.cubic) });
    } else if (mounted) {
      progress.value = withTiming(
        0,
        { duration: reduced ? 0 : 180, easing: Easing.in(Easing.cubic) },
        (done) => {
          if (done) runOnJS(setMounted)(false);
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * maxHeight + drag.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const pan = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((e) => {
      drag.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 110 || e.velocityY > 900) {
        runOnJS(onClose)();
      } else {
        drag.value = withTiming(0, { duration: 160 });
      }
    });

  if (!mounted) return null;

  const body = scroll ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flexShrink, contentStyle]}>{children}</View>
  );

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.flex}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <Animated.View
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }, backdropStyle]}
          >
            <Pressable
              style={styles.flex}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('common:actions.close')}
            />
          </Animated.View>
          <View style={styles.bottom} pointerEvents="box-none">
            <Animated.View
              accessibilityViewIsModal
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.background,
                  maxHeight,
                  height: size === 'large' ? maxHeight : undefined,
                  paddingBottom: footer ? 0 : Math.max(insets.bottom, 12),
                },
                sheetStyle,
              ]}
            >
              <GestureDetector gesture={pan}>
                <View style={styles.header} collapsable={false}>
                  <View style={[styles.handle, { backgroundColor: colors.input }]} />
                  {title ? (
                    <View style={styles.titleRow}>
                      <View style={styles.flex}>
                        <Text variant="title3" accessibilityRole="header" numberOfLines={2}>
                          {title}
                        </Text>
                        {subtitle ? (
                          <Text variant="footnote" color="mutedForeground">
                            {subtitle}
                          </Text>
                        ) : null}
                      </View>
                      {headerRight}
                      <IconButton
                        icon={X}
                        label={t('common:actions.close')}
                        onPress={onClose}
                        variant="filled"
                        size={36}
                      />
                    </View>
                  ) : null}
                </View>
              </GestureDetector>
              {body}
              {footer ? (
                <View
                  style={[
                    styles.footer,
                    { borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) },
                  ]}
                >
                  {footer}
                </View>
              ) : null}
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  bottom: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  header: { paddingTop: 8, paddingHorizontal: 16, paddingBottom: 4 },
  handle: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, minHeight: 44 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
});
