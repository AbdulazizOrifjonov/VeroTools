import type { Language } from '@vero/config';
import type {
  BrandDetail,
  BrandSummary,
  Breadcrumb,
  CategoryNode,
  CategorySummary,
  ProductCard,
  ProductDetail,
  ProductSpec,
  ProductVariant,
  StockInfo,
} from '@vero/types';
import { formatNumber, normalizeSearch, slugify, stockStatusFor } from '@vero/utils';
import type { ICategory } from '../../models/category.model';
import type { IBrand } from '../../models/brand.model';
import type { IProduct, IProductSpecValue, IStockSnapshot } from '../../models/product.model';
import type { IProductSpecification } from '../../models/product-specification.model';
import type { Localized } from '../../models/common';
import { iso, loc, toImageRef } from '../../lib/localize';
import { breadcrumbsFor, type CatalogIndex } from './catalog-index';

const YES: Record<Language, string> = { uz: 'Ha', ru: 'Да', en: 'Yes' };
const NO: Record<Language, string> = { uz: "Yo'q", ru: 'Нет', en: 'No' };

export function stockInfo(stock: IStockSnapshot | undefined, lowThreshold: number): StockInfo {
  const available = Math.max(0, stock?.available ?? 0);
  return { status: stockStatusFor(available, lowThreshold), available };
}

export function toCategorySummary(c: ICategory, lang: Language): CategorySummary {
  return {
    id: String(c._id),
    slug: c.slug,
    name: loc(c.name, lang),
    icon: c.icon,
    image: toImageRef(c.image, lang, loc(c.name, lang)),
    parentId: c.parent ? String(c.parent) : null,
    level: c.level,
    productCount: c.productCount ?? 0,
  };
}

export function toBrandSummary(b: IBrand, lang: Language): BrandSummary {
  return { id: String(b._id), slug: b.slug, name: b.name, logo: toImageRef(b.logo, lang, b.name), productCount: b.productCount ?? 0 };
}

export function toBrandDetail(b: IBrand, lang: Language): BrandDetail {
  return {
    ...toBrandSummary(b, lang),
    description: loc(b.description, lang) || undefined,
    country: loc(b.country, lang) || undefined,
    website: b.website || undefined,
  };
}

export function buildCategoryTree(idx: CatalogIndex, lang: Language, onlyActive = true): CategoryNode[] {
  const build = (c: ICategory): CategoryNode => ({
    ...toCategorySummary(c, lang),
    children: (idx.children.get(String(c._id)) ?? []).filter((x) => !onlyActive || x.isActive).map(build),
  });
  return idx.roots.filter((c) => !onlyActive || c.isActive).map(build);
}

export function toBreadcrumbs(idx: CatalogIndex, categoryId: unknown, lang: Language): Breadcrumb[] {
  return breadcrumbsFor(idx, categoryId as string).map((c) => ({ id: String(c._id), slug: c.slug, name: loc(c.name, lang) }));
}

export type ProductForCard = Pick<
  IProduct,
  | '_id'
  | 'slug'
  | 'sku'
  | 'name'
  | 'shortDescription'
  | 'brand'
  | 'category'
  | 'images'
  | 'price'
  | 'oldPrice'
  | 'discountPercent'
  | 'isDiscounted'
  | 'rating'
  | 'stock'
  | 'deliveryDays'
  | 'warrantyMonths'
  | 'flags'
  | 'promotion'
  | 'variants'
>;

export const CARD_PROJECTION =
  'slug sku name shortDescription brand category images price oldPrice discountPercent isDiscounted rating stock deliveryDays warrantyMonths flags promotion variants._id variants.isActive';

export function toProductCard(p: ProductForCard, lang: Language, idx: CatalogIndex, lowThreshold: number): ProductCard {
  const brand = p.brand ? idx.brands.get(String(p.brand)) : undefined;
  const category = p.category ? idx.categories.get(String(p.category)) : undefined;
  const name = loc(p.name, lang);
  const images = (p.images ?? []).slice(0, 2).map((i) => toImageRef(i, lang, name)!).filter(Boolean);
  const promoActive = p.promotion && new Date(p.promotion.endsAt) > new Date();
  return {
    id: String(p._id),
    slug: p.slug,
    sku: p.sku,
    name,
    shortDescription: loc(p.shortDescription, lang) || undefined,
    brand: brand ? { id: String(brand._id), slug: brand.slug, name: brand.name } : null,
    category: category ? { id: String(category._id), slug: category.slug, name: loc(category.name, lang) } : null,
    image: images[0],
    images,
    price: p.price,
    oldPrice: p.oldPrice && p.oldPrice > p.price ? p.oldPrice : undefined,
    discountPercent: p.discountPercent ?? 0,
    currency: 'UZS',
    rating: Math.round((p.rating?.average ?? 0) * 10) / 10,
    reviewCount: p.rating?.count ?? 0,
    stock: stockInfo(p.stock, lowThreshold),
    deliveryDays: { min: p.deliveryDays?.min ?? 1, max: p.deliveryDays?.max ?? 3 },
    warrantyMonths: p.warrantyMonths ?? 0,
    flags: {
      featured: !!p.flags?.featured,
      isNew: !!p.flags?.isNew,
      bestseller: !!p.flags?.bestseller,
      discounted: !!p.isDiscounted,
    },
    promotion:
      promoActive && p.promotion
        ? { id: String(p.promotion.id), slug: p.promotion.slug, name: loc(p.promotion.name, lang), type: p.promotion.type, endsAt: iso(p.promotion.endsAt)! }
        : undefined,
    hasVariants: (p.variants ?? []).filter((v) => v.isActive !== false).length > 1,
  };
}

function isLocalized(v: unknown): v is Localized {
  return !!v && typeof v === 'object' && ('uz' in (v as object) || 'ru' in (v as object) || 'en' in (v as object));
}

export function displaySpecValue(spec: IProductSpecValue, def: IProductSpecification | undefined, lang: Language): string {
  const v = spec.value;
  if (typeof v === 'boolean') return v ? YES[lang] : NO[lang];
  if (typeof v === 'number') {
    const s = Number.isInteger(v) ? formatNumber(v) : formatNumber(v, v < 10 ? 1 : 0).replace(/,0$/, '');
    return def?.unit ? `${s} ${def.unit}` : s;
  }
  if (isLocalized(v)) return loc(v, lang);
  return String(v ?? '');
}

export function toProductSpecs(specs: IProductSpecValue[], idx: CatalogIndex, lang: Language): ProductSpec[] {
  return specs
    .map((s) => ({ s, def: idx.specs.get(s.key) }))
    .sort((a, b) => (a.def?.order ?? 999) - (b.def?.order ?? 999))
    .map(({ s, def }) => ({
      key: s.key,
      label: def ? loc(def.label, lang) : s.key,
      value: displaySpecValue(s, def, lang),
      raw: typeof s.value === 'object' ? loc(s.value as Localized, lang) : (s.value as number | string | boolean),
      unit: def?.unit,
      group: def?.group ?? 'general',
    }));
}

export function toVariantDTO(v: IProduct['variants'][number], lang: Language, lowThreshold: number): ProductVariant {
  const attrs = v.attributes instanceof Map ? Object.fromEntries(v.attributes) : (v.attributes as Record<string, string>);
  return {
    id: String(v._id),
    sku: v.sku,
    name: loc(v.name, lang),
    attributes: attrs ?? {},
    price: v.price,
    oldPrice: v.oldPrice && v.oldPrice > v.price ? v.oldPrice : undefined,
    discountPercent: v.discountPercent ?? 0,
    stock: stockInfo(v.stock, lowThreshold),
    image: toImageRef(v.image, lang),
  };
}

export function toProductDetail(p: IProduct, lang: Language, idx: CatalogIndex, lowThreshold: number, questionCount: number): ProductDetail {
  const card = toProductCard(p, lang, idx, lowThreshold);
  const name = card.name;
  return {
    ...card,
    description: loc(p.description, lang),
    images: (p.images ?? []).map((i) => toImageRef(i, lang, name)!).filter(Boolean),
    videos: p.videos ?? [],
    specs: toProductSpecs(p.specs ?? [], idx, lang),
    tags: p.tags ?? [],
    variants: (p.variants ?? []).filter((v) => v.isActive !== false).map((v) => toVariantDTO(v, lang, lowThreshold)),
    breadcrumbs: toBreadcrumbs(idx, p.category, lang),
    ratingDistribution: {
      '1': p.rating?.distribution?.['1'] ?? 0,
      '2': p.rating?.distribution?.['2'] ?? 0,
      '3': p.rating?.distribution?.['3'] ?? 0,
      '4': p.rating?.distribution?.['4'] ?? 0,
      '5': p.rating?.distribution?.['5'] ?? 0,
    },
    weightKg: p.weightKg,
    questionCount,
    seoTitle: loc(p.seo?.title, lang) || undefined,
    seoDescription: loc(p.seo?.description, lang) || undefined,
    updatedAt: iso(p.updatedAt)!,
  };
}

/* ----------------------------- search text ----------------------------- */

/** Builds the normalised text used for search (all languages, SKU, brand, categories, tags, text specs). */
export function buildSearchText(
  p: Pick<IProduct, 'name' | 'sku' | 'tags' | 'specs' | 'variants' | 'category'>,
  idx: CatalogIndex,
  brandName?: string,
): string {
  const parts: string[] = [p.name?.uz, p.name?.ru, p.name?.en, p.sku, brandName ?? ''];
  for (const v of p.variants ?? []) parts.push(v.sku, v.name?.uz, v.name?.ru, v.name?.en);
  for (const c of breadcrumbsFor(idx, p.category)) parts.push(c.name.uz, c.name.ru, c.name.en);
  parts.push(...(p.tags ?? []));
  for (const s of p.specs ?? []) {
    if (isLocalized(s.value)) parts.push(s.value.uz, s.value.ru, s.value.en);
    else if (typeof s.value === 'string') parts.push(s.value);
  }
  const normalized = normalizeSearch(parts.filter(Boolean).join(' '));
  // keep SKU also without dashes ("VT-DRL-1001" → "vtdrl1001")
  const compactSkus = [p.sku, ...(p.variants ?? []).map((v) => v.sku)].filter(Boolean).map((s) => s.toLowerCase().replace(/[^a-z0-9]/g, ''));
  return Array.from(new Set(`${normalized} ${compactSkus.join(' ')}`.split(' ').filter(Boolean))).join(' ');
}

/** Normalises a raw spec value for storage + filtering. */
export function normalizeSpec(key: string, raw: unknown, def?: IProductSpecification): IProductSpecValue | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const type = def?.type ?? (typeof raw === 'number' ? 'number' : typeof raw === 'boolean' ? 'boolean' : 'text');
  if (type === 'number') {
    const n = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'));
    if (!Number.isFinite(n)) return null;
    return { key, value: n, n };
  }
  if (type === 'boolean') {
    const b = raw === true || raw === 'true' || raw === 1 || raw === '1';
    return { key, value: b, b };
  }
  const value: Localized = isLocalized(raw)
    ? { uz: String(raw.uz ?? ''), ru: String(raw.ru ?? ''), en: String(raw.en ?? '') }
    : { uz: String(raw), ru: String(raw), en: String(raw) };
  const token = slugify(value.en || value.uz || value.ru);
  return { key, value, t: token };
}
