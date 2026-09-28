import { formatNumber } from '@vero/utils';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useTheme } from '../../theme/theme';
import { TextField } from '../../ui';

export interface Range {
  min?: number;
  max?: number;
}

function stepFor(min: number, max: number, money: boolean): number {
  const span = max - min;
  if (money) return span > 20_000_000 ? 100_000 : span > 2_000_000 ? 10_000 : 1000;
  if (span <= 10) return 0.1;
  if (span <= 200) return 1;
  return span <= 2000 ? 10 : 100;
}

const roundTo = (v: number, step: number) => Math.round(v / step) * step;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const THUMB = 28;

/** Numeric range: two inputs + a dual-thumb slider. Emits `undefined` for an untouched bound. */
export const RangeFilter = memo(function RangeFilter({
  min,
  max,
  value,
  onChange,
  money = false,
  unit,
  label,
}: {
  min: number;
  max: number;
  value: Range;
  onChange: (range: Range) => void;
  money?: boolean;
  unit?: string;
  label: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const step = useMemo(() => stepFor(min, max, money), [min, max, money]);
  const decimals = step < 1 ? 1 : 0;
  const lo0 = clamp(value.min ?? min, min, max);
  const hi0 = clamp(value.max ?? max, min, max);
  const [lo, setLo] = useState(lo0);
  const [hi, setHi] = useState(hi0);
  const [loText, setLoText] = useState(formatNumber(lo0, decimals));
  const [hiText, setHiText] = useState(formatNumber(hi0, decimals));
  const [width, setWidth] = useState(0);
  const loX = useSharedValue(0);
  const hiX = useSharedValue(0);
  const startX = useSharedValue(0);
  const span = Math.max(1e-9, max - min);

  // sync from props (chips removed, reset …)
  useEffect(() => {
    setLo(lo0);
    setHi(hi0);
    setLoText(formatNumber(lo0, decimals));
    setHiText(formatNumber(hi0, decimals));
  }, [lo0, hi0, decimals]);

  useEffect(() => {
    if (!width) return;
    loX.value = ((lo - min) / span) * width;
    hiX.value = ((hi - min) / span) * width;
  }, [lo, hi, min, span, width, loX, hiX]);

  const commit = useCallback(
    (a: number, b: number) => {
      const nextLo = roundTo(Math.min(a, b), step);
      const nextHi = roundTo(Math.max(a, b), step);
      onChange({ min: nextLo <= min ? undefined : nextLo, max: nextHi >= max ? undefined : nextHi });
    },
    [onChange, min, max, step],
  );

  const fromX = useCallback(
    (x: number) => clamp(roundTo(min + (x / Math.max(1, width)) * span, step), min, max),
    [min, span, step, max, width],
  );

  const setLoFromX = useCallback(
    (x: number, done: boolean) => {
      const v = Math.min(fromX(x), hi);
      setLo(v);
      setLoText(formatNumber(v, decimals));
      if (done) commit(v, hi);
    },
    [fromX, hi, decimals, commit],
  );
  const setHiFromX = useCallback(
    (x: number, done: boolean) => {
      const v = Math.max(fromX(x), lo);
      setHi(v);
      setHiText(formatNumber(v, decimals));
      if (done) commit(lo, v);
    },
    [fromX, lo, decimals, commit],
  );

  const loPan = Gesture.Pan()
    .hitSlop({ horizontal: 12, vertical: 16 })
    .onBegin(() => {
      startX.value = loX.value;
    })
    .onUpdate((e) => {
      const x = Math.max(0, Math.min(hiX.value, startX.value + e.translationX));
      loX.value = x;
      runOnJS(setLoFromX)(x, false);
    })
    .onEnd(() => {
      runOnJS(setLoFromX)(loX.value, true);
    });
  const hiPan = Gesture.Pan()
    .hitSlop({ horizontal: 12, vertical: 16 })
    .onBegin(() => {
      startX.value = hiX.value;
    })
    .onUpdate((e) => {
      const x = Math.min(width, Math.max(loX.value, startX.value + e.translationX));
      hiX.value = x;
      runOnJS(setHiFromX)(x, false);
    })
    .onEnd(() => {
      runOnJS(setHiFromX)(hiX.value, true);
    });

  const loStyle = useAnimatedStyle(() => ({ transform: [{ translateX: loX.value }] }));
  const hiStyle = useAnimatedStyle(() => ({ transform: [{ translateX: hiX.value }] }));
  const fillStyle = useAnimatedStyle(() => ({ left: loX.value, width: Math.max(0, hiX.value - loX.value) }));

  const parse = (text: string) => {
    const n = Number(text.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };
  const submitLo = () => {
    const n = parse(loText);
    const v = n === null ? min : clamp(n, min, hi);
    setLo(v);
    setLoText(formatNumber(v, decimals));
    commit(v, hi);
  };
  const submitHi = () => {
    const n = parse(hiText);
    const v = n === null ? max : clamp(n, lo, max);
    setHi(v);
    setHiText(formatNumber(v, decimals));
    commit(lo, v);
  };

  const adjust = (which: 'lo' | 'hi', dir: 1 | -1) => {
    if (which === 'lo') {
      const v = clamp(lo + dir * step, min, hi);
      setLo(v);
      setLoText(formatNumber(v, decimals));
      commit(v, hi);
    } else {
      const v = clamp(hi + dir * step, lo, max);
      setHi(v);
      setHiText(formatNumber(v, decimals));
      commit(lo, v);
    }
  };

  const suffix = unit ? ` ${unit}` : '';
  return (
    <View style={styles.root}>
      <View style={styles.inputs}>
        <TextField
          containerStyle={styles.flex}
          value={loText}
          onChangeText={setLoText}
          onBlur={submitLo}
          onSubmitEditing={submitLo}
          keyboardType="decimal-pad"
          returnKeyType="done"
          prefix={t('shop:catalog.priceFrom')}
          accessibilityLabel={`${label}, ${t('shop:catalog.priceFrom')}`}
          inputStyle={styles.input}
        />
        <TextField
          containerStyle={styles.flex}
          value={hiText}
          onChangeText={setHiText}
          onBlur={submitHi}
          onSubmitEditing={submitHi}
          keyboardType="decimal-pad"
          returnKeyType="done"
          prefix={t('shop:catalog.priceTo')}
          accessibilityLabel={`${label}, ${t('shop:catalog.priceTo')}`}
          inputStyle={styles.input}
        />
      </View>
      <View
        style={styles.trackWrap}
        onLayout={(e: LayoutChangeEvent) => setWidth(Math.max(0, e.nativeEvent.layout.width - THUMB))}
      >
        <View style={[styles.track, { backgroundColor: colors.input, left: THUMB / 2, right: THUMB / 2 }]} />
        <View style={[styles.fillHost, { left: THUMB / 2, right: THUMB / 2 }]} pointerEvents="none">
          <Animated.View style={[styles.fill, { backgroundColor: colors.primary }, fillStyle]} />
        </View>
        {width > 0 ? (
          <>
            <GestureDetector gesture={loPan}>
              <Animated.View
                style={[
                  styles.thumb,
                  { borderColor: colors.primary, backgroundColor: colors.background },
                  loStyle,
                ]}
                accessible
                accessibilityRole="adjustable"
                accessibilityLabel={`${label}, ${t('shop:catalog.priceFrom')}`}
                accessibilityValue={{ text: `${formatNumber(lo, decimals)}${suffix}` }}
                accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                onAccessibilityAction={(e) => adjust('lo', e.nativeEvent.actionName === 'increment' ? 1 : -1)}
                hitSlop={12}
              />
            </GestureDetector>
            <GestureDetector gesture={hiPan}>
              <Animated.View
                style={[
                  styles.thumb,
                  { borderColor: colors.primary, backgroundColor: colors.background },
                  hiStyle,
                ]}
                accessible
                accessibilityRole="adjustable"
                accessibilityLabel={`${label}, ${t('shop:catalog.priceTo')}`}
                accessibilityValue={{ text: `${formatNumber(hi, decimals)}${suffix}` }}
                accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                onAccessibilityAction={(e) => adjust('hi', e.nativeEvent.actionName === 'increment' ? 1 : -1)}
                hitSlop={12}
              />
            </GestureDetector>
          </>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { gap: 14 },
  flex: { flex: 1 },
  inputs: { flexDirection: 'row', gap: 10 },
  input: { fontVariant: ['tabular-nums'] },
  trackWrap: { height: THUMB + 8, justifyContent: 'center' },
  track: { position: 'absolute', height: 4, borderRadius: 2 },
  fillHost: { position: 'absolute', height: 4 },
  fill: { position: 'absolute', height: 4, borderRadius: 2 },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 2.5,
    top: 4,
    left: 0,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
