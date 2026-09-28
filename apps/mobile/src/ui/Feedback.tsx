import { isApiError } from '@vero/api-client';
import { memo, useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { errorMessage } from '../lib/i18n';
import { useTheme } from '../theme/theme';
import { Button } from './Button';
import { CircleAlert, WifiOff, type LucideIcon } from './icons';
import { Text } from './Text';

/* ------------------------------------------------------------------ */
/* Skeleton                                                            */
/* ------------------------------------------------------------------ */

export const Skeleton = memo(function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
  style,
}: {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    pulse.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(pulse);
  }, [reduced, pulse]);
  const animated = useAnimatedStyle(() => ({ opacity: 1 - pulse.value * 0.45 }));
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.skeleton }, animated, style]}
    />
  );
});

/** Screen-level busy indicator (announced to screen readers). */
export function LoadingView({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View
      style={[styles.center, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={t('common:a11y.loading')}
    >
      <ActivityIndicator color={colors.link} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Empty / error                                                       */
/* ------------------------------------------------------------------ */

export function StateIcon({
  icon: Icon,
  tone = 'neutral',
}: {
  icon: LucideIcon;
  tone?: 'neutral' | 'danger' | 'brand' | 'success';
}) {
  const { colors } = useTheme();
  const bg =
    tone === 'danger'
      ? colors.dangerSoft
      : tone === 'brand'
        ? colors.brandSoft
        : tone === 'success'
          ? colors.successSoft
          : colors.fill;
  const fg =
    tone === 'danger'
      ? colors.danger
      : tone === 'brand'
        ? colors.link
        : tone === 'success'
          ? colors.success
          : colors.mutedForeground;
  return (
    <View style={[styles.iconWrap, { backgroundColor: bg }]}>
      <Icon size={30} color={fg} strokeWidth={1.7} />
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  style,
  compact,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  return (
    <View style={[styles.state, compact && styles.stateCompact, style]}>
      {icon ? <StateIcon icon={icon} /> : null}
      <View style={styles.stateText}>
        <Text variant={compact ? 'headline' : 'title3'} align="center">
          {title}
        </Text>
        {description ? (
          <Text variant="callout" color="mutedForeground" align="center">
            {description}
          </Text>
        ) : null}
      </View>
      {action ? <View style={styles.stateAction}>{action}</View> : null}
    </View>
  );
}

/** Error with "Try again"; network failures get the offline wording. */
export function ErrorState({
  error,
  onRetry,
  retrying,
  style,
  compact,
}: {
  error: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const offline = isApiError(error) && error.code === 'NETWORK';
  const title = offline ? t('common:status.offline') : t('common:status.error');
  const description = offline ? t('common:status.networkError') : errorMessage(t, error);
  return (
    <View style={[styles.state, compact && styles.stateCompact, style]} accessibilityRole="alert">
      <StateIcon icon={offline ? WifiOff : CircleAlert} tone="danger" />
      <View style={styles.stateText}>
        <Text variant={compact ? 'headline' : 'title3'} align="center">
          {title}
        </Text>
        <Text variant="callout" color="mutedForeground" align="center">
          {description}
        </Text>
      </View>
      {onRetry ? (
        <View style={styles.stateAction}>
          <Button title={t('common:actions.retry')} variant="outline" onPress={onRetry} loading={retrying} />
        </View>
      ) : null}
    </View>
  );
}

/** One-line inline error (sections inside a screen). */
export function InlineError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={[styles.inline, { backgroundColor: colors.dangerSoft }]} accessibilityRole="alert">
      <CircleAlert size={18} color={colors.danger} />
      <Text variant="footnote" style={{ flex: 1 }}>
        {errorMessage(t, error)}
      </Text>
      {onRetry ? (
        <Button title={t('common:actions.retry')} size="sm" variant="ghost" onPress={onRetry} />
      ) : null}
    </View>
  );
}

/** Tinted notice box (info / warning / danger / success). */
export function Notice({
  tone = 'info',
  icon: Icon,
  title,
  children,
  style,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success' | 'brand' | 'neutral';
  icon?: LucideIcon;
  title?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const map = {
    info: [colors.infoSoft, colors.info],
    warning: [colors.warningSoft, colors.warning],
    danger: [colors.dangerSoft, colors.danger],
    success: [colors.successSoft, colors.success],
    brand: [colors.brandSoft, colors.brandSoftForeground],
    neutral: [colors.fill, colors.mutedForeground],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View
      style={[styles.notice, { backgroundColor: bg }, style]}
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
    >
      {Icon ? <Icon size={18} color={fg} style={{ marginTop: 1 }} /> : null}
      <View style={{ flex: 1, gap: 4 }}>
        {title ? (
          <Text variant="headline" style={{ color: tone === 'neutral' ? colors.foreground : fg }}>
            {title}
          </Text>
        ) : null}
        {typeof children === 'string' ? <Text variant="callout">{children}</Text> : children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  state: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 48,
    gap: 16,
  },
  stateCompact: { paddingVertical: 24, gap: 12 },
  stateText: { gap: 6, alignItems: 'center', maxWidth: 360 },
  stateAction: { marginTop: 4, alignSelf: 'center' },
  iconWrap: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12 },
  notice: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 12 },
});
