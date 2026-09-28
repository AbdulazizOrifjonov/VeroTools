export const LANGUAGES = ['uz', 'ru', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'uz';

export const LANGUAGE_LABELS: Record<Language, { short: string; native: string }> = {
  uz: { short: 'UZ', native: "O'zbekcha" },
  ru: { short: 'RU', native: 'Русский' },
  en: { short: 'EN', native: 'English' },
};

/** Multilingual text stored in the database for every customer-facing string. */
export type LocalizedText = Record<Language, string>;

export const THEMES = ['light', 'dark', 'system'] as const;
export type ThemePreference = (typeof THEMES)[number];

export const CURRENCY = 'UZS' as const;
export const PHONE_COUNTRY_CODE = '+998';
/** +998 followed by 9 digits (operator code + subscriber number). */
export const UZ_PHONE_REGEX = /^\+998\d{9}$/;

export const BUSINESS_TIMEZONE = 'Asia/Tashkent';

export const LIMITS = {
  compareMax: 6,
  cartMaxLineQuantity: 999,
  cartMaxLines: 60,
  wishlistMax: 300,
  addressesMax: 10,
  reviewImagesMax: 5,
  productImagesMax: 15,
  searchHistoryMax: 20,
  pageSizeDefault: 24,
  pageSizeMax: 100,
  adminPageSizeDefault: 20,
  imageUploadMaxBytes: 10 * 1024 * 1024,
  attachmentUploadMaxBytes: 15 * 1024 * 1024,
  reviewImageMaxBytes: 5 * 1024 * 1024,
  avatarMaxBytes: 3 * 1024 * 1024,
} as const;

export const STORAGE_KEYS = {
  guestId: 'vt.guestId',
  theme: 'vt.theme',
  language: 'vt.language',
  recentSearches: 'vt.recentSearches',
  onboardingDone: 'vt.onboardingDone',
  accessToken: 'vt.accessToken',
  refreshToken: 'vt.refreshToken',
} as const;

/** Headers understood by the API. */
export const API_HEADERS = {
  guestId: 'X-Guest-Id',
  client: 'X-Client',
  language: 'Accept-Language',
} as const;

export const CLIENTS = ['web', 'admin', 'mobile'] as const;
export type ClientApp = (typeof CLIENTS)[number];

export const SOCKET_EVENTS = {
  sync: 'sync',
  notification: 'notification:new',
  orderUpdated: 'order:updated',
  adminOrderNew: 'admin:order:new',
  adminOrderUpdated: 'admin:order:updated',
  adminStockLow: 'admin:stock:low',
  adminReviewNew: 'admin:review:new',
} as const;

export type SyncEntity =
  | 'cart'
  | 'wishlist'
  | 'compare'
  | 'orders'
  | 'notifications'
  | 'profile'
  | 'addresses'
  | 'reviews';
