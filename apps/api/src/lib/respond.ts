import type { Response } from 'express';
import type { PageMeta } from '@vero/types';

export const ok = <T>(res: Response, data: T, status = 200) => res.status(status).json({ data });
export const created = <T>(res: Response, data: T) => res.status(201).json({ data });
export const noContent = (res: Response) => res.status(204).end();
export const paged = <T>(res: Response, items: T[], meta: PageMeta) => res.json({ data: items, meta });

/** Private, per-user responses must never be cached by proxies/CDNs. */
export const noStore = (res: Response) => res.setHeader('Cache-Control', 'private, no-store');
/** Public catalogue responses may be cached briefly (they vary by language). */
export const publicCache = (res: Response, seconds = 60) => {
  res.setHeader('Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=${seconds * 5}`);
  res.setHeader('Vary', 'Accept-Language, X-Client');
};
