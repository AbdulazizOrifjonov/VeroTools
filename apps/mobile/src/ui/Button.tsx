import { memo, type ReactNode } from 'react';
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
import { useTheme, type AppColors } from '../theme/theme';
import type { LucideIcon } from './icons';
import { Text } from './Text';

export type ButtonVariant =
  'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'graphite' | 'soft';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  fullWidth?: boolean;
  /** secondary text on the right (e.g. a price) */
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const HEIGHT: Record<ButtonSize, number> = { sm: 36, md: 46, lg: 54 };
const FONT: Record<ButtonSize, number> = { sm: 13, md: 15, lg: 16 };
const PAD: Record<ButtonSize, number> = { sm: 14, md: 18, lg: 22 };
const ICON: Record<ButtonSize, number> = { sm: 16, md: 18, lg: 20 };

function palette(c: AppColors, variant: ButtonVariant, dark: boolean) {
  switch (variant) {
    case 'primary':
      return { bg: c.primary, bgPressed: c.primaryHover, fg: c.primaryForeground, border: 'transparent' };
    case 'secondary':
      return { bg: c.secondary, bgPressed: c.muted, fg: c.secondaryForeground, border: 'transparent' };
    case 'soft':
      return { bg: c.brandSoft, bgPressed: c.brandSoft, fg: c.brandSoftForeground, border: 'transparent' };
    case 'outline':
      return { bg: 'transparent', bgPressed: c.pressed, fg: c.foreground, border: c.input };
    case 'ghost':
      return { bg: 'transparent', bgPressed: c.pressed, fg: c.foreground, border: 'transparent' };
    case 'destructive':
      return {
        bg: dark ? c.dangerSoft : c.dangerSoft,
        bgPressed: c.dangerSoft,
        fg: c.danger,
        border: 'transparent',
      };
    case 'graphite':
    default:
      return {
        bg: dark ? '#F4F4F5' : c.graphite,
        bgPressed: dark ? '#E4E4E7' : '#2A2A2F',
        fg: dark ? '#141416' : c.graphiteForeground,
        border: 'transparent',
      };
  }
}

/** Buttons: 44 pt+ touch targets, loading state, optional icons. */
export const Button = memo(function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  icon: Icon,
  iconRight: IconRight,
  fullWidth,
  trailing,
  style,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const { colors, dark } = useTheme();
  const p = palette(colors, variant, dark);
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      disabled={inactive}
      hitSlop={size === 'sm' ? 6 : 0}
      style={({ pressed }) => [
        styles.base,
        {
          height: HEIGHT[size],
          paddingHorizontal: PAD[size],
          backgroundColor: pressed ? p.bgPressed : p.bg,
          borderColor: p.border,
          borderWidth: p.border === 'transparent' ? 0 : StyleSheet.hairlineWidth * 2,
          opacity: disabled && !loading ? 0.45 : 1,
        },
        fullWidth ? styles.full : null,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} size="small" />
      ) : (
        <View style={styles.content}>
          {Icon ? <Icon size={ICON[size]} color={p.fg} strokeWidth={2} /> : null}
          <Text
            numberOfLines={1}
            style={{ color: p.fg, fontFamily: fonts.bold, fontSize: FONT[size], lineHeight: FONT[size] + 5 }}
            maxFontSizeMultiplier={1.3}
          >
            {title}
          </Text>
          {trailing ? (
            typeof trailing === 'string' ? (
              <Text
                tabular
                style={{ color: p.fg, fontFamily: fonts.bold, fontSize: FONT[size], opacity: 0.9 }}
                maxFontSizeMultiplier={1.3}
              >
                {trailing}
              </Text>
            ) : (
              trailing
            )
          ) : null}
          {IconRight ? <IconRight size={ICON[size]} color={p.fg} strokeWidth={2} /> : null}
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  full: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
});
