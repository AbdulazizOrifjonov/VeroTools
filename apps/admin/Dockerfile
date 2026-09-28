# syntax=docker/dockerfile:1
#
# VERO TOOLS admin panel — production image: Vite build (dist/) served by server/index.mjs
# (static files with noindex + CSP headers, SPA fallback, proxy of /api, /uploads and /socket.io to the API).
# The build context must be the repository root:
#
#   docker build -f apps/admin/Dockerfile -t vero-tools-admin .
#
# Runtime env: PORT (default 3001), API_INTERNAL_URL (default http://localhost:4000; compose: http://api:4000),
#              HOST, TRUST_PROXY (Express syntax, e.g. "loopback, uniquelocal"), ASSET_ORIGINS (extra CSP image origins)

# Base image for every stage (same as the API image). Pin a digest here for fully reproducible builds.
# hadolint global ignore=DL3006
ARG NODE_IMAGE=node:22-bookworm-slim

# ------------------------------------------------------------------------------------------------
# manifests — package.json files + package-lock.json + .npmrc only (keeps the npm ci layer cached)
# ------------------------------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS manifests
WORKDIR /src
COPY . .
RUN find . -mindepth 1 ! -type d ! -name package.json ! -name package-lock.json ! -name .npmrc -delete \
 && find . -mindepth 1 -type d -empty -delete

# ------------------------------------------------------------------------------------------------
# build — admin workspace + root dev tooling (typescript for `tsc`) exactly as locked, then tsc + vite build.
# Lifecycle scripts are skipped: esbuild, rollup, lightningcss and tailwind load their prebuilt platform
# binaries from optionalDependencies.
# ------------------------------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY --from=manifests /src/ ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --workspace=@vero/admin --include-workspace-root --ignore-scripts --no-audit --no-fund
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/admin ./apps/admin
RUN npm run build --workspace=@vero/admin

# ------------------------------------------------------------------------------------------------
# deps — only the npm packages server/*.mjs imports (express, compression, http-proxy-middleware), pinned
# to their locked versions and installed against a copy of package-lock.json without dev-only and
# workspace entries. The build fails if any installed package differs from package-lock.json.
# ------------------------------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS deps
WORKDIR /deps
COPY package-lock.json .npmrc ./
COPY apps/admin/server ./server
ENV APP=apps/admin DEPS_FROM=server
RUN --mount=type=cache,target=/root/.npm,sharing=locked node --input-type=module <<'EOF'
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { builtinModules } from 'node:module';

const { APP, DEPS_FROM } = process.env;
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const entries = lock.packages;
const wanted = new Map();
const want = (name, from) => {
  const e = entries[`${from}/node_modules/${name}`] ?? entries[`node_modules/${name}`];
  if (!e?.version) throw new Error(`${name} (needed by ${from}) is missing from package-lock.json`);
  if (wanted.has(name) && wanted.get(name) !== e.version) throw new Error(`conflicting versions of ${name}: ${wanted.get(name)} / ${e.version}`);
  wanted.set(name, e.version);
};

if (DEPS_FROM === 'server') {
  // bare imports of server/**/*.{js,mjs,cjs}; the Vite bundle in dist/ needs nothing at runtime
  const builtins = new Set(builtinModules);
  for (const file of readdirSync('server', { recursive: true })) {
    if (!/\.[cm]?js$/.test(file)) continue;
    const src = readFileSync(`server/${file}`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const [, spec] of src.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"]([^'"\s]+)['"]/g)) {
      if (/^(\.|\/|node:)/.test(spec)) continue;
      const name = spec.split('/').slice(0, spec.startsWith('@') ? 2 : 1).join('/');
      if (!builtins.has(name)) want(name, APP);
    }
  }
} else {
  // npm dependencies of the app and of the workspace packages bundled into it
  const seen = new Set();
  const visit = (dir) => {
    if (seen.has(dir)) return;
    seen.add(dir);
    const e = entries[dir];
    const peers = Object.keys(e.peerDependencies ?? {}).filter((n) => !e.peerDependenciesMeta?.[n]?.optional);
    for (const name of [...Object.keys({ ...e.dependencies, ...e.optionalDependencies }), ...peers]) {
      const link = entries[`node_modules/${name}`];
      if (link?.link) visit(link.resolved);
      else want(name, dir);
    }
  };
  visit(APP);
}
if (!wanted.size) throw new Error(`no runtime dependencies found for ${APP}`);

const dependencies = Object.fromEntries([...wanted].sort(([a], [b]) => a.localeCompare(b)));
const packages = { '': { name: 'runtime', version: '0.0.0', dependencies } };
for (const [key, e] of Object.entries(entries)) {
  if (key.startsWith('node_modules/') && !e.link && !e.dev && !e.devOptional) packages[key] = e;
}
writeFileSync('package.json', JSON.stringify({ name: 'runtime', version: '0.0.0', private: true, dependencies }, null, 2));
writeFileSync('package-lock.json', JSON.stringify({ name: 'runtime', version: '0.0.0', lockfileVersion: lock.lockfileVersion, requires: true, packages }, null, 2));
execFileSync('npm', ['install', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], { stdio: 'inherit' });

const id = (key, e) => `${key.slice(key.lastIndexOf('node_modules/') + 13)}@${e.version}#${e.integrity}`;
const locked = new Set(Object.entries(entries).filter(([k, e]) => k.includes('node_modules/') && !e.link).map(([k, e]) => id(k, e)));
const installed = JSON.parse(readFileSync('node_modules/.package-lock.json', 'utf8')).packages;
const foreign = Object.entries(installed).filter(([k, e]) => !locked.has(id(k, e))).map(([k]) => k);
if (foreign.length) throw new Error(`installed packages that differ from package-lock.json: ${foreign.join(', ')}`);
console.log(`${APP} runtime dependencies: ${Object.keys(dependencies).join(', ')}`);
console.log(`${Object.keys(installed).length} packages installed, all identical to package-lock.json`);
EOF

# ------------------------------------------------------------------------------------------------
# runtime
# ------------------------------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime
LABEL org.opencontainers.image.title="vero-tools-admin" \
      org.opencontainers.image.description="VERO TOOLS admin panel (static build + API proxy server)"
ENV NODE_ENV=production \
    PORT=3001
WORKDIR /app/apps/admin
COPY --from=deps /deps/node_modules /app/node_modules
COPY apps/admin/package.json ./
COPY apps/admin/server ./server
COPY --from=build /app/apps/admin/dist ./dist
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "server/index.mjs"]
