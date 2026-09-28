import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { themeInitScript } from '@vero/ui/theme-script';
import { defineConfig, type Plugin, type ProxyOptions } from 'vite';

const API_TARGET = process.env.API_PROXY_TARGET ?? 'http://localhost:4000';

/** Same-origin API in development: the admin panel talks to `/api`, uploads and Socket.IO through Vite. */
const proxy: Record<string, ProxyOptions> = {
  '/api': { target: API_TARGET, changeOrigin: true },
  '/uploads': { target: API_TARGET, changeOrigin: true },
  '/socket.io': { target: API_TARGET, changeOrigin: true, ws: true },
};

/**
 * index.html helpers:
 *  - inlines the dependency-free theme bootstrap (no light/dark flash before React mounts);
 *  - preloads the Latin subset of the Manrope variable font (hashed asset, build only).
 */
function htmlEnhancements(): Plugin {
  return {
    name: 'vero-admin-html',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        let out = html.replace('<!--theme-init-->', `<script>${themeInitScript}</script>`);
        const font = ctx.bundle
          ? Object.values(ctx.bundle).find((f) => f.type === 'asset' && /manrope-latin-wght-normal.*\.woff2$/.test(f.fileName))
          : undefined;
        out = out.replace(
          '<!--font-preload-->',
          font ? `<link rel="preload" href="/${font.fileName}" as="font" type="font/woff2" crossorigin />` : '',
        );
        return out;
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), htmlEnhancements()],
  server: { port: 5174, strictPort: true, proxy },
  preview: { port: 4174, strictPort: true, proxy },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    assetsInlineLimit: 2048,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules') && !id.includes('/packages/')) return undefined;
          if (/node_modules\/(react|react-dom|scheduler|react-router)\//.test(id)) return 'react';
          if (/node_modules\/@tanstack\/(query-core|react-query)\//.test(id)) return 'query';
          if (/node_modules\/@tanstack\/(table-core|react-table|virtual-core|react-virtual)\//.test(id)) return 'table';
          // shared texts ship with i18next; the admin texts stay one lazy chunk per language
          if (/node_modules\/(i18next|react-i18next)\//.test(id) || /packages\/i18n\/locales\/[a-z]+\/(common|shop|validation|errors)\.json/.test(id)) return 'i18n';
          if (/packages\/i18n\/locales\/[a-z]+\/admin\.json/.test(id)) return undefined;
          if (/node_modules\/(socket\.io-client|engine\.io-client|engine\.io-parser|socket\.io-parser|@socket\.io)\//.test(id)) return 'socket';
          if (/node_modules\/(radix-ui|@radix-ui|@floating-ui|vaul|sonner|react-day-picker)\//.test(id)) return 'ui-vendor';
          if (/node_modules\/(recharts|recharts-scale|d3-[a-z-]+|victory-vendor|internmap|decimal\.js-light|eventemitter3|react-smooth|fast-equals)\//.test(id)) return 'charts';
          if (/node_modules\/(zod|react-hook-form|@hookform)\//.test(id)) return 'forms';
          if (/node_modules\/(date-fns)\//.test(id)) return 'date';
          return undefined;
        },
      },
    },
  },
});
