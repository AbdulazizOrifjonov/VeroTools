import { DEFAULT_LANGUAGE, LANGUAGES, type Language } from './constants';

/**
 * Storefront URL map — the single source of truth shared by the web app router, the API
 * (sitemap, e-mail / push links, payment return URLs) and mobile deep links.
 *
 * Language prefix: Uzbek (default) has none, other languages are prefixed: /ru/…, /en/….
 */
export const STORE_ROUTES = {
  home: '/',
  catalog: '/catalog',
  category: (slug: string) => `/catalog/${encodeURIComponent(slug)}`,
  product: (slug: string) => `/product/${encodeURIComponent(slug)}`,
  brands: '/brands',
  brand: (slug: string) => `/brands/${encodeURIComponent(slug)}`,
  promotions: '/promotions',
  promotion: (slug: string) => `/promotions/${encodeURIComponent(slug)}`,
  search: '/search',
  compare: '/compare',
  wishlist: '/wishlist',
  cart: '/cart',
  checkout: '/checkout',
  checkoutSuccess: (orderId: string) => `/checkout/success/${encodeURIComponent(orderId)}`,
  faq: '/faq',
  contacts: '/contacts',
  /** static content pages managed in the admin panel (Pages) */
  page: (slug: string) => `/${encodeURIComponent(slug)}`,
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  verifyEmail: '/verify-email',
  account: '/account',
  orders: '/account/orders',
  order: (id: string) => `/account/orders/${encodeURIComponent(id)}`,
  addresses: '/account/addresses',
  notifications: '/account/notifications',
  reviews: '/account/reviews',
  settings: '/account/settings',
} as const;

/** Paths that must never be indexed by search engines. */
export const NOINDEX_PREFIXES = ['/account', '/cart', '/checkout', '/compare', '/wishlist', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/search'] as const;

export function localizedPath(lang: Language, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (lang === DEFAULT_LANGUAGE) return clean;
  return clean === '/' ? `/${lang}` : `/${lang}${clean}`;
}

/** Splits "/ru/product/x" → { lang: 'ru', path: '/product/x' }; unprefixed paths are Uzbek. */
export function parseLocalizedPath(pathname: string): { lang: Language; path: string } {
  const m = /^\/(ru|en|uz)(?=\/|$)/.exec(pathname);
  if (!m) return { lang: DEFAULT_LANGUAGE, path: pathname || '/' };
  const lang = m[1] as Language;
  const rest = pathname.slice(m[0].length) || '/';
  return { lang, path: rest };
}

/** hreflang alternates for a path (uz, ru, en + x-default → uz). */
export function alternatePaths(path: string): Array<{ lang: Language | 'x-default'; path: string }> {
  return [
    ...LANGUAGES.map((lang) => ({ lang, path: localizedPath(lang, path) })),
    { lang: 'x-default' as const, path: localizedPath(DEFAULT_LANGUAGE, path) },
  ];
}
