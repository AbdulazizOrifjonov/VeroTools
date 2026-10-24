/**
 * Regenerates docs/API.md — the endpoint index — from the routers the API really mounts.
 *
 *   npm run docs:api -w @vero/api
 *
 * Express router methods are wrapped before the app is built, so every route is recorded with its full mount
 * path, the permission guard (`requirePermission` tags its guard), the authentication middleware and the
 * source file that declared it. No database connection is needed.
 */
import { writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import express from 'express';

process.env.NODE_ENV ??= 'development';
process.env.LOG_LEVEL = 'silent';
process.env.JOBS_ENABLED = 'false';

type Fn = ((...args: unknown[]) => unknown) & { stack?: unknown[]; permission?: string | string[]; permissionMode?: 'all' | 'any' };
interface RouteRec {
  method: string;
  path: string;
  handlers: Fn[];
  file: string;
}
interface MountRec {
  path: string;
  fn: Fn;
}
interface RouterRec {
  routes: RouteRec[];
  mounts: MountRec[];
  middleware: Fn[];
}

const SRC = resolve(import.meta.dirname, '../src');
const registry = new Map<object, RouterRec>();
const recOf = (router: object): RouterRec => {
  let rec = registry.get(router);
  if (!rec) registry.set(router, (rec = { routes: [], mounts: [], middleware: [] }));
  return rec;
};

/** First stack frame inside apps/api/src → "modules/…/x.ts". */
function callsite(): string {
  const frames = (new Error().stack ?? '').split('\n').slice(2);
  for (const f of frames) {
    const m = /\(?((?:file:\/\/)?\/[^():]+\.ts):\d+:\d+\)?$/.exec(f.trim());
    if (m && m[1]!.includes('/apps/api/src/')) return relative(SRC, m[1]!.replace('file://', ''));
  }
  return '?';
}

const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;
// express.Router() returns a function whose prototype is a Router *instance*; the methods live one level up
function protoWith(obj: object, key: string): Record<string, (...args: unknown[]) => unknown> {
  let proto = Object.getPrototypeOf(obj) as object | null;
  while (proto && !Object.prototype.hasOwnProperty.call(proto, key)) proto = Object.getPrototypeOf(proto) as object | null;
  if (!proto) throw new Error(`cannot find ${key} on the router prototype chain`);
  return proto as Record<string, (...args: unknown[]) => unknown>;
}
const routerProto = protoWith(express.Router(), 'route');
const routeProto = protoWith(express.Router().route('/probe'), 'get');

const originalRoute = routerProto.route!;
routerProto.route = function (this: object, path: unknown) {
  const route = originalRoute.call(this, path) as Record<string, unknown>;
  Object.defineProperty(route, '__owner', { value: this });
  Object.defineProperty(route, '__file', { value: callsite() });
  return route;
};
for (const method of METHODS) {
  const original = routeProto[method]!;
  routeProto[method] = function (this: { path: string; __owner?: object; __file?: string }, ...handlers: unknown[]) {
    if (this.__owner) {
      // app.get(['/health', '/api/health'], …) → one row per path
      for (const path of ([] as unknown[]).concat(this.path)) {
        recOf(this.__owner).routes.push({ method: method.toUpperCase(), path: String(path), handlers: handlers.flat() as Fn[], file: this.__file ?? '?' });
      }
    }
    return original.apply(this, handlers);
  };
}
const originalUse = routerProto.use!;
routerProto.use = function (this: object, ...args: unknown[]) {
  const path = typeof args[0] === 'string' ? (args.shift() as string) : '/';
  for (const fn of args.flat() as Fn[]) {
    if (typeof fn !== 'function') continue;
    if (Array.isArray(fn.stack)) recOf(this).mounts.push({ path, fn });
    else if (path === '/') recOf(this).middleware.push(fn);
  }
  return originalUse.apply(this, path === '/' ? args : [path, ...args]);
};

const { createApp } = await import('../src/app');
const app = createApp() as unknown as { router: object };

interface Endpoint {
  method: string;
  path: string;
  access: string;
  file: string;
}
const endpoints: Endpoint[] = [];
const join = (a: string, b: string) => `${a.replace(/\/+$/, '')}/${b.replace(/^\/+/, '')}`.replace(/\/+$/, '') || '/';

function accessOf(path: string, inherited: Fn[], handlers: Fn[]): string {
  if (/^\/api\/payments\/(payme|click)(\/|$)/.test(path)) return 'provider signature';
  const guard = [...inherited, ...handlers].find((h) => h.permission);
  if (guard) {
    const p = guard.permission!;
    const list = Array.isArray(p) ? p : [p];
    // "|" would break the Markdown table: any-of lists are written with "or"
    return `staff · ${list.length > 1 ? `[${list.join(guard.permissionMode === 'any' ? ' or ' : ', ')}]` : list[0]}`;
  }
  const names = [...inherited, ...handlers].map((h) => h.name);
  if (names.includes('requireStaff')) return 'staff';
  if (names.includes('requireAuth')) return 'customer';
  return 'public';
}

/** A router can be mounted under several paths (e.g. /admin/permissions and /admin/roles/permissions). */
function walk(router: object, prefix: string, inherited: Fn[], chain: object[] = []) {
  if (chain.includes(router)) return; // cycle guard
  const rec = registry.get(router);
  if (!rec) return;
  const middleware = [...inherited, ...rec.middleware];
  for (const r of rec.routes) endpoints.push({ method: r.method, path: join(prefix, r.path), access: accessOf(join(prefix, r.path), middleware, r.handlers), file: r.file });
  for (const m of rec.mounts) walk(m.fn, join(prefix, m.path), middleware, [...chain, router]);
}
walk(app.router, '', []);

const methodOrder = (m: string) => METHODS.indexOf(m.toLowerCase() as (typeof METHODS)[number]);
// parameters sort after literal segments: /products/facets before /products/:id
const sortKey = (p: string) => p.replace(/:/g, '~');
const unique = new Map(endpoints.map((e) => [`${e.method} ${e.path}`, e]));
const rows = [...unique.values()].sort((a, b) => (sortKey(a.path) < sortKey(b.path) ? -1 : sortKey(a.path) > sortKey(b.path) ? 1 : methodOrder(a.method) - methodOrder(b.method)));

const out = `# OCKEAN API — endpoint index

Generated from the routers the API mounts (\`npm run docs:api -w @vero/api\`, ${rows.length} endpoints). All responses use
the envelope \`{ "data": … }\` (lists add \`"meta": { page, limit, total, pages }\`); errors are
\`{ "error": { code, message, fields?, details? } }\` with codes from \`packages/types/src/errors.ts\`.

Request headers: \`Authorization: Bearer <access token>\`, \`Accept-Language: uz|ru|en\`, \`X-Client: web|admin|mobile\`,
\`X-Guest-Id: <uuid v4>\` (anonymous cart / wishlist / compare), \`X-Client-Instance\` (realtime echo suppression).
Typed client: \`packages/api-client\` (\`createVeroApi\`, React Query hooks). DTOs: \`packages/types\`. Input schemas: \`packages/validation\`.

Access: **public** — anyone; **customer** — signed-in user; **staff · perm** — admin panel user with that permission
(\`[a, b]\` = all of them, \`[a or b]\` = any of them); **provider signature** — Payme / Click callbacks authenticated by the merchant key.
Health checks: \`GET /health\` (liveness) and \`GET /ready\` (database / Redis).

| Method | Path | Access | Source |
|---|---|---|---|
${rows.map((r) => `| ${r.method} | \`${r.path}\` | ${r.access} | ${r.file} |`).join('\n')}
`;

const target = resolve(import.meta.dirname, '../../../docs/API.md');
writeFileSync(target, out);
console.log(`docs/API.md — ${rows.length} endpoints`);
process.exit(0);
