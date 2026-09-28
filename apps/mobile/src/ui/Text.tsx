import { memo } from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { fonts, type FontWeight } from '../theme/fonts';
import { useColors, type AppColors } from '../theme/theme';

export type TextVariant =
  | 'display'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'headline'
  | 'body'
  | 'callout'
  | 'subhead'
  | 'footnote'
  | 'caption'
  | 'overline';

const VARIANTS: Record<TextVariant, { size: number; line: number; weight: FontWeight; letter?: number }> = {
  display: { size: 28, line: 34, weight: 'extrabold', letter: -0.5 },
  title1: { size: 24, line: 30, weight: 'bold', letter: -0.4 },
  title2: { size: 20, line: 26, weight: 'bold', letter: -0.3 },
  title3: { size: 17, line: 23, weight: 'bold', letter: -0.2 },
  headline: { size: 15, line: 21, weight: 'semibold', letter: -0.1 },
  body: { size: 15, line: 22, weight: 'regular' },
  callout: { size: 14, line: 20, weight: 'regular' },
  subhead: { size: 13, line: 18, weight: 'medium' },
  footnote: { size: 12, line: 16, weight: 'regular' },
  caption: { size: 11, line: 14, weight: 'medium', letter: 0.1 },
  overline: { size: 11, line: 14, weight: 'bold', letter: 0.8 },
};

export type TextColor = keyof Pick<
  AppColors,
  | 'foreground'
  | 'mutedForeground'
  | 'primary'
  | 'link'
  | 'brand'
  | 'danger'
  | 'success'
  | 'warning'
  | 'info'
  | 'primaryForeground'
  | 'brandSoftForeground'
  | 'rating'
  | 'sale'
>;

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  weight?: FontWeight;
  color?: TextColor | (string & {});
  /** tabular figures (prices, quantities, dates) */
  tabular?: boolean;
  align?: TextStyle['textAlign'];
  uppercase?: boolean;
  strike?: boolean;
}

/** Manrope text with the app's type scale. Dynamic type is respected up to 1.6× to keep layouts intact. */
export const Text = memo(function Text({
  variant = 'body',
  weight,
  color = 'foreground',
  tabular,
  align,
  uppercase,
  strike,
  style,
  maxFontSizeMultiplier = 1.6,
  ...rest
}: TextProps) {
  const colors = useColors();
  const v = VARIANTS[variant];
  const resolved = (colors as unknown as Record<string, string>)[color] ?? color;
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        {
          fontFamily: fonts[weight ?? v.weight],
          fontSize: v.size,
          lineHeight: v.line,
          letterSpacing: v.letter,
          color: resolved,
        },
        tabular ? TABULAR : null,
        align ? { textAlign: align } : null,
        uppercase ? UPPER : null,
        strike ? STRIKE : null,
        style,
      ]}
      {...rest}
    />
  );
});

const TABULAR: TextStyle = { fontVariant: ['tabular-nums'] };
const UPPER: TextStyle = { textTransform: 'uppercase' };
const STRIKE: TextStyle = { textDecorationLine: 'line-through' };
