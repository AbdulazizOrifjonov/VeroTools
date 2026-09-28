import { zodResolver } from '@hookform/resolvers/zod';
import type { LocalizedText } from '@vero/config';
import type { AdminProduct, AdminProductStock, AdminSpecDefinition, AdminSpecValue, ProductStatus } from '@vero/types';
import { productInputSchema } from '@vero/validation';
import type { FieldErrors, Resolver } from 'react-hook-form';
import type { z } from 'zod';
import { imageToForm, type FormImage } from '../../components/media/ImageFields';
import type { FlatCategory } from '../catalog/catalog-data';

export type ProductOutput = z.output<typeof productInputSchema>;

const L = (v?: Partial<LocalizedText> | null): LocalizedText => ({ uz: v?.uz ?? '', ru: v?.ru ?? '', en: v?.en ?? '' });

export type SpecFormValue = number | '' | boolean | null | LocalizedText;

export interface VariantForm {
  id?: string;
  sku: string;
  name: LocalizedText;
  attributes: Array<{ key: string; value: string }>;
  price: number | '';
  oldPrice: number | '';
  costPrice: number | '';
  image: FormImage | null;
  isActive: boolean;
  initialStock: number | '';
  /** read-only (existing variants) */
  stock?: AdminProductStock;
}

export interface ProductFormValues {
  name: LocalizedText;
  slug: string;
  sku: string;
  brand: string;
  category: string;
  shortDescription: LocalizedText;
  description: LocalizedText;
  price: number | '';
  oldPrice: number | '';
  costPrice: number | '';
  minStock: number | '';
  initialStock: number | '';
  images: FormImage[];
  videos: string[];
  /** spec key → value (shape depends on the definition type) */
  specs: Record<string, SpecFormValue>;
  tags: string[];
  warrantyMonths: number | '';
  deliveryDays: { min: number | ''; max: number | '' };
  weightKg: number | '';
  seo: { title: LocalizedText; description: LocalizedText };
  flags: { featured: boolean; isNew: boolean; bestseller: boolean };
  status: ProductStatus;
  variants: VariantForm[];
}

export function emptyVariant(): VariantForm {
  return { sku: '', name: L(), attributes: [], price: '', oldPrice: '', costPrice: '', image: null, isActive: true, initialStock: '' };
}

export function emptyProduct(): ProductFormValues {
  return {
    name: L(),
    slug: '',
    sku: '',
    brand: '',
    category: '',
    shortDescription: L(),
    description: L(),
    price: '',
    oldPrice: '',
    costPrice: '',
    minStock: 3,
    initialStock: '',
    images: [],
    videos: [],
    specs: {},
    tags: [],
    warrantyMonths: 12,
    deliveryDays: { min: 1, max: 3 },
    weightKg: '',
    seo: { title: L(), description: L() },
    flags: { featured: false, isNew: false, bestseller: false },
    status: 'draft',
    variants: [],
  };
}

export function emptySpecValue(def: AdminSpecDefinition): SpecFormValue {
  return def.type === 'number' ? '' : def.type === 'boolean' ? null : { uz: '', ru: '', en: '' };
}

/** Spec keys of a category including the ones inherited from its ancestors (root first). */
export function categorySpecKeys(category: FlatCategory | undefined): string[] {
  if (!category) return [];
  return [...new Set([...category.path, category.node].flatMap((n) => n.specKeys))];
}

/**
 * Adds empty values for the category's spec rows that the product does not fill yet, so the rendered rows
 * start from their default value and an untouched form is not reported as changed.
 */
export function withCategorySpecs(values: ProductFormValues, category: FlatCategory | undefined, defs: Map<string, AdminSpecDefinition>): ProductFormValues {
  const specs = { ...values.specs };
  for (const key of categorySpecKeys(category)) {
    const def = defs.get(key);
    if (def && !(key in specs)) specs[key] = emptySpecValue(def);
  }
  return { ...values, specs };
}

function specToForm(value: AdminSpecValue, def?: AdminSpecDefinition): SpecFormValue {
  if (def?.type === 'number') return typeof value === 'number' ? value : Number(value) || '';
  if (def?.type === 'boolean') return value === true || value === 'true';
  if (typeof value === 'object' && value !== null) return L(value as LocalizedText);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  return { uz: String(value), ru: String(value), en: String(value) };
}

export function productToForm(p: AdminProduct, defs: Map<string, AdminSpecDefinition>): ProductFormValues {
  return {
    name: L(p.name),
    slug: p.slug,
    sku: p.sku,
    brand: p.brand?.id ?? '',
    category: p.category?.id ?? '',
    shortDescription: L(p.shortDescription),
    description: L(p.description),
    price: p.regularPrice,
    oldPrice: p.regularOldPrice ?? '',
    costPrice: p.costPrice,
    minStock: p.stock.minStock,
    initialStock: '',
    images: p.images.map((i) => imageToForm(i)).filter((i): i is FormImage => !!i),
    videos: p.videos,
    specs: Object.fromEntries(p.specs.map((s) => [s.key, specToForm(s.value, defs.get(s.key))])),
    tags: p.tags,
    warrantyMonths: p.warrantyMonths,
    deliveryDays: { min: p.deliveryDays.min, max: p.deliveryDays.max },
    weightKg: p.weightKg ?? '',
    seo: { title: L(p.seo.title), description: L(p.seo.description) },
    flags: { featured: p.flags.featured, isNew: p.flags.isNew, bestseller: p.flags.bestseller },
    status: p.status,
    variants: p.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      name: L(v.name),
      attributes: Object.entries(v.attributes ?? {}).map(([key, value]) => ({ key, value })),
      price: v.price,
      oldPrice: v.oldPrice ?? '',
      costPrice: v.costPrice,
      image: imageToForm(v.image),
      isActive: v.isActive,
      initialStock: '',
      stock: v.stock,
    })),
  };
}

const num = (v: number | '' | undefined | null) => (v === '' || v === null || v === undefined ? undefined : v);

/** Spec rows rendered for the category register their fields without values, so any part may be undefined. */
const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export function specIsEmpty(v: SpecFormValue | undefined): boolean {
  if (v === '' || v === null || v === undefined) return true;
  if (typeof v === 'object') return !text(v.uz) && !text(v.ru) && !text(v.en);
  return false;
}

/** Form values → the shape of productInputSchema (API input). */
export function toInput(values: ProductFormValues, isNew: boolean) {
  const specs = values.specs ?? {};
  const specKeys = Object.keys(specs).filter((k) => !specIsEmpty(specs[k]));
  const input = {
    name: values.name,
    slug: text(values.slug) || undefined,
    sku: values.sku,
    brand: values.brand || undefined,
    category: values.category,
    shortDescription: values.shortDescription,
    description: values.description,
    price: num(values.price),
    oldPrice: num(values.oldPrice),
    costPrice: num(values.costPrice),
    minStock: num(values.minStock),
    initialStock: isNew ? num(values.initialStock) : undefined,
    images: values.images.map((i) => ({ media: i.media })),
    videos: (values.videos ?? []).map(text).filter(Boolean),
    specs: specKeys.map((key) => {
      const v = specs[key]!;
      // text specs: an empty language falls back to the first filled one (the API stores all three)
      if (typeof v === 'object' && v !== null) {
        const [uz, ru, en] = [text(v.uz), text(v.ru), text(v.en)];
        const base = uz || ru || en;
        return { key, value: { uz: uz || base, ru: ru || base, en: en || base } };
      }
      return { key, value: v as number | boolean };
    }),
    tags: values.tags,
    warrantyMonths: num(values.warrantyMonths),
    deliveryDays: { min: num(values.deliveryDays.min), max: num(values.deliveryDays.max) },
    weightKg: num(values.weightKg),
    seo: values.seo,
    flags: values.flags,
    status: values.status,
    variants: values.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      name: v.name,
      attributes: Object.fromEntries((v.attributes ?? []).filter((a) => text(a.key) && text(a.value)).map((a) => [text(a.key), text(a.value)])),
      price: num(v.price),
      oldPrice: num(v.oldPrice),
      costPrice: num(v.costPrice),
      image: v.image ? { media: v.image.media } : null,
      isActive: v.isActive,
      initialStock: !v.id ? num(v.initialStock) : undefined,
    })),
  };
  return { input, specKeys };
}

/**
 * zod validation (shared productInputSchema) on the API-shaped input, with error paths mapped back onto the
 * form (spec rows are addressed by key, an empty category is "required" rather than "invalid id").
 */
export function productResolver(isNew: boolean): Resolver<ProductFormValues, unknown, ProductOutput> {
  const zr = zodResolver(productInputSchema);
  return async (values, context, options) => {
    const { input, specKeys } = toInput(values, isNew);
    const result = await zr(input as never, context, options as never);
    if (!result.errors || Object.keys(result.errors).length === 0) return { values: result.values as ProductOutput, errors: {} };
    const errors = { ...(result.errors as Record<string, unknown>) } as Record<string, unknown>;
    if (errors.specs && typeof errors.specs === 'object') {
      const mapped: Record<string, unknown> = {};
      for (const [index, err] of Object.entries(errors.specs as Record<string, { value?: unknown; key?: unknown }>)) {
        const key = specKeys[Number(index)];
        if (key && err) mapped[key] = err.value ?? err.key ?? err;
      }
      errors.specs = mapped;
    }
    if (!values.category && errors.category) errors.category = { type: 'required', message: 'validation.required' };
    return { values: {}, errors: errors as FieldErrors<ProductFormValues> };
  };
}

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/** YouTube link or id → full watch URL (the storefront renders the value as a link); null when invalid. */
export function normalizeVideo(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (YT_ID.test(v)) return `https://www.youtube.com/watch?v=${v}`;
  try {
    const url = new URL(v);
    if (!/^https?:$/.test(url.protocol)) return null;
    if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$/i.test(url.hostname)) return url.toString();
    return null;
  } catch {
    return null;
  }
}
