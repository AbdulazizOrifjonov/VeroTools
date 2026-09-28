import { getStateFromPath as defaultGetStateFromPath, type LinkingOptions } from '@react-navigation/native';
import { parseLocalizedPath } from '@vero/config';
import * as Linking from 'expo-linking';
import { WEB_URL } from '../config/env';
import type { RootStackParamList } from './types';

const webPrefixes = (() => {
  const out = [WEB_URL];
  try {
    const u = new URL(WEB_URL);
    const bare = u.host.replace(/^www\./, '');
    out.push(`https://${bare}`, `https://www.${bare}`);
  } catch {
    /* ignore */
  }
  return Array.from(new Set(out));
})();

/**
 * Storefront paths (STORE_ROUTES, with optional /ru /en prefix) → app paths understood by `config` below.
 * "/account/orders/42" → "orders/42", "/checkout/success/42" → "orders/42", "/contact" → "contacts", …
 */
export function normalizeIncomingPath(input: string): string {
  const [pathPart = '', query = ''] = input.split('?');
  const withSlash = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
  let { path } = parseLocalizedPath(withSlash.replace(/\/+$/, '') || '/');
  path = path
    .replace(/^\/account\/orders(\/|$)/, '/orders$1')
    .replace(/^\/checkout\/success\//, '/orders/')
    .replace(/^\/contact$/, '/contacts')
    .replace(/^\/account$/, '/account');
  const clean = path.replace(/^\/+/, '');
  return query ? `${clean}?${query}` : clean;
}

const parseJson = (v: string) => {
  try {
    return JSON.parse(v) as unknown;
  } catch {
    return undefined;
  }
};
/** object params of ProductList survive the URL round trip on the web preview */
const jsonParams = { preset: parseJson, initial: parseJson };
const jsonStringify = {
  preset: (v: unknown) => JSON.stringify(v),
  initial: (v: unknown) => JSON.stringify(v),
};

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: Array.from(new Set([Linking.createURL('/'), 'verotools://', ...webPrefixes])),
  // nested `initialRouteName`s keep the tab root under a deep-linked screen (back goes to Catalog, Profile …)
  config: {
    initialRouteName: 'Tabs',
    screens: {
      Tabs: {
        screens: {
          HomeTab: {
            initialRouteName: 'Home',
            screens: {
              Home: '',
              Promotions: 'promotions',
              Brands: 'brands',
            },
          },
          CatalogTab: {
            initialRouteName: 'Catalog',
            screens: {
              Catalog: 'catalog',
              ProductList: { path: 'catalog/:category', parse: jsonParams, stringify: jsonStringify },
            },
          },
          CartTab: { screens: { Cart: 'cart' } },
          WishlistTab: { screens: { Wishlist: 'wishlist' } },
          ProfileTab: {
            initialRouteName: 'Profile',
            screens: {
              Profile: 'account',
              Orders: 'orders',
              Addresses: 'account/addresses',
              Notifications: 'account/notifications',
              MyReviews: 'account/reviews',
              Settings: 'account/settings',
              // app-only screens (no storefront equivalent)
              EditProfile: 'account/edit',
              ChangePassword: 'account/password',
              Help: 'help',
            },
          },
        },
      },
      Product: 'product/:slug',
      Reviews: 'product/:slug/reviews',
      Gallery: { path: 'product/:slug/photos', parse: { index: (v: string) => Number(v) || 0 } },
      ProductList: { path: 'list', parse: jsonParams, stringify: jsonStringify },
      Search: 'search',
      Compare: 'compare',
      Checkout: 'checkout',
      // outgoing only: an incoming /checkout/success/:id is normalized to orders/:id above
      CheckoutSuccess: 'checkout/success/:orderId',
      Order: 'orders/:id',
      Login: 'login',
      Register: 'register',
      ForgotPassword: 'forgot-password',
      ResetPassword: 'reset-password',
      VerifyEmail: 'verify-email',
      Faq: 'faq',
      Contacts: 'contacts',
      Page: ':slug',
    },
  } as unknown as LinkingOptions<RootStackParamList>['config'],
  getStateFromPath(path, options) {
    const normalized = normalizeIncomingPath(path);
    // brand / promotion pages → product list with the matching scope
    const brand = /^brands\/([^/?]+)/.exec(normalized);
    if (brand)
      return {
        routes: [{ name: 'Tabs' }, { name: 'ProductList', params: { brand: decodeURIComponent(brand[1]!) } }],
      } as never;
    const promo = /^promotions\/([^/?]+)/.exec(normalized);
    if (promo)
      return {
        routes: [
          { name: 'Tabs' },
          { name: 'ProductList', params: { promotion: decodeURIComponent(promo[1]!) } },
        ],
      } as never;
    // keep the leading slash: React Navigation stores it as `route.path`, and on the web a relative
    // "account/settings" would be resolved against the current URL (→ /account/account/settings)
    return defaultGetStateFromPath(`/${normalized}`, options);
  },
};
