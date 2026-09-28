import type { Types } from 'mongoose';
import { Brand, type IBrand } from '../../models/brand.model';
import { Category, type ICategory } from '../../models/category.model';
import { ProductSpecification, type IProductSpecification } from '../../models/product-specification.model';

/**
 * In-process index of the (small) category / brand / spec-definition collections, used by serializers,
 * search and facets. Refreshed every 60 s and invalidated explicitly after admin changes.
 */
export interface CatalogIndex {
  categories: Map<string, ICategory>;
  categoriesBySlug: Map<string, ICategory>;
  children: Map<string, ICategory[]>;
  roots: ICategory[];
  brands: Map<string, IBrand>;
  brandsBySlug: Map<string, IBrand>;
  specs: Map<string, IProductSpecification>;
  loadedAt: number;
}

let index: CatalogIndex | null = null;
let loading: Promise<CatalogIndex> | null = null;
const TTL = 60_000;

async function load(): Promise<CatalogIndex> {
  const [cats, brands, specs] = await Promise.all([
    Category.find().sort({ level: 1, order: 1, _id: 1 }).lean(),
    Brand.find().sort({ name: 1 }).lean(),
    ProductSpecification.find().sort({ order: 1 }).lean(),
  ]);
  const categories = new Map(cats.map((c) => [String(c._id), c]));
  const children = new Map<string, ICategory[]>();
  const roots: ICategory[] = [];
  for (const c of cats) {
    if (c.parent) {
      const k = String(c.parent);
      children.set(k, [...(children.get(k) ?? []), c]);
    } else roots.push(c);
  }
  return {
    categories,
    categoriesBySlug: new Map(cats.map((c) => [c.slug, c])),
    children,
    roots,
    brands: new Map(brands.map((b) => [String(b._id), b])),
    brandsBySlug: new Map(brands.map((b) => [b.slug, b])),
    specs: new Map(specs.map((s) => [s.key, s])),
    loadedAt: Date.now(),
  };
}

export async function getCatalogIndex(): Promise<CatalogIndex> {
  if (index && Date.now() - index.loadedAt < TTL) return index;
  if (!loading) {
    loading = load()
      .then((i) => (index = i))
      .finally(() => (loading = null));
  }
  return loading;
}

export function invalidateCatalogIndex() {
  index = null;
}

/** Category ids of `categoryId` and all of its descendants. */
export function descendantIds(idx: CatalogIndex, categoryId: string): string[] {
  const out: string[] = [];
  const stack = [categoryId];
  while (stack.length) {
    const id = stack.pop()!;
    out.push(id);
    for (const child of idx.children.get(id) ?? []) stack.push(String(child._id));
  }
  return out;
}

/** Filterable spec keys for a category (own + inherited from ancestors). */
export function categorySpecKeys(idx: CatalogIndex, categoryId: string): string[] {
  const cat = idx.categories.get(categoryId);
  if (!cat) return [];
  const keys = new Set<string>(cat.specKeys ?? []);
  for (const a of cat.ancestors ?? []) for (const k of idx.categories.get(String(a))?.specKeys ?? []) keys.add(k);
  return [...keys];
}

export function breadcrumbsFor(idx: CatalogIndex, categoryId: Types.ObjectId | string | null | undefined) {
  if (!categoryId) return [];
  const cat = idx.categories.get(String(categoryId));
  if (!cat) return [];
  return [...(cat.ancestors ?? []).map((a) => idx.categories.get(String(a))).filter(Boolean), cat] as ICategory[];
}
