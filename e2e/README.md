# End-to-end checks (`@vero/e2e`)

Playwright tests that drive the **real** storefront, admin panel and mobile app (web build) against a running
stack — no mocks. They create a real customer account and a real order, so point them at a development or
staging database, never at the live store.

| Spec | What it proves |
|---|---|
| `tests/cross-device.spec.ts` | register on the website → search + brand filter → wishlist + cart → 5-step checkout (courier, cash) → the admin finds and confirms the order → the website shows the new status **without a reload** (Socket.IO) → the same account in the mobile app sees the order, its status and the wishlist |
| `tests/admin-settings.spec.ts` | every Admin → Settings section saves through the API's per-key validation (store, social, orders & stock, SEO, home page, installments, payment methods, notifications); the storefront picks the changes up; all values are restored |

## Run locally

```bash
# 1. the stack (demo data): API on :4000, storefront :3000, admin :3001
npm run seed -- --reset
npm run build
npm run start -w @vero/api &
PORT=3000 API_INTERNAL_URL=http://localhost:4000 npm run start -w @vero/web &
PORT=3001 API_INTERNAL_URL=http://localhost:4000 npm run start -w @vero/admin &

# 2. optional: the mobile app as a web build on :8081 (add http://localhost:8081 to CORS_ORIGINS)
cd apps/mobile && EXPO_PUBLIC_API_URL=http://localhost:4000/api npx expo export --platform web --output-dir web-build
npx serve -s web-build -l 8081 &
cd ../..

# 3. the tests (first time: npx playwright install chromium)
E2E_MOBILE_URL=http://localhost:8081 npm run test:e2e
npm run report -w @vero/e2e        # HTML report with traces of failed steps
```

The Vite dev servers work as well: `E2E_WEB_URL=http://localhost:5173 E2E_ADMIN_URL=http://localhost:5174`.

| Variable | Default |
|---|---|
| `E2E_WEB_URL` | `http://localhost:3000` |
| `E2E_ADMIN_URL` | `http://localhost:3001` |
| `E2E_MOBILE_URL` | not set → the mobile step is skipped |
| `E2E_ADMIN_LOGIN` / `E2E_ADMIN_PASSWORD` | the development owner account of the seed (`admin@verotools.uz` / `VeroAdmin2026`) |

CI runs the same suite in the `e2e` job of `.github/workflows/ci.yml` (MongoDB service, demo seed, production
builds, mobile web export).
