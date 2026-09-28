import {
  LOGO_CIRCLE,
  LOGO_GRADIENT,
  LOGO_VIEWBOX,
  LOGO_WORDMARK_PATH,
  LOGO_WORDMARK_VIEWBOX,
} from '@vero/config';
import { memo, useId } from 'react';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

/** The official VERO TOOLS logo (vector geometry from @vero/config) — always 1:1, never stretched. */
export const Logo = memo(function Logo({
  size = 40,
  label = 'VERO TOOLS',
}: {
  size?: number;
  label?: string;
}) {
  // unique per instance: on the web the ids share one document, and a gradient defined inside a hidden
  // screen (display: none) does not paint for the others
  const gradientId = `vtLogo${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
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
      <Path d={LOGO_WORDMARK_PATH} fill="#FFFFFF" />
    </Svg>
  );
});

/** Wordmark only ("vero TOOLS"), keeps the original aspect ratio (476 × 211). */
export const Wordmark = memo(function Wordmark({
  height = 22,
  color,
  label = 'VERO TOOLS',
}: {
  height?: number;
  color: string;
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
      <Path d={LOGO_WORDMARK_PATH} fill={color} />
    </Svg>
  );
});
