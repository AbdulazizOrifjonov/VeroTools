import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { haptic } from '../lib/haptics';
import { useFormat } from '../lib/format';
import { fonts } from '../theme/fonts';
import { useTheme } from '../theme/theme';
import { Minus, Plus, Star } from './icons';
import { Text } from './Text';

/* ------------------------------------------------------------------ */
/* Price                                                               */
/* ------------------------------------------------------------------ */

const PRICE_SIZES = {
  sm: { price: 15, old: 12 },
  md: { price: 17, old: 13 },
  lg: { price: 22, old: 14 },
  xl: { price: 28, old: 16 },
} as const;

export const PriceText = memo(function PriceText({
  amount,
  oldAmount,
  size = 'md',
  inline = false,
  style,
  color,
}: {
  amount: number;
  oldAmount?: number | null;
  size?: keyof typeof PRICE_SIZES;
  /** old price next to the price instead of above it */
  inline?: boolean;
  style?: StyleProp<ViewStyle>;
  color?: string;
}) {
  const f = useFormat();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = PRICE_SIZES[size];
  const hasOld = !!oldAmount && oldAmount > amount;
  const label = hasOld
    ? `${t('common:product.price')}: ${f.price(amount)}, ${t('common:product.oldPrice')}: ${f.price(oldAmount!)}`
    : `${t('common:product.price')}: ${f.price(amount)}`;
  const old = hasOld ? (
    <Text
      tabular
      strike
      style={{
        fontFamily: fonts.medium,
        fontSize: s.old,
        lineHeight: s.old + 4,
        color: colors.mutedForeground,
      }}
      maxFontSizeMultiplier={1.3}
    >
      {f.price(oldAmount!)}
    </Text>
  ) : null;
  return (
    <View accessible accessibilityLabel={label} style={[inline ? styles.inline : styles.stack, style]}>
      {!inline ? old : null}
      <Text
        tabular
        style={{
          fontFamily: fonts.extrabold,
          fontSize: s.price,
          lineHeight: s.price + 5,
          letterSpacing: -0.3,
          color: color ?? (hasOld ? colors.sale : colors.foreground),
        }}
        maxFontSizeMultiplier={1.3}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {f.price(amount)}
      </Text>
      {inline ? old : null}
    </View>
  );
});

/* ------------------------------------------------------------------ */
/* Rating                                                              */
/* ------------------------------------------------------------------ */

export const RatingStars = memo(function RatingStars({
  value,
  size = 14,
  style,
}: {
  value: number;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const clamped = Math.max(0, Math.min(5, value));
  const gap = Math.round(size * 0.12);
  const total = size * 5 + gap * 4;
  const filled = (clamped / 5) * total;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('common:a11y.rating', { value: clamped.toFixed(1) })}
      style={[{ width: total, height: size }, style]}
    >
      <View style={[styles.starsRow, { gap }]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} size={size} color={colors.input} fill={colors.input} strokeWidth={1} />
        ))}
      </View>
      <View style={[StyleSheet.absoluteFill, { width: filled, overflow: 'hidden' }]}>
        <View style={[styles.starsRow, { gap, width: total }]}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} size={size} color={colors.rating} fill={colors.rating} strokeWidth={1} />
          ))}
        </View>
      </View>
    </View>
  );
});

/** Star picker for writing a review (each star is a 44 pt target). */
export function RatingInput({
  value,
  onChange,
  error,
}: {
  value: number;
  onChange: (v: number) => void;
  error?: boolean;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [pressedValue, setPressedValue] = useState<number | null>(null);
  const shown = pressedValue ?? value;
  return (
    <View
      style={styles.inputRow}
      accessibilityRole="radiogroup"
      accessibilityLabel={t('shop:reviews.yourRating')}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === n }}
          accessibilityLabel={`${n} — ${t(`shop:reviews.ratingLabels.${n}`)}`}
          onPressIn={() => setPressedValue(n)}
          onPressOut={() => setPressedValue(null)}
          onPress={() => {
            haptic.selection();
            onChange(n);
          }}
          style={styles.starBtn}
        >
          <Star
            size={34}
            color={n <= shown ? colors.rating : error ? colors.danger : colors.input}
            fill={n <= shown ? colors.rating : 'transparent'}
            strokeWidth={1.6}
          />
        </Pressable>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Quantity stepper                                                    */
/* ------------------------------------------------------------------ */

export const QuantityStepper = memo(function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  size = 'md',
  disabled,
  loading,
  style,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const h = size === 'sm' ? 36 : size === 'lg' ? 52 : 44;
  const canDec = !disabled && value > min;
  const canInc = !disabled && value < max;
  const change = (next: number) => {
    haptic.selection();
    onChange(Math.max(min, Math.min(max, next)));
  };
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={t('common:product.quantity')}
      accessibilityValue={{ min, max, now: value, text: String(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment' && canInc) change(value + 1);
        if (e.nativeEvent.actionName === 'decrement' && canDec) change(value - 1);
      }}
      style={[
        styles.stepper,
        { height: h, borderColor: colors.border, backgroundColor: colors.card, opacity: loading ? 0.7 : 1 },
        style,
      ]}
    >
      <Pressable
        onPress={() => change(value - 1)}
        disabled={!canDec}
        accessibilityLabel={t('common:product.decrease')}
        style={({ pressed }) => [styles.stepBtn, { width: h, opacity: canDec ? (pressed ? 0.5 : 1) : 0.3 }]}
        hitSlop={4}
      >
        <Minus size={size === 'sm' ? 16 : 18} color={colors.foreground} strokeWidth={2.4} />
      </Pressable>
      <Text
        tabular
        weight="bold"
        style={{ minWidth: size === 'sm' ? 24 : 32, textAlign: 'center', fontSize: size === 'sm' ? 14 : 16 }}
      >
        {value}
      </Text>
      <Pressable
        onPress={() => change(value + 1)}
        disabled={!canInc}
        accessibilityLabel={t('common:product.increase')}
        style={({ pressed }) => [styles.stepBtn, { width: h, opacity: canInc ? (pressed ? 0.5 : 1) : 0.3 }]}
        hitSlop={4}
      >
        <Plus size={size === 'sm' ? 16 : 18} color={colors.foreground} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  stack: { gap: 0 },
  inline: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  starsRow: { flexDirection: 'row' },
  inputRow: { flexDirection: 'row', gap: 2 },
  starBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignSelf: 'flex-start',
  },
  stepBtn: { height: '100%', alignItems: 'center', justifyContent: 'center' },
});
