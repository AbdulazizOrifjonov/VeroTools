import { Router } from 'express';
import { Types } from 'mongoose';
import type { AdminBrand, AdminCategory, AdminCategoryNode, AdminSpecDefinition } from '@vero/types';
import { slugify } from '@vero/utils';
import { brandInputSchema, categoryInputSchema, objectId, reorderSchema, specDefinitionInputSchema, z, type CategoryInput } from '@vero/validation';
import { requirePermission } from '../../middleware/auth';
import { validate, body, params, query } from '../../middleware/validate';
import { HttpError, notFound } from '../../lib/http-error';
import { created, noContent, ok, paged } from '../../lib/respond';
import { pageMeta } from '../../lib/pagination';
import { audit, diff } from '../../lib/audit';
import { cache, CacheTags } from '../../lib/cache';
import { absoluteUrl, iso } from '../../lib/localize';
import { Category, type ICategory } from '../../models/category.model';
import { Brand, type IBrand } from '../../models/brand.model';
import { Product } from '../../models/product.model';
import { ProductSpecification, type IProductSpecification } from '../../models/product-specification.model';
import type { ImageValue } from '../../models/common';
import { getCatalogIndex, invalidateCatalogIndex } from '../catalog/catalog-index';
import { buildSearchText } from '../catalog/serializers';
import { recountCatalog } from '../catalog/products.service';
import { imageFromMediaId } from '../media/media.service';

export const categoriesAdminRouter = Router();
export const brandsAdminRouter = Router();
export const specsAdminRouter = Router();

const idParams = z.object({ id: objectId });
const img = (i?: ImageValue) => (i?.url ? { media: i.media ? String(i.media) : '', url: absoluteUrl(i.url)!, thumb: absoluteUrl(i.thumb), medium: absoluteUrl(i.medium), alt: i.alt } : undefined);

async function invalidate() {
  invalidateCatalogIndex();
  await cache.invalidate(CacheTags.catalog, CacheTags.home);
}

/** Rebuilds product search text (category / brand names are part of it). */
async function reindexProducts(filter: Record<string, unknown>) {
  invalidateCatalogIndex();
  const idx = await getCatalogIndex();
  const cursor = Product.find(filter).select('name sku tags specs variants category brand').lean().cursor();
  const ops = [];
  for await (const p of cursor) {
    const brand = p.brand ? idx.brands.get(String(p.brand))?.name : undefined;
    const cat = idx.categories.get(String(p.category));
    ops.push({
      updateOne: {
        filter: { _id: p._id },
        update: { $set: { searchText: buildSearchText(p, idx, brand), categoryPath: cat ? [...(cat.ancestors ?? []), cat._id] : [] } },
      },
    });
    if (ops.length >= 500) await Product.bulkWrite(ops.splice(0));
  }
  if (ops.length) await Product.bulkWrite(ops);
}

/* ------------------------------ categories ------------------------------- */

function toAdminCategory(c: ICategory): AdminCategory {
  return {
    id: String(c._id),
    slug: c.slug,
    name: c.name,
    description: c.description,
    parent: c.parent ? String(c.parent) : null,
    ancestors: (c.ancestors ?? []).map(String),
    level: c.level,
    order: c.order,
    icon: c.icon,
    image: img(c.image),
    isActive: c.isActive,
    specKeys: c.specKeys ?? [],
    seoTitle: c.seoTitle,
    seoDescription: c.seoDescription,
    productCount: c.productCount ?? 0,
    createdAt: iso(c.createdAt)!,
    updatedAt: iso(c.updatedAt)!,
  };
}

async function treeNodes(): Promise<AdminCategoryNode[]> {
  const all = await Category.find().sort({ level: 1, order: 1, _id: 1 }).lean();
  const byParent = new Map<string, ICategory[]>();
  for (const c of all) {
    const k = c.parent ? String(c.parent) : 'root';
    byParent.set(k, [...(byParent.get(k) ?? []), c]);
  }
  const build = (c: ICategory): AdminCategoryNode => ({ ...toAdminCategory(c), children: (byParent.get(String(c._id)) ?? []).map(build) });
  return (byParent.get('root') ?? []).map(build);
}

async function resolveParent(parentId: string | undefined, selfId?: Types.ObjectId) {
  if (!parentId) return { parent: null, ancestors: [] as Types.ObjectId[], level: 0 };
  const parent = await Category.findById(parentId).lean();
  if (!parent) throw new HttpError(422, 'VALIDATION_ERROR', 'Parent category not found', { fields: { parent: 'errors.NOT_FOUND' } });
  if (selfId && (String(parent._id) === String(selfId) || parent.ancestors.some((a) => String(a) === String(selfId)))) {
    throw new HttpError(422, 'VALIDATION_ERROR', 'A category cannot be moved inside itself', { fields: { parent: 'validation.oneOf' } });
  }
  return { parent: parent._id, ancestors: [...parent.ancestors, parent._id], level: parent.level + 1 };
}

/** After moving a category, fix ancestors/level of the whole subtree and product category paths. */
async function rebuildSubtree(rootId: Types.ObjectId) {
  const root = await Category.findById(rootId).lean();
  if (!root) return;
  const queue: ICategory[] = [root];
  while (queue.length) {
    const node = queue.shift()!;
    const children = await Category.find({ parent: node._id }).lean();
    for (const child of children) {
      const ancestors = [...node.ancestors, node._id];
      await Category.updateOne({ _id: child._id }, { $set: { ancestors, level: ancestors.length } });
      queue.push({ ...child, ancestors, level: ancestors.length });
    }
  }
}

categoriesAdminRouter.get('/', requirePermission('categories.read'), async (_req, res) => {
  ok(res, await treeNodes());
});

categoriesAdminRouter.get('/:id', requirePermission('categories.read'), validate({ params: idParams }), async (req, res) => {
  const c = await Category.findById(params<{ id: string }>(req).id).lean();
  if (!c) throw notFound('Category');
  ok(res, toAdminCategory(c));
});

categoriesAdminRouter.post('/', requirePermission('categories.create'), validate({ body: categoryInputSchema }), async (req, res) => {
  const input = body<CategoryInput & { parent?: string; slug?: string; image?: { media: string } | null }>(req);
  const slug = input.slug || slugify(input.name?.en || input.name?.uz || input.name?.ru || '');
  if (!slug) throw new HttpError(422, 'VALIDATION_ERROR', 'Slug is required', { fields: { slug: 'validation.required' } });
  if (await Category.exists({ slug })) throw new HttpError(409, 'CONFLICT', 'Slug already used', { fields: { slug: 'validation.duplicate' } });
  const tree = await resolveParent(input.parent);
  const doc = await Category.create({ ...input, slug, ...tree, image: input.image?.media ? await imageFromMediaId(input.image.media) : undefined });
  await invalidate();
  await audit(req, { action: 'category.create', target: { type: 'category', id: String(doc._id), label: doc.slug } });
  created(res, toAdminCategory(doc.toObject() as ICategory));
});

categoriesAdminRouter.put('/:id', requirePermission('categories.update'), validate({ params: idParams, body: categoryInputSchema.partial() }), async (req, res) => {
  const existing = await Category.findById(params<{ id: string }>(req).id).lean();
  if (!existing) throw notFound('Category');
  const input = body<Partial<CategoryInput> & { parent?: string; slug?: string; image?: { media: string } | null }>(req);
  const set: Record<string, unknown> = { ...input };
  delete set.image;
  if (input.slug && input.slug !== existing.slug && (await Category.exists({ slug: input.slug }))) {
    throw new HttpError(409, 'CONFLICT', 'Slug already used', { fields: { slug: 'validation.duplicate' } });
  }
  const parentChanged = 'parent' in input && String(input.parent ?? '') !== String(existing.parent ?? '');
  if (parentChanged) Object.assign(set, await resolveParent(input.parent, existing._id));
  if (input.image !== undefined) set.image = input.image?.media ? await imageFromMediaId(input.image.media) : undefined;
  await Category.updateOne({ _id: existing._id }, { $set: set });
  if (parentChanged) await rebuildSubtree(existing._id);
  await invalidate();
  if (parentChanged || input.name) {
    const ids = [existing._id, ...(await Category.find({ ancestors: existing._id }).distinct('_id'))];
    await reindexProducts({ category: { $in: ids } });
    await recountCatalog();
  }
  const fresh = (await Category.findById(existing._id).lean())!;
  await audit(req, { action: 'category.update', target: { type: 'category', id: String(existing._id), label: fresh.slug }, changes: diff({ name: existing.name, parent: String(existing.parent), isActive: existing.isActive, order: existing.order }, { name: fresh.name, parent: String(fresh.parent), isActive: fresh.isActive, order: fresh.order }) });
  ok(res, toAdminCategory(fresh));
});

categoriesAdminRouter.post('/reorder', requirePermission('categories.update'), validate({ body: reorderSchema }), async (req, res) => {
  const { items } = body<{ items: Array<{ id: string; order: number; parent?: string }> }>(req);
  for (const item of items) {
    const set: Record<string, unknown> = { order: item.order };
    if (item.parent !== undefined) Object.assign(set, await resolveParent(item.parent || undefined, new Types.ObjectId(item.id)));
    await Category.updateOne({ _id: item.id }, { $set: set });
    if (item.parent !== undefined) await rebuildSubtree(new Types.ObjectId(item.id));
  }
  await invalidate();
  await reindexProducts({});
  await recountCatalog();
  await audit(req, { action: 'category.reorder', target: { type: 'category' }, meta: { count: items.length } });
  noContent(res);
});

categoriesAdminRouter.delete('/:id', requirePermission('categories.delete'), validate({ params: idParams }), async (req, res) => {
  const existing = await Category.findById(params<{ id: string }>(req).id).lean();
  if (!existing) throw notFound('Category');
  if (await Category.exists({ parent: existing._id })) throw new HttpError(409, 'IN_USE', 'Delete or move the subcategories first');
  if (await Product.exists({ category: existing._id })) throw new HttpError(409, 'IN_USE', 'Category contains products — move them first');
  await Category.deleteOne({ _id: existing._id });
  await invalidate();
  await audit(req, { action: 'category.delete', target: { type: 'category', id: String(existing._id), label: existing.slug } });
  noContent(res);
});

/* --------------------------------- brands -------------------------------- */

function toAdminBrand(b: IBrand): AdminBrand {
  return {
    id: String(b._id),
    slug: b.slug,
    name: b.name,
    description: b.description,
    country: b.country,
    website: b.website,
    logo: img(b.logo),
    isActive: b.isActive,
    productCount: b.productCount ?? 0,
    createdAt: iso(b.createdAt)!,
    updatedAt: iso(b.updatedAt)!,
  };
}

const brandList = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  q: z.string().trim().max(80).optional(),
});

brandsAdminRouter.get('/', requirePermission('brands.read'), validate({ query: brandList }), async (req, res) => {
  const q = query<z.output<typeof brandList>>(req);
  const filter = q.q ? { name: { $regex: q.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } } : {};
  const [items, total] = await Promise.all([
    Brand.find(filter).sort({ name: 1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    Brand.countDocuments(filter),
  ]);
  paged(res, items.map(toAdminBrand), pageMeta(q.page, q.limit, total));
});

brandsAdminRouter.get('/:id', requirePermission('brands.read'), validate({ params: idParams }), async (req, res) => {
  const b = await Brand.findById(params<{ id: string }>(req).id).lean();
  if (!b) throw notFound('Brand');
  ok(res, toAdminBrand(b));
});

brandsAdminRouter.post('/', requirePermission('brands.create'), validate({ body: brandInputSchema }), async (req, res) => {
  const input = body<{ name: string; slug?: string; logo?: { media: string } | null } & Record<string, unknown>>(req);
  const slug = input.slug ?? slugify(input.name);
  if (await Brand.exists({ slug })) throw new HttpError(409, 'CONFLICT', 'Slug already used', { fields: { slug: 'validation.duplicate' } });
  const doc = await Brand.create({ ...input, slug, logo: input.logo?.media ? await imageFromMediaId(input.logo.media) : undefined });
  await invalidate();
  await audit(req, { action: 'brand.create', target: { type: 'brand', id: String(doc._id), label: doc.name } });
  created(res, toAdminBrand(doc.toObject() as IBrand));
});

brandsAdminRouter.put('/:id', requirePermission('brands.update'), validate({ params: idParams, body: brandInputSchema.partial() }), async (req, res) => {
  const existing = await Brand.findById(params<{ id: string }>(req).id).lean();
  if (!existing) throw notFound('Brand');
  const input = body<{ name?: string; slug?: string; logo?: { media: string } | null } & Record<string, unknown>>(req);
  if (input.slug && input.slug !== existing.slug && (await Brand.exists({ slug: input.slug }))) {
    throw new HttpError(409, 'CONFLICT', 'Slug already used', { fields: { slug: 'validation.duplicate' } });
  }
  const set: Record<string, unknown> = { ...input };
  delete set.logo;
  if (input.logo !== undefined) set.logo = input.logo?.media ? await imageFromMediaId(input.logo.media) : undefined;
  await Brand.updateOne({ _id: existing._id }, { $set: set });
  await invalidate();
  if (input.name && input.name !== existing.name) await reindexProducts({ brand: existing._id });
  const fresh = (await Brand.findById(existing._id).lean())!;
  await audit(req, { action: 'brand.update', target: { type: 'brand', id: String(existing._id), label: fresh.name }, changes: diff({ name: existing.name, isActive: existing.isActive }, { name: fresh.name, isActive: fresh.isActive }) });
  ok(res, toAdminBrand(fresh));
});

brandsAdminRouter.delete('/:id', requirePermission('brands.delete'), validate({ params: idParams }), async (req, res) => {
  const existing = await Brand.findById(params<{ id: string }>(req).id).lean();
  if (!existing) throw notFound('Brand');
  if (await Product.exists({ brand: existing._id })) throw new HttpError(409, 'IN_USE', 'Brand is used by products');
  await Brand.deleteOne({ _id: existing._id });
  await invalidate();
  await audit(req, { action: 'brand.delete', target: { type: 'brand', id: String(existing._id), label: existing.name } });
  noContent(res);
});

/* ------------------------------ specifications ---------------------------- */

const toAdminSpec = (s: IProductSpecification): AdminSpecDefinition => ({
  id: String(s._id),
  key: s.key,
  label: s.label,
  unit: s.unit,
  type: s.type,
  filterable: s.filterable,
  group: s.group,
  order: s.order,
  categories: (s.categories ?? []).map(String),
});

specsAdminRouter.get('/', requirePermission('products.read'), async (_req, res) => {
  ok(res, (await ProductSpecification.find().sort({ order: 1, key: 1 }).lean()).map(toAdminSpec));
});

specsAdminRouter.post('/', requirePermission('products.update'), validate({ body: specDefinitionInputSchema }), async (req, res) => {
  const input = body<{ key: string } & Record<string, unknown>>(req);
  if (await ProductSpecification.exists({ key: input.key })) throw new HttpError(409, 'CONFLICT', 'Key already exists', { fields: { key: 'validation.duplicate' } });
  const doc = await ProductSpecification.create(input);
  await invalidate();
  await audit(req, { action: 'spec.create', target: { type: 'spec', id: String(doc._id), label: doc.key } });
  created(res, toAdminSpec(doc.toObject() as IProductSpecification));
});

specsAdminRouter.put('/:id', requirePermission('products.update'), validate({ params: idParams, body: specDefinitionInputSchema.partial().omit({ key: true }) }), async (req, res) => {
  const doc = await ProductSpecification.findByIdAndUpdate(params<{ id: string }>(req).id, { $set: body(req) }, { new: true }).lean();
  if (!doc) throw notFound('Specification');
  await invalidate();
  await audit(req, { action: 'spec.update', target: { type: 'spec', id: String(doc._id), label: doc.key } });
  ok(res, toAdminSpec(doc));
});

specsAdminRouter.delete('/:id', requirePermission('products.delete'), validate({ params: idParams }), async (req, res) => {
  const doc = await ProductSpecification.findById(params<{ id: string }>(req).id).lean();
  if (!doc) throw notFound('Specification');
  if (await Product.exists({ 'specs.key': doc.key })) throw new HttpError(409, 'IN_USE', 'Specification is used by products');
  await ProductSpecification.deleteOne({ _id: doc._id });
  await invalidate();
  await audit(req, { action: 'spec.delete', target: { type: 'spec', id: String(doc._id), label: doc.key } });
  noContent(res);
});
