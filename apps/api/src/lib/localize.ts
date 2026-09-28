import type { Language } from '@vero/config';
import type { ImageRef } from '@vero/types';
import { pickLocalized } from '@vero/utils';
import { env } from '../config/env';
import type { ImageValue, Localized } from '../models/common';

export const loc = (value: Partial<Localized> | string | null | undefined, lang: Language): string => pickLocalized(value, lang);

/** Local-storage URLs are stored relative ("/uploads/…"); expose them as absolute URLs. */
export function absoluteUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:')) return url;
  return `${env.PUBLIC_API_URL.replace(/\/+$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
}

export function toImageRef(image: ImageValue | undefined | null, lang: Language, fallbackAlt = ''): ImageRef | undefined {
  if (!image?.url) return undefined;
  return {
    id: image.media ? String(image.media) : undefined,
    url: absoluteUrl(image.url)!,
    thumb: absoluteUrl(image.thumb ?? image.url),
    medium: absoluteUrl(image.medium ?? image.url),
    alt: loc(image.alt, lang) || fallbackAlt,
    width: image.width,
    height: image.height,
  };
}

export const iso = (d: Date | string | undefined | null): string | undefined => (d ? new Date(d).toISOString() : undefined);
