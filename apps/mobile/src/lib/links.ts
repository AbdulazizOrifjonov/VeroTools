import { parseLocalizedPath } from '@vero/config';
import { PAGE_SLUGS } from '@vero/types';
import { parseProductListParams } from '@vero/utils';
import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';
import { WEB_URL } from '../config/env';
import { rootNavigate } from '../navigation/ref';
import type { RootStackParamList } from '../navigation/types';

export type RouteTarget = { name: keyof RootStackParamList; params?: object };

const tab = (tabName: string, screen: string, params?: object): RouteTarget => ({
  name: 'Tabs',
  params: { screen: tabName, params: { screen, params } },
});

const webHost = (() => {
  try {
    return new URL(WEB_URL).host.replace(/^www\./, '');
  } catch {
    return 'verotools.uz';
  }
})();

/** True for links that stay inside the store ("/catalog/x", "https://verotools.uz/product/y", "verotools://orders"). */
export function isInternalHref(href: string): boolean {
  if (href.startsWith('/') && !href.startsWith('//')) return true;
  if (/^verotools:\/\//i.test(href)) return true;
  try {
    const u = new URL(href);
    return (u.protocol === 'https:' || u.protocol === 'http:') && u.host.replace(/^www\./, '') === webHost;
  } catch {
    return false;
  }
}

/**
 * Maps a storefront path (STORE_ROUTES, optionally language-prefixed) or an app deep link to a screen.
 * Returns null for paths the app does not have (they are opened in the browser instead).
 */
export function hrefToRoute(href: string): RouteTarget | null {
  let pathAndQuery = href.trim();
  if (/^verotools:\/\//i.test(pathAndQuery))
    pathAndQuery = `/${pathAndQuery.replace(/^verotools:\/\//i, '')}`;
  else if (/^https?:\/\//i.test(pathAndQuery)) {
    try {
      const u = new URL(pathAndQuery);
      pathAndQuery = `${u.pathname}${u.search}`;
    } catch {
      return null;
    }
  }
  const [beforeHash = ''] = pathAndQuery.split('#');
  const [rawPath = '/', query = ''] = beforeHash.split('?');
  const { path } = parseLocalizedPath(rawPath.replace(/\/+$/, '') || '/');
  const qs = new URLSearchParams(query);
  const seg = path
    .split('/')
    .filter(Boolean)
    .map((s) => decodeURIComponent(s));

  const listFilters = () => {
    const parsed = parseProductListParams(qs);
    delete parsed.page;
    delete parsed.limit;
    return Object.keys(parsed).length ? parsed : undefined;
  };

  if (!seg.length) return tab('HomeTab', 'Home');
  const [a, b, c] = seg;
  switch (a) {
    case 'catalog':
      if (!b) return tab('CatalogTab', 'Catalog');
      return { name: 'ProductList', params: { category: b, initial: listFilters() } };
    case 'product':
      return b
        ? { name: 'Product', params: { slug: b, review: qs.get('review') === '1' || undefined } }
        : null;
    case 'promotions':
      return b ? { name: 'ProductList', params: { promotion: b } } : tab('HomeTab', 'Promotions');
    case 'brands':
      return b
        ? { name: 'ProductList', params: { brand: b, initial: listFilters() } }
        : tab('HomeTab', 'Brands');
    case 'search': {
      const q = qs.get('q')?.trim();
      return q ? { name: 'ProductList', params: { q, initial: listFilters() } } : { name: 'Search' };
    }
    case 'cart':
      return tab('CartTab', 'Cart');
    case 'wishlist':
      return tab('WishlistTab', 'Wishlist');
    case 'compare':
      return { name: 'Compare' };
    case 'checkout':
      if (b === 'success' && c) return { name: 'Order', params: { id: c } };
      return { name: 'Checkout' };
    case 'orders':
      // app deep link / payment return URL: verotools://orders[/<id>]
      return b ? { name: 'Order', params: { id: b } } : tab('ProfileTab', 'Orders');
    case 'account':
      switch (b) {
        case undefined:
          return tab('ProfileTab', 'Profile');
        case 'orders':
          return c ? { name: 'Order', params: { id: c } } : tab('ProfileTab', 'Orders');
        case 'addresses':
          return tab('ProfileTab', 'Addresses');
        case 'notifications':
          return tab('ProfileTab', 'Notifications');
        case 'reviews':
          return tab('ProfileTab', 'MyReviews');
        case 'settings':
          return tab('ProfileTab', 'Settings');
        default:
          return tab('ProfileTab', 'Profile');
      }
    case 'faq':
      return { name: 'Faq' };
    case 'contact':
    case 'contacts':
      return { name: 'Contacts' };
    case 'login':
      return { name: 'Login' };
    case 'register':
      return { name: 'Register' };
    case 'forgot-password':
      return { name: 'ForgotPassword' };
    case 'reset-password':
      return { name: 'ResetPassword', params: { token: qs.get('token') ?? undefined } };
    case 'verify-email':
      return { name: 'VerifyEmail', params: { token: qs.get('token') ?? undefined } };
    default:
      if (!b && (PAGE_SLUGS as readonly string[]).includes(a!)) return { name: 'Page', params: { slug: a } };
      return null;
  }
}

/** Opens an external URL: tel: / mailto: / tg: with the system handler, web pages in the in-app browser. */
export async function openExternal(url: string): Promise<void> {
  try {
    if (/^https?:\/\//i.test(url)) {
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });
      return;
    }
    await Linking.openURL(url);
  } catch {
    /* no handler installed — ignore */
  }
}

/** Opens any link from the API (banner buttons, notifications, markdown) inside the app when possible. */
export function openHref(
  href: string | undefined | null,
  navigate: (target: RouteTarget) => void = rootNavigate,
): void {
  if (!href) return;
  if (isInternalHref(href)) {
    const route = hrefToRoute(href);
    if (route) {
      navigate(route);
      return;
    }
    // an internal page the app does not have → website
    const path = href.startsWith('/') ? href : href.replace(/^verotools:\/\//i, '/');
    void openExternal(/^https?:/i.test(href) ? href : `${WEB_URL}${path}`);
    return;
  }
  void openExternal(href);
}
