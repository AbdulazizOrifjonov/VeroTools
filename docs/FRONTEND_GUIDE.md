# OCKEAN TOOLS — frontend guide (web · admin · mobile)

This is the contract every client app follows. The three apps talk to **one API** and **one database**;
a customer uses the same account on the website and in the mobile app, and every change (cart, wishlist,
compare, orders, addresses, notifications, profile) is synchronised between devices in real time.

## 1. Monorepo

| Path | What |
|---|---|
| `apps/api` | Express + Mongoose API (port 4000). Routes: `docs/API.md`. |
| `apps/web` | Storefront — React 19 + Vite + React Router 7 (port 5173). |
| `apps/admin` | Admin panel — React 19 + Vite + React Router 7 (port 5174). |
| `apps/mobile` | Customer app — Expo / React Native + React Navigation (Metro 8081). |
| `packages/types` | DTOs returned by the API (`dto.ts`, `admin.ts`), enums, permissions, error codes. |
| `packages/validation` | zod schemas shared by API and forms. Error messages are **i18n keys** (`validation.*`). |
| `packages/api-client` | `createVeroApi()` typed client + TanStack Query hooks + realtime sync. |
| `packages/ui` | Web design system (Tailwind v4 + Radix, shadcn-style) — web & admin only. |
| `packages/config` | Design tokens, logo geometry & brand assets, regions of Uzbekistan, `STORE_ROUTES`, constants. |
| `packages/i18n` | i18next setup + shared namespaces `common`, `shop`, `validation`, `errors`. |
| `packages/utils` | Formatting (price, phone, dates in Asia/Tashkent), query-string helpers, commerce helpers. |

Workspace packages are consumed as TypeScript source — no build step. Import them by name (`@vero/ui`, …).

## 2. Talking to the API

```ts
// one instance per app (module scope)
export const api = createVeroApi({
  baseUrl: '/api',                 // web & admin: same origin (Vite proxy in dev, Node server in prod)
  client: 'web',                   // 'web' | 'admin' | 'mobile'
  credentials: 'include',          // web/admin: refresh token lives in an httpOnly cookie
  getLanguage: () => i18n.language as Language,
  getGuestId: () => guestId,       // uuid v4 persisted per device (STORAGE_KEYS.guestId)
  onSessionExpired: () => toast(t('status.sessionExpired')),
});
await api.client.bootstrap();      // restores the session (refresh) on start
```

* Wrap the app in `<QueryClientProvider>` and `<ApiProvider api={api} language={lang}>`.
* Use the hooks from `@vero/api-client` (`useProducts`, `useCart`, `useAddToCart`, `usePlaceOrder`, …).
  Admin screens use `useAdminList / useAdminQuery / useAdminItem / useAdminMutation` with `api.admin.*`.
* `useSession()` → `{ status, user, isReady, isAuthenticated, isStaff, can(permission) }`.
* Payment methods: `GET /payments/methods` returns only methods that can actually be used (online providers
  without credentials are omitted; installment below the minimum amount comes back with `available: false`).
* Errors are `ApiError { status, code, fields }`. Show `translateError(t, err)`; map `fields` onto form
  fields with `translateValidation(t, key)` — server field errors are i18n keys too (`validation.*` or `errors.*`).
* Every request needs visible **loading**, **error (with retry)** and **success** handling. Never show fake
  data: empty states come from real empty responses.
* Mobile: `client: 'mobile'`, absolute `baseUrl` (`EXPO_PUBLIC_API_URL`), refresh token in `expo-secure-store`
  through `tokens.getRefreshToken / setRefreshToken`.

### Realtime

```ts
useRealtimeSync({ url: '', enabled: true, onOrderUpdated, onNotification });   // admin: { admin: true, onAdminOrder }
```
Socket.IO (`/socket.io`) pushes `sync` events; the hook invalidates the matching queries so another device /
tab / the admin panel sees changes immediately. Requests carry `X-Client-Instance` so a device ignores its own echo.

## 3. Languages (uz · ru · en)

* Default **uz** (Latin script, ASCII apostrophe: `o'`, `g'`). No hard-coded UI text anywhere.
* `createI18n({ lng, resources: { uz: { web }, ru: { web }, en: { web } }, defaultNS: 'web' })`.
  App namespaces: `web.json` (storefront), `admin.json`, `mobile.json` in `packages/i18n/locales/{uz,ru,en}/`.
  Shared namespaces already contain statuses, payment methods, validation and error texts — reuse them.
* After the app loads, fetch `GET /api/translations?lng=…` and apply admin overrides with `applyTranslationOverrides`.
* Keys must exist in all three languages: `node packages/i18n/scripts/check-keys.mjs`.
* Storefront URLs: Uzbek has no prefix, other languages are prefixed — `/ru/catalog/drills`, `/en/product/x`
  (`localizedPath`, `parseLocalizedPath`, `STORE_ROUTES` in `@vero/config`). Changing the language keeps the page.
* Content from the API (`name`, `description` …) is already localised by `Accept-Language`.

## 4. Money, dates, phones

* Prices are integers in UZS: `formatPrice(amount, lang, t('common:currency'))` or `<Price currencyLabel={t('common:currency')} />` (web).
* Dates in Asia/Tashkent: `formatDate(value, lang, 'long' | 'datetime' | …)`, `formatRelative`.
* Phones are `+998XXXXXXXXX`; `formatUzPhone` for display, `<PhoneInput />` (web) for entry.
* Regions / cities: `UZ_REGIONS` from `@vero/config`.

## 5. Design language

Professional, modern, minimal, industrial. The brand colour comes from the uploaded logo (orange circle,
white "vero TOOLS" wordmark) — **never distort the logo** (always 1:1, use `<Logo />` / brand PNGs).

* Surfaces: white / near-black, hairline borders (`border-border`), 12 px radius, shadows only for overlays.
* Orange is an accent, not a background: primary buttons (`bg-primary`), active states, discount badges,
  focus rings, key numbers. Large areas stay neutral.
* Typography: Manrope, tight headings, tabular figures for prices / quantities / tables.
* No heavy gradients, no glassmorphism, no decorative animation. Transitions ≤ 200 ms, respect
  `prefers-reduced-motion`.
* Light / dark / system theme everywhere (`ThemeProvider` on web & admin, tokens from `@vero/config` on mobile).
* Responsive from 320 px to 1920 px+. Touch targets ≥ 44 px. Keyboard navigation, visible focus, labelled
  inputs, `alt` texts, ARIA on custom widgets.

Do not copy other stores' code, layout, texts or branding (protools.uz, epamarket.uz were functional references only).

## 6. Security & honesty rules

* Never store tokens in `localStorage` on the web (the refresh token is an httpOnly cookie; the access token
  stays in memory). Never log tokens or passwords.
* No fake buttons, statistics, orders, payments, notifications or data. A button either works against the API
  or is not rendered. Online payments open the provider URL returned by the API (`payment.action`); an order is
  only "paid" when the API says so.
* Respect permissions in the admin UI (`session.can('orders.update')`) — the API enforces them anyway.

## 7. Dev accounts (demo seed)

| Role | Login | Password |
|---|---|---|
| Owner (SUPER_ADMIN) | admin@ockean.uz | OckeanAdmin2026 |
| Admin | admin@example.com | Administrator2026 |
| Manager | manager@example.com | Manager2026 |
| Customer | +998901472536 (any phone in `apps/api/src/seed/data/customers.ts`) | Demo2026 |
