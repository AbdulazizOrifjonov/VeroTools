# OCKEAN — mobile app (`@vero/mobile`)

Customer app for Android and iOS — Expo SDK 57, React Native 0.86, React Navigation, TanStack Query, the shared
`@vero/api-client`, `@vero/i18n` and brand tokens from `@vero/config`. It uses the same API and the same account
as the website: profile, cart, wishlist, compare, orders, addresses, reviews, notifications and settings stay in
sync in real time.

## Run

Requirements: Node ≥ 22.12, `npm install` in the repository root, the API running on port 4000.

```bash
cd apps/mobile
cp .env.example .env        # then edit it
npx expo start              # Expo Go / development build (a = Android, i = iOS)
npx expo start --web        # web preview on http://localhost:8081
```

| Variable | Purpose | Default |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | API base including `/api` | `http://localhost:4000/api` |
| `EXPO_PUBLIC_WEB_URL` | storefront origin (share links, universal / app links) | `https://ockean.uz` |
| `EAS_PROJECT_ID` (or `EXPO_PUBLIC_EAS_PROJECT_ID`) | EAS project id, needed for push tokens | — |

`EXPO_PUBLIC_*` values are embedded in the bundle — never put secrets there.

* **Phone on the same Wi-Fi:** a phone cannot reach `localhost` of your computer — use
  `EXPO_PUBLIC_API_URL=http://<computer LAN IP>:4000/api` and allow port 4000 in the firewall. The Android
  emulator can use `http://10.0.2.2:4000/api`; the iOS simulator and the web preview can use `localhost`.
  Restart `expo start -c` after changing `.env`.
* **Images:** the API builds media URLs from its `PUBLIC_API_URL`; the app rewrites loopback hosts to the host of
  `EXPO_PUBLIC_API_URL`, so photos load on a phone in development. In production set `PUBLIC_API_URL`.
* **Web preview:** add its origin (e.g. `http://localhost:8081`) to `CORS_ORIGINS` of the API.
* **Builds:** `eas init` (project id), then `eas build --profile development | preview | production`
  (`eas.json`). Release steps: [docs/DEPLOYMENT.md §10](../../docs/DEPLOYMENT.md#10-mobile-app-release-eas).

## Screens

Tabs Home / Catalog / Cart / Wishlist / Profile, each with its own stack, plus Product, Search, Compare,
Checkout, Order, auth modals and the gallery.

* **Home:** banners, categories, promotions with countdown, product rails, brands, advantages, reviews, recently
  viewed. **Catalog:** category tree, product grid with infinite scroll, sorting, filter sheet (price, brands,
  availability, discount, rating, highlights, specifications). **Search:** suggestions, recent and popular queries.
* **Product:** gallery with pinch zoom, variants, stock, add to cart / buy now, wishlist, compare, share, delivery
  estimate by region, installment calculator, description, specifications, reviews (write one with up to 5
  photos), Q&A, related products.
* **Cart and checkout:** coupons, stock warnings, free-delivery progress; recipient → delivery (courier to a saved /
  new address or pickup point) → payment → review. Online payment opens the provider page in the in-app browser;
  the order counts as paid only when the API says so.
* **Orders:** list with filters, detail with live timeline, cancel with reason, pay, reorder, review delivered items.
* **Profile:** avatar, phone verification, addresses, notifications, my reviews, help (FAQ, pages, contacts with
  call / e-mail / Telegram / map / form), settings (language, theme, notification channels, push, password).
* Deep links: `verotools://…` and `https://ockean.uz/…` (all storefront routes, also with `/ru` or `/en`).
* Accessibility: 44 pt touch targets, screen-reader labels, reduced motion, dynamic type with a maximum scale.

## Checked

* `npx tsc -p tsconfig.json --noEmit` — 0 errors; `npx expo export --platform android` and `--platform ios` bundle.
* On the web build (Playwright, 390×844, real API): sign in, product → cart → checkout with courier and cash,
  order in the list, cancellation, cart and wishlist changed from another session appear without a reload,
  language / theme changes synchronised with the account; the cross-device flow is automated in
  [`e2e/`](../../e2e/README.md).

## Not verified on a device

No emulator or physical device was available while building the app, so everything native was checked by type
checking and the Android / iOS bundles only: push notifications (need an EAS project id and a development or
store build — Expo Go on Android has no remote push), camera and photo picker, SecureStore, haptics, share sheet,
the return from the in-app payment browser (`verotools://orders/<id>`), gestures and keyboard behaviour. Test
these on real Android and iOS devices before the store release.
