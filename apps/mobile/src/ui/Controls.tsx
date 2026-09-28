import { memo, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch as RNSwitch,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { haptic } from '../lib/haptics';
import { useTheme } from '../theme/theme';
import { Check } from './icons';
import { Text } from './Text';

/* ------------------------------------------------------------------ */
/* Checkbox                                                            */
/* ------------------------------------------------------------------ */

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: string;
  disabled?: boolean;
  error?: boolean;
  count?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export const Checkbox = memo(function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled,
  error,
  count,
  style,
  accessibilityLabel,
}: CheckboxProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel ?? (typeof label === 'string' ? label : undefined)}
      disabled={disabled}
      onPress={() => {
        haptic.selection();
        onChange(!checked);
      }}
      style={({ pressed }) => [styles.row, { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 }, style]}
      hitSlop={4}
    >
      <View
        style={[
          styles.box,
          {
            borderColor: error ? colors.danger : checked ? colors.primary : colors.input,
            backgroundColor: checked ? colors.primary : 'transparent',
          },
        ]}
      >
        {checked ? <Check size={15} color={colors.primaryForeground} strokeWidth={3} /> : null}
      </View>
      {label !== undefined ? (
        <View style={styles.labelWrap}>
          {typeof label === 'string' ? <Text variant="callout">{label}</Text> : label}
          {description ? (
            <Text variant="footnote" color="mutedForeground">
              {description}
            </Text>
          ) : null}
        </View>
      ) : null}
      {count !== undefined ? (
        <Text variant="footnote" color="mutedForeground" tabular>
          {count}
        </Text>
      ) : null}
    </Pressable>
  );
});

/* ------------------------------------------------------------------ */
/* Switch row                                                          */
/* ------------------------------------------------------------------ */

export interface SwitchRowProps {
  value: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  count?: number;
  style?: StyleProp<ViewStyle>;
}

/** react-native-web paints the "on" thumb with its own teal unless told otherwise */
const webSwitchColors = (Platform.OS === 'web' ? { activeThumbColor: '#FFFFFF' } : {}) as object;

export const SwitchRow = memo(function SwitchRow({
  value,
  onChange,
  label,
  description,
  disabled,
  count,
  style,
}: SwitchRowProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      accessibilityLabel={label}
      accessibilityHint={description}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={[styles.switchRow, { opacity: disabled ? 0.5 : 1 }, style]}
    >
      <View style={styles.labelWrap}>
        <Text variant="callout" weight="medium">
          {label}
        </Text>
        {description ? (
          <Text variant="footnote" color="mutedForeground">
            {description}
          </Text>
        ) : null}
      </View>
      {count !== undefined ? (
        <Text variant="footnote" color="mutedForeground" tabular>
          {count}
        </Text>
      ) : null}
      {/* the whole row is the (single, accessible) control; the switch only shows the state */}
      <View
        style={styles.switchVisual}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <RNSwitch
          value={value}
          disabled={disabled}
          trackColor={{ true: colors.primary, false: colors.input }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={colors.input}
          {...webSwitchColors}
        />
      </View>
    </Pressable>
  );
});

/* ------------------------------------------------------------------ */
/* Radio                                                               */
/* ------------------------------------------------------------------ */

export function RadioDot({ selected, disabled }: { selected: boolean; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.radio,
        { borderColor: selected ? colors.primary : colors.input, opacity: disabled ? 0.5 : 1 },
      ]}
    >
      {selected ? <View style={[styles.radioInner, { backgroundColor: colors.primary }]} /> : null}
    </View>
  );
}

export interface RadioCardProps {
  selected: boolean;
  onPress: () => void;
  title: ReactNode;
  description?: ReactNode;
  right?: ReactNode;
  disabled?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  icon?: ReactNode;
}

/** Selectable card (delivery / payment method, address, variant). */
export const RadioCard = memo(function RadioCard({
  selected,
  onPress,
  title,
  description,
  right,
  disabled,
  children,
  style,
  accessibilityLabel,
  icon,
}: RadioCardProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel ?? (typeof title === 'string' ? title : undefined)}
      disabled={disabled}
      onPress={() => {
        haptic.selection();
        onPress();
      }}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth * 2,
          backgroundColor: selected ? colors.brandSoft : pressed ? colors.pressed : colors.card,
          opacity: disabled ? 0.55 : 1,
        },
        style,
      ]}
    >
      <RadioDot selected={selected} disabled={disabled} />
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          {icon}
          {typeof title === 'string' ? (
            <Text variant="headline" style={styles.flex}>
              {title}
            </Text>
          ) : (
            <View style={styles.flex}>{title}</View>
          )}
          {right}
        </View>
        {description ? (
          typeof description === 'string' ? (
            <Text variant="footnote" color="mutedForeground">
              {description}
            </Text>
          ) : (
            description
          )
        ) : null}
        {children}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrap: { flex: 1, gap: 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 6 },
  switchVisual: { pointerEvents: 'none' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 11, height: 11, borderRadius: 6 },
  card: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 12, alignItems: 'flex-start' },
  cardBody: { flex: 1, gap: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 22 },
  flex: { flex: 1 },
});
