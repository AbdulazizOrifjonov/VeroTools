import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/theme';
import { Text } from './Text';

export function countdownParts(endsAt: string | number | Date, now = Date.now()) {
  const totalMs = Math.max(0, new Date(endsAt).getTime() - now);
  const s = Math.floor(totalMs / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    done: totalMs <= 0,
  };
}

function useNow(intervalMs: number, active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, active]);
  return now;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Promotion countdown: "2 d 04:12:33" boxes (ticks every second, stops at zero). */
export const Countdown = memo(function Countdown({
  endsAt,
  variant = 'boxes',
  style,
  onDark,
}: {
  endsAt: string;
  variant?: 'boxes' | 'inline';
  style?: StyleProp<ViewStyle>;
  onDark?: boolean;
}) {
  const { t } = useTranslation();
  const { colors, dark } = useTheme();
  const [done, setDone] = useState(() => countdownParts(endsAt).done);
  const now = useNow(1000, !done);
  const p = countdownParts(endsAt, now);
  useEffect(() => {
    if (p.done && !done) setDone(true);
  }, [p.done, done]);

  const readable = t('countdown.readable', { days: p.days, hours: p.hours, minutes: p.minutes });
  if (variant === 'inline') {
    return (
      <Text
        variant="subhead"
        weight="bold"
        tabular
        accessibilityLabel={readable}
        style={{ color: onDark ? '#FFFFFF' : colors.foreground }}
      >
        {p.days > 0 ? `${t('countdown.daysShort', { count: p.days })} ` : ''}
        {`${pad(p.hours)}:${pad(p.minutes)}:${pad(p.seconds)}`}
      </Text>
    );
  }
  const cells: Array<[number, string]> = [
    ...(p.days > 0 ? ([[p.days, t('countdown.d')]] as Array<[number, string]>) : []),
    [p.hours, t('countdown.h')],
    [p.minutes, t('countdown.m')],
    [p.seconds, t('countdown.s')],
  ];
  const boxBg = onDark ? 'rgba(255,255,255,0.14)' : dark ? '#26262B' : '#18181B';
  return (
    <View style={[styles.row, style]} accessible accessibilityLabel={readable}>
      {cells.map(([value, label], i) => (
        <View key={i} style={[styles.cell, { backgroundColor: boxBg }]}>
          <Text tabular weight="extrabold" style={styles.value} maxFontSizeMultiplier={1.2}>
            {pad(value)}
          </Text>
          <Text style={styles.label} maxFontSizeMultiplier={1.2}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  cell: { minWidth: 38, paddingVertical: 4, paddingHorizontal: 4, borderRadius: 8, alignItems: 'center' },
  value: { color: '#FFFFFF', fontSize: 15, lineHeight: 19 },
  label: { color: 'rgba(255,255,255,0.7)', fontSize: 9.5, lineHeight: 12, fontWeight: '600' },
});
