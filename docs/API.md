# VERO TOOLS API — endpoint index

Generated from the routers the API mounts (`npm run docs:api -w @vero/api`, 214 endpoints). All responses use
the envelope `{ "data": … }` (lists add `"meta": { page, limit, total, pages }`); errors are
`{ "error": { code, message, fields?, details? } }` with codes from `packages/types/src/errors.ts`.

Request headers: `Authorization: Bearer <access token>`, `Accept-Language: uz|ru|en`, `X-Client: web|admin|mobile`,
`X-Guest-Id: <uuid v4>` (anonymous cart / wishlist / compare), `X-Client-Instance` (realtime echo suppression).
Typed client: `packages/api-client` (`createVeroApi`, React Query hooks). DTOs: `packages/types`. Input schemas: `packages/validation`.

Access: **public** — anyone; **customer** — signed-in user; **staff · perm** — admin panel user with that permission
(`[a, b]` = all of them, `[a or b]` = any of them); **provider signature** — Payme / Click callbacks authenticated by the merchant key.
Health checks: `GET /health` (liveness) and `GET /ready` (database / Redis).

| Method | Path | Access | Source |
|---|---|---|---|
| GET | `/api/addresses` | customer | modules/addresses/address.routes.ts |
| POST | `/api/addresses` | customer | modules/addresses/address.routes.ts |
| PATCH | `/api/addresses/:id` | customer | modules/addresses/address.routes.ts |
| DELETE | `/api/addresses/:id` | customer | modules/addresses/address.routes.ts |
| POST | `/api/addresses/:id/default` | customer | modules/addresses/address.routes.ts |
| GET | `/api/admin/analytics` | staff · analytics.read | modules/admin/analytics.admin.ts |
| GET | `/api/admin/audit-logs` | staff · audit.read | modules/admin/users.admin.ts |
| GET | `/api/admin/banners` | staff · banners.read | modules/admin/marketing.admin.ts |
| POST | `/api/admin/banners` | staff · banners.create | modules/admin/marketing.admin.ts |
| GET | `/api/admin/banners/:id` | staff · banners.read | modules/admin/marketing.admin.ts |
| PUT | `/api/admin/banners/:id` | staff · banners.update | modules/admin/marketing.admin.ts |
| DELETE | `/api/admin/banners/:id` | staff · banners.delete | modules/admin/marketing.admin.ts |
| GET | `/api/admin/brands` | staff · brands.read | modules/admin/catalog.admin.ts |
| POST | `/api/admin/brands` | staff · brands.create | modules/admin/catalog.admin.ts |
| GET | `/api/admin/brands/:id` | staff · brands.read | modules/admin/catalog.admin.ts |
| PUT | `/api/admin/brands/:id` | staff · brands.update | modules/admin/catalog.admin.ts |
| DELETE | `/api/admin/brands/:id` | staff · brands.delete | modules/admin/catalog.admin.ts |
| GET | `/api/admin/categories` | staff · categories.read | modules/admin/catalog.admin.ts |
| POST | `/api/admin/categories` | staff · categories.create | modules/admin/catalog.admin.ts |
| POST | `/api/admin/categories/reorder` | staff · categories.update | modules/admin/catalog.admin.ts |
| GET | `/api/admin/categories/:id` | staff · categories.read | modules/admin/catalog.admin.ts |
| PUT | `/api/admin/categories/:id` | staff · categories.update | modules/admin/catalog.admin.ts |
| DELETE | `/api/admin/categories/:id` | staff · categories.delete | modules/admin/catalog.admin.ts |
| GET | `/api/admin/coupons` | staff · coupons.read | modules/admin/marketing.admin.ts |
| POST | `/api/admin/coupons` | staff · coupons.create | modules/admin/marketing.admin.ts |
| GET | `/api/admin/coupons/:id` | staff · coupons.read | modules/admin/marketing.admin.ts |
| PUT | `/api/admin/coupons/:id` | staff · coupons.update | modules/admin/marketing.admin.ts |
| DELETE | `/api/admin/coupons/:id` | staff · coupons.delete | modules/admin/marketing.admin.ts |
| GET | `/api/admin/customers` | staff · customers.read | modules/admin/orders.admin.ts |
| GET | `/api/admin/customers/:id` | staff · customers.read | modules/admin/orders.admin.ts |
| PATCH | `/api/admin/customers/:id` | staff · customers.update | modules/admin/orders.admin.ts |
| GET | `/api/admin/dashboard` | staff · dashboard.read | modules/admin/analytics.admin.ts |
| GET | `/api/admin/delivery/pickup-points` | staff · delivery.read | modules/admin/marketing.admin.ts |
| POST | `/api/admin/delivery/pickup-points` | staff · delivery.update | modules/admin/marketing.admin.ts |
| GET | `/api/admin/delivery/pickup-points/:id` | staff · delivery.read | modules/admin/marketing.admin.ts |
| PUT | `/api/admin/delivery/pickup-points/:id` | staff · delivery.update | modules/admin/marketing.admin.ts |
| DELETE | `/api/admin/delivery/pickup-points/:id` | staff · delivery.update | modules/admin/marketing.admin.ts |
| GET | `/api/admin/delivery/zones` | staff · delivery.read | modules/admin/marketing.admin.ts |
| POST | `/api/admin/delivery/zones` | staff · delivery.update | modules/admin/marketing.admin.ts |
| GET | `/api/admin/delivery/zones/:id` | staff · delivery.read | modules/admin/marketing.admin.ts |
| PUT | `/api/admin/delivery/zones/:id` | staff · delivery.update | modules/admin/marketing.admin.ts |
| DELETE | `/api/admin/delivery/zones/:id` | staff · delivery.update | modules/admin/marketing.admin.ts |
| GET | `/api/admin/expense-categories` | staff · expenses.read | modules/admin/finance-content.admin.ts |
| POST | `/api/admin/expense-categories` | staff · expenses.create | modules/admin/finance-content.admin.ts |
| PUT | `/api/admin/expense-categories/:id` | staff · expenses.update | modules/admin/finance-content.admin.ts |
| DELETE | `/api/admin/expense-categories/:id` | staff · expenses.delete | modules/admin/finance-content.admin.ts |
| GET | `/api/admin/expenses` | staff · expenses.read | modules/admin/finance-content.admin.ts |
| POST | `/api/admin/expenses` | staff · expenses.create | modules/admin/finance-content.admin.ts |
| POST | `/api/admin/expenses/attachments` | staff · expenses.create | modules/admin/finance-content.admin.ts |
| GET | `/api/admin/expenses/summary` | staff · expenses.read | modules/admin/finance-content.admin.ts |
| GET | `/api/admin/expenses/:id` | staff · expenses.read | modules/admin/finance-content.admin.ts |
| PUT | `/api/admin/expenses/:id` | staff · expenses.update | modules/admin/finance-content.admin.ts |
| DELETE | `/api/admin/expenses/:id` | staff · expenses.delete | modules/admin/finance-content.admin.ts |
| GET | `/api/admin/faq` | staff · content.read | modules/admin/finance-content.admin.ts |
| POST | `/api/admin/faq` | staff · content.update | modules/admin/finance-content.admin.ts |
| PUT | `/api/admin/faq/:id` | staff · content.update | modules/admin/finance-content.admin.ts |
| DELETE | `/api/admin/faq/:id` | staff · content.update | modules/admin/finance-content.admin.ts |
| GET | `/api/admin/inventory` | staff · inventory.read | modules/admin/operations.admin.ts |
| GET | `/api/admin/inventory/movements` | staff · inventory.read | modules/admin/operations.admin.ts |
| PATCH | `/api/admin/inventory/:id` | staff · inventory.update | modules/admin/operations.admin.ts |
| POST | `/api/admin/inventory/:id/adjust` | staff · inventory.update | modules/admin/operations.admin.ts |
| GET | `/api/admin/inventory/:id/movements` | staff · inventory.read | modules/admin/operations.admin.ts |
| GET | `/api/admin/media` | staff · media.read | modules/admin/finance-content.admin.ts |
| POST | `/api/admin/media` | staff · media.upload | modules/admin/finance-content.admin.ts |
| PATCH | `/api/admin/media/:id` | staff · media.upload | modules/admin/finance-content.admin.ts |
| DELETE | `/api/admin/media/:id` | staff · media.delete | modules/admin/finance-content.admin.ts |
| POST | `/api/admin/media/:id/replace` | staff · media.upload | modules/admin/finance-content.admin.ts |
| GET | `/api/admin/messages` | staff · content.read | modules/admin/finance-content.admin.ts |
| PATCH | `/api/admin/messages/:id` | staff · content.update | modules/admin/finance-content.admin.ts |
| DELETE | `/api/admin/messages/:id` | staff · content.update | modules/admin/finance-content.admin.ts |
| POST | `/api/admin/notifications/broadcast` | staff · notifications.send | modules/admin/finance-content.admin.ts |
| GET | `/api/admin/notifications/logs` | staff · notifications.read | modules/admin/finance-content.admin.ts |
| GET | `/api/admin/orders` | staff · orders.read | modules/admin/orders.admin.ts |
| GET | `/api/admin/orders/:id` | staff · orders.read | modules/admin/orders.admin.ts |
| PATCH | `/api/admin/orders/:id/delivery` | staff · orders.update | modules/admin/orders.admin.ts |
| POST | `/api/admin/orders/:id/installment` | staff · orders.update | modules/admin/orders.admin.ts |
| POST | `/api/admin/orders/:id/notes` | staff · orders.update | modules/admin/orders.admin.ts |
| PATCH | `/api/admin/orders/:id/payment` | staff · [orders.update, payments.update] | modules/admin/orders.admin.ts |
| POST | `/api/admin/orders/:id/status` | staff · orders.update | modules/admin/orders.admin.ts |
| GET | `/api/admin/pages` | staff · content.read | modules/admin/finance-content.admin.ts |
| GET | `/api/admin/pages/:slug` | staff · content.read | modules/admin/finance-content.admin.ts |
| PUT | `/api/admin/pages/:slug` | staff · content.update | modules/admin/finance-content.admin.ts |
| GET | `/api/admin/payments` | staff · payments.read | modules/admin/operations.admin.ts |
| GET | `/api/admin/payments/providers` | staff · payments.read | modules/admin/operations.admin.ts |
| PATCH | `/api/admin/payments/:id/refund` | staff · payments.update | modules/admin/operations.admin.ts |
| GET | `/api/admin/permissions` | staff · roles.read | modules/admin/users.admin.ts |
| GET | `/api/admin/products` | staff · products.read | modules/admin/products.admin.ts |
| POST | `/api/admin/products` | staff · products.create | modules/admin/products.admin.ts |
| POST | `/api/admin/products/bulk-delete` | staff · products.delete | modules/admin/products.admin.ts |
| POST | `/api/admin/products/bulk-status` | staff · products.update | modules/admin/products.admin.ts |
| GET | `/api/admin/products/:id` | staff · products.read | modules/admin/products.admin.ts |
| PUT | `/api/admin/products/:id` | staff · products.update | modules/admin/products.admin.ts |
| DELETE | `/api/admin/products/:id` | staff · products.delete | modules/admin/products.admin.ts |
| POST | `/api/admin/products/:id/duplicate` | staff · products.create | modules/admin/products.admin.ts |
| PATCH | `/api/admin/products/:id/status` | staff · products.update | modules/admin/products.admin.ts |
| GET | `/api/admin/promotions` | staff · promotions.read | modules/admin/marketing.admin.ts |
| POST | `/api/admin/promotions` | staff · promotions.create | modules/admin/marketing.admin.ts |
| GET | `/api/admin/promotions/:id` | staff · promotions.read | modules/admin/marketing.admin.ts |
| PUT | `/api/admin/promotions/:id` | staff · promotions.update | modules/admin/marketing.admin.ts |
| DELETE | `/api/admin/promotions/:id` | staff · promotions.delete | modules/admin/marketing.admin.ts |
| GET | `/api/admin/questions` | staff · reviews.read | modules/admin/operations.admin.ts |
| PATCH | `/api/admin/questions/:id` | staff · reviews.moderate | modules/admin/operations.admin.ts |
| DELETE | `/api/admin/questions/:id` | staff · reviews.moderate | modules/admin/operations.admin.ts |
| GET | `/api/admin/reports/:type` | staff · reports.read | modules/admin/analytics.admin.ts |
| GET | `/api/admin/reviews` | staff · reviews.read | modules/admin/operations.admin.ts |
| PATCH | `/api/admin/reviews/:id` | staff · reviews.moderate | modules/admin/operations.admin.ts |
| DELETE | `/api/admin/reviews/:id` | staff · reviews.moderate | modules/admin/operations.admin.ts |
| GET | `/api/admin/roles` | staff · roles.read | modules/admin/users.admin.ts |
| POST | `/api/admin/roles` | staff · roles.manage | modules/admin/users.admin.ts |
| GET | `/api/admin/roles/permissions` | staff · roles.read | modules/admin/users.admin.ts |
| PUT | `/api/admin/roles/:id` | staff · roles.manage | modules/admin/users.admin.ts |
| DELETE | `/api/admin/roles/:id` | staff · roles.manage | modules/admin/users.admin.ts |
| GET | `/api/admin/settings` | staff · settings.read | modules/admin/finance-content.admin.ts |
| PUT | `/api/admin/settings` | staff · settings.update | modules/admin/finance-content.admin.ts |
| GET | `/api/admin/specs` | staff · products.read | modules/admin/catalog.admin.ts |
| POST | `/api/admin/specs` | staff · products.update | modules/admin/catalog.admin.ts |
| PUT | `/api/admin/specs/:id` | staff · products.update | modules/admin/catalog.admin.ts |
| DELETE | `/api/admin/specs/:id` | staff · products.delete | modules/admin/catalog.admin.ts |
| GET | `/api/admin/translations` | staff · translations.read | modules/admin/finance-content.admin.ts |
| PUT | `/api/admin/translations` | staff · translations.update | modules/admin/finance-content.admin.ts |
| DELETE | `/api/admin/translations` | staff · translations.update | modules/admin/finance-content.admin.ts |
| GET | `/api/admin/translations/namespaces` | staff · translations.read | modules/admin/finance-content.admin.ts |
| GET | `/api/admin/users` | staff · users.read | modules/admin/users.admin.ts |
| POST | `/api/admin/users` | staff · users.create | modules/admin/users.admin.ts |
| GET | `/api/admin/users/:id` | staff · users.read | modules/admin/users.admin.ts |
| PATCH | `/api/admin/users/:id` | staff · users.update | modules/admin/users.admin.ts |
| DELETE | `/api/admin/users/:id` | staff · users.delete | modules/admin/users.admin.ts |
| GET | `/api/admin/users/:id/activity` | staff · [users.read or audit.read] | modules/admin/users.admin.ts |
| POST | `/api/admin/users/:id/reset-password` | staff · users.update | modules/admin/users.admin.ts |
| POST | `/api/auth/forgot-password` | public | modules/auth/auth.routes.ts |
| POST | `/api/auth/login` | public | modules/auth/auth.routes.ts |
| POST | `/api/auth/logout` | public | modules/auth/auth.routes.ts |
| GET | `/api/auth/me` | customer | modules/auth/auth.routes.ts |
| POST | `/api/auth/otp/send` | customer | modules/auth/auth.routes.ts |
| POST | `/api/auth/otp/verify` | customer | modules/auth/auth.routes.ts |
| POST | `/api/auth/refresh` | public | modules/auth/auth.routes.ts |
| POST | `/api/auth/register` | public | modules/auth/auth.routes.ts |
| POST | `/api/auth/reset-password` | public | modules/auth/auth.routes.ts |
| POST | `/api/auth/verify-email` | public | modules/auth/auth.routes.ts |
| POST | `/api/auth/verify-email/request` | customer | modules/auth/auth.routes.ts |
| GET | `/api/banners` | public | modules/content/content.routes.ts |
| GET | `/api/brands` | public | modules/catalog/catalog.routes.ts |
| GET | `/api/brands/:slug` | public | modules/catalog/catalog.routes.ts |
| GET | `/api/cart` | public | modules/cart/cart.routes.ts |
| DELETE | `/api/cart` | public | modules/cart/cart.routes.ts |
| POST | `/api/cart/coupon` | public | modules/cart/cart.routes.ts |
| DELETE | `/api/cart/coupon` | public | modules/cart/cart.routes.ts |
| POST | `/api/cart/items` | public | modules/cart/cart.routes.ts |
| PATCH | `/api/cart/items/:lineId` | public | modules/cart/cart.routes.ts |
| DELETE | `/api/cart/items/:lineId` | public | modules/cart/cart.routes.ts |
| POST | `/api/cart/merge` | customer | modules/cart/cart.routes.ts |
| GET | `/api/categories` | public | modules/catalog/catalog.routes.ts |
| GET | `/api/categories/:slug` | public | modules/catalog/catalog.routes.ts |
| POST | `/api/checkout/quote` | customer | modules/orders/orders.routes.ts |
| GET | `/api/compare` | public | modules/cart/cart.routes.ts |
| POST | `/api/compare` | public | modules/cart/cart.routes.ts |
| DELETE | `/api/compare` | public | modules/cart/cart.routes.ts |
| DELETE | `/api/compare/:productId` | public | modules/cart/cart.routes.ts |
| POST | `/api/contact` | public | modules/content/content.routes.ts |
| GET | `/api/delivery/options` | public | modules/content/content.routes.ts |
| GET | `/api/delivery/pickup-points` | public | modules/content/content.routes.ts |
| GET | `/api/engagement` | public | modules/cart/cart.routes.ts |
| GET | `/api/faq` | public | modules/content/content.routes.ts |
| GET | `/api/health` | public | app.ts |
| GET | `/api/home` | public | modules/home/home.routes.ts |
| GET | `/api/notifications` | customer | modules/notifications/notifications.routes.ts |
| POST | `/api/notifications/read-all` | customer | modules/notifications/notifications.routes.ts |
| GET | `/api/notifications/unread-count` | customer | modules/notifications/notifications.routes.ts |
| DELETE | `/api/notifications/:id` | customer | modules/notifications/notifications.routes.ts |
| POST | `/api/notifications/:id/read` | customer | modules/notifications/notifications.routes.ts |
| GET | `/api/orders` | customer | modules/orders/orders.routes.ts |
| POST | `/api/orders` | customer | modules/orders/orders.routes.ts |
| GET | `/api/orders/:id` | customer | modules/orders/orders.routes.ts |
| POST | `/api/orders/:id/cancel` | customer | modules/orders/orders.routes.ts |
| POST | `/api/orders/:id/pay` | customer | modules/orders/orders.routes.ts |
| POST | `/api/orders/:id/reorder` | customer | modules/orders/orders.routes.ts |
| GET | `/api/pages/:slug` | public | modules/content/content.routes.ts |
| POST | `/api/payments/click/complete` | provider signature | modules/payments/click.routes.ts |
| POST | `/api/payments/click/prepare` | provider signature | modules/payments/click.routes.ts |
| GET | `/api/payments/methods` | public | modules/content/content.routes.ts |
| POST | `/api/payments/payme` | provider signature | modules/payments/payme.routes.ts |
| GET | `/api/products` | public | modules/catalog/catalog.routes.ts |
| GET | `/api/products/facets` | public | modules/catalog/catalog.routes.ts |
| GET | `/api/products/:id/questions` | public | modules/reviews/reviews.routes.ts |
| GET | `/api/products/:id/related` | public | modules/catalog/catalog.routes.ts |
| GET | `/api/products/:id/reviews` | public | modules/reviews/reviews.routes.ts |
| GET | `/api/products/:slug` | public | modules/catalog/catalog.routes.ts |
| GET | `/api/promotions` | public | modules/content/content.routes.ts |
| GET | `/api/promotions/:slug` | public | modules/content/content.routes.ts |
| POST | `/api/questions` | customer | modules/reviews/reviews.routes.ts |
| GET | `/api/ready` | public | app.ts |
| POST | `/api/reviews` | customer | modules/reviews/reviews.routes.ts |
| POST | `/api/reviews/images` | customer | modules/reviews/reviews.routes.ts |
| GET | `/api/search/popular` | public | modules/catalog/catalog.routes.ts |
| GET | `/api/search/suggest` | public | modules/catalog/catalog.routes.ts |
| GET | `/api/seo/meta` | public | modules/seo/seo.routes.ts |
| GET | `/api/settings/public` | public | modules/content/content.routes.ts |
| GET | `/api/translations` | public | modules/content/content.routes.ts |
| PATCH | `/api/users/me` | customer | modules/users/account.routes.ts |
| POST | `/api/users/me/avatar` | customer | modules/users/account.routes.ts |
| DELETE | `/api/users/me/avatar` | customer | modules/users/account.routes.ts |
| POST | `/api/users/me/password` | customer | modules/users/account.routes.ts |
| PATCH | `/api/users/me/preferences` | customer | modules/users/account.routes.ts |
| POST | `/api/users/me/push-tokens` | customer | modules/users/account.routes.ts |
| DELETE | `/api/users/me/push-tokens` | customer | modules/users/account.routes.ts |
| GET | `/api/users/me/reviews` | customer | modules/users/account.routes.ts |
| GET | `/api/wishlist` | public | modules/cart/cart.routes.ts |
| POST | `/api/wishlist` | public | modules/cart/cart.routes.ts |
| DELETE | `/api/wishlist/:productId` | public | modules/cart/cart.routes.ts |
| GET | `/health` | public | app.ts |
| GET | `/ready` | public | app.ts |
| GET | `/robots.txt` | public | modules/seo/seo.routes.ts |
| GET | `/sitemap-:page.xml` | public | modules/seo/seo.routes.ts |
| GET | `/sitemap.xml` | public | modules/seo/seo.routes.ts |
