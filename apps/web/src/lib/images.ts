import type { ImageRef } from '@vero/types';

/**
 * Upload URLs come back absolute (API PUBLIC_API_URL). Files under /uploads are rewritten to the
 * storefront origin — the dev server and the production server proxy /uploads to the API — so images
 * stay same-origin (CSP, no mixed content). Other hosts (CDN / S3) are kept as is.
 */
export function assetUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  const m = /^https?:\/\/[^/]+(\/uploads\/.*)$/i.exec(url);
  return m ? m[1] : url;
}

export interface ImageSources {
  src: string;
  srcSet?: string;
  width?: number;
  height?: number;
}

/** src + srcSet from the thumb (360w) / medium (800w) / original renditions. */
export function imageSources(ref: ImageRef | undefined | null, prefer: 'thumb' | 'medium' | 'full' = 'medium'): ImageSources | null {
  if (!ref?.url) return null;
  const full = assetUrl(ref.url)!;
  const thumb = assetUrl(ref.thumb);
  const medium = assetUrl(ref.medium);
  const fullWidth = ref.width && ref.width > 0 ? ref.width : 1200;
  const set: string[] = [];
  if (thumb && thumb !== full) set.push(`${thumb} ${Math.min(360, fullWidth)}w`);
  if (medium && medium !== full && fullWidth > 800) set.push(`${medium} 800w`);
  set.push(`${full} ${fullWidth}w`);
  const src = prefer === 'thumb' ? (thumb ?? medium ?? full) : prefer === 'medium' ? (medium ?? full) : full;
  return { src, srcSet: set.length > 1 ? set.join(', ') : undefined, width: ref.width, height: ref.height };
}
