# syntax=docker/dockerfile:1
#
# VERO TOOLS API — production image (Express 5 + Mongoose, bundled with tsup).
# The build context must be the repository root:
#
#   docker build -f apps/api/Dockerfile -t vero-tools-api .
#
# Runtime layout (WORKDIR /app/apps/api):
#   dist/index.js, dist/seed.js     API server and seeding bundle (@vero/* workspace packages are bundled in)
#   assets/                         fonts + logo for PDF reports (resolved relative to dist/)
#   src/seed/assets/                seed illustrations (VERO_SEED_ASSETS_DIR)
#   /app/packages/i18n/locales      locale JSON files for Admin → Translations (I18N_LOCALES_DIR)
#   /app/node_modules               production npm dependencies of the API only
#   /data/uploads                   uploaded media (UPLOAD_DIR) — mount a persistent volume here
#
# Seed base data with the same image:  node dist/seed.js --base   (see docker-compose.yml, service "seed")

# Base image for every stage (glibc: sharp's prebuilt binaries). Pin a digest here for fully reproducible builds.
# hadolint global ignore=DL3006
ARG NODE_IMAGE=node:22-bookworm-slim

# ------------------------------------------------------------------------------------------------
# manifests — package.json files + package-lock.json + .npmrc only, so the `npm ci` layer below stays
# cached until a dependency changes.
# ------------------------------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS manifests
WORKDIR /src
COPY . .
RUN find . -mindepth 1 ! -type d ! -name package.json ! -name package-lock.json ! -name .npmrc -delete \
 && find . -mindepth 1 -type d -empty -delete

# ------------------------------------------------------------------------------------------------
# build — dependencies of the API workspace (incl. dev) exactly as locked, then tsup.
# Lifecycle scripts are skipped: the only install scripts in the tree are esbuild's and sharp's
# binary checks, and both load their prebuilt platform binaries from optionalDependencies.
# ------------------------------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY --from=manifests /src/ ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --workspace=@vero/api --ignore-scripts --no-audit --no-fund
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN npm run build --workspace=@vero/api

# ------------------------------------------------------------------------------------------------
# deps — production npm dependencies of the API bundle only.
# `npm ci --omit=dev --workspace=@vero/api` also installs packages the API never reaches (optional peers
# of other workspaces' tooling: typescript, terser, lightningcss …). Instead, a package.json with the API's
# npm dependencies (and those of the bundled @vero/* packages) pinned to their locked versions is installed
# against a copy of package-lock.json without dev-only and workspace entries, so npm keeps exactly the
# reachable tree. The build fails if any installed package differs from package-lock.json.
# ------------------------------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS deps
WORKDIR /deps
COPY package-lock.json .npmrc ./
ENV APP=apps/api DEPS_FROM=manifest
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
LABEL org.opencontainers.image.title="vero-tools-api" \
      org.opencontainers.image.description="VERO TOOLS e-commerce API (Express, MongoDB, Socket.IO)"
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4000 \
    UPLOAD_DIR=/data/uploads \
    I18N_LOCALES_DIR=/app/packages/i18n/locales \
    VERO_SEED_ASSETS_DIR=/app/apps/api/src/seed/assets
WORKDIR /app/apps/api
COPY --from=deps /deps/node_modules /app/node_modules
# package.json: "type": "module" for dist/*.js and the @vero/api marker the API uses to locate its root
COPY apps/api/package.json ./
COPY apps/api/assets ./assets
COPY apps/api/src/seed/assets ./src/seed/assets
COPY packages/i18n/locales /app/packages/i18n/locales
COPY --from=build /app/apps/api/dist ./dist
# application files stay root-owned (read-only for the app user); only the uploads volume is writable
RUN mkdir -p /data/uploads && chown -R node:node /data
VOLUME ["/data/uploads"]
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "dist/index.js"]
