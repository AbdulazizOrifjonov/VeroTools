/**
 * Admin API DTOs. Multilingual fields are returned as full LocalizedText objects so they can be edited.
 */
import type { Language, LocalizedText } from '@vero/config';
import type { ID, ISODate, ImageRef, PageMeta, AddressSnapshot, PickupPointDTO, OrderStatusEvent } from './dto';
import type {
  BannerPlacement,
  ContactMessageStatus,
  ContactMessageType,
  CouponScope,
  CouponType,
  CurrencyCode,
  DeliveryMethod,
  ExpenseCategoryCode,
  ExpensePaymentMethod,
  ExpenseStatus,
  FaqCategory,
  Granularity,
  InstallmentStatus,
  InventoryMovementType,
  MediaFolder,
  MediaProvider,
  NotificationType,
  OrderSource,
  OrderStatus,
  PaymentMethod,
  PaymentProviderCode,
  PaymentStatus,
  ProductStatus,
  PromotionType,
  QuestionStatus,
  RefundStatus,
  ReportType,
  ReviewStatus,
  RoleKey,
  SpecGroup,
  SpecType,
  StockStatus,
  UserStatus,
} from './enums';

export interface AdminListParams {
  page?: number;
  limit?: number;
  q?: string;
  sort?: string; // "field" or "-field"
  [key: string]: string | number | boolean | undefined | string[];
}

export interface AdminList<T> {
  items: T[];
  meta: PageMeta;
}

/* ------------------------------ Media ------------------------------ */

export interface AdminMedia {
  id: ID;
  provider: MediaProvider;
  folder: MediaFolder;
  url: string;
  thumbUrl?: string;
  mediumUrl?: string;
  filename: string;
  originalName: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
  alt: LocalizedText;
  tags: string[];
  usageCount: number;
  uploadedBy?: { id: ID; name: string };
  createdAt: ISODate;
  updatedAt: ISODate;
}

/** image attached to an entity: media id + denormalised urls */
export interface AdminImage {
  media: ID;
  url: string;
  thumb?: string;
  medium?: string;
  alt?: LocalizedText;
}

/* ----------------------------- Catalog ----------------------------- */

export interface AdminCategory {
  id: ID;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  parent: ID | null;
  ancestors: ID[];
  level: number;
  order: number;
  icon?: string;
  image?: AdminImage;
  isActive: boolean;
  specKeys: string[];
  seoTitle: LocalizedText;
  seoDescription: LocalizedText;
  productCount: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface AdminCategoryNode extends AdminCategory {
  children: AdminCategoryNode[];
}

export interface AdminBrand {
  id: ID;
  slug: string;
  name: string;
  description: LocalizedText;
  country: LocalizedText;
  website?: string;
  logo?: AdminImage;
  isActive: boolean;
  productCount: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface AdminSpecDefinition {
  id: ID;
  key: string;
  label: LocalizedText;
  unit?: string;
  type: SpecType;
  filterable: boolean;
  group: SpecGroup;
  order: number;
  categories: ID[];
}

export type AdminSpecValue = number | string | boolean | LocalizedText;

export interface AdminProductStock {
  onHand: number;
  reserved: number;
  available: number;
  minStock: number;
  incoming: number;
  status: StockStatus;
}

export interface AdminVariant {
  id: ID;
  sku: string;
  name: LocalizedText;
  attributes: Record<string, string>;
  price: number;
  oldPrice?: number;
  costPrice: number;
  image?: AdminImage;
  isActive: boolean;
  stock: AdminProductStock;
}

export interface AdminProduct {
  id: ID;
  sku: string;
  slug: string;
  name: LocalizedText;
  shortDescription: LocalizedText;
  description: LocalizedText;
  brand: { id: ID; name: string } | null;
  category: { id: ID; name: LocalizedText; path: string } | null;
  /** effective price after promotions */
  price: number;
  /** price set by the admin */
  regularPrice: number;
  oldPrice?: number;
  regularOldPrice?: number;
  costPrice: number;
  discountPercent: number;
  stock: AdminProductStock;
  images: AdminImage[];
  videos: string[];
  specs: Array<{ key: string; value: AdminSpecValue }>;
  tags: string[];
  warrantyMonths: number;
  deliveryDays: { min: number; max: number };
  weightKg?: number;
  seo: { title: LocalizedText; description: LocalizedText };
  flags: { featured: boolean; isNew: boolean; bestseller: boolean; discounted: boolean };
  status: ProductStatus;
  variants: AdminVariant[];
  promotion?: { id: ID; name: LocalizedText; endsAt: ISODate };
  rating: number;
  reviewCount: number;
  soldCount: number;
  viewCount: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface AdminProductListItem {
  id: ID;
  sku: string;
  slug: string;
  name: LocalizedText;
  image?: AdminImage;
  brand?: string;
  category?: string;
  price: number;
  oldPrice?: number;
  costPrice: number;
  stock: AdminProductStock;
  status: ProductStatus;
  flags: AdminProduct['flags'];
  hasVariants: boolean;
  soldCount: number;
  rating: number;
  updatedAt: ISODate;
}

/* ----------------------------- Orders ------------------------------ */

export interface AdminOrderItem {
  id: ID;
  product: ID;
  variant?: ID;
  sku: string;
  name: LocalizedText;
  variantName?: LocalizedText;
  image?: ImageRef;
  price: number;
  oldPrice?: number;
  costPrice: number;
  quantity: number;
  couponDiscount: number;
  total: number;
}

export interface AdminOrderSummary {
  id: ID;
  number: string;
  customer: { id: ID; name: string; phone: string };
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  deliveryMethod: DeliveryMethod;
  region?: string;
  itemsCount: number;
  total: number;
  source: OrderSource;
  createdAt: ISODate;
}

export interface AdminOrder extends AdminOrderSummary {
  items: AdminOrderItem[];
  customerInfo: { firstName: string; lastName: string; phone: string; email?: string };
  delivery: {
    method: DeliveryMethod;
    address?: AddressSnapshot;
    pickupPoint?: PickupPointDTO;
    zone?: { id: ID; name: LocalizedText };
    fee: number;
    minDays: number;
    maxDays: number;
    carrier?: string;
    trackingNumber?: string;
  };
  payment: {
    id?: ID;
    method: PaymentMethod;
    provider: PaymentProviderCode;
    status: PaymentStatus;
    transactionId?: string;
    paidAt?: ISODate;
    installment?: { months: number; markupPercent: number; monthlyPayment: number; total: number; status: InstallmentStatus };
  };
  subtotal: number;
  oldSubtotal: number;
  productDiscount: number;
  couponDiscount: number;
  coupon?: { code: string };
  deliveryFee: number;
  costTotal: number;
  estimatedProfit: number;
  comment?: string;
  adminNotes: Array<{ text: string; by: string; at: ISODate }>;
  statusHistory: Array<OrderStatusEvent & { by?: string }>;
  allowedTransitions: OrderStatus[];
  cancelReason?: string;
  inventoryDeducted: boolean;
  updatedAt: ISODate;
}

/* ----------------------------- People ------------------------------ */

export interface AdminCustomer {
  id: ID;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  avatar?: ImageRef;
  status: UserStatus;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  language: Language;
  ordersCount: number;
  totalSpent: number;
  lastOrderAt?: ISODate;
  lastLoginAt?: ISODate;
  createdAt: ISODate;
}

export interface AdminCustomerDetail extends AdminCustomer {
  addresses: Array<AddressSnapshot & { id: ID; label?: string; isDefault: boolean }>;
  recentOrders: AdminOrderSummary[];
  reviewsCount: number;
  wishlistCount: number;
  cartItemsCount: number;
}

export interface AdminUser {
  id: ID;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  avatar?: ImageRef;
  role: { id: ID; key: RoleKey; name: string };
  permissions: string[];
  effectivePermissions: string[];
  status: UserStatus;
  lastLoginAt?: ISODate;
  createdAt: ISODate;
}

export interface AdminRole {
  id: ID;
  key: RoleKey;
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  usersCount: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface AdminPermission {
  key: string;
  group: string;
  description: LocalizedText;
}

/* ------------------------ Reviews & questions ---------------------- */

export interface AdminReview {
  id: ID;
  product: { id: ID; name: LocalizedText; slug: string; image?: ImageRef };
  user: { id: ID; name: string; phone?: string };
  rating: number;
  title?: string;
  comment: string;
  pros?: string;
  cons?: string;
  images: ImageRef[];
  isVerifiedPurchase: boolean;
  status: ReviewStatus;
  reply?: { text: string; by: string; createdAt: ISODate };
  moderatedBy?: string;
  moderatedAt?: ISODate;
  createdAt: ISODate;
}

export interface AdminQuestion {
  id: ID;
  product: { id: ID; name: LocalizedText; slug: string };
  user: { id: ID; name: string };
  question: string;
  answer?: { text: string; by: string; createdAt: ISODate };
  status: QuestionStatus;
  createdAt: ISODate;
}

/* ----------------------------- Inventory --------------------------- */

export interface AdminInventoryItem {
  id: ID;
  product: { id: ID; name: LocalizedText; slug: string; image?: ImageRef; status: ProductStatus };
  variant?: { id: ID; name: LocalizedText };
  sku: string;
  stock: number;
  reserved: number;
  available: number;
  minStock: number;
  incoming: number;
  status: StockStatus;
  costPrice: number;
  stockValue: number;
  updatedAt: ISODate;
}

export interface AdminInventoryMovement {
  id: ID;
  inventory: ID;
  product: { id: ID; name: LocalizedText };
  variant?: { id: ID; name: LocalizedText };
  sku: string;
  type: InventoryMovementType;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  reservedBefore: number;
  reservedAfter: number;
  reason?: string;
  reference?: { type: 'order' | 'manual' | 'import' | 'seed' | 'return'; id?: string; label?: string };
  user?: { id: ID; name: string };
  createdAt: ISODate;
}

/* ------------------------------ Marketing -------------------------- */

export interface AdminCoupon {
  id: ID;
  code: string;
  description: LocalizedText;
  type: CouponType;
  value: number;
  maxDiscount?: number;
  scope: CouponScope;
  products: ID[];
  categories: ID[];
  brands: ID[];
  minOrderAmount: number;
  firstOrderOnly: boolean;
  startsAt?: ISODate;
  expiresAt?: ISODate;
  usageLimit?: number;
  perUserLimit?: number;
  usedCount: number;
  isActive: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface AdminPromotion {
  id: ID;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  type: PromotionType;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  products: ID[];
  categories: ID[];
  brands: ID[];
  startsAt: ISODate;
  endsAt: ISODate;
  priority: number;
  isActive: boolean;
  showOnHome: boolean;
  image?: AdminImage;
  productCount: number;
  state: 'scheduled' | 'active' | 'ended' | 'inactive';
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface AdminBanner {
  id: ID;
  placement: BannerPlacement;
  title: LocalizedText;
  subtitle: LocalizedText;
  buttonText: LocalizedText;
  buttonUrl?: string;
  imageDesktop?: AdminImage;
  imageMobile?: AdminImage;
  textTheme: 'dark' | 'light';
  startsAt?: ISODate;
  endsAt?: ISODate;
  priority: number;
  isActive: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/* ------------------------------ Delivery --------------------------- */

export interface AdminDeliveryZone {
  id: ID;
  code: string;
  name: LocalizedText;
  regions: string[];
  price: number;
  freeThreshold: number;
  minDays: number;
  maxDays: number;
  priority: number;
  isActive: boolean;
}

export interface AdminPickupPoint {
  id: ID;
  code: string;
  name: LocalizedText;
  address: LocalizedText;
  region: string;
  city: string;
  phone: string;
  workingHours: LocalizedText;
  location: { lat: number; lng: number };
  isActive: boolean;
}

/* ------------------------------ Payments --------------------------- */

export interface AdminPayment {
  id: ID;
  order: { id: ID; number: string; status: OrderStatus };
  customer: { id: ID; name: string; phone: string };
  method: PaymentMethod;
  provider: PaymentProviderCode;
  amount: number;
  currency: 'UZS';
  status: PaymentStatus;
  transactionId?: string;
  refundStatus: RefundStatus;
  refundAmount?: number;
  paidAt?: ISODate;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface AdminPaymentProviderStatus {
  provider: PaymentProviderCode;
  methods: PaymentMethod[];
  configured: boolean;
  enabled: boolean;
  testMode?: boolean;
  webhookUrl?: string;
}

/* ------------------------------ Expenses --------------------------- */

export interface AdminExpenseCategory {
  id: ID;
  code: ExpenseCategoryCode | string;
  name: LocalizedText;
  color: string;
  isActive: boolean;
  isSystem: boolean;
}

export interface AdminExpense {
  id: ID;
  title: string;
  category: { id: ID; code: string; name: LocalizedText; color: string };
  description?: string;
  amount: number;
  currency: CurrencyCode;
  exchangeRate: number;
  amountUzs: number;
  date: ISODate;
  paymentMethod: ExpensePaymentMethod;
  responsible?: string;
  attachments: Array<{ media: ID; url: string; name: string; mime: string }>;
  status: ExpenseStatus;
  notes?: string;
  createdBy?: { id: ID; name: string };
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface AdminExpenseSummary {
  total: number;
  count: number;
  byCategory: Array<{ code: string; name: LocalizedText; color: string; amount: number; count: number }>;
}

/* ------------------------------ Analytics -------------------------- */

export interface PeriodKpi {
  revenue: number;
  orders: number;
  expenses: number;
  profit: number;
  averageOrderValue: number;
  customers: number;
}

export interface SeriesPoint {
  /** YYYY-MM-DD (day/week start) or YYYY-MM (month) */
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
  orders: number;
  customers: number;
}

export interface TopProductRow {
  productId: ID;
  name: LocalizedText;
  sku: string;
  image?: ImageRef;
  quantity: number;
  revenue: number;
}

export interface TopGroupRow {
  id: ID;
  name: LocalizedText | string;
  quantity: number;
  revenue: number;
}

export interface DashboardDTO {
  generatedAt: ISODate;
  timezone: string;
  /**
   * false when the viewer lacks `analytics.read` / `expenses.read`: expense and profit figures are then
   * withheld (sent as 0) and the admin UI must hide those cards instead of showing zeros.
   */
  financeVisible: boolean;
  kpis: {
    today: PeriodKpi;
    yesterday: PeriodKpi;
    month: PeriodKpi;
    previousMonth: PeriodKpi;
    year: PeriodKpi;
  };
  counts: {
    customers: number;
    newCustomersMonth: number;
    products: number;
    publishedProducts: number;
    lowStock: number;
    outOfStock: number;
    pendingOrders: number;
    processingOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    pendingReviews: number;
    newMessages: number;
  };
  daily: SeriesPoint[];
  monthly: SeriesPoint[];
  bestSellers: TopProductRow[];
  topCategories: TopGroupRow[];
  topBrands: TopGroupRow[];
  recentOrders: AdminOrderSummary[];
  recentCustomers: AdminCustomer[];
  lowStockItems: AdminInventoryItem[];
}

export interface ProfitBreakdown {
  grossSales: number;
  productCost: number;
  discounts: number;
  deliveryIncome: number;
  deliveryExpenses: number;
  operationalExpenses: number;
  estimatedProfit: number;
  margin: number;
}

export interface AnalyticsDTO {
  range: { from: ISODate; to: ISODate; granularity: Granularity; timezone: string };
  totals: PeriodKpi & {
    grossSales: number;
    discounts: number;
    netSales: number;
    itemsSold: number;
    cancelledOrders: number;
    returnedOrders: number;
    newCustomers: number;
  };
  previous: PeriodKpi;
  profit: ProfitBreakdown;
  series: SeriesPoint[];
  expensesByCategory: Array<{ code: string; name: LocalizedText; color: string; amount: number }>;
  salesByPaymentMethod: Array<{ method: PaymentMethod; orders: number; amount: number }>;
  salesByRegion: Array<{ region: string; name: string; orders: number; amount: number }>;
  ordersByStatus: Array<{ status: OrderStatus; count: number }>;
  topProducts: TopProductRow[];
  topCategories: TopGroupRow[];
  topBrands: TopGroupRow[];
}

/** `date` = calendar date, `datetime` = date + time (both ISO strings, shown in Asia/Tashkent). */
export type ReportColumnType = 'text' | 'number' | 'money' | 'date' | 'datetime' | 'percent';

export interface ReportDTO {
  type: ReportType;
  title: string;
  range: { from: ISODate; to: ISODate };
  columns: Array<{ key: string; label: string; type: ReportColumnType }>;
  rows: Array<Record<string, string | number | null>>;
  summary: Array<{ label: string; value: number | string; type: ReportColumnType }>;
  generatedAt: ISODate;
}

/* ------------------------------ Content ---------------------------- */

export interface AdminPage {
  id: ID;
  slug: string;
  title: LocalizedText;
  content: LocalizedText;
  seoTitle: LocalizedText;
  seoDescription: LocalizedText;
  isPublished: boolean;
  updatedAt: ISODate;
}

export interface AdminFaq {
  id: ID;
  category: FaqCategory;
  question: LocalizedText;
  answer: LocalizedText;
  order: number;
  isActive: boolean;
}

export interface AdminContactMessage {
  id: ID;
  type: ContactMessageType;
  name: string;
  phone: string;
  email?: string;
  subject?: string;
  message?: string;
  product?: { id: ID; name: LocalizedText };
  status: ContactMessageStatus;
  handledBy?: string;
  createdAt: ISODate;
}

export interface AdminTranslationRow {
  namespace: string;
  key: string;
  /** bundled default values */
  defaults: Record<Language, string>;
  /** DB overrides (only present when edited) */
  overrides: Partial<Record<Language, string>>;
  updatedAt?: ISODate;
}

export interface AdminSetting {
  key: string;
  value: unknown;
  group: string;
  isPublic: boolean;
  updatedAt?: ISODate;
}

export interface AdminAuditLog {
  id: ID;
  user?: { id: ID; name: string; role?: string };
  action: string;
  target?: { type: string; id?: string; label?: string };
  changes?: Record<string, { from: unknown; to: unknown }>;
  meta?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: ISODate;
}

export interface AdminNotificationBroadcastInput {
  type: Extract<NotificationType, 'PROMOTION' | 'DISCOUNT' | 'SYSTEM'>;
  title: LocalizedText;
  body: LocalizedText;
  url?: string;
  channels: Array<'in_app' | 'push' | 'email'>;
  audience: 'all' | 'active' | 'with_orders';
}

export interface AdminNotificationLog {
  id: ID;
  type: NotificationType;
  title: LocalizedText;
  body: LocalizedText;
  audience: string;
  channels: string[];
  recipients: number;
  sentBy?: string;
  createdAt: ISODate;
}
