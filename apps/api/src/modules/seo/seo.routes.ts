import { Router } from 'express';
import { z } from '@vero/validation';
import { env, isProd } from '../../config/env';
import { validate, params, query } from '../../middleware/validate';
import { notFound } from '../../lib/http-error';
import { ok, publicCache } from '../../lib/respond';
import { seoLimiter } from '../../middleware/rate-limit';
import { renderSitemapIndex, renderUrlSet, resolveMeta, robotsTxt, sitemapEntries, SITEMAP_CHUNK } from './seo.service';

/** Mounted at the API root: /robots.txt, /sitemap.xml, /sitemap-N.xml (the storefront proxies these). */
export const seoRootRouter = Router();
/** Mounted at /api/seo. */
export const seoApiRouter = Router();

seoRootRouter.get('/robots.txt', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(robotsTxt(isProd && env.SEO_INDEXING));
});

seoRootRouter.get('/sitemap.xml', async (_req, res) => {
  const entries = await sitemapEntries();
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=900');
  if (entries.length <= SITEMAP_CHUNK) return void res.send(renderUrlSet(entries));
  res.send(renderSitemapIndex(Math.ceil(entries.length / SITEMAP_CHUNK)));
});

seoRootRouter.get('/sitemap-:page.xml', validate({ params: z.object({ page: z.coerce.number().int().min(1).max(1000) }) }), async (req, res) => {
  const { page } = params<{ page: number }>(req);
  const entries = await sitemapEntries();
  const chunk = entries.slice((page - 1) * SITEMAP_CHUNK, page * SITEMAP_CHUNK);
  if (!chunk.length) throw notFound('Sitemap');
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=900');
  res.send(renderUrlSet(chunk));
});

seoApiRouter.get('/meta', seoLimiter, validate({ query: z.object({ path: z.string().max(2048).default('/') }) }), async (req, res) => {
  const meta = await resolveMeta(query<{ path: string }>(req).path);
  publicCache(res, 120);
  ok(res, meta);
});
