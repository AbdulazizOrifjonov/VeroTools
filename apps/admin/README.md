# OCKEAN TOOLS — admin panel (`@vero/admin`)

React 19 + Vite 7 + React Router 7, TanStack Query / Table / Virtual, react-hook-form + zod (shared schemas),
Recharts, Tailwind CSS 4 and `@vero/ui`. Staff sign in with e-mail or phone; every screen and action checks the
permission of the signed-in role — the API enforces the same permissions.

```bash
npm run dev -w @vero/admin        # http://localhost:5174 (Vite proxies /api, /uploads, /socket.io → :4000)
npm run build -w @vero/admin      # tsc + vite build → dist/
npm run start -w @vero/admin      # production server (server/index.mjs) on PORT=3001
```

Production server: serves the build (CSP, `noindex`, immutable assets, SPA fallback) and proxies `/api`,
`/uploads` and websockets to `API_INTERNAL_URL`. Optional `HOST`, `TRUST_PROXY` (Express syntax, e.g.
`loopback, uniquelocal`) and `ASSET_ORIGINS` (extra CSP image origins such as an S3 / CDN host). Health check:
`GET /healthz`.

## Screens

* **Dashboard** — today / yesterday / week / month KPIs, trends, top products, categories and brands, recent
  orders and customers, low stock; finance figures only for roles with finance permissions.
* **Orders** — list with status tabs and filters, order page with the status workflow, timeline, items with cost
  and profit (finance roles), delivery details and tracking, payments (offline payments can be recorded; online
  payments are confirmed only by the provider), installment decisions, staff notes, printing.
* **Catalogue** — products (variants, specifications by category, media, SEO, flags, promotion info, bulk
  actions, duplicate), categories (tree, reorder), brands, specification definitions.
* **Inventory** — stock per SKU, receipts / corrections / stock counts with a mandatory reason, incoming stock,
  movement history with the staff member.
* **Customers**, **reviews** (moderation, replies), **questions**.
* **Marketing** — coupons, promotions (scheduled pricing), banners with live preview, broadcast notifications.
* **Operations** — delivery zones and pickup points, payments and refunds, media library (WebP sizes, usage,
  safe delete).
* **Finance** — expenses with categories, attachments and currencies; analytics (revenue, orders, average order,
  profit = revenue − cost of goods − delivery and operating expenses); reports with preview and CSV / XLSX / PDF
  export.
* **System** — staff users, roles and the permission matrix, translations overrides, pages and FAQ, contact
  messages, store settings (8 sections), audit log, own profile.

## Texts

Sources in `scripts/i18n/source/*.mjs` (leaves are `[uz, ru, en]`, plurals via `P()`):

```bash
node apps/admin/scripts/i18n/build.mjs            # → packages/i18n/locales/{uz,ru,en}/admin.json
node packages/i18n/scripts/check-keys.mjs
```

Only the active language is downloaded (one lazy chunk per language). App icons are copies of
`packages/config/brand/*` in `public/` — re-copy them when the brand kit changes.

## Checked

Typecheck and build without errors; responsive layouts at 1440 / 1024 / 390 px in light and dark; the MANAGER
role (finance data hidden, forbidden actions not rendered, 403 page for forbidden URLs). Verified end to end:
product with an uploaded image visible in the shop, stock adjustment → movement, order status change → timeline
and live update on the storefront, report exports, roles, translation override, page editor, FAQ, messages,
settings (every section, see `e2e/tests/admin-settings.spec.ts`), profile.

## Known limits

* Names and descriptions of custom roles are stored as typed (the system roles are translated in the panel).
* In the product list, the margin of a product with variants is computed from the cheapest variant price and the
  base cost price; the product page shows the cost per variant.
