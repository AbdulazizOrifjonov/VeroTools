import { Router } from 'express';
import { Types } from 'mongoose';
import type { AdminProduct, AdminProductListItem, AdminProductStock } from '@vero/types';
import { PRODUCT_STATUSES } from '@vero/types';
import { escapeRegex, normalizeSearch, pickLocalized, slugify, stockStatusFor } from '@vero/utils';
import type { Language } from '@vero/config';
import { bulkIdsSchema, objectId, productInputSchema, productStatusSchema, z, type ProductData } from '@vero/validation';
import { requirePermission } from '../../middleware/auth';
import { validate, body, params, query } from '../../middleware/validate';
import { HttpError, notFound } from '../../lib/http-error';
import { created, noContent, ok, paged } from '../../lib/respond';
import { pageMeta, sortSpec } from '../../lib/pagination';
import { audit, diff } from '../../lib/audit';
import { cache, CacheTags } from '../../lib/cache';
import { absoluteUrl, iso } from '../../lib/localize';
import { Product, type IProduct, type IProductVariant, type IStockSnapshot } from '../../models/product.model';
import { Inventory } from '../../models/inventory.model';
import { Brand } from '../../models/brand.model';
import { Category } from '../../models/category.model';
import { Cart } from '../../models/cart.model';
import { Comparison, Wishlist } from '../../models/wishlist.model';
import type { ImageValue } from '../../models/common';
import { getCatalogIndex, descendantIds } from '../catalog/catalog-index';
import { buildSearchText, normalizeSpec } from '../catalog/serializers';
import { computePrice } from '../catalog/pricing';
import { applyPricing } from '../catalog/promotions.service';
import { recountCatalog } from '../catalog/products.service';
import { ensureInventory, type Actor, type MovementRef } from '../inventory/inventory.service';
import { imageFromMediaId, imagesFromMediaIds, refreshUsageCounts } from '../media/media.service';
import { getSetting } from '../settings/settings.service';
import { clock } from '../../lib/clock';
import { canSeeFinance } from '../auth/permissions';

export const productsAdminRouter = Router();

const idParams = z.object({ id: objectId });
const staffActor = (req: import('express').Request): Actor => ({ id: req.auth!.id, name: `${req.auth!.user.firstName} ${req.auth!.user.lastName}`.trim() });

function adminStock(s: IStockSnapshot | undefined, low: number): AdminProductStock {
  const available = Math.max(0, s?.available ?? 0);
  return {
    onHand: s?.onHand ?? 0,
    reserved: s?.reserved ?? 0,
    available,
    minStock: s?.minStock ?? 0,
    incoming: s?.incoming ?? 0,
    status: stockStatusFor(available, Math.max(low, s?.minStock ?? 0)),
  };
}

const adminImage = (i: ImageValue) => ({
  media: i.media ? String(i.media) : '',
  url: absoluteUrl(i.url)!,
  thumb: absoluteUrl(i.thumb),
  medium: absoluteUrl(i.medium),
  alt: i.alt,
});

/** `finance: false` → cost prices are sent as 0 (the admin UI hides them; updates keep the stored cost). */
export async function toAdminProduct(p: IProduct, finance = true, lang: Language = 'uz'): Promise<AdminProduct> {
  const idx = await getCatalogIndex();
  const low = await getSetting('inventory.lowStockThreshold');
  const brand = p.brand ? idx.brands.get(String(p.brand)) : undefined;
  const cat = idx.categories.get(String(p.category));
  const path = cat ? [...(cat.ancestors ?? []).map((a) => pickLocalized(idx.categories.get(String(a))?.name, lang)), pickLocalized(cat.name, lang)].filter(Boolean).join(' / ') : '';
  return {
    id: String(p._id),
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    shortDescription: p.shortDescription,
    description: p.description,
    brand: brand ? { id: String(brand._id), name: brand.name } : null,
    category: cat ? { id: String(cat._id), name: cat.name, path } : null,
    price: p.price,
    regularPrice: p.regularPrice,
    oldPrice: p.oldPrice,
    regularOldPrice: p.regularOldPrice,
    costPrice: finance ? p.costPrice : 0,
    discountPercent: p.discountPercent,
    stock: adminStock(p.stock, low),
    images: (p.images ?? []).map(adminImage),
    videos: p.videos ?? [],
    specs: (p.specs ?? []).map((s) => ({ key: s.key, value: s.value })),
    tags: p.tags ?? [],
    warrantyMonths: p.warrantyMonths,
    deliveryDays: { min: p.deliveryDays?.min ?? 1, max: p.deliveryDays?.max ?? 3 },
    weightKg: p.weightKg,
    seo: { title: p.seo?.title ?? { uz: '', ru: '', en: '' }, description: p.seo?.description ?? { uz: '', ru: '', en: '' } },
    flags: { featured: !!p.flags?.featured, isNew: !!p.flags?.isNew, bestseller: !!p.flags?.bestseller, discounted: !!p.isDiscounted },
    status: p.status,
    variants: (p.variants ?? []).map((v) => ({
      id: String(v._id),
      sku: v.sku,
      name: v.name,
      attributes: v.attributes instanceof Map ? Object.fromEntries(v.attributes) : (v.attributes as Record<string, string>) ?? {},
      price: v.regularPrice,
      oldPrice: v.regularOldPrice,
      costPrice: finance ? v.costPrice : 0,
      image: v.image ? adminImage(v.image) : undefined,
      isActive: v.isActive !== false,
      stock: adminStock(v.stock, low),
    })),
    promotion: p.promotion ? { id: String(p.promotion.id), name: p.promotion.name, endsAt: iso(p.promotion.endsAt)! } : undefined,
    rating: p.rating?.average ?? 0,
    reviewCount: p.rating?.count ?? 0,
    soldCount: p.soldCount ?? 0,
    viewCount: p.viewCount ?? 0,
    createdAt: iso(p.createdAt)!,
    updatedAt: iso(p.updatedAt)!,
  };
}

async function toListItem(p: IProduct, low: number, finance = true, lang: Language = 'uz'): Promise<AdminProductListItem> {
  const idx = await getCatalogIndex();
  return {
    id: String(p._id),
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    image: p.images?.[0] ? adminImage(p.images[0]) : undefined,
    brand: p.brand ? idx.brands.get(String(p.brand))?.name : undefined,
    category: pickLocalized(idx.categories.get(String(p.category))?.name, lang) || undefined,
    price: p.price,
    oldPrice: p.oldPrice,
    costPrice: finance ? p.costPrice : 0,
    stock: adminStock(p.stock, low),
    status: p.status,
    flags: { featured: !!p.flags?.featured, isNew: !!p.flags?.isNew, bestseller: !!p.flags?.bestseller, discounted: !!p.isDiscounted },
    hasVariants: (p.variants ?? []).length > 0,
    soldCount: p.soldCount ?? 0,
    rating: p.rating?.average ?? 0,
    updatedAt: iso(p.updatedAt)!,
  };
}

async function uniqueSlug(base: string, excludeId?: Types.ObjectId): Promise<string> {
  let slug = base;
  for (let i = 2; await Product.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }); i++) slug = `${base}-${i}`;
  return slug;
}

async function assertSkusFree(skus: string[], excludeId?: Types.ObjectId) {
  const dup = skus.find((s, i) => skus.indexOf(s) !== i);
  if (dup) throw new HttpError(409, 'CONFLICT', `Duplicate SKU ${dup}`, { fields: { sku: 'validation.duplicate' } });
  const clash = await Product.findOne({ $or: [{ sku: { $in: skus } }, { 'variants.sku': { $in: skus } }], ...(excludeId ? { _id: { $ne: excludeId } } : {}) })
    .select('sku')
    .lean();
  if (clash) throw new HttpError(409, 'CONFLICT', 'SKU already used by another product', { fields: { sku: 'validation.duplicate' } });
}

/** Maps validated admin input onto product fields (media → images, specs normalised, search text …). */
async function buildFields(input: ProductData, existing?: IProduct) {
  const idx = await getCatalogIndex();
  const category = await Category.findById(input.category).lean();
  if (!category) throw new HttpError(422, 'VALIDATION_ERROR', 'Category not found', { fields: { category: 'errors.NOT_FOUND' } });
  const brand = input.brand ? await Brand.findById(input.brand).lean() : null;
  if (input.brand && !brand) throw new HttpError(422, 'VALIDATION_ERROR', 'Brand not found', { fields: { brand: 'errors.NOT_FOUND' } });

  await assertSkusFree([input.sku, ...input.variants.map((v) => v.sku)], existing?._id);

  const specs = [];
  for (const s of input.specs) {
    const def = idx.specs.get(s.key);
    if (!def) throw new HttpError(422, 'VALIDATION_ERROR', `Unknown specification ${s.key}`, { fields: { specs: 'validation.oneOf' } });
    const n = normalizeSpec(s.key, s.value, def);
    if (n) specs.push(n);
  }

  const images = await imagesFromMediaIds(input.images.map((i) => i.media));
  const variants: IProductVariant[] = [];
  for (const v of input.variants) {
    const prev = v.id ? existing?.variants.find((x) => String(x._id) === v.id) : undefined;
    const priced = computePrice(v.price, v.oldPrice ?? undefined, null);
    variants.push({
      _id: prev?._id ?? new Types.ObjectId(),
      sku: v.sku,
      name: v.name,
      attributes: v.attributes ?? {},
      regularPrice: v.price,
      regularOldPrice: v.oldPrice ?? undefined,
      price: priced.price,
      oldPrice: priced.oldPrice,
      discountPercent: priced.discountPercent,
      costPrice: v.costPrice,
      image: v.image?.media ? await imageFromMediaId(v.image.media) : undefined,
      isActive: v.isActive,
      stock: prev?.stock ?? { onHand: 0, reserved: 0, available: 0, minStock: input.minStock, incoming: 0 },
    });
  }
  const base = computePrice(input.price, input.oldPrice ?? undefined, null);
  const slug = input.slug ?? (existing?.slug && !input.slug ? existing.slug : await uniqueSlug(slugify(input.name.en || input.name.uz), existing?._id));
  if (input.slug) {
    const taken = await Product.exists({ slug: input.slug, ...(existing ? { _id: { $ne: existing._id } } : {}) });
    if (taken) throw new HttpError(409, 'CONFLICT', 'Slug already used', { fields: { slug: 'validation.duplicate' } });
  }
  const fields = {
    name: input.name,
    slug,
    sku: input.sku,
    brand: brand?._id ?? null,
    category: category._id,
    categoryPath: [...(category.ancestors ?? []), category._id],
    shortDescription: input.shortDescription,
    description: input.description,
    regularPrice: input.price,
    regularOldPrice: input.oldPrice ?? undefined,
    costPrice: input.costPrice,
    price: variants.length ? Math.min(...variants.filter((v) => v.isActive).map((v) => v.price).concat(base.price)) : base.price,
    oldPrice: base.oldPrice,
    discountPercent: base.discountPercent,
    isDiscounted: base.discountPercent > 0,
    images,
    videos: input.videos,
    specs,
    tags: Array.from(new Set(input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))),
    warrantyMonths: input.warrantyMonths,
    deliveryDays: input.deliveryDays,
    weightKg: input.weightKg,
    seo: input.seo,
    flags: input.flags,
    status: input.status,
    variants,
    publishedAt: input.status === 'published' ? existing?.publishedAt ?? clock.now() : existing?.publishedAt,
    'stock.minStock': input.minStock,
  };
  const searchText = buildSearchText({ ...fields, category: category._id } as unknown as IProduct, idx, brand?.name);
  return { ...fields, searchText };
}

interface WriteOpts {
  bulk?: boolean;
  previous?: IProduct;
  /** staff member the initial-stock movements are attributed to */
  actor?: Actor;
  /** origin of the initial stock (manual form, import, seed) */
  reference?: MovementRef;
}

async function afterWrite(id: Types.ObjectId, input: ProductData, opts: WriteOpts = {}) {
  const doc = await Product.findById(id).lean();
  if (!doc) return;
  if (!opts.bulk) {
    const mediaOf = (p?: IProduct) => [...(p?.images ?? []).map((i) => i.media), ...(p?.variants ?? []).map((v) => v.image?.media)];
    await refreshUsageCounts([...mediaOf(doc), ...mediaOf(opts.previous)]);
  }
  const initial = new Map<string, number>();
  if (input.initialStock) initial.set(doc.sku, input.initialStock);
  for (const v of input.variants) if (v.initialStock) initial.set(v.sku, v.initialStock);
  await ensureInventory(doc, { minStock: input.minStock, initial, costPrice: input.costPrice, actor: opts.actor, reference: opts.reference });
  await applyPricing(id);
  if (opts.bulk) return; // bulk imports recount + invalidate once at the end
  await recountCatalog();
  await cache.invalidate(CacheTags.home, CacheTags.catalog);
}

/**
 * Creates a product from validated admin input (images from the media library, specs normalised, inventory
 * records + initial stock movements, promotion pricing). Used by the admin API and by imports / seeding.
 */
export async function createProduct(input: ProductData, opts: Omit<WriteOpts, 'previous'> = {}): Promise<IProduct> {
  const fields = await buildFields(input);
  const { 'stock.minStock': minStock, ...rest } = fields;
  const doc = await Product.create({ ...rest, stock: { onHand: 0, reserved: 0, available: 0, minStock, incoming: 0 } });
  await afterWrite(doc._id, input, opts);
  return (await Product.findById(doc._id).lean<IProduct>())!;
}

/* ---------------------------------- list --------------------------------- */

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(120).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  category: objectId.optional(),
  brand: objectId.optional(),
  stock: z.enum(['in', 'low', 'out']).optional(),
  flag: z.enum(['featured', 'isNew', 'bestseller', 'discounted']).optional(),
  sort: z.string().max(40).optional(),
});

productsAdminRouter.get('/', requirePermission('products.read'), validate({ query: listQuery }), async (req, res) => {
  const q = query<z.output<typeof listQuery>>(req);
  const low = await getSetting('inventory.lowStockThreshold');
  const filter: Record<string, unknown> = {};
  if (q.status) filter.status = q.status;
  if (q.category) filter.categoryPath = new Types.ObjectId(q.category);
  if (q.brand) filter.brand = new Types.ObjectId(q.brand);
  if (q.stock === 'out') filter['stock.available'] = { $lte: 0 };
  if (q.stock === 'low') filter.$expr = { $and: [{ $gt: ['$stock.available', 0] }, { $lte: ['$stock.available', { $max: ['$stock.minStock', low] }] }] };
  if (q.stock === 'in') filter['stock.available'] = { $gt: low };
  if (q.flag === 'discounted') filter.isDiscounted = true;
  else if (q.flag) filter[`flags.${q.flag}`] = true;
  if (q.q) {
    const tokens = normalizeSearch(q.q).split(' ').filter(Boolean);
    filter.$and = tokens.map((t) => ({ searchText: { $regex: escapeRegex(t) } }));
  }
  const sort = sortSpec(q.sort, ['updatedAt', 'createdAt', 'price', 'stock.available', 'soldCount', 'rating.average', 'sku'], { updatedAt: -1, _id: -1 });
  const [items, total] = await Promise.all([
    Product.find(filter).sort(sort).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    Product.countDocuments(filter),
  ]);
  const finance = canSeeFinance(req.auth!.permissions);
  paged(res, await Promise.all(items.map((p) => toListItem(p, low, finance, req.ctx.lang))), pageMeta(q.page, q.limit, total));
});

productsAdminRouter.get('/:id', requirePermission('products.read'), validate({ params: idParams }), async (req, res) => {
  const p = await Product.findById(params<{ id: string }>(req).id).lean();
  if (!p) throw notFound('Product');
  ok(res, await toAdminProduct(p, canSeeFinance(req.auth!.permissions), req.ctx.lang));
});

productsAdminRouter.post('/', requirePermission('products.create'), validate({ body: productInputSchema }), async (req, res) => {
  const fresh = await createProduct(body<ProductData>(req), { actor: staffActor(req) });
  await audit(req, { action: 'product.create', target: { type: 'product', id: String(fresh._id), label: fresh.sku } });
  created(res, await toAdminProduct(fresh, canSeeFinance(req.auth!.permissions), req.ctx.lang));
});

productsAdminRouter.put('/:id', requirePermission('products.update'), validate({ params: idParams, body: productInputSchema }), async (req, res) => {
  const existing = await Product.findById(params<{ id: string }>(req).id).lean();
  if (!existing) throw notFound('Product');
  const input = body<ProductData>(req);
  if (!canSeeFinance(req.auth!.permissions)) {
    // editors without finance access never see cost prices, so they can't change them either
    input.costPrice = existing.costPrice;
    for (const v of input.variants) {
      const prev = v.id ? existing.variants.find((x) => String(x._id) === v.id) : undefined;
      if (prev) v.costPrice = prev.costPrice;
    }
  }
  const fields = await buildFields(input, existing);
  await Product.updateOne({ _id: existing._id }, { $set: fields });
  await afterWrite(existing._id, input, { previous: existing, actor: staffActor(req) });
  const fresh = (await Product.findById(existing._id).lean())!;
  await audit(req, {
    action: 'product.update',
    target: { type: 'product', id: String(existing._id), label: fresh.sku },
    changes: diff(
      { name: existing.name, price: existing.regularPrice, oldPrice: existing.regularOldPrice, costPrice: existing.costPrice, status: existing.status, category: String(existing.category), brand: String(existing.brand), flags: existing.flags, images: existing.images?.length, variants: existing.variants?.length },
      { name: fresh.name, price: fresh.regularPrice, oldPrice: fresh.regularOldPrice, costPrice: fresh.costPrice, status: fresh.status, category: String(fresh.category), brand: String(fresh.brand), flags: fresh.flags, images: fresh.images?.length, variants: fresh.variants?.length },
    ),
  });
  ok(res, await toAdminProduct(fresh, canSeeFinance(req.auth!.permissions), req.ctx.lang));
});

productsAdminRouter.patch('/:id/status', requirePermission('products.update'), validate({ params: idParams, body: productStatusSchema }), async (req, res) => {
  const { status } = body<{ status: IProduct['status'] }>(req);
  const existing = await Product.findById(params<{ id: string }>(req).id).lean();
  if (!existing) throw notFound('Product');
  await Product.updateOne({ _id: existing._id }, { $set: { status, ...(status === 'published' && !existing.publishedAt ? { publishedAt: new Date() } : {}) } });
  await recountCatalog();
  await cache.invalidate(CacheTags.home, CacheTags.catalog);
  await audit(req, { action: `product.${status === 'published' ? 'publish' : status === 'archived' ? 'archive' : 'unpublish'}`, target: { type: 'product', id: String(existing._id), label: existing.sku }, changes: { status: { from: existing.status, to: status } } });
  ok(res, await toAdminProduct((await Product.findById(existing._id).lean())!, canSeeFinance(req.auth!.permissions), req.ctx.lang));
});

productsAdminRouter.post('/bulk-status', requirePermission('products.update'), validate({ body: bulkIdsSchema.extend({ status: z.enum(PRODUCT_STATUSES) }) }), async (req, res) => {
  const { ids, status } = body<{ ids: string[]; status: IProduct['status'] }>(req);
  const r = await Product.updateMany({ _id: { $in: ids } }, { $set: { status } });
  if (status === 'published') await Product.updateMany({ _id: { $in: ids }, publishedAt: null }, { $set: { publishedAt: new Date() } });
  await recountCatalog();
  await cache.invalidate(CacheTags.home, CacheTags.catalog);
  await audit(req, { action: 'product.bulk_status', target: { type: 'product' }, meta: { ids, status } });
  ok(res, { updated: r.modifiedCount });
});

async function deleteProduct(id: Types.ObjectId) {
  const reserved = await Inventory.exists({ product: id, reserved: { $gt: 0 } });
  if (reserved) throw new HttpError(409, 'IN_USE', 'Product has reserved stock in open orders — archive it instead');
  await Product.deleteOne({ _id: id });
  await Inventory.deleteMany({ product: id });
  await Promise.all([
    Cart.updateMany({ 'items.product': id }, { $pull: { items: { product: id } } }),
    Wishlist.updateMany({ 'items.product': id }, { $pull: { items: { product: id } } }),
    Comparison.updateMany({ 'items.product': id }, { $pull: { items: { product: id } } }),
  ]);
}

productsAdminRouter.delete('/:id', requirePermission('products.delete'), validate({ params: idParams }), async (req, res) => {
  const existing = await Product.findById(params<{ id: string }>(req).id).lean();
  if (!existing) throw notFound('Product');
  await deleteProduct(existing._id);
  await recountCatalog();
  await cache.invalidate(CacheTags.home, CacheTags.catalog);
  await audit(req, { action: 'product.delete', target: { type: 'product', id: String(existing._id), label: existing.sku } });
  noContent(res);
});

productsAdminRouter.post('/bulk-delete', requirePermission('products.delete'), validate({ body: bulkIdsSchema }), async (req, res) => {
  const { ids } = body<{ ids: string[] }>(req);
  let deleted = 0;
  for (const id of ids) {
    try {
      await deleteProduct(new Types.ObjectId(id));
      deleted += 1;
    } catch {
      /* skip products with reserved stock */
    }
  }
  await recountCatalog();
  await cache.invalidate(CacheTags.home, CacheTags.catalog);
  await audit(req, { action: 'product.bulk_delete', target: { type: 'product' }, meta: { ids, deleted } });
  ok(res, { deleted });
});

productsAdminRouter.post('/:id/duplicate', requirePermission('products.create'), validate({ params: idParams }), async (req, res) => {
  const src = await Product.findById(params<{ id: string }>(req).id).lean();
  if (!src) throw notFound('Product');
  const suffix = Date.now().toString(36).slice(-4).toUpperCase();
  const { _id, createdAt: _c, updatedAt: _u, ...rest } = src;
  void _id;
  const copy = await Product.create({
    ...rest,
    slug: await uniqueSlug(`${src.slug}-copy`),
    sku: `${src.sku}-C${suffix}`,
    name: { uz: `${src.name.uz} (nusxa)`, ru: `${src.name.ru} (копия)`, en: `${src.name.en} (copy)` },
    status: 'draft',
    variants: src.variants.map((v) => ({ ...v, _id: new Types.ObjectId(), sku: `${v.sku}-C${suffix}`, stock: { onHand: 0, reserved: 0, available: 0, minStock: v.stock?.minStock ?? 3, incoming: 0 } })),
    stock: { onHand: 0, reserved: 0, available: 0, minStock: src.stock?.minStock ?? 3, incoming: 0 },
    inStock: false,
    soldCount: 0,
    viewCount: 0,
    popularity: 0,
    rating: { average: 0, count: 0, distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } },
    publishedAt: undefined,
  });
  const fresh = copy.toObject() as IProduct;
  await ensureInventory(fresh, { minStock: src.stock?.minStock ?? 3, costPrice: src.costPrice, actor: staffActor(req) });
  await audit(req, { action: 'product.duplicate', target: { type: 'product', id: String(copy._id), label: copy.sku }, meta: { source: src.sku } });
  created(res, await toAdminProduct((await Product.findById(copy._id).lean())!, canSeeFinance(req.auth!.permissions), req.ctx.lang));
});

export { descendantIds };
