# VERO TOOLS — security

How the system protects accounts, data and payments, and what operators must configure. Deployment checklist:
[DEPLOYMENT.md §11](DEPLOYMENT.md#11-security-checklist-before-launch). Payment specifics: [PAYMENTS.md](PAYMENTS.md).

## Reporting a vulnerability

Do not open a public issue. Send a description (affected URL / endpoint, steps to reproduce, impact) to the
store's technical contact — `security@verotools.uz` once that mailbox exists, until then the owner's address in
Admin → Settings — or privately to the repository maintainers. Please give us reasonable time to fix the issue
before disclosure and do not access other customers' data, run denial-of-service tests or use social engineering.
We confirm receipt and keep the reporter informed until the fix is deployed.

## 1. Authentication and sessions

* **Tokens.** Short-lived access tokens (JWT HS256, `JWT_ACCESS_TTL`, default 15 min) and rotating refresh tokens
  (separate secret `JWT_REFRESH_SECRET`, `JWT_REFRESH_TTL_DAYS`, default 30 days). Refresh tokens are stored only as
  SHA-256 hashes; every refresh rotates the token, and **re-use of an already rotated token revokes the whole
  session family** (theft detection). Details: [ARCHITECTURE.md §3](ARCHITECTURE.md#3-authentication-and-sessions).
* **Browsers** keep the access token in memory only; the refresh token is an httpOnly, `SameSite=Lax`, `Secure`
  (`COOKIE_SECURE=true`) cookie scoped to `Path=/api/auth` and to the exact host (`vt_rt` on the storefront,
  `vt_art` on the admin panel — they never share a session). No token is ever written to `localStorage`.
* **Mobile** stores the refresh token in the OS keystore (`expo-secure-store`) and sends it in the request body.
* **Revocation.** Changing or resetting the password, blocking an account or changing a staff member's role revokes
  all refresh tokens and increments the user's token version, which invalidates all outstanding access tokens
  immediately (every request re-reads the user). Blocked users cannot sign in, refresh or open a Socket.IO connection.
* **Secrets.** Production refuses to start with the development default secrets or with identical access / refresh
  secrets; `.env.example` ships them empty so a forgotten value fails validation instead of running with a known
  key. Generate each with `openssl rand -base64 48`.
* **Admin sign-in** (`X-Client: admin`) is refused for customers; every `/api/admin` route requires a staff role
  plus its own permission.

## 2. Passwords and one-time codes

* bcrypt (`bcryptjs`) with cost `BCRYPT_ROUNDS` (default 12). Password rules: 8–72 characters, letters and digits.
* Logins with an unknown e-mail / phone are checked against a dummy bcrypt hash, so response time does not reveal
  whether an account exists; the error is always `INVALID_CREDENTIALS`.
* SMS codes (phone verification, password reset): 6 digits, valid 5 minutes, 60-second resend cooldown, at most 5
  attempts, stored as HMAC-SHA-256 (keyed with `JWT_SECRET`) — a database leak does not reveal active codes.
* E-mail links (password reset 1 hour, e-mail verification 24 hours): 32-byte random tokens stored as SHA-256,
  single use.
* A password reset or change signs the user out on every device.
* The owner account is created by the seed from `SEED_ADMIN_*`; production refuses the development default
  password. Remove `SEED_ADMIN_PASSWORD` from `.env` after seeding and change the password at the first sign-in.

## 3. Account-enumeration protection

* **Password reset** answers identically whether or not the e-mail / phone exists, including while the SMS
  cooldown is active.
* **Login** has one generic error and constant-time behaviour (above).
* **Registration** necessarily reports an already registered phone / e-mail (`PHONE_TAKEN`, `EMAIL_TAKEN`); it is
  rate-limited per IP and login identifier.

## 4. Rate limiting

All limits are per client IP (the admin write limit per staff account). With `REDIS_URL` the counters are shared
by all API instances; without Redis each instance counts separately. Responses carry the draft-8 `RateLimit` /
`RateLimit-Policy` headers; exceeding a limit returns `429 RATE_LIMITED`.

| Limiter | Limit | Routes |
|---|---|---|
| global | `RATE_LIMIT_MAX` (300) per `RATE_LIMIT_WINDOW_MS` (1 min) | every `/api` request (payment callbacks exempt) |
| auth | 3 × `AUTH_RATE_LIMIT_MAX` (36) per 15 min per IP **and** login | register, login, forgot / reset password, OTP verification |
| otp | 8 per hour | send SMS code, request verification e-mail |
| write | 30 per 10 min | place order, reorder, reviews, questions, contact form |
| upload | 60 per 10 min | review photos, avatar, admin media and expense attachments |
| admin write | 1 500 per 10 min per staff account | every non-GET `/api/admin` request |

**The client IP must be correct.** Behind nginx and the web / admin servers set `TRUST_PROXY=2` and let nginx
overwrite `X-Forwarded-For` ([DEPLOYMENT.md §4](DEPLOYMENT.md#4-reverse-proxy-nginx--lets-encrypt)). A value that is
too low makes every visitor share the web server's address — for example all customers together could place only
30 orders per 10 minutes; a value that is too high lets clients spoof their IP and escape the limits.

## 5. Input validation and NoSQL-injection protection

* Every body, query and route parameter is parsed by a zod schema (`packages/validation`) into typed primitives
  before it reaches a service; unknown fields are dropped, wrong types are `422 VALIDATION_ERROR`.
* Defence in depth: request bodies are stripped of keys starting with `$` or containing `.` and of `__proto__`,
  `constructor` and `prototype`; route params must be strings; Mongoose runs with `strictQuery`. Query strings are
  never passed to MongoDB raw.
* Body size limits: JSON 2 MB, URL-encoded 200 KB, payment callbacks 50–100 KB; uploads per §6.
* Output encoding: React escapes all rendered text; the storefront server HTML-escapes injected SEO values and
  escapes JSON-LD so it can never close its `<script>` element; e-mail templates escape user data; Markdown content
  pages are rendered without raw HTML.

## 6. File uploads

* In-memory uploads with hard limits: images 10 MB (up to 20 files per request), expense attachments 15 MB (10),
  review photos 5 MB (5), avatars 3 MB (1).
* The file type is detected from the **magic bytes**; the client's MIME type and extension are ignored. Accepted:
  JPEG, PNG, WebP, GIF, AVIF; PDF only for expense attachments. **SVG is rejected** (it can carry scripts).
* Images are decoded and re-encoded by sharp (max 60 megapixels, EXIF rotation, **metadata such as GPS stripped**)
  into WebP; the stored file is never the uploaded byte stream. Damaged files are rejected (`415`).
* Stored names are server-generated ids (`<folder>/<yyyy>/<mm>/<id>.webp`); user file names are kept only as
  sanitised metadata; the local driver normalises keys to prevent path traversal and serves `/uploads` without
  directory listings or dotfiles.

## 7. CORS

* Allowed browser origins: `CLIENT_URL`, `ADMIN_URL` and `CORS_ORIGINS` only, with credentials. Other origins get
  no `Access-Control-Allow-Origin` header, so browsers block the response.
* Requests **without** an `Origin` header (the native app, server-to-server calls, payment providers) are not
  subject to CORS; they are authenticated by tokens or provider signatures, never by cookies alone.
* The storefront and the admin panel call the API through their own origin, so production needs no extra
  `CORS_ORIGINS` (only e.g. Expo web during development).

## 8. Security headers

| Component | Headers |
|---|---|
| API (helmet) | `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; img-src 'self' data:`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: no-referrer`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: cross-origin` (media is embedded by the storefront, admin panel and app), `X-Permitted-Cross-Domain-Policies: none`, `Origin-Agent-Cluster`, no `X-Powered-By` |
| Storefront server | CSP with SHA-256 hashes of the inline theme script (`script-src 'self'`, `connect-src 'self'` + same-host WebSocket, `frame-ancestors 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`), `X-Frame-Options: SAMEORIGIN`, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, microphone, payment, USB off), HSTS behind HTTPS |
| Admin server | stricter CSP (`img-src 'self' data: blob:` + `ASSET_ORIGINS`, `frame-src 'none'`, `frame-ancestors 'none'`), `X-Frame-Options: DENY`, `Referrer-Policy: same-origin`, `Cross-Origin-Opener-Policy: same-origin`, `X-Robots-Tag: noindex, nofollow`, `Permissions-Policy`, HSTS behind HTTPS |

Responses with personal data (auth, account, cart, orders, addresses, notifications, everything under
`/api/admin`) are sent with `Cache-Control: no-store`.

## 9. Permissions (RBAC)

* **Permissions** are granular keys per area and action — e.g. `orders.read`, `orders.update`, `payments.update`,
  `expenses.read`, `reports.export`, `roles.manage` (catalogue: `PERMISSION_GROUPS` in
  `packages/types/src/permissions.ts`). The API checks the required permission on every admin route; the admin UI
  only hides what the API would refuse anyway.
* **Roles** carry a permission set. System roles: `CUSTOMER` (none), `MANAGER` (dashboard; orders, inventory and
  review moderation; product edits and media uploads; read access to categories, brands, customers, coupons,
  promotions, banners, payments, delivery, notifications and content), `ADMIN` (everything except `roles.manage`
  and `users.delete`), `SUPER_ADMIN` (wildcard `*`, cannot be edited). Custom roles can be created in Admin → Roles;
  individual users may get extra permissions on top of their role.
* **Guards:** only a SUPER_ADMIN can create, modify or grant SUPER_ADMIN; the last active SUPER_ADMIN cannot be
  removed; you cannot demote yourself; role changes and blocking revoke the user's sessions.
* Realtime: only staff with `orders.read` join the admin Socket.IO room; everybody else receives only their own
  events.
* Sensitive combinations to grant deliberately: `payments.update` (+ `orders.update`) can record payments
  manually ([PAYMENTS.md](PAYMENTS.md#manual-payment-changes-by-staff)); `users.*` / `roles.manage` control access
  itself; `reports.export` downloads customer and financial data; `settings.update` changes store-wide behaviour.
* Role permissions are cached per API instance for up to 60 s — a revoked permission may stay effective that long on
  other instances (sessions of blocked users and role changes are revoked immediately).

## 10. Audit log

Admin → Audit log (`audit.read`) records who (user, role), what (action, target, field-level before / after of
top-level fields, extra metadata), when, from which IP and user agent — for catalogue, marketing, content,
settings, translations, staff, roles and permissions, orders (status, notes, delivery, payment, installment
decisions), refunds, inventory adjustments, media, expenses, broadcast notifications and every report export.
Audit entries are kept indefinitely (no TTL). Password hashes and internal fields are never written to the log.
Sign-ins are not audit entries; refresh-token records keep IP and user agent for 30 days.

## 11. Payments

* Payme callbacks are authenticated with HTTP Basic (`Paycom:<PAYME_KEY>`), Click callbacks with the MD5 signature
  over the request fields and `CLICK_SECRET_KEY`; both comparisons are constant-time. Amounts and order state are
  re-validated on every call; callbacks are idempotent and replays never pay twice.
* Nothing is marked paid by a redirect, a client request or polling. Online payments (Payme / Click) become paid
  only through the authenticated provider callback — the admin API refuses to mark them paid by hand (`409`);
  staff can record offline payments (cash, bank transfer, installment) and every such change is audited.
* Keys exist only in `.env` and in the provider cabinets; the repository contains no credentials.

## 12. Secrets management

* All secrets live in `.env` on the server (mode `600`, owned by the deploy user): JWT secrets, database credentials
  (for an external cluster), SMTP, Eskiz, Telegram, Expo, S3 / Cloudinary, Payme, Click. `.env*` files are
  git-ignored and excluded from Docker build contexts (`.dockerignore`), so they never enter an image.
* Docker Compose passes `.env` only to the `api` and `seed` containers; the web and admin servers receive just
  their port, the internal API URL and public, non-secret values (admin CSP image origins, mobile app-link ids).
* Keep an encrypted copy of `.env` outside the server (password manager / vault); backups do not contain it.
* Rotate a secret by replacing it in `.env` and `docker compose up -d api`. Rotating `JWT_SECRET` /
  `JWT_REFRESH_SECRET` signs everybody out; payment keys must be changed in the provider cabinet at the same time.
* Logs redact `Authorization` headers, cookies, passwords, tokens and codes. `SMS_PROVIDER=console` writes SMS
  texts — including verification codes — to the log in development only; with `NODE_ENV=production` it logs just
  a masked phone number, sends nothing and reports the SMS as not delivered, so configure Eskiz before launch.

## 13. Infrastructure

* Containers run as the unprivileged `node` user with `no-new-privileges` and all Linux capabilities dropped;
  application files are read-only for that user, only `/data/uploads` is writable.
* MongoDB and Redis are on an internal Docker network without internet access and without published ports; the
  Node services listen on 127.0.0.1 behind nginx. MongoDB runs without authentication inside that network — if the
  database is ever reachable from elsewhere (other containers on the host, a managed cluster), enable access
  control and put the credentials into `MONGO_URI`.
* Demo data must never be loaded into production: it creates staff accounts whose passwords are published in the
  repository (`docs/FRONTEND_GUIDE.md`). Production refuses `--demo` / `--reset` without `--force`.
* Keep the host patched, rebuild images regularly (`docker compose build --pull`), and restrict SSH to keys.
* Optional: restrict `admin.verotools.uz` to office / VPN addresses in nginx and the payment callback paths to the
  providers' IP ranges.
