import type { Language } from '@vero/config';
import type { BannerPlacement, ProductListParams } from '@vero/types';

/**
 * Query keys. Everything that depends on the signed-in user (or guest session) lives under the
 * "session" prefix so it can be reset on login / logout in one call.
 */
export const qk = {
  home: (l: Language) => ['home', l] as const,
  settings: (l: Language) => ['settings', l] as const,
  categories: (l: Language) => ['categories', l] as const,
  category: (slug: string, l: Language) => ['category', slug, l] as const,
  brands: (params: object | undefined, l: Language) => ['brands', params ?? {}, l] as const,
  brand: (slug: string, l: Language) => ['brand', slug, l] as const,
  products: (params: ProductListParams, l: Language) => ['products', params, l] as const,
  productsInfinite: (params: ProductListParams, l: Language) => ['products', 'infinite', params, l] as const,
  facets: (params: ProductListParams, l: Language) => ['facets', params, l] as const,
  product: (slug: string, l: Language) => ['product', slug, l] as const,
  related: (id: string, l: Language) => ['related', id, l] as const,
  productsByIds: (ids: string[], l: Language) => ['productsByIds', ids, l] as const,
  suggest: (q: string, l: Language) => ['suggest', q, l] as const,
  popularSearches: () => ['popularSearches'] as const,
  reviews: (productId: string, params?: object) => ['reviews', productId, params ?? {}] as const,
  questions: (productId: string, params?: object) => ['questions', productId, params ?? {}] as const,
  banners: (placement: BannerPlacement, l: Language) => ['banners', placement, l] as const,
  promotions: (l: Language) => ['promotions', l] as const,
  promotion: (slug: string, l: Language) => ['promotion', slug, l] as const,
  page: (slug: string, l: Language) => ['page', slug, l] as const,
  faq: (l: Language) => ['faq', l] as const,
  paymentMethods: (amount: number | undefined, l: Language) => ['paymentMethods', amount ?? 0, l] as const,
  pickupPoints: (l: Language) => ['pickupPoints', l] as const,
  translations: (l: Language) => ['translations', l] as const,

  session: ['session'] as const,
  me: () => ['session', 'me'] as const,
  cart: (l: Language) => ['session', 'cart', l] as const,
  cartAll: () => ['session', 'cart'] as const,
  engagement: () => ['session', 'engagement'] as const,
  wishlist: (l: Language) => ['session', 'wishlist', l] as const,
  wishlistAll: () => ['session', 'wishlist'] as const,
  compare: (l: Language) => ['session', 'compare', l] as const,
  compareAll: () => ['session', 'compare'] as const,
  addresses: () => ['session', 'addresses'] as const,
  orders: (params: object | undefined, l: Language) => ['session', 'orders', params ?? {}, l] as const,
  ordersAll: () => ['session', 'orders'] as const,
  order: (id: string, l: Language) => ['session', 'order', id, l] as const,
  orderAll: () => ['session', 'order'] as const,
  notifications: (params: object | undefined, l: Language) => ['session', 'notifications', params ?? {}, l] as const,
  notificationsAll: () => ['session', 'notifications'] as const,
  unread: () => ['session', 'unread'] as const,
  myReviews: (l: Language) => ['session', 'myReviews', l] as const,
  deliveryOptions: (region: string | undefined, subtotal: number | undefined, l: Language) =>
    ['session', 'deliveryOptions', region ?? '', subtotal ?? 0, l] as const,
  quote: (input: object, l: Language) => ['session', 'quote', input, l] as const,

  admin: {
    all: ['admin'] as const,
    resource: (resource: string) => ['admin', resource] as const,
    list: (resource: string, params?: object) => ['admin', resource, 'list', params ?? {}] as const,
    item: (resource: string, id: string) => ['admin', resource, 'item', id] as const,
    dashboard: () => ['admin', 'dashboard'] as const,
    analytics: (params: object) => ['admin', 'analytics', params] as const,
    report: (type: string, params: object) => ['admin', 'reports', type, params] as const,
  },
};

export type AdminResource =
  | 'products'
  | 'categories'
  | 'brands'
  | 'specs'
  | 'orders'
  | 'customers'
  | 'users'
  | 'roles'
  | 'reviews'
  | 'questions'
  | 'inventory'
  | 'movements'
  | 'coupons'
  | 'promotions'
  | 'banners'
  | 'media'
  | 'payments'
  | 'deliveryZones'
  | 'pickupPoints'
  | 'expenses'
  | 'expenseCategories'
  | 'notifications'
  | 'translations'
  | 'settings'
  | 'pages'
  | 'faq'
  | 'messages'
  | 'auditLogs'
  | 'dashboard'
  | 'analytics'
  | 'reports';
