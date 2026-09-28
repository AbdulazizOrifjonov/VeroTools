import { memo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { fonts } from '../theme/fonts';
import { useTheme } from '../theme/theme';
import type { LucideIcon } from './icons';
import { Text } from './Text';

export interface IconButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  icon: LucideIcon;
  /** required: icon-only controls need an accessible name */
  label: string;
  variant?: 'plain' | 'filled' | 'outline' | 'overlay' | 'primary';
  size?: number;
  iconSize?: number;
  color?: string;
  /** filled / highlighted state (e.g. item in wishlist) */
  active?: boolean;
  activeColor?: string;
  badge?: number;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Icon-only button with a 44 pt minimum touch target (visual size can be smaller, hitSlop compensates). */
export const IconButton = memo(function IconButton({
  icon: Icon,
  label,
  variant = 'plain',
  size = 44,
  iconSize,
  color,
  active = false,
  activeColor,
  badge,
  loading,
  disabled,
  style,
  ...rest
}: IconButtonProps) {
  const { colors, dark } = useTheme();
  const bg =
    variant === 'filled'
      ? colors.fill
      : variant === 'overlay'
        ? dark
          ? 'rgba(27,27,31,0.92)'
          : 'rgba(255,255,255,0.94)'
        : variant === 'primary'
          ? colors.primary
          : 'transparent';
  const fg = active
    ? (activeColor ?? colors.link)
    : (color ?? (variant === 'primary' ? colors.primaryForeground : colors.foreground));
  const slop = Math.max(0, (44 - size) / 2);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected: active, busy: !!loading }}
      disabled={disabled || loading}
      hitSlop={slop}
      style={({ pressed }) => [
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: pressed && variant !== 'primary' ? colors.pressed : bg,
          borderWidth: variant === 'outline' ? StyleSheet.hairlineWidth * 2 : 0,
          borderColor: colors.border,
          opacity: disabled ? 0.4 : pressed && variant === 'primary' ? 0.85 : 1,
        },
        variant === 'overlay' ? styles.shadow : null,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <Icon
          size={iconSize ?? Math.round(size * 0.46)}
          color={fg}
          strokeWidth={2}
          fill={active && activeColor ? activeColor : 'none'}
        />
      )}
      {badge ? (
        <View
          style={[styles.badge, { backgroundColor: colors.primary, borderColor: colors.background }]}
          pointerEvents="none"
        >
          <Text style={styles.badgeText} maxFontSizeMultiplier={1.2} tabular>
            {badge > 99 ? '99+' : String(badge)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  badgeText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 10, lineHeight: 13 },
});
