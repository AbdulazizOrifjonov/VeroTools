import {
  LOGO_CIRCLE,
  LOGO_GRADIENT,
  LOGO_VIEWBOX,
  LOGO_WORDMARK_PATH,
  LOGO_WORDMARK_VIEWBOX,
} from '@vero/config';
import { memo, useId } from 'react';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

/** The official OCKEAN TOOLS logo (vector geometry from @vero/config) — always 1:1, never stretched. */
export const Logo = memo(function Logo({
  size = 40,
  label = 'OCKEAN TOOLS',
  textColor = '#000000',
}: {
  size?: number;
  label?: string;
  textColor?: string;
}) {
  const gradientId = `ockeanLogo${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <Svg
      width={size}
      height={size}
      viewBox={LOGO_VIEWBOX}
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      <Defs>
        <RadialGradient id={gradientId} cx={LOGO_GRADIENT.cx} cy={LOGO_GRADIENT.cy} r={LOGO_GRADIENT.r}>
          {LOGO_GRADIENT.stops.map((s) => (
            <Stop key={s.offset} offset={s.offset} stopColor={s.color} />
          ))}
        </RadialGradient>
      </Defs>
      <Circle cx={LOGO_CIRCLE.cx} cy={LOGO_CIRCLE.cy} r={LOGO_CIRCLE.r} fill={`url(#${gradientId})`} />
      <Path d={LOGO_WORDMARK_PATH} fill={textColor} fillRule="evenodd" />
    </Svg>
  );
});

/** Wordmark only ("OCKEAN"), keeps the official aspect ratio (895 × 148). */
export const Wordmark = memo(function Wordmark({
  height = 22,
  color = '#000000',
  label = 'OCKEAN TOOLS',
}: {
  height?: number;
  color?: string;
  label?: string;
}) {
  const [, , w, h] = LOGO_WORDMARK_VIEWBOX.split(' ').map(Number) as [number, number, number, number];
  return (
    <Svg
      width={(height * w) / h}
      height={height}
      viewBox={LOGO_WORDMARK_VIEWBOX}
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      <Path d={LOGO_WORDMARK_PATH} fill={color} fillRule="evenodd" />
    </Svg>
  );
});
