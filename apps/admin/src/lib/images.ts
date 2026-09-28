import type { ImageRef } from '@vero/types';

/**
 * Upload URLs come back absolute (the API's PUBLIC_API_URL). Files under /uploads are rewritten to the admin
 * origin — the dev server and the production server proxy /uploads to the API — so images stay same-origin
 * (CSP, no mixed content). Other hosts (CDN / S3) are kept as they are.
 */
export function assetUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  const m = /^https?:\/\/[^/]+(\/uploads\/.*)$/i.exec(url);
  return m ? m[1] : url;
}

/** Smallest rendition that is good enough for a thumbnail. */
export function thumbOf(ref: { url?: string; thumb?: string; thumbUrl?: string; medium?: string; mediumUrl?: string } | null | undefined): string | undefined {
  if (!ref) return undefined;
  return assetUrl(ref.thumb ?? ref.thumbUrl ?? ref.medium ?? ref.mediumUrl ?? ref.url);
}

export function imageRefThumb(ref: ImageRef | undefined | null): string | undefined {
  return thumbOf(ref ?? undefined);
}

/** Human readable file size: 14 124 → "13.8 KB". */
export function formatBytes(bytes: number | undefined | null): string {
  if (bytes == null || !Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}
