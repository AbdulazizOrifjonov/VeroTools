#!/usr/bin/env node
/**
 * Authenticated screenshots of the admin panel (Playwright Chromium from the global tools install).
 *
 *   node apps/admin/scripts/screenshots.mjs --pages=/,/orders --widths=1440,1024,390 --themes=light,dark \
 *        [--user=owner|admin|manager] [--lang=uz|ru|en] [--full] [--wait=1500] [--base=http://localhost:5174]
 *
 * Logs in once per run (one browser context, so the rotating refresh cookie stays valid), then saves
 * apps/admin/.screenshots/<name>-<width>-<theme>.png and prints console errors per page.
 */
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire('/home/claude/.npm-global/lib/node_modules/');
const { chromium } = require('playwright');

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.screenshots');
mkdirSync(OUT, { recursive: true });

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.length ? v.join('=') : true];
  }),
);
const BASE = args.base ?? 'http://localhost:5174';
const USERS = {
  owner: { login: 'admin@ockean.uz', password: 'OckeanAdmin2026' },
  admin: { login: 'admin@example.com', password: 'Administrator2026' },
  manager: { login: 'manager@example.com', password: 'Manager2026' },
};
const user = USERS[args.user ?? 'owner'];
const pages = String(args.pages ?? '/').split(',');
const widths = String(args.widths ?? '1440').split(',').map(Number);
const themes = String(args.themes ?? 'light').split(',');
const wait = Number(args.wait ?? 1500);
const lang = args.lang ?? 'uz';
const prefix = args.prefix ? `${args.prefix}-` : '';

const nameOf = (path) => (path === '/' ? 'dashboard' : path.replace(/^\//, '').replace(/[/?&=]+/g, '_')) || 'root';

const browser = await chromium.launch();
for (const theme of themes) {
  const context = await browser.newContext({ viewport: { width: widths[0], height: 900 }, colorScheme: theme === 'dark' ? 'dark' : 'light', deviceScaleFactor: 1 });
  await context.addInitScript(
    ([l, th]) => {
      try {
        localStorage.setItem('vt.admin.language', l);
        localStorage.setItem('vt.theme', th);
      } catch {}
    },
    [lang, theme],
  );
  if (!args.anon) {
    const res = await context.request.post(`${BASE}/api/auth/login`, { data: user, headers: { 'X-Client': 'admin', 'Content-Type': 'application/json' } });
    if (!res.ok()) {
      console.error('login failed', res.status(), await res.text());
      process.exit(1);
    }
  }
  const page = await context.newPage();
  for (const path of pages) {
    for (const width of widths) {
      const errors = [];
      const onConsole = (m) => {
        if (m.type() === 'error') errors.push(m.text());
      };
      const onError = (e) => errors.push(String(e));
      page.on('console', onConsole);
      page.on('pageerror', onError);
      await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => errors.push(String(e)));
      await page.waitForTimeout(wait);
      const file = join(OUT, `${prefix}${nameOf(path)}-${width}-${theme}.png`);
      await page.screenshot({ path: file, fullPage: !!args.full });
      page.off('console', onConsole);
      page.off('pageerror', onError);
      console.log(`saved ${file}${errors.length ? `\n  console errors:\n  - ${errors.join('\n  - ')}` : ''}`);
    }
  }
  await context.close();
}
await browser.close();
