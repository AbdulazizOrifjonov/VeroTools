import { Types, type PipelineStage } from 'mongoose';
import type { Language } from '@vero/config';
import type { FacetOption, PopularSearch, ProductCard, ProductDetail, ProductFacets, SearchSuggestions, SpecFacet } from '@vero/types';
import { escapeRegex, normalizeSearch } from '@vero/utils';
import type { ProductListQuery } from '@vero/validation';
import { Product, type IProduct } from '../../models/product.model';
import { Promotion } from '../../models/marketing.model';
import { ProductQuestion } from '../../models/review.model';
import { SearchQuery } from '../../models/content.model';
import { User } from '../../models/user.model';
import { Category } from '../../models/category.model';
import { Brand } from '../../models/brand.model';
import { notFound } from '../../lib/http-error';
import { loc } from '../../lib/localize';
import { pageMeta } from '../../lib/pagination';
import { getSetting } from '../settings/settings.service';
import { CARD_PROJECTION, toBrandSummary, toProductCard, toProductDetail, toCategorySummary } from './serializers';
import { categorySpecKeys, descendantIds, getCatalogIndex, type CatalogIndex } from './catalog-index';

type Cond = Record<string, unknown>;

interface FilterParts {
  base: Cond[];
  brand?: Cond;
  price?: Cond;
  rating?: Cond;
  inStock?: Cond;
  discounted?: Cond;
  specs: Record<string, Cond>;
  categoryId?: string;
  empty: boolean;
  tokens: string[];
}

const NOTHING: Cond = { _id: new Types.ObjectId('000000000000000000000000') };

export function searchTokens(q: string | undefined): string[] {
  return normalizeSearch(q ?? '')
    .split(' ')
    .filter((t) => t.length >= 1)
    .slice(0, 8);
}

async function filterParts(params: Partial<ProductListQuery>, idx: CatalogIndex): Promise<FilterParts> {
  const parts: FilterParts = { base: [{ status: 'published' }], specs: {}, empty: false, tokens: [] };
  if (params.category) {
    const cat = idx.categoriesBySlug.get(params.category);
    if (!cat || !cat.isActive) {
      parts.base.push(NOTHING);
      parts.empty = true;
    } else {
      parts.base.push({ categoryPath: cat._id });
      parts.categoryId = String(cat._id);
    }
  }
  if (params.ids?.length) parts.base.push({ _id: { $in: params.ids.map((id) => new Types.ObjectId(id)) } });
  if (params.featured) parts.base.push({ 'flags.featured': true });
  if (params.isNew) parts.base.push({ 'flags.isNew': true });
  if (params.bestseller) parts.base.push({ 'flags.bestseller': true });
  if (params.promotion) {
    const promo = await Promotion.findOne({ slug: params.promotion }).select('_id').lean();
    parts.base.push(promo ? { 'promotion.id': promo._id } : NOTHING);
  }
  const tokens = searchTokens(params.q);
  parts.tokens = tokens;
  if (tokens.length) {
    parts.base.push({ $and: tokens.map((t) => ({ searchText: { $regex: `(^| )${escapeRegex(t)}` } })) });
  }
  if (params.brand?.length) {
    const ids = params.brand.map((s) => idx.brandsBySlug.get(s)?._id).filter(Boolean);
    parts.brand = ids.length ? { brand: { $in: ids } } : NOTHING;
  }
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    const range: Cond = {};
    if (params.minPrice !== undefined) range.$gte = params.minPrice;
    if (params.maxPrice !== undefined) range.$lte = params.maxPrice;
    parts.price = { price: range };
  }
  if (params.rating) parts.rating = { 'rating.average': { $gte: params.rating } };
  if (params.inStock) parts.inStock = { inStock: true };
  if (params.discounted) parts.discounted = { isDiscounted: true };
  for (const [key, value] of Object.entries(params.specs ?? {})) {
    const def = idx.specs.get(key);
    if (!def) continue;
    if (value === true) parts.specs[key] = { specs: { $elemMatch: { key, b: true } } };
    else if (Array.isArray(value)) {
      if (value.length) parts.specs[key] = { specs: { $elemMatch: { key, t: { $in: value } } } };
    } else if (typeof value === 'object' && value) {
      const range: Cond = {};
      if (value.min !== undefined) range.$gte = value.min;
      if (value.max !== undefined) range.$lte = value.max;
      if (Object.keys(range).length) parts.specs[key] = { specs: { $elemMatch: { key, n: range } } };
    }
  }
  return parts;
}

function combine(parts: FilterParts, exclude?: string): Cond {
  const conds: Cond[] = [];
  if (exclude !== 'brand' && parts.brand) conds.push(parts.brand);
  if (exclude !== 'price' && parts.price) conds.push(parts.price);
  if (exclude !== 'rating' && parts.rating) conds.push(parts.rating);
  if (exclude !== 'inStock' && parts.inStock) conds.push(parts.inStock);
  if (exclude !== 'discounted' && parts.discounted) conds.push(parts.discounted);
  for (const [key, cond] of Object.entries(parts.specs)) if (exclude !== `spec:${key}`) conds.push(cond);
  return conds.length ? { $and: conds } : {};
}

function sortStage(sort: ProductListQuery['sort'], hasQuery: boolean): Record<string, 1 | -1> {
  switch (sort) {
    case 'newest':
      return { createdAt: -1, _id: -1 };
    case 'popular':
      return { popularity: -1, soldCount: -1, _id: -1 };
    case 'price_asc':
      return { price: 1, _id: 1 };
    case 'price_desc':
      return { price: -1, _id: -1 };
    case 'rating':
      return { 'rating.average': -1, 'rating.count': -1, _id: -1 };
    case 'discount':
      return { discountPercent: -1, popularity: -1, _id: -1 };
    case 'recommended':
    default:
      return hasQuery
        ? { _score: -1, inStock: -1, popularity: -1, _id: -1 }
        : { inStock: -1, 'flags.featured': -1, popularity: -1, _id: -1 };
  }
}

export interface ListContext {
  lang: Language;
  userId?: Types.ObjectId;
  track?: boolean;
}

export async function listProducts(params: ProductListQuery, ctx: ListContext): Promise<{ items: ProductCard[]; meta: ReturnType<typeof pageMeta> }> {
  const idx = await getCatalogIndex();
  const low = await getSetting('inventory.lowStockThreshold');
  const parts = await filterParts(params, idx);
  const match = { $and: [...parts.base, combine(parts)] };
  const skip = (params.page - 1) * params.limit;
  const hasQuery = parts.tokens.length > 0;
  const phrase = parts.tokens.join(' ');
  const compactQ = phrase.replace(/[^a-z0-9]/g, '');

  const pipeline: PipelineStage[] = [{ $match: match }];
  if (hasQuery && params.sort === 'recommended') {
    pipeline.push({
      $addFields: {
        _score: {
          $add: [
            { $cond: [{ $regexMatch: { input: '$searchText', regex: `(^| )${escapeRegex(compactQ)}( |$)` } }, 100, 0] },
            { $cond: [{ $regexMatch: { input: '$searchText', regex: escapeRegex(phrase) } }, 20, 0] },
            { $cond: ['$inStock', 5, 0] },
          ],
        },
      },
    });
  }
  pipeline.push(
    { $sort: sortStage(params.sort, hasQuery) },
    {
      $facet: {
        items: [{ $skip: skip }, { $limit: params.limit }, { $project: Object.fromEntries(CARD_PROJECTION.split(' ').map((f) => [f, 1])) }],
        total: [{ $count: 'n' }],
      },
    },
  );
  const [res] = await Product.aggregate<{ items: IProduct[]; total: Array<{ n: number }> }>(pipeline);
  const total = res?.total[0]?.n ?? 0;
  const items = (res?.items ?? []).map((p) => toProductCard(p, ctx.lang, idx, low));

  if (ctx.track && params.q && params.page === 1) void trackSearch(params.q, total, ctx.userId);
  return { items, meta: pageMeta(params.page, params.limit, total) };
}

export async function productFacets(params: ProductListQuery, lang: Language): Promise<ProductFacets> {
  const idx = await getCatalogIndex();
  const parts = await filterParts(params, idx);
  const specKeys = parts.categoryId ? categorySpecKeys(idx, parts.categoryId).filter((k) => idx.specs.get(k)?.filterable) : [];
  const childCats = parts.categoryId
    ? (idx.children.get(parts.categoryId) ?? []).filter((c) => c.isActive)
    : idx.roots.filter((c) => c.isActive);

  const facet: Record<string, PipelineStage.FacetPipelineStage[]> = {
    total: [{ $match: combine(parts) }, { $count: 'n' }],
    brands: [{ $match: combine(parts, 'brand') }, { $group: { _id: '$brand', count: { $sum: 1 } } }],
    price: [{ $match: combine(parts, 'price') }, { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }],
    ratings: [{ $match: combine(parts, 'rating') }, { $group: { _id: { $floor: '$rating.average' }, count: { $sum: 1 } } }],
    inStock: [{ $match: combine(parts, 'inStock') }, { $match: { inStock: true } }, { $count: 'n' }],
    discounted: [{ $match: combine(parts, 'discounted') }, { $match: { isDiscounted: true } }, { $count: 'n' }],
    categories: [
      { $match: combine(parts) },
      { $project: { categoryPath: 1 } },
      { $unwind: '$categoryPath' },
      { $match: { categoryPath: { $in: childCats.map((c) => c._id) } } },
      { $group: { _id: '$categoryPath', count: { $sum: 1 } } },
    ],
  };
  specKeys.forEach((key, i) => {
    const def = idx.specs.get(key)!;
    const stages: PipelineStage.FacetPipelineStage[] = [
      { $match: combine(parts, `spec:${key}`) },
      { $project: { specs: 1 } },
      { $unwind: '$specs' },
      { $match: { 'specs.key': key } },
    ];
    if (def.type === 'number') stages.push({ $group: { _id: null, min: { $min: '$specs.n' }, max: { $max: '$specs.n' } } });
    else if (def.type === 'boolean') stages.push({ $match: { 'specs.b': true } }, { $count: 'n' });
    else stages.push({ $group: { _id: '$specs.t', count: { $sum: 1 }, label: { $first: '$specs.value' } } }, { $sort: { count: -1 } }, { $limit: 30 });
    facet[`spec${i}`] = stages;
  });

  const [res] = await Product.aggregate<Record<string, Array<Record<string, unknown>>>>([
    { $match: { $and: parts.base } },
    { $project: { brand: 1, price: 1, rating: 1, inStock: 1, isDiscounted: 1, specs: 1, categoryPath: 1 } },
    { $facet: facet },
  ]);
  const r = res ?? {};

  const brands: FacetOption[] = (r.brands ?? [])
    .map((b) => {
      const brand = b._id ? idx.brands.get(String(b._id)) : undefined;
      return brand ? { value: brand.slug, label: brand.name, count: Number(b.count) } : null;
    })
    .filter((x): x is FacetOption => !!x)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const ratingBuckets = new Map((r.ratings ?? []).map((b) => [Number(b._id), Number(b.count)]));
  const ratings = [4, 3, 2, 1].map((value) => ({
    value,
    count: [...ratingBuckets.entries()].filter(([k]) => k >= value).reduce((s, [, c]) => s + c, 0),
  }));

  const catCounts = new Map((r.categories ?? []).map((c) => [String(c._id), Number(c.count)]));
  const categories: FacetOption[] = childCats
    .map((c) => ({ value: c.slug, label: loc(c.name, lang), count: catCounts.get(String(c._id)) ?? 0 }))
    .filter((c) => c.count > 0);

  const specs: SpecFacet[] = [];
  specKeys.forEach((key, i) => {
    const def = idx.specs.get(key)!;
    const rows = r[`spec${i}`] ?? [];
    const label = loc(def.label, lang);
    if (def.type === 'number') {
      const row = rows[0];
      if (row && typeof row.min === 'number' && typeof row.max === 'number' && row.max > row.min) {
        specs.push({ key, label, unit: def.unit, type: 'range', min: row.min, max: row.max });
      }
    } else if (def.type === 'boolean') {
      const n = Number(rows[0]?.n ?? 0);
      if (n > 0) specs.push({ key, label, type: 'boolean', count: n });
    } else {
      const options = rows
        .filter((o) => o._id)
        .map((o) => ({ value: String(o._id), label: loc(o.label as never, lang) || String(o._id), count: Number(o.count) }));
      if (options.length > 1 || (options.length === 1 && params.specs?.[key])) specs.push({ key, label, unit: def.unit, type: 'options', options });
    }
  });

  const priceRow = r.price?.[0];
  return {
    total: Number(r.total?.[0]?.n ?? 0),
    price: { min: Number(priceRow?.min ?? 0), max: Number(priceRow?.max ?? 0) },
    brands,
    categories,
    ratings,
    inStock: Number(r.inStock?.[0]?.n ?? 0),
    discounted: Number(r.discounted?.[0]?.n ?? 0),
    specs,
  };
}

const viewThrottle = new Map<string, number>();

export async function productDetail(slugOrId: string, lang: Language, viewerKey?: string): Promise<ProductDetail> {
  const idx = await getCatalogIndex();
  const low = await getSetting('inventory.lowStockThreshold');
  const filter = Types.ObjectId.isValid(slugOrId) && slugOrId.length === 24 ? { _id: slugOrId } : { slug: slugOrId.toLowerCase() };
  const product = await Product.findOne({ ...filter, status: 'published' }).lean();
  if (!product) throw notFound('Product');
  const questionCount = await ProductQuestion.countDocuments({ product: product._id, status: 'PUBLISHED' });
  if (viewerKey) {
    const key = `${viewerKey}:${product._id}`;
    const last = viewThrottle.get(key) ?? 0;
    if (Date.now() - last > 30 * 60_000) {
      viewThrottle.set(key, Date.now());
      if (viewThrottle.size > 50_000) viewThrottle.clear();
      void Product.updateOne({ _id: product._id }, { $inc: { viewCount: 1, popularity: 1 } }).exec();
    }
  }
  return toProductDetail(product, lang, idx, low, questionCount);
}

export async function relatedProducts(productId: string, lang: Language): Promise<ProductCard[]> {
  const idx = await getCatalogIndex();
  const low = await getSetting('inventory.lowStockThreshold');
  const product = await Product.findById(productId).select('category categoryPath brand price').lean();
  if (!product) throw notFound('Product');
  const projection = CARD_PROJECTION;
  const same = await Product.find({ status: 'published', category: product.category, _id: { $ne: product._id } })
    .sort({ inStock: -1, popularity: -1 })
    .limit(12)
    .select(projection)
    .lean();
  let items = same;
  if (items.length < 8 && product.categoryPath?.[0]) {
    const more = await Product.find({
      status: 'published',
      categoryPath: product.categoryPath[0],
      _id: { $nin: [product._id, ...items.map((i) => i._id)] },
    })
      .sort({ inStock: -1, popularity: -1 })
      .limit(12 - items.length)
      .select(projection)
      .lean();
    items = [...items, ...more];
  }
  return items.map((p) => toProductCard(p, lang, idx, low));
}

/* --------------------------------- search -------------------------------- */

export async function trackSearch(q: string, resultsCount: number, userId?: Types.ObjectId) {
  const query = normalizeSearch(q).slice(0, 100);
  if (query.length < 2) return;
  await SearchQuery.updateOne(
    { query },
    { $inc: { count: 1 }, $set: { display: q.trim().slice(0, 100), resultsCount, lastSearchedAt: new Date() } },
    { upsert: true },
  ).catch(() => undefined);
  if (userId) {
    await User.updateOne({ _id: userId }, { $pull: { searchHistory: { q: q.trim() } } }).catch(() => undefined);
    await User.updateOne(
      { _id: userId },
      { $push: { searchHistory: { $each: [{ q: q.trim().slice(0, 120), at: new Date() }], $position: 0, $slice: 20 } } },
    ).catch(() => undefined);
  }
}

export async function popularSearches(limit = 10): Promise<PopularSearch[]> {
  const rows = await SearchQuery.find({ resultsCount: { $gt: 0 } }).sort({ count: -1 }).limit(limit).lean();
  return rows.map((r) => ({ query: r.display, count: r.count }));
}

export async function searchSuggestions(q: string, lang: Language, limit = 6): Promise<SearchSuggestions> {
  const idx = await getCatalogIndex();
  const low = await getSetting('inventory.lowStockThreshold');
  const tokens = searchTokens(q);
  const phrase = tokens.join(' ');
  if (!tokens.length) return { query: q, products: [], categories: [], brands: [], suggestions: [] };

  const products = await Product.find({
    status: 'published',
    $and: tokens.map((t) => ({ searchText: { $regex: `(^| )${escapeRegex(t)}` } })),
  })
    .sort({ inStock: -1, popularity: -1 })
    .limit(limit)
    .select(CARD_PROJECTION)
    .lean();

  const matchName = (names: Array<string | undefined>) => names.some((n) => normalizeSearch(n ?? '').includes(phrase));
  const categories = [...idx.categories.values()]
    .filter((c) => c.isActive && matchName([c.name.uz, c.name.ru, c.name.en]))
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, 5)
    .map((c) => toCategorySummary(c, lang));
  const brands = [...idx.brands.values()]
    .filter((b) => b.isActive && normalizeSearch(b.name).includes(phrase))
    .slice(0, 5)
    .map((b) => toBrandSummary(b, lang));

  const popular = await SearchQuery.find({ query: { $regex: `^${escapeRegex(phrase)}` }, resultsCount: { $gt: 0 } })
    .sort({ count: -1 })
    .limit(5)
    .lean();
  const suggestions = Array.from(new Set([...popular.map((p) => p.display), ...products.slice(0, 3).map((p) => loc(p.name, lang))])).slice(0, 6);

  return {
    query: q,
    products: products.map((p) => toProductCard(p, lang, idx, low)),
    categories,
    brands,
    suggestions,
  };
}

/* ------------------------------ maintenance ------------------------------ */

/** Recomputes denormalised product counts of categories (incl. descendants) and brands. */
export async function recountCatalog(): Promise<void> {
  const [byCat, byBrand] = await Promise.all([
    Product.aggregate<{ _id: Types.ObjectId; n: number }>([
      { $match: { status: 'published' } },
      { $project: { categoryPath: 1 } },
      { $unwind: '$categoryPath' },
      { $group: { _id: '$categoryPath', n: { $sum: 1 } } },
    ]),
    Product.aggregate<{ _id: Types.ObjectId; n: number }>([
      { $match: { status: 'published', brand: { $ne: null } } },
      { $group: { _id: '$brand', n: { $sum: 1 } } },
    ]),
  ]);
  const catCounts = new Map(byCat.map((r) => [String(r._id), r.n]));
  const brandCounts = new Map(byBrand.map((r) => [String(r._id), r.n]));
  const cats = await Category.find().select('_id').lean();
  const brands = await Brand.find().select('_id').lean();
  if (cats.length)
    await Category.bulkWrite(cats.map((c) => ({ updateOne: { filter: { _id: c._id }, update: { $set: { productCount: catCounts.get(String(c._id)) ?? 0 } } } })));
  if (brands.length)
    await Brand.bulkWrite(brands.map((b) => ({ updateOne: { filter: { _id: b._id }, update: { $set: { productCount: brandCounts.get(String(b._id)) ?? 0 } } } })));
}

export { descendantIds };
