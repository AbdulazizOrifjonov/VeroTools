/**
 * Public / customer-facing API data transfer objects.
 * Customer endpoints return strings already localised for the requested language
 * (`Accept-Language: uz|ru|en`, default uz). Admin endpoints return LocalizedText objects (see admin.ts).
 */
import type { Language, ThemePreference } from '@vero/config';
import type {
  BannerPlacement,
  ContactMessageType,
  DeliveryMethod,
  FaqCategory,
  InstallmentStatus,
  NotificationType,
  OrderSource,
  OrderStatus,
  PaymentMethod,
  PaymentProviderCode,
  PaymentStatus,
  PromotionType,
  ReviewStatus,
  RoleKey,
  SortOption,
  SpecGroup,
  StockStatus,
} from './enums';

export type ID = string;
/** ISO-8601 date-time string */
export type ISODate = string;

/* ------------------------------------------------------------------ */
/* Envelope                                                            */
/* ------------------------------------------------------------------ */

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: PageMeta;
}

export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  /** field path → message key/text for validation errors */
  fields?: Record<string, string>;
  details?: unknown;
}

export interface ApiErrorBody {
  error: ApiErrorPayload;
}

/* ------------------------------------------------------------------ */
/* Media                                                               */
/* ------------------------------------------------------------------ */

export interface ImageRef {
  id?: ID;
  url: string;
  thumb?: string;
  medium?: string;
  alt?: string;
  width?: number;
  height?: number;
}

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */

export interface Breadcrumb {
  id: ID;
  slug: string;
  name: string;
}

export interface CategorySummary {
  id: ID;
  slug: string;
  name: string;
  icon?: string;
  image?: ImageRef;
  parentId: ID | null;
  level: number;
  productCount: number;
}

export interface CategoryNode extends CategorySummary {
  children: CategoryNode[];
}

export interface CategoryDetail extends CategorySummary {
  description?: string;
  breadcrumbs: Breadcrumb[];
  children: CategorySummary[];
  seoTitle?: string;
  seoDescription?: string;
}

export interface BrandSummary {
  id: ID;
  slug: string;
  name: string;
  logo?: ImageRef;
  productCount: number;
}

export interface BrandDetail extends BrandSummary {
  description?: string;
  country?: string;
  website?: string;
}

export interface StockInfo {
  status: StockStatus;
  /** units available to order (on hand − reserved) */
  available: number;
}

export interface ProductFlags {
  featured: boolean;
  isNew: boolean;
  bestseller: boolean;
  discounted: boolean;
}

export interface ProductPromotionBadge {
  id: ID;
  slug: string;
  name: string;
  type: PromotionType;
  endsAt: ISODate;
}

export interface ProductCard {
  id: ID;
  slug: string;
  sku: string;
  name: string;
  shortDescription?: string;
  brand: { id: ID; slug: string; name: string } | null;
  category: { id: ID; slug: string; name: string } | null;
  image?: ImageRef;
  /** first two images (hover swap on desktop) */
  images: ImageRef[];
  price: number;
  oldPrice?: number;
  discountPercent: number;
  currency: 'UZS';
  rating: number;
  reviewCount: number;
  stock: StockInfo;
  deliveryDays: { min: number; max: number };
  warrantyMonths: number;
  flags: ProductFlags;
  promotion?: ProductPromotionBadge;
  hasVariants: boolean;
}

export interface ProductSpec {
  key: string;
  label: string;
  /** display value, already localised and formatted */
  value: string;
  raw?: number | string | boolean;
  unit?: string;
  group: SpecGroup;
}

export interface ProductVariant {
  id: ID;
  sku: string;
  name: string;
  attributes: Record<string, string>;
  price: number;
  oldPrice?: number;
  discountPercent: number;
  stock: StockInfo;
  image?: ImageRef;
}

export interface ProductDetail extends ProductCard {
  description: string; // markdown
  images: ImageRef[];
  videos: string[];
  specs: ProductSpec[];
  tags: string[];
  variants: ProductVariant[];
  breadcrumbs: Breadcrumb[];
  ratingDistribution: Record<'1' | '2' | '3' | '4' | '5', number>;
  weightKg?: number;
  questionCount: number;
  seoTitle?: string;
  seoDescription?: string;
  updatedAt: ISODate;
}

export type SpecFilterValue = string[] | { min?: number; max?: number } | boolean;

export interface ProductListParams {
  q?: string;
  category?: string; // slug (includes all descendants)
  brand?: string[]; // slugs
  minPrice?: number;
  maxPrice?: number;
  rating?: number; // minimum average rating
  inStock?: boolean;
  discounted?: boolean;
  featured?: boolean;
  isNew?: boolean;
  bestseller?: boolean;
  promotion?: string; // promotion slug
  ids?: ID[];
  /** dynamic specification filters, keyed by spec key */
  specs?: Record<string, SpecFilterValue>;
  sort?: SortOption;
  page?: number;
  limit?: number;
}

export interface FacetOption {
  value: string;
  label: string;
  count: number;
}

export type SpecFacet =
  | { key: string; label: string; unit?: string; type: 'range'; min: number; max: number }
  | { key: string; label: string; unit?: string; type: 'options'; options: FacetOption[] }
  | { key: string; label: string; type: 'boolean'; count: number };

export interface ProductFacets {
  total: number;
  price: { min: number; max: number };
  brands: FacetOption[];
  categories: FacetOption[];
  ratings: Array<{ value: number; count: number }>;
  inStock: number;
  discounted: number;
  specs: SpecFacet[];
}

export interface SearchSuggestions {
  query: string;
  products: ProductCard[];
  categories: CategorySummary[];
  brands: BrandSummary[];
  suggestions: string[];
}

export interface PopularSearch {
  query: string;
  count: number;
}

/* ------------------------------------------------------------------ */
/* Reviews & questions                                                 */
/* ------------------------------------------------------------------ */

export interface ReviewDTO {
  id: ID;
  rating: number;
  title?: string;
  comment: string;
  pros?: string;
  cons?: string;
  images: ImageRef[];
  isVerifiedPurchase: boolean;
  author: { name: string; avatar?: string };
  reply?: { text: string; createdAt: ISODate };
  status?: ReviewStatus;
  product?: { id: ID; slug: string; name: string; image?: ImageRef };
  createdAt: ISODate;
}

export interface ReviewStats {
  average: number;
  count: number;
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
}

export interface ProductQuestionDTO {
  id: ID;
  question: string;
  author: { name: string };
  answer?: { text: string; author: string; createdAt: ISODate };
  createdAt: ISODate;
}

/* ------------------------------------------------------------------ */
/* Cart, wishlist, compare                                             */
/* ------------------------------------------------------------------ */

export type CartItemWarning = 'QUANTITY_REDUCED' | 'OUT_OF_STOCK' | 'PRICE_CHANGED' | 'UNAVAILABLE';

export interface CartItemDTO {
  /** line id (productId or productId:variantId) */
  id: string;
  productId: ID;
  variantId?: ID;
  slug: string;
  sku: string;
  name: string;
  variantName?: string;
  brandName?: string;
  image?: ImageRef;
  price: number;
  oldPrice?: number;
  quantity: number;
  maxQuantity: number;
  lineTotal: number;
  lineOldTotal: number;
  stock: StockInfo;
  isAvailable: boolean;
  warning?: CartItemWarning;
  deliveryDays: { min: number; max: number };
  warrantyMonths: number;
  addedAt: ISODate;
}

export interface CartCouponDTO {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  discount: number;
  description?: string;
}

export interface CartTotals {
  itemsCount: number;
  linesCount: number;
  subtotal: number;
  oldSubtotal: number;
  productDiscount: number;
  couponDiscount: number;
  total: number;
  freeDeliveryThreshold: number;
  amountToFreeDelivery: number;
}

export interface CartDTO {
  id: ID;
  items: CartItemDTO[];
  coupon?: CartCouponDTO;
  /** error code when a previously applied coupon is no longer valid */
  couponError?: string;
  totals: CartTotals;
  estimatedDelivery?: { minDays: number; maxDays: number };
  updatedAt: ISODate;
}

export interface WishlistItemDTO {
  productId: ID;
  addedAt: ISODate;
  priceAtAdd: number;
  /** current price − price when added (negative = cheaper now) */
  priceChange: number;
  product: ProductCard;
}

export interface WishlistDTO {
  count: number;
  items: WishlistItemDTO[];
}

export interface CompareRow {
  key: string;
  label: string;
  unit?: string;
  group: SpecGroup | 'overview';
  values: Array<string | null>;
  isDifferent: boolean;
}

export interface CompareGroup {
  category: { id: ID; slug: string; name: string };
  products: ProductCard[];
  rows: CompareRow[];
}

export interface CompareDTO {
  count: number;
  productIds: ID[];
  groups: CompareGroup[];
}

/** lightweight ids used for badges / toggles without loading the full lists */
export interface EngagementState {
  cartCount: number;
  wishlistIds: ID[];
  compareIds: ID[];
  unreadNotifications: number;
}

/* ------------------------------------------------------------------ */
/* Account                                                             */
/* ------------------------------------------------------------------ */

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  promotions: boolean;
  priceDrops: boolean;
  backInStock: boolean;
}

export interface UserPreferences {
  language: Language;
  theme: ThemePreference;
  notifications: NotificationPreferences;
}

export interface UserDTO {
  id: ID;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone: string;
  avatar?: ImageRef;
  role: RoleKey;
  isStaff: boolean;
  /** effective permissions (staff only, empty for customers) */
  permissions: string[];
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  preferences: UserPreferences;
  stats: { ordersCount: number; reviewsCount: number };
  createdAt: ISODate;
}

export interface AuthResult {
  user: UserDTO;
  accessToken: string;
  /** seconds */
  expiresIn: number;
  /** only returned to native clients (X-Client: mobile); web/admin receive an httpOnly cookie */
  refreshToken?: string;
}

export interface AddressDTO {
  id: ID;
  label?: string;
  firstName: string;
  lastName: string;
  phone: string;
  region: string;
  regionName: string;
  city: string;
  district?: string;
  street: string;
  house: string;
  apartment?: string;
  comment?: string;
  location?: { lat: number; lng: number };
  isDefault: boolean;
}

export interface NotificationDTO {
  id: ID;
  type: NotificationType;
  title: string;
  body: string;
  data?: { orderId?: ID; orderNumber?: string; productId?: ID; productSlug?: string; url?: string };
  image?: string;
  readAt: ISODate | null;
  createdAt: ISODate;
}

/* ------------------------------------------------------------------ */
/* Delivery, payment, checkout, orders                                 */
/* ------------------------------------------------------------------ */

export interface PickupPointDTO {
  id: ID;
  code: string;
  name: string;
  address: string;
  region: string;
  city: string;
  phone: string;
  workingHours: string;
  location: { lat: number; lng: number };
}

export interface CourierOption {
  zoneId: ID;
  zoneName: string;
  price: number;
  /** price before applying the free-delivery threshold */
  basePrice: number;
  freeThreshold: number;
  isFree: boolean;
  minDays: number;
  maxDays: number;
  estimatedFrom: ISODate;
  estimatedTo: ISODate;
}

export interface DeliveryOptionsDTO {
  region?: string;
  courier: CourierOption | null;
  pickupPoints: PickupPointDTO[];
}

export interface InstallmentPlan {
  months: number;
  markupPercent: number;
}

export interface PaymentMethodDTO {
  code: PaymentMethod;
  provider: PaymentProviderCode;
  name: string;
  description: string;
  online: boolean;
  available: boolean;
  /** reason code when not available (e.g. MIN_AMOUNT) */
  unavailableReason?: string;
  installmentPlans?: InstallmentPlan[];
  minAmount?: number;
}

export interface CheckoutQuote {
  items: CartItemDTO[];
  subtotal: number;
  oldSubtotal: number;
  productDiscount: number;
  couponDiscount: number;
  coupon?: CartCouponDTO;
  deliveryFee: number;
  total: number;
  installment?: { months: number; markupPercent: number; monthlyPayment: number; total: number };
  delivery?: { method: DeliveryMethod; minDays: number; maxDays: number };
}

export type PaymentAction =
  | { type: 'none' }
  | { type: 'redirect'; url: string }
  | { type: 'instructions'; message: string };

export interface AddressSnapshot {
  firstName: string;
  lastName: string;
  phone: string;
  region: string;
  regionName: string;
  city: string;
  district?: string;
  street: string;
  house: string;
  apartment?: string;
  comment?: string;
}

export interface OrderItemDTO {
  id: ID;
  productId: ID;
  variantId?: ID;
  slug: string;
  sku: string;
  name: string;
  variantName?: string;
  image?: ImageRef;
  price: number;
  oldPrice?: number;
  quantity: number;
  total: number;
  warrantyMonths: number;
  reviewed: boolean;
}

export interface OrderStatusEvent {
  status: OrderStatus;
  at: ISODate;
  note?: string;
}

export interface OrderSummary {
  id: ID;
  number: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  deliveryMethod: DeliveryMethod;
  total: number;
  itemsCount: number;
  preview: Array<{ name: string; image?: ImageRef }>;
  createdAt: ISODate;
}

export interface OrderDetail extends OrderSummary {
  items: OrderItemDTO[];
  customer: { firstName: string; lastName: string; phone: string; email?: string };
  delivery: {
    method: DeliveryMethod;
    address?: AddressSnapshot;
    pickupPoint?: PickupPointDTO;
    zoneName?: string;
    fee: number;
    minDays: number;
    maxDays: number;
    estimatedFrom?: ISODate;
    estimatedTo?: ISODate;
    carrier?: string;
    trackingNumber?: string;
  };
  payment: {
    method: PaymentMethod;
    provider: PaymentProviderCode;
    status: PaymentStatus;
    paidAt?: ISODate;
    /** available while an online payment is pending */
    action?: PaymentAction;
    installment?: {
      months: number;
      markupPercent: number;
      monthlyPayment: number;
      total: number;
      status: InstallmentStatus;
    };
  };
  subtotal: number;
  oldSubtotal: number;
  productDiscount: number;
  couponDiscount: number;
  coupon?: { code: string };
  deliveryFee: number;
  comment?: string;
  statusHistory: OrderStatusEvent[];
  canCancel: boolean;
  cancelReason?: string;
  source: OrderSource;
  updatedAt: ISODate;
}

export interface CreateOrderResult {
  order: OrderDetail;
  payment: { method: PaymentMethod; status: PaymentStatus; action: PaymentAction };
}

/* ------------------------------------------------------------------ */
/* Marketing & content                                                 */
/* ------------------------------------------------------------------ */

export interface BannerDTO {
  id: ID;
  placement: BannerPlacement;
  title: string;
  subtitle?: string;
  buttonText?: string;
  buttonUrl?: string;
  imageDesktop?: ImageRef;
  imageMobile?: ImageRef;
  textTheme: 'dark' | 'light';
}

export interface PromotionDTO {
  id: ID;
  slug: string;
  name: string;
  description?: string;
  type: PromotionType;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  startsAt: ISODate;
  endsAt: ISODate;
  image?: ImageRef;
  productCount: number;
  isActive: boolean;
}

export interface PageDTO {
  slug: string;
  title: string;
  content: string; // markdown
  seoTitle?: string;
  seoDescription?: string;
  updatedAt: ISODate;
}

export interface FaqDTO {
  id: ID;
  category: FaqCategory;
  question: string;
  answer: string;
}

export interface StoreAdvantage {
  icon: string;
  title: string;
  text: string;
}

export interface PublicSettings {
  store: {
    name: string;
    legalName?: string;
    phone: string;
    phoneSecondary?: string;
    email: string;
    supportEmail?: string;
    address: string;
    workingHours: string;
    map?: { lat: number; lng: number; zoom?: number };
    footerAbout?: string;
  };
  social: {
    telegram?: string;
    telegramBot?: string;
    instagram?: string;
    facebook?: string;
    youtube?: string;
    tiktok?: string;
  };
  currency: 'UZS';
  installment: { enabled: boolean; minAmount: number; plans: InstallmentPlan[] };
  delivery: { freeThreshold: number };
  paymentMethods: PaymentMethod[];
  advantages: StoreAdvantage[];
  trustBullets: string[];
  seo: { title: string; description: string };
  languages: Language[];
  defaultLanguage: Language;
}

export interface HomeReview {
  id: ID;
  rating: number;
  comment: string;
  author: { name: string };
  product: { id: ID; slug: string; name: string; image?: ImageRef };
  createdAt: ISODate;
}

export interface HomeDTO {
  hero: BannerDTO[];
  secondary: BannerDTO[];
  middle: BannerDTO[];
  categories: CategorySummary[];
  featured: ProductCard[];
  newArrivals: ProductCard[];
  bestsellers: ProductCard[];
  discounted: ProductCard[];
  recommended: ProductCard[];
  brands: BrandSummary[];
  promotions: PromotionDTO[];
  reviews: HomeReview[];
  faq: FaqDTO[];
}

export interface ContactMessageInput {
  type: ContactMessageType;
  name: string;
  phone: string;
  email?: string;
  subject?: string;
  message?: string;
  productId?: ID;
}

export interface TranslationsDTO {
  language: Language;
  /** namespace → flat key → value (DB overrides of bundled translations) */
  resources: Record<string, Record<string, string>>;
  updatedAt?: ISODate;
}

/* ------------------------------------------------------------------ */
/* SEO (consumed by the storefront server to render <head> per URL)     */
/* ------------------------------------------------------------------ */

export interface SeoMetaDTO {
  /** 404 when the URL points to a missing / unpublished entity */
  status: 200 | 404;
  lang: Language;
  title: string;
  description: string;
  /** absolute canonical URL */
  canonical: string;
  alternates: Array<{ hreflang: string; href: string }>;
  /** absolute image URL for Open Graph / Twitter cards */
  image?: string;
  type: 'website' | 'product' | 'article';
  noindex: boolean;
  siteName: string;
  /** og:locale, e.g. uz_UZ */
  locale: string;
  /** JSON-LD objects (Organization, WebSite, Product, BreadcrumbList, FAQPage …) */
  jsonLd: Array<Record<string, unknown>>;
}
