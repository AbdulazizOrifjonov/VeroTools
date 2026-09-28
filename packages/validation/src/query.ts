import { z } from 'zod';
import { SORT_OPTIONS, type ProductListParams } from '@vero/types';
import { LIMITS } from '@vero/config';
import { parseProductListParams } from '@vero/utils';

const specFilter = z.union([
  z.array(z.string().max(120)).max(50),
  z.object({ min: z.number().optional(), max: z.number().optional() }),
  z.boolean(),
]);

/** Validated ProductListParams (used by the API after parsing the raw query string). */
export const productListParamsSchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(120).optional(),
  brand: z.array(z.string().max(120)).max(50).optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  rating: z.number().min(0).max(5).optional(),
  inStock: z.boolean().optional(),
  discounted: z.boolean().optional(),
  featured: z.boolean().optional(),
  isNew: z.boolean().optional(),
  bestseller: z.boolean().optional(),
  promotion: z.string().max(120).optional(),
  ids: z.array(z.string().regex(/^[a-f0-9]{24}$/i)).max(100).optional(),
  specs: z.record(z.string().regex(/^[a-z0-9_]+$/).max(60), specFilter).optional(),
  sort: z.enum(SORT_OPTIONS).default('recommended'),
  page: z.number().int().min(1).max(10_000).default(1),
  limit: z.number().int().min(1).max(LIMITS.pageSizeMax).default(LIMITS.pageSizeDefault),
});
export type ProductListQuery = z.output<typeof productListParamsSchema>;

/** Parses a raw query object/string with the shared URL format and validates it. */
export function parseProductListQuery(raw: Record<string, unknown> | URLSearchParams | string): ProductListQuery {
  const src =
    raw instanceof URLSearchParams || typeof raw === 'string'
      ? raw
      : Object.fromEntries(
          Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v.map(String) : v == null ? undefined : String(v)]),
        );
  const parsed: ProductListParams = parseProductListParams(src as Record<string, string | string[] | undefined>);
  return productListParamsSchema.parse(parsed);
}

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(12).default(6),
});

export const reviewListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  sort: z.enum(['newest', 'rating_desc', 'rating_asc']).default('newest'),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  withPhotos: z
    .union([z.literal('1'), z.literal('true'), z.literal('0'), z.literal('false')])
    .optional()
    .transform((v) => v === '1' || v === 'true'),
});
