import type { ImageRef } from '@vero/types';
import { API_ORIGIN } from '../config/env';

const LOOPBACK = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?(\/uploads\/.*)$/i;

/**
 * Upload URLs come back absolute with the API's PUBLIC_API_URL (http://localhost:4000 in development),
 * which a phone cannot reach. Loopback /uploads URLs and relative paths are re-targeted to the configured
 * API origin; any other host (CDN / S3) is kept as is.
 */
export function assetUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('/')) return `${API_ORIGIN}${url}`;
  const m = LOOPBACK.exec(url);
  return m ? `${API_ORIGIN}${m[3]}` : url;
}

export type ImageSize = 'thumb' | 'medium' | 'full';

/** Picks the rendition for a display size: thumb (360w) · medium (800w) · full. */
export function imageUri(ref: ImageRef | undefined | null, size: ImageSize = 'medium'): string | undefined {
  if (!ref?.url) return undefined;
  const pick =
    size === 'thumb'
      ? (ref.thumb ?? ref.medium ?? ref.url)
      : size === 'medium'
        ? (ref.medium ?? ref.url)
        : ref.url;
  return assetUrl(pick);
}

/** Rendition for a rendered width in dp (accounts for the screen density). */
export function imageForWidth(
  ref: ImageRef | undefined | null,
  widthDp: number,
  scale = 2,
): string | undefined {
  const px = widthDp * scale;
  return imageUri(ref, px <= 380 ? 'thumb' : px <= 900 ? 'medium' : 'full');
}
