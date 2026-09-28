/**
 * VERO TOOLS storefront — production server.
 *
 *  - serves the Vite build (hashed assets: 1 year immutable, index.html: no-cache)
 *  - proxies /api, /uploads, /socket.io (websocket), /sitemap*.xml and /robots.txt to the API
 *  - injects per-URL SEO (title, description, canonical, hreflang, Open Graph, Twitter, robots, JSON-LD,
 *    <html lang>, HTTP status) from GET /api/seo/meta?path=… — cached 60 s, 1.5 s timeout, plain HTML fallback
 *  - security headers (CSP with frame-ancestors, nosniff, referrer policy)
 *
 * Env: PORT (default 3000), API_INTERNAL_URL (default http://localhost:4000)
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import compression from 'compression';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(HERE, '../dist');
const INDEX_FILE = path.join(DIST, 'index.html');
const API = (process.env.API_INTERNAL_URL || 'http://localhost:4000').replace(/\/+$/, '');
const PORT = Number(process.env.PORT) || 3000;
const SEO_TIMEOUT_MS = 1500;
const SEO_TTL_MS = 60_000;
const SEO_CACHE_MAX = 2000;
const LANGS = ['uz', 'ru', 'en'];
const DEFAULT_SITE_NAME = 'VERO TOOLS';

if (!existsSync(INDEX_FILE)) {
  console.error(`[web] ${INDEX_FILE} not found — run "npm run build -w @vero/web" first.`);
  process.exit(1);
}

const template = readFileSync(INDEX_FILE, 'utf8');

/* ------------------------------------------------------------------ security headers */

/** CSP hashes of the inline scripts in index.html (the theme bootstrap), computed from the build. */
function inlineScriptHashes(html) {
  const hashes = [];
  const re = /<script(?![^>]*\bsrc=)(?![^>]*type=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) {
    if (m[1].trim()) hashes.push(`'sha256-${createHash('sha256').update(m[1], 'utf8').digest('base64')}'`);
  }
  return hashes;
}

const scriptHashes = inlineScriptHashes(template);

function contentSecurityPolicy(req) {
  const host = req.headers.host;
  const ws = host ? ` ws://${host} wss://${host}` : '';
  return [
    "default-src 'self'",
    `script-src 'self' ${scriptHashes.join(' ')}`.trim(),
    // Radix / sonner inject small <style> elements at runtime
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self'${ws}`,
    // contacts page map
    'frame-src https://www.openstreetmap.org',
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
  ].join('; ');
}

function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), payment=(), usb=()');
  res.setHeader('Content-Security-Policy', contentSecurityPolicy(req));
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
}

/* ------------------------------------------------------------------ SEO */

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** JSON inside <script type="application/ld+json">: "<" can never close the element. */
const jsonForScript = (value) =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028')
    .replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029');

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The API appends the store name to SEO titles that may already contain it ("… | VERO TOOLS | VERO TOOLS"). */
function dedupeTitle(title, siteName) {
  if (!title || !siteName) return title;
  const suffix = new RegExp(`(?:\\s*\\|\\s*${escapeRegExp(siteName)})+\\s*$`, 'i');
  return suffix.test(title) ? title.replace(suffix, ` | ${siteName}`) : title;
}

const langOfPath = (pathname) => {
  const m = /^\/(ru|en|uz)(?=\/|$)/.exec(pathname);
  return m ? m[1] : 'uz';
};

/** Small TTL + LRU cache (Map keeps insertion order). */
const seoCache = new Map();
const inflight = new Map();

function cacheGet(key) {
  const hit = seoCache.get(key);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) {
    seoCache.delete(key);
    return undefined;
  }
  seoCache.delete(key);
  seoCache.set(key, hit);
  return hit.value;
}

function cacheSet(key, value) {
  seoCache.set(key, { value, expires: Date.now() + SEO_TTL_MS });
  while (seoCache.size > SEO_CACHE_MAX) seoCache.delete(seoCache.keys().next().value);
}

async function fetchSeo(pathname) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEO_TIMEOUT_MS);
  try {
    const res = await fetch(`${API}/api/seo/meta?path=${encodeURIComponent(pathname)}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'X-Client': 'web' },
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body && typeof body === 'object' && body.data && typeof body.data === 'object' ? body.data : null;
  } catch {
    return null; // timeout / API down → plain HTML
  } finally {
    clearTimeout(timer);
  }
}

async function seoFor(pathname) {
  const cached = cacheGet(pathname);
  if (cached !== undefined) return cached;
  let pending = inflight.get(pathname);
  if (!pending) {
    pending = fetchSeo(pathname).then((meta) => {
      // failures are not cached, so the next request retries
      if (meta) cacheSet(pathname, meta);
      return meta;
    });
    inflight.set(pathname, pending);
    pending.finally(() => inflight.delete(pathname)).catch(() => {});
  }
  return pending;
}

function seoTags(meta) {
  const siteName = meta.siteName || DEFAULT_SITE_NAME;
  const title = dedupeTitle(meta.title || siteName, siteName);
  const description = meta.description ? String(meta.description).replace(/\s+/g, ' ').trim().slice(0, 300) : '';
  const tags = [`<title>${escapeHtml(title)}</title>`];
  if (description) tags.push(`<meta name="description" content="${escapeHtml(description)}" />`);
  if (meta.noindex) tags.push('<meta name="robots" content="noindex, follow" />');
  if (meta.canonical) tags.push(`<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`);
  for (const alt of Array.isArray(meta.alternates) ? meta.alternates : []) {
    if (alt && alt.hreflang && alt.href) tags.push(`<link rel="alternate" hreflang="${escapeHtml(alt.hreflang)}" href="${escapeHtml(alt.href)}" />`);
  }
  tags.push(`<meta property="og:type" content="${escapeHtml(meta.type === 'product' ? 'product' : 'website')}" />`);
  tags.push(`<meta property="og:site_name" content="${escapeHtml(siteName)}" />`);
  tags.push(`<meta property="og:title" content="${escapeHtml(title)}" />`);
  if (description) tags.push(`<meta property="og:description" content="${escapeHtml(description)}" />`);
  if (meta.canonical) tags.push(`<meta property="og:url" content="${escapeHtml(meta.canonical)}" />`);
  if (meta.locale) tags.push(`<meta property="og:locale" content="${escapeHtml(meta.locale)}" />`);
  if (meta.image) tags.push(`<meta property="og:image" content="${escapeHtml(meta.image)}" />`);
  tags.push(`<meta name="twitter:card" content="${meta.image ? 'summary_large_image' : 'summary'}" />`);
  tags.push(`<meta name="twitter:title" content="${escapeHtml(title)}" />`);
  if (description) tags.push(`<meta name="twitter:description" content="${escapeHtml(description)}" />`);
  if (meta.image) tags.push(`<meta name="twitter:image" content="${escapeHtml(meta.image)}" />`);
  const jsonLd = Array.isArray(meta.jsonLd) ? meta.jsonLd : meta.jsonLd ? [meta.jsonLd] : [];
  for (const block of jsonLd) tags.push(`<script type="application/ld+json">${jsonForScript(block)}</script>`);
  return tags.join('\n    ');
}

function renderHtml(meta, pathname) {
  const lang = meta && LANGS.includes(meta.lang) ? meta.lang : langOfPath(pathname);
  let html = template.replace(/<html([^>]*)\blang="[^"]*"/i, `<html$1lang="${lang}"`);
  if (meta) html = html.replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->/, seoTags(meta));
  return html;
}

/* ------------------------------------------------------------------ app */

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

app.get('/healthz', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ status: 'ok' });
});

/* ------------------------------------------ mobile app links (optional) */
// iOS universal links and Android App Links open storefront URLs in the VERO TOOLS app. The operating
// systems verify them with these two files, which are served only when the app identifiers are configured
// (apple team + bundle id, Android signing certificate fingerprints); otherwise they are plain 404s.
const list = (value) =>
  String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
// the same path prefixes as the intent filters in apps/mobile/app.config.ts
const APP_LINK_PATHS = ['/product/*', '/catalog', '/catalog/*', '/account', '/account/*', '/promotions', '/promotions/*', '/brands', '/brands/*'];
const IOS_APP_IDS = list(process.env.IOS_APP_IDS); // e.g. ABCDE12345.uz.verotools.app
const ANDROID_PACKAGE = (process.env.ANDROID_APP_PACKAGE || 'uz.verotools.app').trim();
const ANDROID_FINGERPRINTS = list(process.env.ANDROID_SHA256_FINGERPRINTS).map((f) => f.toUpperCase());

app.get('/.well-known/apple-app-site-association', (_req, res, next) => {
  if (!IOS_APP_IDS.length) return next();
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.type('application/json').send(
    JSON.stringify({
      applinks: { details: [{ appIDs: IOS_APP_IDS, components: APP_LINK_PATHS.map((p) => ({ '/': p })) }] },
      webcredentials: { apps: IOS_APP_IDS },
    }),
  );
});

app.get('/.well-known/assetlinks.json', (_req, res, next) => {
  if (!ANDROID_FINGERPRINTS.length) return next();
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.type('application/json').send(
    JSON.stringify([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: { namespace: 'android_app', package_name: ANDROID_PACKAGE, sha256_cert_fingerprints: ANDROID_FINGERPRINTS },
      },
    ]),
  );
});

// nothing else lives under /.well-known (never the app shell)
app.use('/.well-known', (_req, res) => {
  res.status(404).type('text/plain').send('Not found');
});

// API, media, realtime and SEO files come from the API (before compression: responses are streamed as is)
const apiProxy = createProxyMiddleware({
  target: API,
  changeOrigin: true,
  ws: true,
  xfwd: true,
  pathFilter: (pathname) =>
    pathname === '/api' ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/uploads/') ||
    pathname === '/socket.io' ||
    pathname.startsWith('/socket.io/') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    /^\/sitemap-[\w-]+\.xml$/.test(pathname),
  on: {
    error: (err, _req, resOrSocket) => {
      console.error('[web] proxy error:', err.message);
      // websocket upgrade errors give a socket, not a response
      if (resOrSocket && typeof resOrSocket.writeHead === 'function' && !resOrSocket.headersSent) {
        resOrSocket.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        resOrSocket.end(JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message: 'API is unavailable' } }));
      } else if (resOrSocket && typeof resOrSocket.destroy === 'function') {
        resOrSocket.destroy();
      }
    },
  },
});
app.use(apiProxy);

app.use(securityHeaders);
app.use(compression());

// hashed build assets: cache forever
app.use(
  '/assets',
  express.static(path.join(DIST, 'assets'), {
    index: false,
    immutable: true,
    maxAge: '365d',
    fallthrough: false,
  }),
);

// other public files (icons, manifest, og-image): short cache, never index.html
app.use(
  express.static(DIST, {
    index: false,
    maxAge: '1h',
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
      if (filePath.endsWith('.webmanifest')) res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    },
  }),
);

// SPA routes: index.html with SEO for the requested URL
app.get(/.*/, async (req, res, next) => {
  const pathname = req.path;
  // unknown files (/favicon.png, /x.js …) are real 404s, not the app shell
  if (/\.[a-z0-9]{2,8}$/i.test(pathname) && !pathname.endsWith('.html')) return next();
  // Uzbek is the unprefixed default language: /uz/… is a permanent alias
  if (/^\/uz(?=\/|$)/.test(pathname)) {
    const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
    return res.redirect(301, `${pathname.replace(/^\/uz/, '') || '/'}${query}`);
  }
  let meta = null;
  try {
    meta = await seoFor(pathname);
  } catch {
    meta = null;
  }
  const status = meta && Number.isInteger(meta.status) && meta.status >= 200 && meta.status < 600 ? meta.status : 200;
  res.status(status);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Vary', 'Accept-Encoding');
  res.send(renderHtml(meta, pathname));
});

app.use((_req, res) => {
  res.status(404).type('text/plain').send('Not found');
});

app.use((err, _req, res, _next) => {
  if (err && (err.status === 404 || err.statusCode === 404)) return res.status(404).type('text/plain').send('Not found');
  console.error('[web] error:', err);
  if (!res.headersSent) res.status(500).type('text/plain').send('Internal server error');
});

const server = app.listen(PORT, () => {
  console.log(`[web] VERO TOOLS storefront on http://localhost:${PORT} → API ${API}`);
});
server.on('upgrade', apiProxy.upgrade);

const shutdown = (signal) => {
  console.log(`[web] ${signal} — shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 8000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
