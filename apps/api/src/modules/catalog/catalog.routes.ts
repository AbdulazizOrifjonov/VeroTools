import { Router } from 'express';
import { parseProductListQuery, searchQuerySchema, z } from '@vero/validation';
import { optionalAuth } from '../../middleware/auth';
import { validate, params, query } from '../../middleware/validate';
import { notFound } from '../../lib/http-error';
import { ok, paged, publicCache } from '../../lib/respond';
import { pageMeta } from '../../lib/pagination';
import { loc } from '../../lib/localize';
import { cache, CacheTags } from '../../lib/cache';
import { buildCategoryTree, toBrandDetail, toBrandSummary, toBreadcrumbs, toCategorySummary } from './serializers';
import { getCatalogIndex } from './catalog-index';
import * as products from './products.service';
import { productReviewsRouter } from '../reviews/reviews.routes';
import { HttpError } from '../../lib/http-error';

export const categoriesRouter = Router();
export const brandsRouter = Router();
export const productsRouter = Router();
export const searchRouter = Router();

/* ------------------------------ categories ------------------------------ */

categoriesRouter.get('/', async (req, res) => {
  const tree = await cache.wrap(`${CacheTags.catalog}tree:${req.ctx.lang}`, 120, async () => buildCategoryTree(await getCatalogIndex(), req.ctx.lang));
  publicCache(res, 120);
  ok(res, tree);
});

categoriesRouter.get('/:slug', validate({ params: z.object({ slug: z.string().min(1).max(120) }) }), async (req, res) => {
  const idx = await getCatalogIndex();
  const cat = idx.categoriesBySlug.get(params<{ slug: string }>(req).slug.toLowerCase());
  if (!cat || !cat.isActive) throw notFound('Category');
  publicCache(res, 120);
  ok(res, {
    ...toCategorySummary(cat, req.ctx.lang),
    description: loc(cat.description, req.ctx.lang) || undefined,
    breadcrumbs: toBreadcrumbs(idx, cat._id, req.ctx.lang),
    children: (idx.children.get(String(cat._id)) ?? []).filter((c) => c.isActive).map((c) => toCategorySummary(c, req.ctx.lang)),
    seoTitle: loc(cat.seoTitle, req.ctx.lang) || undefined,
    seoDescription: loc(cat.seoDescription, req.ctx.lang) || undefined,
  });
});

/* -------------------------------- brands -------------------------------- */

const brandQuery = z.object({
  q: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

brandsRouter.get('/', validate({ query: brandQuery }), async (req, res) => {
  const q = query<z.output<typeof brandQuery>>(req);
  const idx = await getCatalogIndex();
  let list = [...idx.brands.values()].filter((b) => b.isActive);
  if (q.q) list = list.filter((b) => b.name.toLowerCase().includes(q.q!.toLowerCase()));
  list.sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name));
  const total = list.length;
  const items = list.slice((q.page - 1) * q.limit, q.page * q.limit).map((b) => toBrandSummary(b, req.ctx.lang));
  publicCache(res, 300);
  paged(res, items, pageMeta(q.page, q.limit, total));
});

brandsRouter.get('/:slug', validate({ params: z.object({ slug: z.string().min(1).max(120) }) }), async (req, res) => {
  const idx = await getCatalogIndex();
  const brand = idx.brandsBySlug.get(params<{ slug: string }>(req).slug.toLowerCase());
  if (!brand || !brand.isActive) throw notFound('Brand');
  publicCache(res, 300);
  ok(res, toBrandDetail(brand, req.ctx.lang));
});

/* ------------------------------- products ------------------------------- */

function listQuery(req: import('express').Request) {
  try {
    return parseProductListQuery(new URL(req.originalUrl, 'http://x').searchParams);
  } catch {
    throw new HttpError(422, 'VALIDATION_ERROR', 'Invalid filter parameters');
  }
}

productsRouter.get('/', optionalAuth, async (req, res) => {
  const q = listQuery(req);
  const result = await products.listProducts(q, { lang: req.ctx.lang, userId: req.auth?.id, track: true });
  if (!q.q) publicCache(res, 30);
  paged(res, result.items, result.meta);
});

productsRouter.get('/facets', async (req, res) => {
  const q = listQuery(req);
  publicCache(res, 60);
  ok(res, await products.productFacets(q, req.ctx.lang));
});

productsRouter.get('/:slug', validate({ params: z.object({ slug: z.string().min(1).max(160) }) }), async (req, res) => {
  const slug = params<{ slug: string }>(req).slug;
  publicCache(res, 30);
  ok(res, await products.productDetail(slug, req.ctx.lang, req.ctx.guestId ?? req.ctx.ip));
});

productsRouter.get('/:id/related', validate({ params: z.object({ id: z.string().regex(/^[a-f0-9]{24}$/i) }) }), async (req, res) => {
  publicCache(res, 300);
  ok(res, await products.relatedProducts(params<{ id: string }>(req).id, req.ctx.lang));
});

productsRouter.use('/:id', productReviewsRouter);

/* -------------------------------- search -------------------------------- */

searchRouter.get('/suggest', validate({ query: searchQuerySchema }), async (req, res) => {
  const q = query<{ q: string; limit: number }>(req);
  publicCache(res, 30);
  ok(res, await products.searchSuggestions(q.q, req.ctx.lang, q.limit));
});

searchRouter.get('/popular', async (_req, res) => {
  publicCache(res, 600);
  ok(res, await products.popularSearches(10));
});
