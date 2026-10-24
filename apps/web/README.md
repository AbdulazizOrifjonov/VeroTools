# OCKEAN TOOLS — storefront (`@vero/web`)

React 19 + Vite 7 + React Router 7 (data router, lazy route chunks), TanStack Query, Tailwind CSS 4 and the
shared `@vero/ui` kit. Talks to the API through `@vero/api-client` (same origin: `/api`, `/uploads`,
`/socket.io`).

```bash
npm run dev -w @vero/web          # http://localhost:5173 (Vite proxies /api, /uploads, /socket.io → :4000)
npm run build -w @vero/web        # tsc + vite build → dist/
npm run start -w @vero/web        # production server (server/index.mjs) on PORT=3000
```

## What it does

* **Layout:** top bar (phone, hours, info links, language, theme), sticky header, mega menu (desktop) and
  drill-down catalogue (mobile), search with suggestions / recent / popular queries, live compare / wishlist /
  cart counters, account menu with unread notifications, mobile tab bar, footer.
* **Catalogue:** home (hero, banners, categories, product rails, promotions, brands, advantages, reviews, FAQ),
  category and search pages with disjunctive facets (brands, price range, rating, availability, discount,
  highlights, specifications), sorting, grid / list, pagination — all in the URL; mobile filter sheet.
* **Product page:** gallery with zoom, variants, promotion countdown, delivery estimate by region, pickup points,
  installment calculator, warranty, description, specifications, reviews with photos, questions & answers,
  related and recently viewed products.
* **Cart and checkout:** quantities with stock checks, undo, move to wishlist, coupons, free-delivery progress;
  5 steps — details, delivery (saved / new address with zone price, or pickup point), payment (only the methods
  the API offers), review with terms, done. Online payments open the provider page from the API; the success
  page shows the payment state reported by the API.
* **Account:** profile (avatar, e-mail verification, phone verification by SMS), orders with live status and
  timeline, cancel / reorder / pay / review, addresses, notifications, my reviews, settings (theme, language,
  notification preferences, password). Sign in with phone or e-mail; password reset by e-mail link or SMS code.
* **Content:** pages managed in the admin panel, FAQ with search, contacts with map, pickup points and form.
* **Languages:** Uzbek without prefix, `/ru/…`, `/en/…`; `/uz/…` redirects permanently. Texts live in
  `packages/i18n/locales/*/web.json` (source: `scripts/i18n/build.py`), plus the shared namespaces; admin
  overrides from `/api/translations` are applied at runtime.

## Production server (`server/index.mjs`)

Express 5 with compression. Proxies `/api`, `/uploads`, websockets, `/robots.txt` and the sitemaps to
`API_INTERNAL_URL`, serves the build (hashed assets cached for a year, `index.html` no-cache) and injects
per-URL SEO into `index.html` from `GET /api/seo/meta` (title, description, canonical, hreflang, Open Graph,
Twitter card, robots, JSON-LD, `<html lang>` and the HTTP status — unknown products answer 404). SEO lookups are
cached for 60 s with a 1.5 s timeout and fall back to plain HTML. Security headers include a CSP with hashes of
the inline theme script.

| Variable | Default | |
|---|---|---|
| `PORT` | `3000` | |
| `API_INTERNAL_URL` | `http://localhost:4000` | the API as seen from this server |
| `IOS_APP_IDS`, `ANDROID_APP_PACKAGE`, `ANDROID_SHA256_FINGERPRINTS` | empty | serve `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` for the mobile app links |

Health check: `GET /healthz`.

## Checked

* Typecheck and production build without errors.
* Browser flows (Playwright, dev and production server): guest cart → registration → merged cart → checkout
  (cash) → success → order in the account; filters / sort / view in the URL; language switch keeps the page;
  SMS password reset; e-mail verification; avatar; addresses; cancel + reorder; notifications; settings.
  The cross-device flow is automated in [`e2e/`](../../e2e/README.md).
* Accessibility with axe-core (WCAG 2.2 AA) in light and dark themes at 1440 and 375 px.

## Known limits

* The Click / Payme redirect is implemented but can only be exercised with real merchant credentials — without
  them the API does not offer these methods.
* The contacts map is an OpenStreetMap embed (`frame-src https://www.openstreetmap.org` in the CSP).
