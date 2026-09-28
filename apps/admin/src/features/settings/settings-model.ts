import { PAYMENT_METHODS, type AdminSetting } from '@vero/types';
import { localized, V } from '@vero/validation';
import { normalizeUzPhone } from '@vero/utils';
import { z } from 'zod';

/**
 * The store settings the API knows (apps/api settings.service DEFAULT_SETTINGS), grouped into the sections of
 * this screen. The API validates every key with its own schema (settingValueSchemas in @vero/validation) and
 * answers 422 with per-field messages; the schemas here mirror those limits (some stricter) so mistakes show up
 * before sending — and optional texts are sent as '' (an omitted key would not clear the value).
 */
export const SECTIONS = {
  store: [
    'store.name',
    'store.legalName',
    'store.website',
    'store.phone',
    'store.phoneSecondary',
    'store.email',
    'store.supportEmail',
    'store.address',
    'store.workingHours',
    'store.map',
    'store.footerAbout',
  ],
  social: ['social.telegram', 'social.telegramBot', 'social.instagram', 'social.facebook', 'social.youtube', 'social.tiktok'],
  payments: ['payments.enabledMethods'],
  installment: ['installment.enabled', 'installment.minAmount', 'installment.plans'],
  operations: ['order.autoCancelUnpaidMinutes', 'inventory.lowStockThreshold', 'delivery.defaultFreeThreshold'],
  home: ['home.advantages', 'product.trustBullets'],
  seo: ['seo.title', 'seo.description'],
  notifications: ['notifications.telegramNewOrders', 'notifications.emailOrderStatus', 'notifications.smsOrderStatus'],
} as const;

export type SectionKey = keyof typeof SECTIONS;
export const SECTION_KEYS = Object.keys(SECTIONS) as SectionKey[];

/* ------------------------------------------------------------------ nested ⇄ flat (dotted keys) */

function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((node, key) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined), obj);
}

function setPath(obj: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split('.');
  let node = obj;
  parts.slice(0, -1).forEach((p) => {
    node[p] = (node[p] as Record<string, unknown> | undefined) ?? {};
    node = node[p] as Record<string, unknown>;
  });
  node[parts[parts.length - 1]!] = value;
}

const clone = <T>(v: T): T => (v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T));

/** Form values for a section: `{ store: { name, … } }` from the flat settings list (RHF reads dotted names). */
export function sectionValues(section: SectionKey, settings: AdminSetting[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of SECTIONS[section]) setPath(out, key, clone(settings.find((s) => s.key === key)?.value));
  return out;
}

/** `{ 'store.name': … }` for PUT /admin/settings. */
export function flatValues(section: SectionKey, values: unknown): Record<string, unknown> {
  return Object.fromEntries(SECTIONS[section].map((key) => [key, getPath(values, key)]));
}

export function lastUpdated(section: SectionKey, settings: AdminSetting[]): string | undefined {
  const dates = SECTIONS[section].map((k) => settings.find((s) => s.key === k)?.updatedAt).filter((d): d is string => !!d);
  return dates.sort().at(-1);
}

/* ------------------------------------------------------------------ value schemas */

const requiredStr = (max: number) => z.string(V.required).trim().min(1, V.required).max(max, V.tooLong);
const url = z
  .string()
  .trim()
  .max(300, V.tooLong)
  .refine((v) => v === '' || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v), { error: V.url });
const requiredEmail = z.string(V.required).trim().toLowerCase().pipe(z.email(V.email).max(120, V.tooLong));
const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => v === '' || (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 120), { error: V.email });
const phoneStr = (required: boolean) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (!v) {
        if (required) ctx.addIssue({ code: 'custom', message: V.required });
        return '';
      }
      const p = normalizeUzPhone(v);
      if (!p) {
        ctx.addIssue({ code: 'custom', message: V.phone });
        return z.NEVER;
      }
      return p;
    });
const int = (min: number, max: number) => z.coerce.number(V.number).int(V.integer).min(min, V.min).max(max, V.max);
const moneyValue = z.coerce.number(V.number).int(V.integer).min(0, V.positive).max(10_000_000_000, V.max);

export const storeSchema = z.object({
  store: z.object({
    name: requiredStr(80),
    legalName: localized({ required: 'default', max: 160 }),
    website: url,
    phone: phoneStr(true),
    phoneSecondary: phoneStr(false),
    email: requiredEmail,
    supportEmail: optionalEmail,
    address: localized({ required: 'default', max: 300 }),
    workingHours: localized({ required: 'default', max: 160 }),
    map: z.object({
      lat: z.coerce.number(V.number).min(-90, V.min).max(90, V.max),
      lng: z.coerce.number(V.number).min(-180, V.min).max(180, V.max),
      zoom: int(1, 20),
    }),
    footerAbout: localized({ required: 'none', max: 600 }),
  }),
});

export const socialSchema = z.object({
  social: z.object({ telegram: url, telegramBot: url, instagram: url, facebook: url, youtube: url, tiktok: url }),
});

export const paymentsSchema = z.object({
  payments: z.object({ enabledMethods: z.array(z.enum(PAYMENT_METHODS)).min(1, V.required) }),
});

export const installmentSchema = z.object({
  installment: z.object({
    enabled: z.boolean(),
    minAmount: moneyValue,
    // same limits as the API (settingValueSchemas['installment.plans'])
    plans: z
      .array(z.object({ months: int(1, 36), markupPercent: z.coerce.number(V.number).min(0, V.min).max(100, V.max) }))
      .min(1, V.required)
      .max(12, V.max)
      .superRefine((plans, ctx) => {
        const seen = new Set<number>();
        plans.forEach((p, i) => {
          if (seen.has(p.months)) ctx.addIssue({ code: 'custom', message: 'settings.installment.duplicate', path: [i, 'months'] });
          seen.add(p.months);
        });
      })
      .transform((plans) => [...plans].sort((a, b) => a.months - b.months)),
  }),
});

export const operationsSchema = z.object({
  order: z.object({ autoCancelUnpaidMinutes: int(0, 10_080) }),
  inventory: z.object({ lowStockThreshold: int(0, 100_000) }),
  delivery: z.object({ defaultFreeThreshold: moneyValue }),
});

export const homeSchema = z.object({
  home: z.object({
    advantages: z
      .array(
        z.object({
          // lucide icon names (PascalCase letters and digits), as the storefront renders them
          icon: requiredStr(40).regex(/^[A-Za-z0-9]+$/, V.oneOf),
          title: localized({ required: 'default', max: 80 }),
          text: localized({ required: 'none', max: 240 }),
        }),
      )
      .max(12, V.max),
  }),
  product: z.object({ trustBullets: z.array(localized({ required: 'default', max: 120 })).max(10, V.max) }),
});

export const seoSchema = z.object({
  seo: z.object({ title: localized({ required: 'default', max: 160 }), description: localized({ required: 'none', max: 320 }) }),
});

export const notificationsSchema = z.object({
  notifications: z.object({ telegramNewOrders: z.boolean(), emailOrderStatus: z.boolean(), smsOrderStatus: z.boolean() }),
});

/** Guards against a malformed or legacy stored value (e.g. written before validation existed) so the form never crashes. */
export function normalizeSection(section: SectionKey, values: Record<string, unknown>): Record<string, unknown> {
  const L = (v: unknown) => ({ uz: '', ru: '', en: '', ...(v && typeof v === 'object' ? (v as object) : {}) });
  const s = clone(values) as Record<string, Record<string, unknown>>;
  const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  const text = (v: unknown) => (typeof v === 'string' ? v : '');
  switch (section) {
    case 'store': {
      const st = s.store ?? {};
      const map = (st.map ?? {}) as Record<string, unknown>;
      s.store = {
        ...st,
        name: text(st.name),
        website: text(st.website),
        phone: text(st.phone),
        phoneSecondary: text(st.phoneSecondary),
        email: text(st.email),
        supportEmail: text(st.supportEmail),
        legalName: L(st.legalName),
        address: L(st.address),
        workingHours: L(st.workingHours),
        footerAbout: L(st.footerAbout),
        map: { lat: Number(map.lat ?? 41.3111), lng: Number(map.lng ?? 69.2797), zoom: Number(map.zoom ?? 14) },
      };
      break;
    }
    case 'social':
      s.social = Object.fromEntries(Object.entries(s.social ?? {}).map(([k, v]) => [k, text(v)]));
      break;
    case 'payments':
      s.payments = { enabledMethods: arr<string>(s.payments?.enabledMethods) };
      break;
    case 'installment':
      s.installment = { enabled: !!s.installment?.enabled, minAmount: Number(s.installment?.minAmount ?? 0), plans: arr(s.installment?.plans) };
      break;
    case 'home':
      s.home = { advantages: arr<Record<string, unknown>>(s.home?.advantages).map((a) => ({ icon: text(a.icon), title: L(a.title), text: L(a.text) })) };
      s.product = { trustBullets: arr(s.product?.trustBullets).map(L) };
      break;
    case 'seo':
      s.seo = { title: L(s.seo?.title), description: L(s.seo?.description) };
      break;
    case 'notifications':
      s.notifications = Object.fromEntries(Object.entries(s.notifications ?? {}).map(([k, v]) => [k, !!v]));
      break;
    default:
      break;
  }
  return s;
}
