import {
  LOGO_CIRCLE,
  LOGO_GRADIENT,
  LOGO_VIEWBOX,
  LOGO_WORDMARK_PATH,
  LOGO_WORDMARK_VIEWBOX,
} from '@vero/config';
import * as React from 'react';

import { cn } from '../lib/utils';

const WORDMARK_RATIO = 476 / 211;

function useSvgId(prefix: string): string {
  // React ids may contain characters that are awkward inside url(#…) references.
  return `${prefix}-${React.useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

export interface LogoProps extends Omit<
  React.ComponentProps<'svg'>,
  'width' | 'height' | 'viewBox' | 'children'
> {
  /** Width and height in px (the logo is always square). Default 48. */
  size?: number;
  /** Accessible name. Default 'VERO TOOLS'. */
  title?: string;
}

/** Official VERO TOOLS logo — orange radial-gradient circle with the white wordmark. Never distorted (1:1). */
function Logo({ size = 48, title = 'VERO TOOLS', className, style, ...props }: LogoProps) {
  const gradientId = useSvgId('vt-logo-gradient');
  const titleId = useSvgId('vt-logo-title');

  return (
    <svg
      data-slot="logo"
      role="img"
      aria-labelledby={titleId}
      viewBox={LOGO_VIEWBOX}
      width={size}
      height={size}
      preserveAspectRatio="xMidYMid meet"
      className={cn('inline-block shrink-0 select-none', className)}
      style={{ aspectRatio: '1 / 1', ...style }}
      {...props}
    >
      <title id={titleId}>{title}</title>
      <defs>
        <radialGradient id={gradientId} cx={LOGO_GRADIENT.cx} cy={LOGO_GRADIENT.cy} r={LOGO_GRADIENT.r}>
          {LOGO_GRADIENT.stops.map((stop) => (
            <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
          ))}
        </radialGradient>
      </defs>
      <circle cx={LOGO_CIRCLE.cx} cy={LOGO_CIRCLE.cy} r={LOGO_CIRCLE.r} fill={`url(#${gradientId})`} />
      <path d={LOGO_WORDMARK_PATH} fill="#FFFFFF" />
    </svg>
  );
}

export interface LogoWordmarkProps extends Omit<
  React.ComponentProps<'svg'>,
  'width' | 'height' | 'viewBox' | 'children'
> {
  /** Height in px; width follows the wordmark ratio (476 : 211). Default 24. */
  height?: number;
  /** Accessible name. Default 'VERO TOOLS'. */
  title?: string;
}

/** Wordmark only ("vero® TOOLS"), filled with `currentColor` — use on light or dark surfaces. */
function LogoWordmark({ height = 24, title = 'VERO TOOLS', className, ...props }: LogoWordmarkProps) {
  const titleId = useSvgId('vt-wordmark-title');
  return (
    <svg
      data-slot="logo-wordmark"
      role="img"
      aria-labelledby={titleId}
      viewBox={LOGO_WORDMARK_VIEWBOX}
      height={height}
      width={Math.round(height * WORDMARK_RATIO * 100) / 100}
      preserveAspectRatio="xMidYMid meet"
      className={cn('inline-block shrink-0 fill-current select-none', className)}
      {...props}
    >
      <title id={titleId}>{title}</title>
      <path d={LOGO_WORDMARK_PATH} fill="currentColor" />
    </svg>
  );
}

export { Logo, LogoWordmark };
