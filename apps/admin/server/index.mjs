/**
 * VERO TOOLS admin panel — production server.
 *
 *  - serves the Vite build: hashed files under /assets are cached for a year (immutable), index.html is
 *    never cached, every other client route falls back to index.html (SPA)
 *  - proxies /api, /uploads and /socket.io (WebSocket upgrade included) to the API, so the panel stays
 *    same-origin: the httpOnly refresh cookie, CSP `connect-src 'self'` and images all work without CORS
 *  - security headers: CSP (own scripts + the hashed inline theme bootstrap, images from self/data:/blob:,
 *    WebSocket to the same host, frame-ancestors 'none'), nosniff, referrer policy, X-Robots-Tag noindex
 *  - gzip compression of the panel's own files (API responses are streamed through untouched)
 *
 * Env:
 *   PORT               listen port (default 3001)
 *   HOST               listen address (default 0.0.0.0)
 *   API_INTERNAL_URL   API base URL as seen from this server (default http://localhost:4000)
 *   TRUST_PROXY        Express "trust proxy" value when running behind a reverse proxy (default: loopback)
 *   ASSET_ORIGINS      optional extra image origins for the CSP, space separated (e.g. a CDN for uploads)
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
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const ASSET_ORIGINS = (process.env.ASSET_ORIGINS || '').split(/\s+/).filter((o) => /^https?:\/\/[^\s/]+$/i.test(o));
const PROXIED = ['/api', '/uploads', '/socket.io'];

if (!existsSync(INDEX_FILE)) {
  console.error(`[admin] ${INDEX_FILE} not found — run "npm run build -w @vero/admin" first.`);
  process.exit(1);
}

const indexHtml = readFileSync(INDEX_FILE, 'utf8');

/* ---------------------------------------------------------------------------- security headers */

/** CSP hashes of the inline scripts of index.html (the theme bootstrap that prevents a light/dark flash). */
function inlineScriptHashes(html) {
  const hashes = [];
  for (const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
    if (m[1].trim()) hashes.push(`'sha256-${createHash('sha256').update(m[1], 'utf8').digest('base64')}'`);
  }
  return hashes;
}

const SCRIPT_HASHES = inlineScriptHashes(indexHtml);

/** Host header → only a plain host[:port] is echoed into the CSP. */
function safeHost(req) {
  const host = req.headers.host || '';
  return /^[a-z0-9.-]+(?::\d{1,5})?$/i.test(host) || /^\[[0-9a-f:]+\](?::\d{1,5})?$/i.test(host) ? host : '';
}

function contentSecurityPolicy(req) {
  const host = safeHost(req);
  const ws = host ? ` ws://${host} wss://${host}` : '';
  return [
    "default-src 'self'",
    ["script-src 'self'", ...SCRIPT_HASHES].join(' '),
    // Radix, sonner and recharts set inline style attributes / small <style> elements at runtime
    "style-src 'self' 'unsafe-inline'",
    // https: — product images may live on S3 / Cloudinary / a CDN (ASSET_ORIGINS stays for explicit http origins)
    ["img-src 'self' data: blob: https:", ...ASSET_ORIGINS].join(' '),
    "font-src 'self' data:",
    `connect-src 'self'${ws}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; ');
}

function securityHeaders(req, res, next) {
  res.setHeader('Content-Security-Policy', contentSecurityPolicy(req));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()');
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
}

/* ------------------------------------------------------------------------------------ API proxy */

const apiProxy = createProxyMiddleware({
  target: API,
  pathFilter: PROXIED,
  changeOrigin: true,
  xfwd: true,
  ws: true,
  // report exports and uploads can take a while
  proxyTimeout: 120_000,
  timeout: 120_000,
  on: {
    error(err, req, res) {
      console.error(`[admin] proxy ${req.method} ${req.url?.split('?')[0]} → ${API}: ${err.code || err.message}`);
      // `res` is a socket for failed WebSocket upgrades
      if (!res || typeof res.writeHead !== 'function') {
        res?.destroy?.();
        return;
      }
      if (res.headersSent) return res.end();
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message: 'The API is not reachable' } }));
    },
  },
});

/* ------------------------------------------------------------------------------------------ app */

const app = express();
app.disable('x-powered-by');
/** TRUST_PROXY: hop count ("2"), true/false, or an Express trust list ("loopback, 10.0.0.0/8"). */
function trustProxySetting(value) {
  if (value === undefined || value === '') return 'loopback';
  if (/^\d+$/.test(value)) return Number(value);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}
app.set('trust proxy', trustProxySetting(process.env.TRUST_PROXY));
app.set('etag', 'strong');

app.use(securityHeaders);

app.get('/healthz', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ status: 'ok' });
});

// before compression and static files: API traffic is streamed as is
app.use(apiProxy);

app.use(compression({ threshold: 1024 }));

// hashed build output → immutable; a missing chunk is a real 404 (never the SPA shell)
app.use(
  '/assets',
  express.static(path.join(DIST, 'assets'), { immutable: true, maxAge: '1y', index: false, fallthrough: false }),
);

// icons and other root files (favicon.ico, logo-192.png …)
app.use(
  express.static(DIST, {
    index: false,
    maxAge: '1d',
    setHeaders(res, file) {
      if (file.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    },
  }),
);

function sendIndex(res) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.type('html').send(indexHtml);
}

// SPA fallback: client routes get the shell, unknown files 404
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (path.extname(req.path)) {
    res.status(404).type('text/plain').send('Not found');
    return;
  }
  sendIndex(res);
});

app.use((err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error('[admin] request failed', req.method, req.path, err.message);
  if (res.headersSent) return res.end();
  res.status(status).type('text/plain').send(status === 404 ? 'Not found' : 'Server error');
});

const server = app.listen(PORT, HOST, () => {
  console.log(`[admin] http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}  (API → ${API})`);
});

// Socket.IO: forward WebSocket upgrades for /socket.io only
server.on('upgrade', (req, socket, head) => {
  if (req.url?.startsWith('/socket.io')) apiProxy.upgrade(req, socket, head);
  else socket.destroy();
});

server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

function shutdown(signal) {
  console.log(`[admin] ${signal} received, closing`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
