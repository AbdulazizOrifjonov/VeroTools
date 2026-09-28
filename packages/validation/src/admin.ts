import { z } from 'zod';
import {
  BANNER_PLACEMENTS,
  CONTACT_MESSAGE_STATUSES,
  COUPON_SCOPES,
  COUPON_TYPES,
  CURRENCIES,
  DATE_PRESETS,
  EXPENSE_PAYMENT_METHODS,
  EXPENSE_STATUSES,
  EXPORT_FORMATS,
  FAQ_CATEGORIES,
  GRANULARITIES,
  MEDIA_FOLDERS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PRODUCT_STATUSES,
  PROMOTION_TYPES,
  QUESTION_STATUSES,
  REFUND_STATUSES,
  INSTALLMENT_STATUSES,
  REPORT_TYPES,
  REVIEW_STATUSES,
  SPEC_GROUPS,
  SPEC_TYPES,
  USER_STATUSES,
} from '@vero/types';
import { LIMITS, UZ_REGION_CODES } from '@vero/config';
import { normalizeUzPhone } from '@vero/utils';
import {
  V,
  hexColor,
  intRange,
  localized,
  money,
  objectId,
  optionalEmail,
  optionalIsoDate,
  optionalMoney,
  optionalObjectId,
  optionalSlug,
  optionalText,
  password,
  personName,
  phone,
  regionCode,
  text,
  urlOrPath,
} from './common';

const imageRef = z.object({ media: objectId });

const specValue = z.union([
  z.number(),
  z.boolean(),
  z.string().trim().max(300),
  z.object({ uz: z.string().max(300), ru: z.string().max(300), en: z.string().max(300) }),
]);

export const variantInputSchema = z
  .object({
    id: optionalObjectId,
    sku: z.string().trim().toUpperCase().min(2, V.sku).max(60, V.sku).regex(/^[A-Z0-9][A-Z0-9_\-/.]*$/, V.sku),
    name: localized({ required: 'default', max: 120 }),
    attributes: z.record(z.string().max(40), z.string().max(80)).default({}),
    price: money,
    oldPrice: optionalMoney,
    costPrice: money,
    image: imageRef.optional().nullable(),
    isActive: z.boolean().default(true),
    initialStock: intRange(0, 1_000_000).optional(),
  })
  .refine((v) => !v.oldPrice || v.oldPrice > v.price, { error: V.oldPriceGreater, path: ['oldPrice'] });

export const productInputSchema = z
  .object({
    name: localized({ required: 'all', max: 200, min: 2 }),
    slug: optionalSlug,
    sku: z.string().trim().toUpperCase().min(2, V.sku).max(60, V.sku).regex(/^[A-Z0-9][A-Z0-9_\-/.]*$/, V.sku),
    brand: optionalObjectId,
    category: objectId,
    shortDescription: localized({ required: 'none', max: 400 }),
    description: localized({ required: 'none', max: 20000 }),
    price: money,
    oldPrice: optionalMoney,
    costPrice: money,
    minStock: intRange(0, 100_000).default(3),
    initialStock: intRange(0, 1_000_000).optional(),
    images: z.array(imageRef).max(LIMITS.productImagesMax).default([]),
    videos: z.array(z.string().trim().max(300)).max(10).default([]),
    specs: z.array(z.object({ key: z.string().trim().regex(/^[a-z0-9_]+$/).max(60), value: specValue })).max(80).default([]),
    tags: z.array(z.string().trim().toLowerCase().max(40)).max(40).default([]),
    warrantyMonths: intRange(0, 120).default(12),
    deliveryDays: z
      .object({ min: intRange(0, 60), max: intRange(0, 90) })
      .refine((d) => d.max >= d.min, { error: V.dateRange, path: ['max'] })
      .default({ min: 1, max: 3 }),
    weightKg: z.coerce.number().min(0).max(100_000).optional(),
    seo: z
      .object({ title: localized({ required: 'none', max: 160 }), description: localized({ required: 'none', max: 320 }) })
      .default({ title: { uz: '', ru: '', en: '' }, description: { uz: '', ru: '', en: '' } }),
    flags: z
      .object({ featured: z.boolean().default(false), isNew: z.boolean().default(false), bestseller: z.boolean().default(false) })
      .default({ featured: false, isNew: false, bestseller: false }),
    status: z.enum(PRODUCT_STATUSES).default('draft'),
    variants: z.array(variantInputSchema).max(50).default([]),
  })
  .refine((v) => !v.oldPrice || v.oldPrice > v.price, { error: V.oldPriceGreater, path: ['oldPrice'] });
export type ProductInput = z.input<typeof productInputSchema>;
export type ProductData = z.output<typeof productInputSchema>;

export const productStatusSchema = z.object({ status: z.enum(PRODUCT_STATUSES) });
export const bulkIdsSchema = z.object({ ids: z.array(objectId).min(1).max(500) });

export const categoryInputSchema = z.object({
  name: localized({ required: 'all', max: 120, min: 2 }),
  slug: optionalSlug,
  description: localized({ required: 'none', max: 2000 }),
  parent: optionalObjectId,
  icon: optionalText(60),
  image: imageRef.optional().nullable(),
  order: intRange(0, 100_000).default(0),
  isActive: z.boolean().default(true),
  specKeys: z.array(z.string().regex(/^[a-z0-9_]+$/)).max(100).default([]),
  seoTitle: localized({ required: 'none', max: 160 }),
  seoDescription: localized({ required: 'none', max: 320 }),
});
export type CategoryInput = z.input<typeof categoryInputSchema>;

export const reorderSchema = z.object({
  items: z.array(z.object({ id: objectId, order: intRange(0, 100_000), parent: optionalObjectId })).min(1).max(1000),
});

export const brandInputSchema = z.object({
  name: text(1, 80),
  slug: optionalSlug,
  description: localized({ required: 'none', max: 3000 }),
  country: localized({ required: 'none', max: 80 }),
  website: urlOrPath,
  logo: imageRef.optional().nullable(),
  isActive: z.boolean().default(true),
});
export type BrandInput = z.input<typeof brandInputSchema>;

export const specDefinitionInputSchema = z.object({
  key: z.string().trim().regex(/^[a-z0-9_]+$/, V.slug).max(60),
  label: localized({ required: 'all', max: 80 }),
  unit: optionalText(20),
  type: z.enum(SPEC_TYPES),
  filterable: z.boolean().default(false),
  group: z.enum(SPEC_GROUPS).default('main'),
  order: intRange(0, 10_000).default(100),
  categories: z.array(objectId).default([]),
});
export type SpecDefinitionInput = z.input<typeof specDefinitionInputSchema>;

/* ------------------------------ Orders ------------------------------ */

export const orderStatusUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: optionalText(500),
  carrier: optionalText(80),
  trackingNumber: optionalText(80),
});
export type OrderStatusUpdateInput = z.input<typeof orderStatusUpdateSchema>;

export const orderNoteSchema = z.object({ text: text(1, 1000) });

export const orderDeliveryUpdateSchema = z.object({
  carrier: optionalText(80),
  trackingNumber: optionalText(80),
});

export const paymentStatusUpdateSchema = z.object({
  status: z.enum(PAYMENT_STATUSES),
  note: optionalText(300),
});

export const installmentDecisionSchema = z.object({
  status: z.enum(INSTALLMENT_STATUSES).refine((s) => s === 'APPROVED' || s === 'REJECTED'),
  note: optionalText(300),
});

export const refundUpdateSchema = z.object({
  refundStatus: z.enum(REFUND_STATUSES),
  refundAmount: optionalMoney,
  note: optionalText(300),
});

/* ----------------------------- Inventory ---------------------------- */

export const inventoryAdjustSchema = z.object({
  /** IN: receive stock (+), ADJUSTMENT: correction (+/−), SET: set on-hand to value, INCOMING: expected stock (+/−) */
  type: z.enum(['IN', 'ADJUSTMENT', 'SET', 'INCOMING']),
  quantity: z.coerce.number(V.number).int(V.integer).min(-1_000_000).max(1_000_000),
  reason: text(3, 300),
  costPrice: optionalMoney,
});
export type InventoryAdjustInput = z.input<typeof inventoryAdjustSchema>;

export const inventorySettingsSchema = z.object({ minStock: intRange(0, 100_000) });

/* ----------------------------- People ------------------------------ */

export const customerUpdateSchema = z.object({
  status: z.enum(USER_STATUSES).optional(),
  firstName: personName.optional(),
  lastName: personName.optional(),
  email: optionalEmail,
});

export const adminUserCreateSchema = z.object({
  firstName: personName,
  lastName: personName,
  email: z.string().trim().toLowerCase().pipe(z.email(V.email)),
  phone,
  password,
  role: objectId,
  permissions: z.array(z.string().max(60)).max(200).default([]),
  status: z.enum(USER_STATUSES).default('active'),
});
export type AdminUserCreateInput = z.input<typeof adminUserCreateSchema>;

export const adminUserUpdateSchema = adminUserCreateSchema.partial().extend({
  password: password.optional(),
});
export type AdminUserUpdateInput = z.input<typeof adminUserUpdateSchema>;

export const adminResetPasswordSchema = z.object({ password });

export const roleInputSchema = z.object({
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9_]{1,40}$/, V.slug),
  name: text(2, 60),
  description: optionalText(300),
  permissions: z.array(z.string().max(60)).max(200),
});
export type RoleInput = z.input<typeof roleInputSchema>;

/* ------------------------ Reviews & questions ----------------------- */

export const reviewModerationSchema = z.object({
  status: z.enum(REVIEW_STATUSES).optional(),
  reply: optionalText(2000),
});

export const questionAnswerSchema = z.object({
  status: z.enum(QUESTION_STATUSES).optional(),
  answer: optionalText(2000),
});

/* ----------------------------- Marketing ---------------------------- */

export const couponInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,40}$/, V.code),
    description: localized({ required: 'none', max: 300 }),
    type: z.enum(COUPON_TYPES),
    value: z.coerce.number(V.number).positive(V.positive),
    maxDiscount: optionalMoney,
    scope: z.enum(COUPON_SCOPES).default('all'),
    products: z.array(objectId).default([]),
    categories: z.array(objectId).default([]),
    brands: z.array(objectId).default([]),
    minOrderAmount: money.default(0),
    firstOrderOnly: z.boolean().default(false),
    startsAt: optionalIsoDate,
    expiresAt: optionalIsoDate,
    usageLimit: z.coerce.number().int().min(1).optional(),
    perUserLimit: z.coerce.number().int().min(1).optional(),
    isActive: z.boolean().default(true),
  })
  .refine((v) => v.type !== 'percent' || v.value <= 100, { error: V.max, path: ['value'] })
  .refine((v) => !v.startsAt || !v.expiresAt || v.expiresAt > v.startsAt, { error: V.dateRange, path: ['expiresAt'] });
export type CouponInput = z.input<typeof couponInputSchema>;

export const promotionInputSchema = z
  .object({
    name: localized({ required: 'all', max: 120 }),
    slug: optionalSlug,
    description: localized({ required: 'none', max: 2000 }),
    type: z.enum(PROMOTION_TYPES),
    discountType: z.enum(COUPON_TYPES),
    discountValue: z.coerce.number(V.number).positive(V.positive),
    products: z.array(objectId).default([]),
    categories: z.array(objectId).default([]),
    brands: z.array(objectId).default([]),
    startsAt: z.coerce.date(V.date),
    endsAt: z.coerce.date(V.date),
    priority: intRange(0, 1000).default(0),
    isActive: z.boolean().default(true),
    showOnHome: z.boolean().default(true),
    image: imageRef.optional().nullable(),
  })
  .refine((v) => v.endsAt > v.startsAt, { error: V.dateRange, path: ['endsAt'] })
  .refine((v) => v.discountType !== 'percent' || v.discountValue <= 90, { error: V.max, path: ['discountValue'] })
  .refine((v) => v.products.length + v.categories.length + v.brands.length > 0, { error: V.required, path: ['products'] });
export type PromotionInput = z.input<typeof promotionInputSchema>;

export const bannerInputSchema = z.object({
  placement: z.enum(BANNER_PLACEMENTS),
  title: localized({ required: 'default', max: 80 }),
  subtitle: localized({ required: 'none', max: 200 }),
  buttonText: localized({ required: 'none', max: 40 }),
  buttonUrl: urlOrPath,
  imageDesktop: imageRef,
  imageMobile: imageRef.optional().nullable(),
  textTheme: z.enum(['dark', 'light']).default('dark'),
  startsAt: optionalIsoDate,
  endsAt: optionalIsoDate,
  priority: intRange(0, 1000).default(0),
  isActive: z.boolean().default(true),
});
export type BannerInput = z.input<typeof bannerInputSchema>;

export const broadcastSchema = z.object({
  type: z.enum(['PROMOTION', 'DISCOUNT', 'SYSTEM']),
  title: localized({ required: 'all', max: 120 }),
  body: localized({ required: 'all', max: 600 }),
  url: urlOrPath,
  channels: z.array(z.enum(['in_app', 'push', 'email'])).min(1),
  audience: z.enum(['all', 'active', 'with_orders']).default('all'),
});
export type BroadcastInput = z.input<typeof broadcastSchema>;

/* ------------------------------ Delivery ---------------------------- */

export const deliveryZoneInputSchema = z.object({
  code: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,40}$/, V.slug),
  name: localized({ required: 'all', max: 80 }),
  regions: z.array(z.enum(UZ_REGION_CODES as [string, ...string[]])).min(1),
  price: money,
  freeThreshold: money.default(0),
  minDays: intRange(0, 60),
  maxDays: intRange(0, 90),
  priority: intRange(0, 1000).default(0),
  isActive: z.boolean().default(true),
});
export type DeliveryZoneInput = z.input<typeof deliveryZoneInputSchema>;

export const pickupPointInputSchema = z.object({
  code: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,40}$/, V.slug),
  name: localized({ required: 'all', max: 120 }),
  address: localized({ required: 'all', max: 300 }),
  region: regionCode,
  city: text(2, 80),
  phone,
  workingHours: localized({ required: 'default', max: 120 }),
  location: z.object({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) }),
  isActive: z.boolean().default(true),
});
export type PickupPointInput = z.input<typeof pickupPointInputSchema>;

/* ------------------------------ Expenses ---------------------------- */

export const expenseInputSchema = z.object({
  title: text(2, 160),
  category: objectId,
  description: optionalText(2000),
  amount: z.coerce.number(V.number).positive(V.positive).max(1_000_000_000_000),
  currency: z.enum(CURRENCIES).default('UZS'),
  exchangeRate: z.coerce.number().positive().max(1_000_000).default(1),
  date: z.coerce.date(V.date),
  paymentMethod: z.enum(EXPENSE_PAYMENT_METHODS).default('cash'),
  responsible: optionalText(120),
  attachments: z.array(imageRef).max(10).default([]),
  status: z.enum(EXPENSE_STATUSES).default('PAID'),
  notes: optionalText(2000),
});
export type ExpenseInput = z.input<typeof expenseInputSchema>;

export const expenseCategoryInputSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9_]{1,30}$/, V.slug),
  name: localized({ required: 'all', max: 60 }),
  color: hexColor.default('#75757F'),
  isActive: z.boolean().default(true),
});
export type ExpenseCategoryInput = z.input<typeof expenseCategoryInputSchema>;

/* ------------------------------ Content ----------------------------- */

export const pageInputSchema = z.object({
  title: localized({ required: 'all', max: 160 }),
  content: localized({ required: 'default', max: 60000 }),
  seoTitle: localized({ required: 'none', max: 160 }),
  seoDescription: localized({ required: 'none', max: 320 }),
  isPublished: z.boolean().default(true),
});
export type PageInput = z.input<typeof pageInputSchema>;

export const faqInputSchema = z.object({
  category: z.enum(FAQ_CATEGORIES),
  question: localized({ required: 'all', max: 300 }),
  answer: localized({ required: 'all', max: 4000 }),
  order: intRange(0, 10_000).default(0),
  isActive: z.boolean().default(true),
});
export type FaqInput = z.input<typeof faqInputSchema>;

export const contactStatusSchema = z.object({ status: z.enum(CONTACT_MESSAGE_STATUSES) });

export const translationUpdateSchema = z.object({
  namespace: z.string().regex(/^[a-z][a-zA-Z0-9]{1,30}$/),
  key: z.string().regex(/^[a-zA-Z0-9_.-]{1,150}$/),
  values: z.object({
    uz: z.string().max(4000).optional(),
    ru: z.string().max(4000).optional(),
    en: z.string().max(4000).optional(),
  }),
});
export type TranslationUpdateInput = z.input<typeof translationUpdateSchema>;

export const settingsUpdateSchema = z.object({
  values: z.record(z.string().regex(/^[a-z][a-zA-Z0-9_.]{1,80}$/), z.unknown()),
});

const optionalPhoneSetting = z
  .string()
  .trim()
  .max(40, V.tooLong)
  .transform((v, ctx) => {
    if (!v) return '';
    const p = normalizeUzPhone(v);
    if (!p) {
      ctx.addIssue({ code: 'custom', message: V.phone });
      return z.NEVER;
    }
    return p;
  });
const optionalEmailSetting = optionalEmail.transform((v) => v ?? '');
const linkSetting = z
  .string()
  .trim()
  .max(300, V.tooLong)
  .refine((v) => v === '' || /^https?:\/\//i.test(v), { error: V.url });
const localizedSetting = (max: number) => localized({ required: 'none', max });

/**
 * Value schema of every store setting (Admin → Settings). The API validates each submitted key with its
 * schema and answers 422 with `fields: { "<key>": "validation.*" }`; unknown keys are rejected.
 */
export const settingValueSchemas = {
  'store.name': text(1, 80),
  'store.legalName': localizedSetting(200),
  'store.website': linkSetting,
  'store.phone': phone,
  'store.phoneSecondary': optionalPhoneSetting,
  'store.email': z.string(V.required).trim().toLowerCase().pipe(z.email(V.email).max(120, V.tooLong)),
  'store.supportEmail': optionalEmailSetting,
  'store.address': localized({ required: 'default', max: 300 }),
  'store.workingHours': localizedSetting(200),
  'store.map': z.object({
    lat: z.coerce.number(V.number).min(-90, V.min).max(90, V.max),
    lng: z.coerce.number(V.number).min(-180, V.min).max(180, V.max),
    zoom: intRange(1, 20).default(15),
  }),
  'store.footerAbout': localizedSetting(1000),
  'social.telegram': linkSetting,
  'social.telegramBot': linkSetting,
  'social.instagram': linkSetting,
  'social.facebook': linkSetting,
  'social.youtube': linkSetting,
  'social.tiktok': linkSetting,
  'installment.enabled': z.boolean(),
  'installment.minAmount': money,
  'installment.plans': z
    .array(z.object({ months: intRange(1, 36), markupPercent: z.coerce.number(V.number).min(0, V.min).max(100, V.max) }))
    .max(12, V.max)
    .refine((plans) => new Set(plans.map((p) => p.months)).size === plans.length, { error: V.duplicate }),
  'order.autoCancelUnpaidMinutes': intRange(0, 10_080),
  'inventory.lowStockThreshold': intRange(0, 100_000),
  'payments.enabledMethods': z.array(z.enum(PAYMENT_METHODS)).min(1, V.required),
  'seo.title': localizedSetting(160),
  'seo.description': localizedSetting(320),
  'home.advantages': z
    .array(z.object({ icon: z.string().trim().max(60).regex(/^[A-Za-z0-9]*$/, V.oneOf), title: localized({ required: 'default', max: 80 }), text: localizedSetting(300) }))
    .max(12, V.max),
  'product.trustBullets': z.array(localized({ required: 'default', max: 120 })).max(10, V.max),
  'notifications.telegramNewOrders': z.boolean(),
  'notifications.emailOrderStatus': z.boolean(),
  'notifications.smsOrderStatus': z.boolean(),
  'delivery.defaultFreeThreshold': money,
} as const;

export type SettingKeyInput = keyof typeof settingValueSchemas;

export const mediaUpdateSchema = z.object({
  alt: localized({ required: 'none', max: 200 }).optional(),
  tags: z.array(z.string().trim().toLowerCase().max(40)).max(30).optional(),
  folder: z.enum(MEDIA_FOLDERS).optional(),
});

/* ----------------------------- Analytics ---------------------------- */

export const analyticsQuerySchema = z.object({
  preset: z.enum(DATE_PRESETS).default('last30'),
  from: z.string().optional(),
  to: z.string().optional(),
  granularity: z.enum(GRANULARITIES).optional(),
});
export type AnalyticsQuery = z.input<typeof analyticsQuerySchema>;

export const reportQuerySchema = analyticsQuerySchema.extend({
  format: z.enum(['json', ...EXPORT_FORMATS]).default('json'),
  lang: z.enum(['uz', 'ru', 'en']).default('uz'),
});

export const reportTypeSchema = z.enum(REPORT_TYPES);
