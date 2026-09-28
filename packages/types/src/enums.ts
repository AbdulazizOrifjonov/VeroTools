/**
 * Domain enumerations shared by API, web, admin and mobile.
 * Defined as `as const` arrays so they exist at runtime (validation, selects) and as types.
 */

export const ROLE_KEYS = ['CUSTOMER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'] as const;
export type SystemRoleKey = (typeof ROLE_KEYS)[number];
/** Custom roles created in the admin panel are allowed, hence `string`. */
export type RoleKey = SystemRoleKey | (string & {});
export const STAFF_ROLE_KEYS: readonly SystemRoleKey[] = ['MANAGER', 'ADMIN', 'SUPER_ADMIN'];

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Allowed order status transitions (single source of truth for API validation and admin UI). */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'DELIVERED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: [],
};

/** Statuses from which the customer may cancel an order on their own. */
export const CUSTOMER_CANCELLABLE_STATUSES: readonly OrderStatus[] = ['PENDING', 'CONFIRMED'];

/** Timeline shown to customers (terminal branches CANCELLED / RETURNED are rendered separately). */
export const ORDER_TIMELINE: readonly OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
];

/** Orders counted as revenue in analytics (accepted and not cancelled/returned). */
export const REVENUE_ORDER_STATUSES: readonly OrderStatus[] = [
  'CONFIRMED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
];

export const PAYMENT_STATUSES = [
  'PENDING',
  'PAID',
  'FAILED',
  'CANCELLED',
  'REFUND_PENDING',
  'REFUNDED',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = [
  'cash',
  'card_on_delivery',
  'click',
  'payme',
  'uzcard',
  'humo',
  'bank_card',
  'installment',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_PROVIDERS = ['cash', 'click', 'payme', 'installment'] as const;
export type PaymentProviderCode = (typeof PAYMENT_PROVIDERS)[number];

export const REFUND_STATUSES = ['NONE', 'PENDING', 'REFUNDED', 'REJECTED'] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const INSTALLMENT_STATUSES = ['NONE', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'] as const;
export type InstallmentStatus = (typeof INSTALLMENT_STATUSES)[number];

export const DELIVERY_METHODS = ['courier', 'pickup'] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export const STOCK_STATUSES = ['in_stock', 'low_stock', 'out_of_stock'] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];

export const PRODUCT_STATUSES = ['draft', 'published', 'archived'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const REVIEW_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const QUESTION_STATUSES = ['PENDING', 'PUBLISHED', 'REJECTED'] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  'ORDER_CREATED',
  'ORDER_CONFIRMED',
  'ORDER_PROCESSING',
  'ORDER_PACKED',
  'ORDER_SHIPPED',
  'ORDER_DELIVERED',
  'ORDER_CANCELLED',
  'ORDER_RETURNED',
  'PAYMENT_RECEIVED',
  'PAYMENT_FAILED',
  'PROMOTION',
  'DISCOUNT',
  'PRICE_DROP',
  'BACK_IN_STOCK',
  'REVIEW_APPROVED',
  'REVIEW_REPLY',
  'QUESTION_ANSWERED',
  'SYSTEM',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_CHANNELS = ['in_app', 'email', 'push', 'telegram', 'sms'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const INVENTORY_MOVEMENT_TYPES = [
  'IN',
  'OUT',
  'RESERVE',
  'RELEASE',
  'ADJUSTMENT',
  'RETURN',
  'INCOMING',
] as const;
export type InventoryMovementType = (typeof INVENTORY_MOVEMENT_TYPES)[number];

export const EXPENSE_CATEGORY_CODES = [
  'RENT',
  'SALARY',
  'DELIVERY',
  'MARKETING',
  'ADVERTISING',
  'UTILITIES',
  'WAREHOUSE',
  'PACKAGING',
  'EQUIPMENT',
  'MAINTENANCE',
  'TAXES',
  'OTHER',
] as const;
export type ExpenseCategoryCode = (typeof EXPENSE_CATEGORY_CODES)[number];

export const EXPENSE_STATUSES = ['PAID', 'PENDING', 'CANCELLED'] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const EXPENSE_PAYMENT_METHODS = ['cash', 'card', 'bank_transfer', 'click', 'payme', 'other'] as const;
export type ExpensePaymentMethod = (typeof EXPENSE_PAYMENT_METHODS)[number];

export const CURRENCIES = ['UZS', 'USD'] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export const COUPON_TYPES = ['percent', 'fixed'] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export const COUPON_SCOPES = ['all', 'products', 'categories', 'brands'] as const;
export type CouponScope = (typeof COUPON_SCOPES)[number];

export const PROMOTION_TYPES = ['FLASH_SALE', 'SEASONAL', 'CATEGORY', 'BRAND', 'PRODUCT', 'CAMPAIGN'] as const;
export type PromotionType = (typeof PROMOTION_TYPES)[number];

export const BANNER_PLACEMENTS = ['home_hero', 'home_secondary', 'home_middle', 'catalog_top'] as const;
export type BannerPlacement = (typeof BANNER_PLACEMENTS)[number];

export const MEDIA_FOLDERS = [
  'products',
  'categories',
  'brands',
  'banners',
  'promotions',
  'reviews',
  'avatars',
  'expenses',
  'pages',
  'general',
] as const;
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

export const MEDIA_PROVIDERS = ['local', 's3', 'cloudinary'] as const;
export type MediaProvider = (typeof MEDIA_PROVIDERS)[number];

export const SORT_OPTIONS = [
  'recommended',
  'newest',
  'popular',
  'price_asc',
  'price_desc',
  'rating',
  'discount',
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const SPEC_TYPES = ['number', 'text', 'boolean'] as const;
export type SpecType = (typeof SPEC_TYPES)[number];

export const SPEC_GROUPS = ['main', 'power', 'performance', 'dimensions', 'equipment', 'general'] as const;
export type SpecGroup = (typeof SPEC_GROUPS)[number];

export const USER_STATUSES = ['active', 'blocked'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const ORDER_SOURCES = ['web', 'mobile', 'admin'] as const;
export type OrderSource = (typeof ORDER_SOURCES)[number];

export const CONTACT_MESSAGE_TYPES = ['contact', 'callback', 'wholesale'] as const;
export type ContactMessageType = (typeof CONTACT_MESSAGE_TYPES)[number];

export const CONTACT_MESSAGE_STATUSES = ['NEW', 'IN_PROGRESS', 'DONE'] as const;
export type ContactMessageStatus = (typeof CONTACT_MESSAGE_STATUSES)[number];

export const FAQ_CATEGORIES = ['orders', 'delivery', 'payment', 'warranty', 'account', 'general'] as const;
export type FaqCategory = (typeof FAQ_CATEGORIES)[number];

export const PAGE_SLUGS = [
  'about',
  'delivery',
  'warranty',
  'returns',
  'privacy',
  'terms',
  'payment',
  'contacts',
] as const;
export type PageSlug = (typeof PAGE_SLUGS)[number];

export const REPORT_TYPES = ['sales', 'orders', 'expenses', 'profit', 'inventory', 'customers', 'products'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const EXPORT_FORMATS = ['csv', 'xlsx', 'pdf'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const GRANULARITIES = ['day', 'week', 'month'] as const;
export type Granularity = (typeof GRANULARITIES)[number];

export const DATE_PRESETS = [
  'today',
  'yesterday',
  'last7',
  'last30',
  'thisMonth',
  'lastMonth',
  'thisYear',
  'custom',
] as const;
export type DatePreset = (typeof DATE_PRESETS)[number];
