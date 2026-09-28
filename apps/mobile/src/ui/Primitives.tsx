import { memo, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme, type AppColors } from '../theme/theme';
import { ChevronRight, X, type LucideIcon } from './icons';
import { Text } from './Text';

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  style,
  padded = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: 14,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        },
        padded ? { padding: 16 } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Divider                                                             */
/* ------------------------------------------------------------------ */

export function Divider({ style, inset = 0 }: { style?: StyleProp<ViewStyle>; inset?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: inset }, style]}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Badge                                                               */
/* ------------------------------------------------------------------ */

export type BadgeTone =
  'neutral' | 'brand' | 'sale' | 'success' | 'warning' | 'danger' | 'info' | 'solid' | 'dark';

function badgeColors(c: AppColors, tone: BadgeTone, dark: boolean): { bg: string; fg: string } {
  switch (tone) {
    case 'brand':
      return { bg: c.brandSoft, fg: c.brandSoftForeground };
    case 'sale':
      return { bg: c.sale, fg: '#FFFFFF' };
    case 'solid':
      return { bg: c.primary, fg: c.primaryForeground };
    case 'success':
      return { bg: c.successSoft, fg: c.success };
    case 'warning':
      return { bg: c.warningSoft, fg: c.warning };
    case 'danger':
      return { bg: c.dangerSoft, fg: c.danger };
    case 'info':
      return { bg: c.infoSoft, fg: c.info };
    case 'dark':
      return { bg: dark ? '#F4F4F5' : '#18181B', fg: dark ? '#18181B' : '#FFFFFF' };
    case 'neutral':
    default:
      return { bg: c.fill, fg: c.mutedForeground };
  }
}

export const Badge = memo(function Badge({
  label,
  tone = 'neutral',
  icon: Icon,
  size = 'md',
  dot,
  style,
}: {
  label: string;
  tone?: BadgeTone;
  icon?: LucideIcon;
  size?: 'sm' | 'md';
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, dark } = useTheme();
  const p = badgeColors(colors, tone, dark);
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: p.bg, paddingHorizontal: size === 'sm' ? 6 : 8, height: size === 'sm' ? 20 : 24 },
        style,
      ]}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: p.fg }]} /> : null}
      {Icon ? <Icon size={size === 'sm' ? 11 : 13} color={p.fg} strokeWidth={2.4} /> : null}
      <Text
        variant="caption"
        weight="bold"
        style={{ color: p.fg, fontSize: size === 'sm' ? 10.5 : 11.5 }}
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
        tabular
      >
        {label}
      </Text>
    </View>
  );
});

/* ------------------------------------------------------------------ */
/* Chip                                                                */
/* ------------------------------------------------------------------ */

export interface ChipProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  selected?: boolean;
  onRemove?: () => void;
  icon?: LucideIcon;
  count?: number;
  style?: StyleProp<ViewStyle>;
}

export const Chip = memo(function Chip({
  label,
  selected,
  onRemove,
  icon: Icon,
  count,
  style,
  onPress,
  ...rest
}: ChipProps) {
  const { colors } = useTheme();
  const fg = selected ? colors.brandSoftForeground : colors.foreground;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      onPress={onPress ?? onRemove}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.brandSoft : pressed ? colors.pressed : colors.card,
          borderColor: selected ? colors.primary : colors.border,
        },
        style,
      ]}
      hitSlop={{ top: 4, bottom: 4 }}
      {...rest}
    >
      {Icon ? <Icon size={15} color={fg} /> : null}
      <Text variant="subhead" weight="semibold" style={{ color: fg }} numberOfLines={1}>
        {label}
      </Text>
      {count !== undefined ? (
        <Text variant="footnote" color="mutedForeground" tabular>
          {count}
        </Text>
      ) : null}
      {onRemove ? <X size={14} color={fg} strokeWidth={2.5} /> : null}
    </Pressable>
  );
});

/* ------------------------------------------------------------------ */
/* Section header                                                      */
/* ------------------------------------------------------------------ */

export function SectionHeader({
  title,
  action,
  onAction,
  style,
  subtitle,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  subtitle?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="title3" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="footnote" color="mutedForeground">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={`${action}: ${title}`}
          hitSlop={10}
          style={({ pressed }) => [styles.sectionAction, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text variant="subhead" weight="bold" color="link">
            {action}
          </Text>
          <ChevronRight size={16} color={colors.link} />
        </Pressable>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* List row                                                            */
/* ------------------------------------------------------------------ */

export interface ListRowProps extends Omit<PressableProps, 'style' | 'children'> {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  value?: string;
  right?: ReactNode;
  badge?: number;
  chevron?: boolean;
  destructive?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const ListRow = memo(function ListRow({
  title,
  subtitle,
  icon: Icon,
  iconColor,
  value,
  right,
  badge,
  chevron = true,
  destructive,
  style,
  onPress,
  ...rest
}: ListRowProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={[title, value, badge ? String(badge) : undefined].filter(Boolean).join(', ')}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.listRow,
        { backgroundColor: pressed ? colors.pressed : 'transparent' },
        style,
      ]}
      {...rest}
    >
      {Icon ? (
        <View style={[styles.listIcon, { backgroundColor: destructive ? colors.dangerSoft : colors.fill }]}>
          <Icon
            size={19}
            color={destructive ? colors.danger : (iconColor ?? colors.foreground)}
            strokeWidth={1.9}
          />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          variant="body"
          weight="semibold"
          color={destructive ? 'danger' : 'foreground'}
          numberOfLines={2}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text variant="footnote" color="mutedForeground" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="callout" color="mutedForeground" numberOfLines={1} style={{ maxWidth: '45%' }}>
          {value}
        </Text>
      ) : null}
      {badge ? (
        <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
          <Text variant="caption" weight="bold" color="primaryForeground" tabular>
            {badge > 99 ? '99+' : String(badge)}
          </Text>
        </View>
      ) : null}
      {right}
      {chevron && onPress ? <ChevronRight size={18} color={colors.mutedForeground} /> : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, alignSelf: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    minHeight: 56,
    paddingVertical: 10,
  },
  listIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
