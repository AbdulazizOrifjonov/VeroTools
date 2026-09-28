import { defineConfig } from 'tsup';

/**
 * Production bundle: dist/index.js (API server) and dist/seed.js (database seeding).
 * Workspace packages (@vero/*) are TypeScript sources, so they are bundled in; npm dependencies stay external.
 */
export default defineConfig({
  entry: { index: 'src/index.ts', seed: 'src/seed/index.ts' },
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  splitting: false,
  dts: false,
  noExternal: [/^@vero\//],
  banner: {
    // some CommonJS dependencies still call require() — provide it inside the ESM bundle
    js: "import { createRequire as __vtCreateRequire } from 'node:module'; const require = __vtCreateRequire(import.meta.url);",
  },
});
