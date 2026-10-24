// Metro configuration for the OCKEAN monorepo (npm workspaces).
// The @vero/* workspace packages are consumed as TypeScript source (packages/*/src) — Metro must watch
// the repository root and resolve modules from both the app and the root node_modules.
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = Array.from(new Set([...(config.watchFolders ?? []), workspaceRoot]));

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// workspace packages expose `exports` → ./src/index.ts, JSON locales via "./locales/*"
config.resolver.unstable_enablePackageExports = true;
config.resolver.sourceExts = Array.from(
  new Set([...config.resolver.sourceExts, 'ts', 'tsx', 'mjs', 'cjs', 'json']),
);

// never bundle other apps of the monorepo or build output
const escape = (p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const blocked = ['apps/web', 'apps/admin', 'apps/api', 'packages/ui'].map(
  (dir) => new RegExp(`^${escape(path.resolve(workspaceRoot, dir))}[\\/](?!node_modules).*`),
);
const existing = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
  ...blocked,
];

// Single lucide icons: `lucide-react-native/icons/<file>` → dist/esm/icons/<file>.js. The package only exports
// its barrel (~1700 icons); importing icon files one by one keeps them out of the bundle.
const fs = require('node:fs');
const lucideRoot = [
  path.resolve(projectRoot, 'node_modules/lucide-react-native'),
  path.resolve(workspaceRoot, 'node_modules/lucide-react-native'),
].find((dir) => fs.existsSync(dir));
const upstreamResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const m = /^lucide-react-native\/icons\/([a-z0-9-]+)$/.exec(moduleName);
  if (m && lucideRoot) {
    return { type: 'sourceFile', filePath: path.join(lucideRoot, 'dist/esm/icons', `${m[1]}.js`) };
  }
  return upstreamResolve
    ? upstreamResolve(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
