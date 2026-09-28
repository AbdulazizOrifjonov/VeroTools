import { defineConfig, devices } from '@playwright/test';

/**
 * Cross-device end-to-end checks against a RUNNING VERO TOOLS stack (they create a real customer and a real
 * order — run them against a development / staging database, never against the live store).
 *
 *   E2E_WEB_URL      storefront          default http://localhost:3000  (npm run start -w @vero/web, or Vite :5173)
 *   E2E_ADMIN_URL    admin panel         default http://localhost:3001  (npm run start -w @vero/admin, or Vite :5174)
 *   E2E_MOBILE_URL   mobile app, web build (expo start --web / expo export -p web) — the mobile checks are
 *                    skipped when it is not set
 *   E2E_ADMIN_LOGIN / E2E_ADMIN_PASSWORD   staff account allowed to update orders (default: the development
 *                    owner account created by the seed)
 */
export default defineConfig({
  testDir: './tests',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  use: {
    ...devices['Desktop Chrome'],
    locale: 'en-US',
    timezoneId: 'Asia/Tashkent',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [{ name: 'chromium' }],
});
