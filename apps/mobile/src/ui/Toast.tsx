import { memo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToasts, type ToastItem } from '../lib/toast';
import { useTheme } from '../theme/theme';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from './icons';
import { Text } from './Text';

const ToastView = memo(function ToastView({ item }: { item: ToastItem }) {
  const { colors, dark } = useTheme();
  const { t } = useTranslation();
  const dismiss = useToasts((s) => s.dismiss);

  useEffect(() => {
    const id = setTimeout(() => dismiss(item.id), item.duration);
    return () => clearTimeout(id);
  }, [item.id, item.duration, dismiss]);

  const Icon =
    item.type === 'success'
      ? CircleCheck
      : item.type === 'error'
        ? CircleAlert
        : item.type === 'warning'
          ? TriangleAlert
          : Info;
  const tint =
    item.type === 'success'
      ? colors.success
      : item.type === 'error'
        ? colors.danger
        : item.type === 'warning'
          ? colors.warning
          : colors.info;

  return (
    <Animated.View
      entering={FadeInUp.duration(180).reduceMotion(ReduceMotion.System)}
      exiting={FadeOutUp.duration(160).reduceMotion(ReduceMotion.System)}
      layout={LinearTransition.duration(160).reduceMotion(ReduceMotion.System)}
      style={[
        styles.toast,
        {
          backgroundColor: dark ? '#232328' : '#18181B',
          borderColor: dark ? colors.border : 'transparent',
        },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole={item.type === 'error' ? 'alert' : 'summary'}
    >
      <Icon
        size={20}
        color={item.type === 'info' ? '#93C5FD' : tint === colors.success && !dark ? '#4ADE80' : tint}
      />
      <View style={styles.body}>
        <Text variant="callout" weight="semibold" style={styles.light} numberOfLines={3}>
          {item.title}
        </Text>
        {item.message ? (
          <Text variant="footnote" style={styles.muted} numberOfLines={3}>
            {item.message}
          </Text>
        ) : null}
      </View>
      {item.action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={item.action.label}
          onPress={() => {
            item.action?.onPress();
            dismiss(item.id);
          }}
          hitSlop={8}
          style={({ pressed }) => [styles.action, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text variant="subhead" weight="bold" style={{ color: '#FF8A57' }}>
            {item.action.label}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common:actions.close')}
        onPress={() => dismiss(item.id)}
        hitSlop={10}
      >
        <X size={16} color="#A1A1AA" />
      </Pressable>
    </Animated.View>
  );
});

/** Renders the in-app banners at the top of the screen (above everything, below the status bar). */
export function ToastHost() {
  const items = useToasts((s) => s.items);
  const insets = useSafeAreaInsets();
  if (!items.length) return null;
  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + 8 }]}>
      {items.map((item) => (
        <ToastView key={item.id} item={item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 12,
    right: 12,
    gap: 8,
    zIndex: 1000,
    elevation: 1000,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    width: '100%',
    maxWidth: 560,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  body: { flex: 1, gap: 2 },
  light: { color: '#F4F4F5' },
  muted: { color: '#A1A1AA' },
  action: { paddingHorizontal: 4, minHeight: 32, justifyContent: 'center' },
});
