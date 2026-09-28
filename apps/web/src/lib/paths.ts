import { localizedPath, parseLocalizedPath, type Language } from '@vero/config';

/** True for links that stay inside the storefront ("/catalog/x", "/ru/product/y", "?page=2"). */
export function isInternalHref(href: string | undefined | null): href is string {
  if (!href) return false;
  return href.startsWith('/') && !href.startsWith('//');
}

/**
 * Localises an internal link coming from the API (banner buttons, notifications, markdown):
 * "/catalog/drills" → "/ru/catalog/drills" for Russian. Already prefixed links are re-targeted to `lang`.
 * External links are returned untouched.
 */
export function localizeHref(href: string, lang: Language): string {
  if (!isInternalHref(href)) return href;
  const [pathAndQuery, hash = ''] = href.split('#');
  const [pathname = '/', query = ''] = (pathAndQuery ?? '').split('?');
  const { path } = parseLocalizedPath(pathname);
  return `${localizedPath(lang, path)}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
}

/** Current page in another language (language switcher keeps the page, query and hash). */
export function switchLanguagePath(location: { pathname: string; search: string; hash: string }, lang: Language): string {
  const { path } = parseLocalizedPath(location.pathname);
  return `${localizedPath(lang, path)}${location.search}${location.hash}`;
}

/**
 * "?next=" target for auth redirects — only same-site relative paths are accepted. The language prefix is
 * dropped (navigation re-localises it) and auth pages are rejected to avoid loops.
 */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !isInternalHref(next) || next.includes('\\')) return null;
  const cut = next.search(/[?#]/);
  const pathname = cut === -1 ? next : next.slice(0, cut);
  const rest = cut === -1 ? '' : next.slice(cut);
  const { path } = parseLocalizedPath(pathname);
  if (/^\/(login|register|forgot-password|reset-password|verify-email)(\/|$)/.test(path)) return null;
  return `${path}${rest}`;
}

export function withQuery(path: string, query: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  const s = sp.toString();
  return s ? `${path}?${s}` : path;
}
