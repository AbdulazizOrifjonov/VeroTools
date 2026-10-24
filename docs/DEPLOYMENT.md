# OCKEAN — deployment and operations

## Qisqacha (o'zbekcha)

**Nima kerak:** Linux server (Ubuntu 22.04 / 24.04 yoki Debian 12), kamida 2 vCPU, 4 GB RAM, 40 GB SSD; Docker Engine va
Docker Compose v2; domenlar `ockean.uz`, `www.ockean.uz`, `admin.ockean.uz` (ixtiyoriy `api.ockean.uz`)
server IP manziliga yo'naltirilgan bo'lishi kerak.

**Birinchi o'rnatish:**

1. Docker'ni o'rnating va loyihani yuklab oling: `git clone <repozitoriya> /opt/vero-tools && cd /opt/vero-tools`.
2. Sozlamalar fayli: `cp .env.example .env && chmod 600 .env`. Ikki xil maxfiy kalit yarating
   (`openssl rand -base64 48`) va `JWT_SECRET`, `JWT_REFRESH_SECRET` ga yozing. `CLIENT_URL`, `ADMIN_URL`,
   `PUBLIC_API_URL`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PHONE`, `SEED_ADMIN_PASSWORD` ni to'ldiring.
3. Ishga tushiring: `docker compose up -d --build`, so'ng `docker compose ps` — barcha xizmatlar `healthy` bo'lishi kerak.
4. Boshlang'ich ma'lumotlar (birinchi o'rnatishda): `docker compose --profile tools run --rm seed` — rollar va ruxsatlar,
   do'kon egasi (SUPER_ADMIN) hisobi, sozlamalar, yetkazib berish zonalari, sahifalar, FAQ va kategoriyalar yaratiladi.
   Keyin `.env` dan `SEED_ADMIN_PASSWORD` ni o'chiring.
5. nginx va Let's Encrypt (certbot) bilan HTTPS ni sozlang (4-bo'lim). `.env` da `COOKIE_SECURE=true` va
   `TRUST_PROXY=2` bo'lishi shart.
6. `https://admin.ockean.uz` ga kiring, parolni darhol o'zgartiring. **Admin → Sozlamalar** bo'limida do'kon
   ma'lumotlarini (nom, yuridik nom, telefonlar, email, manzil, ish vaqti, xarita, ijtimoiy tarmoqlar) haqiqiy
   ma'lumotlar bilan almashtiring — seed dagi qiymatlar faqat namuna. Olib ketish punktlari, yetkazib berish narxlari
   va sahifalardagi (shartlar, maxfiylik, qaytarish) matnlarni ham tekshiring.
7. To'lov tizimlari: Payme va Click kabinetlarida callback manzillarini kiriting va kalitlarni `.env` ga yozing
   ([PAYMENTS.md](PAYMENTS.md)). Kaliti kiritilmagan to'lov usuli xaridorlarga ko'rsatilmaydi.

**Muhim:** demo ma'lumotlar (to'qima brendlar, mahsulotlar, mijozlar, buyurtmalar, xarajatlar va paroli ochiq demo
xodim hisoblari) haqiqiy do'konda **hech qachon** ishlatilmasin.

**Zaxira nusxa:** `scripts/backup.sh` (har kuni cron orqali, nusxani boshqa serverga ham ko'chiring), tiklash:
`scripts/restore.sh <papka>`. `.env` faylini alohida, shifrlangan holda saqlang.

**Yangilash:** avval zaxira nusxa, so'ng `git pull && docker compose up -d --build` va
`docker compose --profile tools run --rm seed`.

**Ishga tushirishdan oldin** 11-bo'limdagi xavfsizlik ro'yxatini to'liq tekshiring.

---

Contents: [1. Topology](#1-topology) · [2. Requirements](#2-requirements) · [3. First deployment](#3-first-deployment) ·
[4. Reverse proxy](#4-reverse-proxy-nginx--lets-encrypt) · [5. Media storage](#5-media-storage) ·
[6. Backups](#6-backups-and-restore) · [7. Upgrades](#7-upgrades) · [8. Scaling](#8-scaling) ·
[9. Monitoring](#9-monitoring-and-logs) · [10. Mobile release](#10-mobile-app-release-eas) ·
[11. Security checklist](#11-security-checklist-before-launch) · [12. Troubleshooting](#12-troubleshooting)

## 1. Topology

```
Internet ──443──▶ nginx (host, TLS)
                   ├─ ockean.uz        → 127.0.0.1:3000  web    (storefront; proxies /api /uploads /socket.io … to api)
                   ├─ admin.ockean.uz  → 127.0.0.1:3001  admin  (admin panel; proxies /api /uploads /socket.io to api)
                   └─ api.ockean.uz    → 127.0.0.1:4000  api    (optional: mobile app, payment callbacks)
docker compose (project "vero-tools")
   network edge:     web, admin, api            (internet access for SMTP, SMS, Telegram, push, S3)
   network backend:  api, mongo, redis          (internal: no internet, no published ports)
   volumes:          vero-tools_mongo-data, vero-tools_mongo-config, vero-tools_redis-data, vero-tools_uploads
```

| Service | Image / build | Port (host) | Health | Data |
|---|---|---|---|---|
| `mongo` | `mongo:7`, single-node replica set `rs0` | — | replica set PRIMARY (the healthcheck also initiates the set on first start) | `mongo-data`, `mongo-config` |
| `redis` | `redis:7-alpine`, AOF persistence | — | `redis-cli ping` | `redis-data` (cache — may be lost) |
| `api` | `apps/api/Dockerfile` | 127.0.0.1:4000 | `GET /health` | `uploads` → `/data/uploads` |
| `web` | `apps/web/Dockerfile` | 127.0.0.1:3000 | `GET /healthz` | — |
| `admin` | `apps/admin/Dockerfile` | 127.0.0.1:3001 | `GET /healthz` | — |
| `seed` | API image, profile `tools`, one-off | — | — | writes to MongoDB + `uploads` |

All containers run as non-root (`node`, uid 1000 for the Node services), with `no-new-privileges` and all Linux
capabilities dropped (except the database images, which switch users themselves). Logs rotate at 5 × 20 MB per
container. Architecture details: [ARCHITECTURE.md](ARCHITECTURE.md).

## 2. Requirements

* **Server:** Ubuntu 22.04 / 24.04 LTS or Debian 12, x86_64 (arm64 works too). Minimum 2 vCPU, 4 GB RAM,
  40 GB SSD; recommended 4 vCPU / 8 GB. Building the images needs about 2 GB of free RAM; MongoDB uses up to
  half of (RAM − 1 GB) for its cache.
* **Docker Engine 24+ with the Compose plugin v2.20+** (`docker compose version`); BuildKit is the default builder.
* **DNS:** A (and AAAA if the server has IPv6) records for `ockean.uz`, `www.ockean.uz`,
  `admin.ockean.uz` and optionally `api.ockean.uz`.
* **Firewall:** inbound 22 (SSH, keys only), 80 and 443. Nothing else — the stack binds to 127.0.0.1.
* **Outbound HTTPS** from the server: `registry.npmjs.org` and Docker Hub (image builds), your SMTP server,
  `notify.eskiz.uz`, `api.telegram.org`, `exp.host` (Expo push), the S3 / Cloudinary endpoint if used.
* **Correct time** (systemd-timesyncd / chrony): token expiry and payment timeouts depend on it.
* **Accounts before launch:** SMTP provider (with SPF/DKIM for the sender domain), Eskiz.uz (SMS), a Telegram bot
  for staff notifications, Payme and / or Click merchant contracts, Expo + Google Play / Apple developer accounts
  for the app.

## 3. First deployment

### 3.1 Install Docker

```bash
curl -fsSL https://get.docker.com | sudo sh        # or follow docs.docker.com/engine/install for your distribution
sudo usermod -aG docker "$USER"                    # log out and in again
docker compose version                             # Docker Compose version v2.20 or newer
```

### 3.2 Get the code

```bash
sudo mkdir -p /opt/vero-tools && sudo chown "$USER" /opt/vero-tools
git clone <repository-url> /opt/vero-tools
cd /opt/vero-tools
git checkout <release tag>                          # deploy tagged releases, not a moving branch
```

### 3.3 Configure `.env`

```bash
cp .env.example .env
chmod 600 .env
# two different random secrets (base64 contains no "|", so sed can use it as delimiter)
sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -base64 48)|" .env
sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$(openssl rand -base64 48)|" .env
nano .env
```

Every variable is documented in `.env.example`. For the first start set at least:

| Variable | Production value |
|---|---|
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | generated above — two different values (the API refuses to start otherwise) |
| `CLIENT_URL` | `https://ockean.uz` |
| `ADMIN_URL` | `https://admin.ockean.uz` |
| `PUBLIC_API_URL` | `https://ockean.uz` (the storefront proxies `/api` and `/uploads`) or `https://api.ockean.uz` |
| `TRUST_PROXY` | `2` (nginx → web/admin server → API; see §4) |
| `COOKIE_SECURE` | `true` |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PHONE` | the owner's real e-mail and `+998…` phone (sign-in identifiers) |
| `SEED_ADMIN_PASSWORD` | 8–72 characters with letters and digits (uncomment the line); removed again after seeding |
| `SEED_ADMIN_FIRST_NAME`, `SEED_ADMIN_LAST_NAME` | optional — the owner's name in the admin panel (default "Store Owner") |
| `SMS_PROVIDER`, `ESKIZ_*` | `eskiz` + credentials — with `console` customers never receive verification / reset codes |
| `SMTP_*`, `MAIL_FROM` | your SMTP server — without `SMTP_HOST` no e-mail is delivered |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID` | staff notifications (optional) |
| `PAYME_*`, `CLICK_*` | leave empty until the merchant contracts are ready — methods without credentials are hidden ([PAYMENTS.md](PAYMENTS.md)) |

Leave `MONGO_URI` / `REDIS_URL` at the bundled services unless you use a managed database. Docker Compose
reads the same `.env` for its own variables (image names, host ports — last section of `.env.example`). Wrap values
containing `$` in single quotes.

### 3.4 Build and start

```bash
docker compose up -d --build
docker compose ps                                  # mongo, redis, api, web, admin → "healthy" (1–3 minutes)
curl -fsS http://127.0.0.1:4000/ready             # {"status":"ready","database":true,"redis":"ready"}
curl -fsS http://127.0.0.1:3000/healthz           # {"status":"ok"}
curl -fsS http://127.0.0.1:3001/healthz           # {"status":"ok"}
docker compose logs api | tail                    # JSON logs, e.g. "OCKEAN API listening", "transactions": true
```

On the first start the `mongo` healthcheck initiates the replica set `rs0` (member `mongo:27017`); `api` waits
until MongoDB is PRIMARY and Redis answers, `web` and `admin` wait for a healthy `api`.

### 3.5 Seed the base data (once)

```bash
docker compose --profile tools run --rm seed
```

The seed (`node dist/seed.js --base`) creates the permission catalogue and the system roles (CUSTOMER, MANAGER,
ADMIN, SUPER_ADMIN), the **owner account** (SUPER_ADMIN) from `SEED_ADMIN_*`, store settings, delivery zones and
pickup points, expense categories, content pages and FAQ, product specification definitions and the category tree
with illustrations. It is idempotent: existing records and settings changed in the admin panel are never
overwritten, and an existing owner is never modified. Production refuses the development default password
(`OckeanAdmin2026`) as well as demo data.

Afterwards remove `SEED_ADMIN_PASSWORD` from `.env` (or comment it out again) — the owner changes the password in
the admin panel.

> **Never load demo data on a real store.** `--demo` adds fictional brands, 125 products, customers, orders,
> reviews and expenses **and demo staff accounts whose passwords are published in the repository**. Production
> refuses it without `--force`; it exists only for local testing (`docker-compose.override.example.yml`).

### 3.6 Reverse proxy and TLS

Configure nginx and certificates as described in [§4](#4-reverse-proxy-nginx--lets-encrypt), then open
`https://ockean.uz` and `https://admin.ockean.uz`.

### 3.7 First sign-in and store setup

1. Sign in at `https://admin.ockean.uz` with the owner's e-mail or phone and **change the password**.
2. **Admin → Settings:** replace every store detail — the seeded values are realistic-looking **placeholders**:
   store and legal name, phones, e-mails, address, working hours, map position, footer text, SEO title and
   description, homepage
   advantages, product trust bullets. Social links start empty (no account is guessed) — enter your Telegram,
   Instagram, Facebook, YouTube and TikTok pages under Social media. Choose the enabled payment methods,
   installment plans and minimum amount, unpaid-order timeout and low-stock threshold.
3. **Delivery:** check zone prices, free-delivery thresholds and delivery days; replace or deactivate the sample
   pickup points (addresses and phones are samples).
4. **Pages & FAQ:** review the policy texts (terms / public offer, privacy, returns, warranty, delivery, payment)
   with your lawyer; they are published at `/terms`, `/privacy`, `/returns`, `/warranty`, `/delivery`, `/payment`.
5. **Staff & roles:** create personal accounts for every employee with the smallest role that fits (MANAGER for
   order processing). Do not share the owner account.
6. **Catalogue:** brands, products with images, stock (Inventory), banners and promotions.
7. **Smoke test:** register on the storefront, place a cash order, move it through the statuses in the admin panel,
   verify stock, e-mails, SMS and the Telegram message; then cancel it.

### 3.8 Payments

Configure Payme / Click as described in [PAYMENTS.md](PAYMENTS.md), test in the sandboxes, then switch to
production keys.

## 4. Reverse proxy (nginx + Let's Encrypt)

nginx on the host terminates TLS and forwards to the containers on 127.0.0.1. The configuration below was
validated with nginx 1.24 (Ubuntu 24.04) and tested end to end in front of the api, web and admin servers
(HTTP/2, redirects, WebSocket upgrade, upload limits, client IP detection).

```bash
sudo apt install nginx certbot
sudo mkdir -p /var/www/certbot
```

1. Put only the first `server { listen 80; … }` block of the file below into `/etc/nginx/conf.d/vero-tools.conf`
   (the TLS blocks need the certificate first), then `sudo nginx -t && sudo systemctl reload nginx`.
2. Request one certificate for all names (drop `api.ockean.uz` if you do not use it):

   ```bash
   sudo certbot certonly --webroot -w /var/www/certbot \
     -d ockean.uz -d www.ockean.uz -d admin.ockean.uz -d api.ockean.uz \
     --deploy-hook "systemctl reload nginx"
   ```

   Renewal runs automatically (certbot systemd timer); test it with `sudo certbot renew --dry-run`.
3. Install the complete file, `sudo nginx -t && sudo systemctl reload nginx`. Remove the `listen [::]:…` lines if
   the server has no IPv6, and the `api.ockean.uz` block if you do not use that host.

```nginx
# /etc/nginx/conf.d/vero-tools.conf — OCKEAN behind nginx.
# Docker Compose publishes web on 127.0.0.1:3000, admin on 127.0.0.1:3001 and the API on 127.0.0.1:4000.

# Socket.IO WebSocket upgrade; an empty Connection header keeps upstream keep-alive for normal requests.
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      '';
}

upstream vero_web   { server 127.0.0.1:3000; keepalive 16; }
upstream vero_admin { server 127.0.0.1:3001; keepalive 8; }
upstream vero_api   { server 127.0.0.1:4000; keepalive 16; }

# HTTP: Let's Encrypt http-01 challenges, everything else → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ockean.uz www.ockean.uz admin.ockean.uz api.ockean.uz;

    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}

# www → apex
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.ockean.uz;
    ssl_certificate     /etc/letsencrypt/live/ockean.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ockean.uz/privkey.pem;
    return 301 https://ockean.uz$request_uri;
}

# Storefront (also proxies /api, /uploads, /socket.io, sitemaps and robots.txt to the API)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ockean.uz;
    ssl_certificate     /etc/letsencrypt/live/ockean.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ockean.uz/privkey.pem;

    # review photos (5 × 5 MB), avatars (3 MB)
    client_max_body_size 30m;

    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    # overwrite, never append: the API trusts exactly two hops (TRUST_PROXY=2)
    proxy_set_header X-Forwarded-For   $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host  $host;
    proxy_set_header Upgrade           $http_upgrade;
    proxy_set_header Connection        $connection_upgrade;
    proxy_read_timeout 75s;

    location / { proxy_pass http://vero_web; }
}

# Admin panel
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name admin.ockean.uz;
    ssl_certificate     /etc/letsencrypt/live/ockean.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ockean.uz/privkey.pem;

    # optional: office / VPN addresses only
    # allow 203.0.113.0/24;
    # deny all;

    # media library uploads: up to 20 images × 10 MB per request
    client_max_body_size 210m;

    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host  $host;
    proxy_set_header Upgrade           $http_upgrade;
    proxy_set_header Connection        $connection_upgrade;
    # PDF / XLSX report exports can take a while
    proxy_read_timeout 180s;
    proxy_send_timeout 180s;

    location / { proxy_pass http://vero_admin; }
}

# Optional: dedicated API host for the mobile app and payment callbacks (PUBLIC_API_URL=https://api.ockean.uz)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.ockean.uz;
    ssl_certificate     /etc/letsencrypt/live/ockean.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ockean.uz/privkey.pem;

    client_max_body_size 30m;

    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host  $host;
    proxy_set_header Upgrade           $http_upgrade;
    proxy_set_header Connection        $connection_upgrade;
    proxy_read_timeout 75s;

    location / { proxy_pass http://vero_api; }
}
```

What matters in this configuration:

* **`X-Forwarded-For $remote_addr` (overwrite, not `$proxy_add_x_forwarded_for`)** together with
  **`TRUST_PROXY=2`**: requests to the storefront and the admin panel pass two proxies (nginx → web/admin server →
  API), direct `api.ockean.uz` requests one. Because nginx replaces whatever the client sent, the API resolves
  the real visitor IP on every route and a client cannot spoof its address. With the default `TRUST_PROXY=1` every
  storefront visitor would appear with the web server's IP and share one rate-limit bucket (global 429s); with an
  appending `X-Forwarded-For` a client could forge its IP on the direct API host. If a CDN or load balancer sits in
  front of nginx, restore the visitor address in nginx first (`set_real_ip_from <CDN ranges>;`
  `real_ip_header CF-Connecting-IP;` for Cloudflare) and keep the rest unchanged.
* **`X-Forwarded-Proto`** lets the web and admin servers detect HTTPS and send HSTS; the API sends its own HSTS
  header (helmet). Do not add a second HSTS header in nginx.
* **WebSocket:** `Upgrade` / `Connection` headers and HTTP/1.1 to the upstreams (Socket.IO under `/socket.io`).
* **Upload limits:** storefront 30 MB (review photos 5 × 5 MB), admin 210 MB (media library 20 × 10 MB per
  request), API host 30 MB. The API enforces the per-file limits itself.
* **Timeouts:** report exports in the admin panel may take up to two minutes (the admin server allows 120 s).
* Leave `COOKIE_DOMAIN` empty: the refresh cookies are host-only for `ockean.uz` and `admin.ockean.uz`.

Proxy-related variables:

| Variable | Value | Why |
|---|---|---|
| `TRUST_PROXY` | `2` | two trusted hops, see above (`1` only without nginx, e.g. local tests) |
| `COOKIE_SECURE` | `true` | refresh cookies only over HTTPS |
| `CLIENT_URL` | `https://ockean.uz` | canonical URLs, sitemap, e-mail links, payment return URL, CORS |
| `ADMIN_URL` | `https://admin.ockean.uz` | CORS / Socket.IO origin of the admin panel |
| `PUBLIC_API_URL` | `https://ockean.uz` or `https://api.ockean.uz` | absolute media URLs, payment callback URLs shown in the admin panel — must be public HTTPS, never `http://api:4000` |
| `CORS_ORIGINS` | empty | extra browser origins only (e.g. Expo web during development); the native app needs none |
| `MOBILE_RETURN_URL` | `verotools://orders` | payment return deep link of the app (scheme `verotools`) |

The admin container has its own `TRUST_PROXY` (Express syntax, set to `loopback, uniquelocal` in
`docker-compose.yml`) — never copy the API's numeric value there.

## 5. Media storage

Choose the driver **before launch**. Media records store the URL of the driver that uploaded them, `/uploads` is
served only while `STORAGE_DRIVER=local`, and there is no built-in migration: switching later makes previously
uploaded local images unreachable unless you copy the files and rewrite the stored URLs yourself.

| Driver | Configuration | Backups | Notes |
|---|---|---|---|
| `local` (default) | nothing — Compose mounts the volume `vero-tools_uploads` at `/data/uploads` | `scripts/backup.sh` includes the volume | served by the API (`/uploads/…`, one-year immutable cache) through the storefront / API host; watch disk usage |
| `s3` | `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, for non-AWS providers `S3_ENDPOINT` (+ `S3_FORCE_PATH_STYLE=true` for MinIO), `S3_PUBLIC_URL` (bucket or CDN URL) | bucket versioning / replication (use `backup.sh --no-uploads`) | objects must be publicly readable; set `ADMIN_ASSET_ORIGINS` to the `S3_PUBLIC_URL` origin so the admin panel may display them |
| `cloudinary` | `CLOUDINARY_URL=cloudinary://KEY:SECRET@CLOUD` | Cloudinary account | set `ADMIN_ASSET_ORIGINS=https://res.cloudinary.com` |

The API refuses to start when the selected driver is incomplete — `STORAGE_DRIVER=s3` without `S3_BUCKET` or
`STORAGE_DRIVER=cloudinary` without `CLOUDINARY_URL` exits with a clear error instead of quietly writing uploads to
the container disk. After changing the driver check the API log line `"media storage ready"` (`provider`). The seed
uploads category illustrations through the configured driver, so configure storage before seeding.

## 6. Backups and restore

What to protect:

| Data | Where | Backup |
|---|---|---|
| All business data (catalogue, customers, orders, payments, settings, translations, audit log) | MongoDB database `vero_tools` | `scripts/backup.sh` (mongodump) |
| Uploaded media | volume `vero-tools_uploads` (local driver) | `scripts/backup.sh` (tar of `/data/uploads`) |
| Secrets and configuration | `.env` | **separately**, encrypted (password manager / vault) — not part of the backup |
| Cache, rate limits, job locks | Redis | not needed (rebuilt automatically) |

```bash
scripts/backup.sh                         # → ~/vero-tools-backups/vero-tools-<UTC timestamp>/
scripts/backup.sh -o /var/backups/vero-tools --keep-days 14
scripts/backup.sh --no-uploads            # media in S3 / Cloudinary
```

A backup directory contains `mongo-vero_tools.archive.gz` (mongodump `--archive --gzip`), `uploads.tar.gz`,
`SHA256SUMS` and `backup.txt`; files are created with mode 600 and an incomplete backup is deleted. Schedule it
and copy the result off the server:

```cron
15 3 * * *  /opt/vero-tools/scripts/backup.sh -o /var/backups/vero-tools --keep-days 14 >> /var/log/vero-tools-backup.log 2>&1
45 3 * * *  rclone sync /var/backups/vero-tools remote:vero-tools-backups     # or rsync / restic to another host
```

A dump of a running database is not a point-in-time snapshot across collections; schedule it at night. For a
strictly consistent copy stop the writers for the duration of the dump (`docker compose stop api web admin`, run the
backup, `docker compose start api web admin`).

### Restore

```bash
scripts/restore.sh /var/backups/vero-tools/vero-tools-20261001T031500Z
```

The script verifies the checksums, asks you to type the database name, starts `mongo` / `redis` and waits until
healthy, stops `api`, `web` and `admin`, drops the database and restores the archive, replaces the content of the
uploads volume, flushes the Redis cache and starts the stopped services again. Options: `--no-mongo`,
`--no-uploads`, `--keep-uploads`, `--db NAME`, `--yes`.

**New server (disaster recovery):** install Docker, clone the same release, restore `.env` from the secure copy
(same JWT secrets keep customers signed in; payment keys), `docker compose build`, then
`scripts/restore.sh --yes <backup dir>` and `docker compose up -d`. Update DNS last.

Test a restore regularly (e.g. monthly on a staging server with `SEO_INDEXING=false` and without payment keys).

Manual equivalents: `docker compose exec -T mongo mongodump --archive --gzip --db vero_tools > dump.gz` and
`docker compose exec -T mongo mongorestore --archive --gzip --drop --nsInclude 'vero_tools.*' < dump.gz`.

## 7. Upgrades

```bash
cd /opt/vero-tools
scripts/backup.sh                                   # always first
git fetch --tags && git checkout <new tag>
docker compose build --pull                         # api, web, admin (+ latest node:22-bookworm-slim patches)
docker compose up -d                                # recreates changed containers; mongo/redis keep running
docker compose --profile tools run --rm seed        # idempotent: new permissions, settings keys, pages
docker compose ps && curl -fsS http://127.0.0.1:4000/ready
docker image prune -f
```

* Downtime is a few seconds per container. While the API restarts the storefront still serves pages (without
  per-URL SEO data) and clients reconnect Socket.IO automatically.
* Indexes are created automatically when the API starts; schema changes are additive (no migration step).
* New permission keys appear in Admin → Roles; system roles keep their stored permissions (only SUPER_ADMIN has
  the `*` wildcard), so grant new keys to MANAGER / ADMIN / custom roles as needed.
* **Rollback:** `git checkout <previous tag> && docker compose up -d --build`; restore the backup if the new
  version changed data in an incompatible way.
* **Prebuilt images** (`.github/workflows/docker.yml`): set `VERO_API_IMAGE`, `VERO_WEB_IMAGE`,
  `VERO_ADMIN_IMAGE` in `.env` (e.g. `ghcr.io/<owner>/vero-tools-api:1.2.0`), then
  `docker compose pull api web admin && docker compose up -d --no-build`.
* Database images: `docker compose pull mongo redis && docker compose up -d mongo redis` for patch releases. A
  MongoDB major upgrade (7 → 8) follows MongoDB's procedure (backup, `featureCompatibilityVersion`), never just an
  image tag change.
* Rebuild monthly even without code changes to pick up security fixes of the base image.

## 8. Scaling

* **One API container** serves a typical single-country store; scale vertically first (CPU for image processing,
  RAM for MongoDB).
* **More API instances** (Compose `--scale`, several hosts or Kubernetes) require:
  * `REDIS_URL` — shared rate limits, cache invalidation, Socket.IO fan-out (Redis adapter) and background-job
    locks. Without Redis every instance has its own counters and cache and runs every job.
  * shared media — S3 / Cloudinary, or one shared volume;
  * **sticky sessions** for Socket.IO: clients connect WebSocket-first, but the long-polling fallback needs all
    requests of a session on the same instance (nginx `hash $remote_addr consistent;` in the upstream, or a
    load balancer with session affinity). The web / admin servers proxy to a single `API_INTERNAL_URL`, so put
    the balancer behind that URL;
  * no fixed host port per instance (remove the `ports:` mapping of `api`).
* In-process caches converge within 60 s across instances (catalogue index for search / facets, role
  permissions), so a category or role change can take up to a minute to show everywhere.
* Background jobs run on whichever instance holds the Redis lock; set `JOBS_ENABLED=false` on instances that should
  never run them.
* **MongoDB:** for high availability use a managed replica set (MongoDB Atlas) —
  `MONGO_URI=mongodb+srv://…/vero_tools`; each API instance keeps up to 20 connections.
* The web and admin servers are stateless and cheap; scale them independently if needed.

## 9. Monitoring and logs

| Endpoint | Meaning |
|---|---|
| `GET /health` (also `/api/health`) | liveness — the API process is up |
| `GET /ready` (also `/api/ready`) | readiness — `200 {"status":"ready","database":true,"redis":"ready"}`, or `503 {"status":"degraded", …}` when MongoDB is disconnected or Redis is not ready |
| `GET /healthz` on web / admin | the Node server is up |

* External uptime checks: `https://ockean.uz/api/ready` (whole chain nginx → web → API → MongoDB / Redis),
  `https://ockean.uz/`, `https://admin.ockean.uz/healthz`.
* `docker compose ps` shows the healthcheck state. Docker restarts containers that **exit**
  (`restart: unless-stopped`), not ones that are merely unhealthy — alert on unhealthy containers.
* **Logs** are JSON lines (pino) in production: `level` (30 info, 40 warn, 50 error, 60 fatal), `time` (ms), `msg`,
  `req` (`id`, `method`, `url`), `res.statusCode`, `responseTime`. Authorization headers, cookies, passwords, tokens
  and codes are redacted.

  ```bash
  docker compose logs -f --tail 100 api
  docker compose logs --no-log-prefix api | jq -c 'select(.level >= 50)'      # errors only
  ```

  Rotation: 5 × 20 MB per container (docker-compose.yml). Ship to Loki / ELK if you need retention.
* Watch for: `5xx` rates, `"payme handler failed"`, `"click prepare failed"` / `"click complete failed"`,
  `"job failed"`, `"refresh token reuse detected"`, `"MongoDB disconnected"`, `"Redis error"`,
  `"mail delivery failed"`; disk usage (`docker system df -v`, the uploads and mongo volumes), backup age,
  certificate expiry.
* **Known limitation — SEO lookups and rate limiting:** the storefront server fetches `/api/seo/meta` for every
  uncached page without forwarding the visitor IP, so all these lookups share one rate-limit bucket
  (`RATE_LIMIT_MAX` per `RATE_LIMIT_WINDOW_MS`, default 300 / min). Under heavy crawling the API answers them with
  429 and uncached pages are served without SEO tags and with status 200. If crawlers hit many distinct URLs,
  raise `RATE_LIMIT_MAX` (it also raises the per-visitor limit) until this is fixed in the application.

## 10. Mobile app release (EAS)

The app (`apps/mobile`, Expo SDK 57) is built and submitted with EAS; it is not part of the Docker stack.
Identifiers: Android package and iOS bundle id `uz.verotools.app`, URL scheme `verotools`.

`apps/mobile/eas.json` profiles:

| Profile | Output | API (`EXPO_PUBLIC_API_URL`) | Use |
|---|---|---|---|
| `development` | Android debug APK / iOS simulator build | `http://192.168.1.20:4000/api` (LAN IP of a dev machine) | local testing |
| `preview` | internal APK, channel `preview` | `https://staging.ockean.uz/api` | testers / staging |
| `production` | Android App Bundle, channel `production`, build numbers auto-incremented | `https://ockean.uz/api` | store release |

`EXPO_PUBLIC_*` values are embedded into the bundle at build time and are not secret. EAS builds do not read
`apps/mobile/.env` (it is not uploaded); change them in `eas.json` (`build.<profile>.env`) or as EAS environment
variables — e.g. use `https://api.ockean.uz/api` if you run the dedicated API host.

```bash
npm install -g eas-cli                     # >= 16
eas login
cd apps/mobile
eas init                                   # creates the EAS project and prints its id
export EAS_PROJECT_ID=<project id>         # app.config.ts reads it (extra.eas.projectId)
```

`EAS_PROJECT_ID` must be present both when you run `eas` commands and on the build workers — add it to
`build.base.env` in `eas.json` (it is not a secret) or create it as an EAS environment variable. Without it the app
cannot obtain Expo push tokens (push is skipped).

**Push notifications.** The API sends through the Expo Push service (`exp.host`); no provider keys live on the
server. Configure credentials once with `eas credentials`: Android → FCM V1 service-account key (Firebase project
of the app), iOS → APNs key (EAS can create it). Set `EXPO_ACCESS_TOKEN` on the API only if you enable "enhanced
push security" for the Expo project.

**Build and submit:**

```bash
eas build --platform android --profile production
eas build --platform ios --profile production
eas submit --platform android --profile production     # Google Play service-account JSON; the very first upload is done manually in Play Console
eas submit --platform ios --profile production         # App Store Connect API key
```

The marketing version (`version` in `app.config.ts`) is bumped manually; build numbers are managed remotely by EAS
(`appVersionSource: remote`, `autoIncrement`). Store listings need the privacy policy URL
(`https://ockean.uz/privacy`), the data-safety / privacy questionnaire (account data, orders, push token,
photos for reviews), screenshots and support contacts. `expo-updates` is not installed, so every change ships
through a store release (the `channel` settings only matter once it is added).

**App links.** The Android intent filters (`autoVerify`) for `https://ockean.uz/product|catalog|account|
promotions|brands` and the iOS associated domain `applinks:ockean.uz` only verify when the storefront serves
`/.well-known/assetlinks.json` and `/.well-known/apple-app-site-association`. The storefront server generates both
files from its environment (set in `.env`, passed through by `docker-compose.yml`):

| Variable | Value |
|---|---|
| `IOS_APP_IDS` | `<Apple Team ID>.uz.verotools.app` (comma separated for several apps) |
| `ANDROID_APP_PACKAGE` | `uz.verotools.app` (default) |
| `ANDROID_SHA256_FINGERPRINTS` | SHA-256 fingerprint(s) of the **Play app-signing** certificate (Play Console → Test and release → App integrity), plus the upload key for internal builds if needed |

Then `docker compose up -d web` and check `curl -s https://ockean.uz/.well-known/assetlinks.json`. While a
variable is empty the file answers 404 and links simply open in the browser; the `verotools://` scheme (payment
return) works regardless.

## 11. Security checklist before launch

- [ ] `.env`: two different random JWT secrets, `chmod 600`, not in git, an encrypted copy stored outside the server.
- [ ] `NODE_ENV=production` (Compose enforces it), `COOKIE_SECURE=true`, `TRUST_PROXY=2`, nginx overwrites
      `X-Forwarded-For`.
- [ ] `CLIENT_URL`, `ADMIN_URL`, `PUBLIC_API_URL` are the public HTTPS origins without a trailing slash;
      `CORS_ORIGINS` empty; `COOKIE_DOMAIN` empty.
- [ ] Only 22 / 80 / 443 reachable from the internet; `docker compose ps` shows `127.0.0.1:` bindings only; no
      `docker-compose.override.yml` on the server (it publishes MongoDB and Redis).
- [ ] Owner password changed after the first sign-in; `SEED_ADMIN_PASSWORD` removed from `.env`; personal staff
      accounts with least privilege; nobody shares the owner account.
- [ ] No demo data: no `manager@example.com` / `admin@example.com` in Admin → Staff, no fictional orders.
- [ ] `SMS_PROVIDER=eskiz` (the console provider writes verification codes into the log), SMTP configured with
      SPF / DKIM for the `MAIL_FROM` domain.
- [ ] Payments: sandbox scenarios passed, then production keys with `PAYME_TEST_MODE=false`; callback URLs use
      HTTPS; only contracted methods enabled; decide who may record payments manually (see
      [PAYMENTS.md](PAYMENTS.md#manual-payment-changes-by-staff)).
- [ ] Store details, pickup points and policy pages replaced; `SEO_INDEXING=true` only on the production host.
- [ ] Daily backups with an off-site copy; one restore tested.
- [ ] Monitoring and alerts for `/api/ready`, unhealthy containers, disk space and certificate expiry;
      `certbot renew --dry-run` passes.
- [ ] Host: automatic security updates (`unattended-upgrades`), SSH keys only, root login disabled; images rebuilt
      recently.
- [ ] Read [SECURITY.md](SECURITY.md) (rate limits, permissions, audit log, reporting vulnerabilities).

## 12. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `api` exits: `Invalid environment configuration` | a variable has an invalid value (e.g. empty `JWT_SECRET`, unknown `STORAGE_DRIVER`); the log shows the field |
| `api` exits: `JWT_SECRET and JWT_REFRESH_SECRET must be set to strong, different values` | generate two different secrets (§3.3) |
| `api` unhealthy, log `failed to start API` / server selection timeout | MongoDB not reachable: `docker compose ps mongo`, `docker compose logs mongo`; with an external database check `MONGO_URI` |
| `mongo` stays unhealthy | `docker compose exec mongo mongosh --eval 'rs.status()'`; a replica-set member name other than `mongo:27017` (data restored from another setup) needs `rs.reconfig` |
| `/ready` → 503, `"redis":"reconnecting"` | Redis down: `docker compose logs redis` |
| Storefront answers 502 `SERVICE_UNAVAILABLE` for `/api` | the API container is down or restarting |
| Every visitor gets 429 `RATE_LIMITED` | `TRUST_PROXY` too low or nginx appends `X-Forwarded-For` (§4) |
| Customers are signed out on every reload | `COOKIE_SECURE=true` over plain HTTP, or a `COOKIE_DOMAIN` that does not match |
| Images missing in the admin panel (S3 / Cloudinary) | set `ADMIN_ASSET_ORIGINS` (§5) |
| Images use `http://localhost:4000` / `http://api:4000` URLs | `PUBLIC_API_URL` is not the public origin |
| Uploads fail with 413 | nginx `client_max_body_size` (§4) or the per-file limit of the API |
| Realtime updates do not arrive | WebSocket headers missing in nginx; several API instances without Redis or sticky sessions (§8) |
| Seed: `Refusing to create the owner account with the default password` | set `SEED_ADMIN_PASSWORD` (§3.3) |
| Payme answers `-32504` for every call | `PAYME_KEY` does not match the key of the cabinet (test key vs. production key) |
