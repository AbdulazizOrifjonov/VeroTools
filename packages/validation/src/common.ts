import { z } from 'zod';
import { LANGUAGES, UZ_REGION_CODES } from '@vero/config';
import { normalizeUzPhone, stripTags } from '@vero/utils';

/**
 * Error messages are i18n keys (namespace "validation"), translated by the clients:
 * t(issue.message) → "Enter a valid phone number" / "Telefon raqamini to'g'ri kiriting" ...
 */
export const V = {
  required: 'validation.required',
  tooShort: 'validation.tooShort',
  tooLong: 'validation.tooLong',
  duplicate: 'validation.duplicate',
  email: 'validation.email',
  phone: 'validation.phone',
  password: 'validation.password',
  passwordMismatch: 'validation.passwordMismatch',
  number: 'validation.number',
  positive: 'validation.positive',
  integer: 'validation.integer',
  min: 'validation.min',
  max: 'validation.max',
  id: 'validation.id',
  slug: 'validation.slug',
  url: 'validation.url',
  date: 'validation.date',
  oneOf: 'validation.oneOf',
  acceptTerms: 'validation.acceptTerms',
  oldPriceGreater: 'validation.oldPriceGreater',
  dateRange: 'validation.dateRange',
  sku: 'validation.sku',
  code: 'validation.code',
  rating: 'validation.rating',
  region: 'validation.region',
  addressRequired: 'validation.addressRequired',
  pickupRequired: 'validation.pickupRequired',
  installmentMonths: 'validation.installmentMonths',
  color: 'validation.color',
} as const;

export const objectId = z.string().regex(/^[a-f0-9]{24}$/i, V.id);
export const optionalObjectId = z
  .union([objectId, z.literal(''), z.null()])
  .optional()
  .transform((v) => (v ? v : undefined));

/** Required single-line text, trimmed and stripped of HTML. */
export const text = (min = 1, max = 200) =>
  z
    .string(V.required)
    .trim()
    .min(1, { error: V.required, abort: true })
    .min(Math.max(1, min), V.tooShort)
    .max(max, V.tooLong)
    .transform((v) => stripTags(v));

/** Optional text: empty string → undefined. */
export const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, V.tooLong)
    .optional()
    .transform((v) => (v ? stripTags(v) : undefined));

export const phone = z
  .string(V.required)
  .trim()
  .min(1, V.required)
  .transform((v, ctx) => {
    const p = normalizeUzPhone(v);
    if (!p) {
      ctx.addIssue({ code: 'custom', message: V.phone });
      return z.NEVER;
    }
    return p;
  });

export const email = z.string(V.required).trim().toLowerCase().pipe(z.email(V.email).max(120, V.tooLong));

export const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .transform((v, ctx) => {
    if (!v) return undefined;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || v.length > 120) {
      ctx.addIssue({ code: 'custom', message: V.email });
      return z.NEVER;
    }
    return v;
  });

/** 8–72 chars (bcrypt limit), at least one letter and one digit. */
export const password = z
  .string(V.required)
  .min(8, { error: V.password, abort: true })
  .max(72, V.tooLong)
  .refine((v) => /[A-Za-zА-Яа-яЁё]/.test(v) && /\d/.test(v), { error: V.password });

export const personName = text(2, 60);

export const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, V.slug)
  .max(120, V.tooLong);

export const optionalSlug = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .transform((v, ctx) => {
    if (!v) return undefined;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v)) {
      ctx.addIssue({ code: 'custom', message: V.slug });
      return z.NEVER;
    }
    return v;
  });

export const regionCode = z.enum(UZ_REGION_CODES as [string, ...string[]], V.region);

export const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i, V.color);

export const urlOrPath = z
  .string()
  .trim()
  .max(500, V.tooLong)
  .refine((v) => v === '' || v.startsWith('/') || /^https?:\/\//i.test(v), { error: V.url })
  .optional()
  .transform((v) => (v ? v : undefined));

export const money = z.coerce.number(V.number).int(V.integer).min(0, V.positive).max(10_000_000_000, V.max);
export const optionalMoney = z
  .union([z.coerce.number(V.number).int(V.integer).min(0, V.positive), z.literal(''), z.null()])
  .optional()
  .transform((v) => (v === '' || v === null || v === undefined || v === 0 ? undefined : v));

export const intRange = (min: number, max: number) =>
  z.coerce.number(V.number).int(V.integer).min(min, V.min).max(max, V.max);

export const isoDate = z.coerce.date(V.date);
export const optionalIsoDate = z
  .union([z.coerce.date(V.date), z.literal(''), z.null()])
  .optional()
  .transform((v) => (v instanceof Date ? v : undefined));

/**
 * Multilingual text object { uz, ru, en }.
 * required: 'all' → every language required; 'default' → Uzbek required; 'none' → all optional.
 */
export function localized(opts: { required?: 'all' | 'default' | 'none'; max?: number; min?: number } = {}) {
  const { required = 'default', max = 300, min = 1 } = opts;
  const field = (isRequired: boolean) =>
    isRequired
      ? z.string(V.required).trim().min(min, min <= 1 ? V.required : V.tooShort).max(max, V.tooLong)
      : z.string().trim().max(max, V.tooLong).default('');
  const shape = z.object({
    uz: field(required !== 'none'),
    ru: field(required === 'all'),
    en: field(required === 'all'),
  });
  return required === 'none' ? shape.default({ uz: '', ru: '', en: '' }) : shape;
}

export const languageSchema = z.enum(LANGUAGES);
export const themeSchema = z.enum(['light', 'dark', 'system']);

/** Base pagination for list endpoints (query strings → numbers). */
export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(120).optional(),
  sort: z
    .string()
    .trim()
    .regex(/^-?[a-zA-Z0-9_.]+$/)
    .max(40)
    .optional(),
});
export type PaginationQuery = z.output<typeof paginationQuery>;

/** Query-string boolean: "1" | "true" | "0" | "false". */
export const queryBool = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((v) => (v === true || v === '1' || v === 'true' ? true : v === false || v === '0' || v === 'false' ? false : undefined));

/** Comma separated list in a query string → string[] */
export const queryList = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => {
    if (!v) return undefined;
    const arr = (Array.isArray(v) ? v : v.split(',')).map((s) => s.trim()).filter(Boolean);
    return arr.length ? Array.from(new Set(arr)).slice(0, 100) : undefined;
  });

export type Localized = { uz: string; ru: string; en: string };
