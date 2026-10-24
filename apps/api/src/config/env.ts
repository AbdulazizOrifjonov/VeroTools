import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

/**
 * Environment configuration. Values are read from process.env; for local development
 * the repository-root `.env` (or apps/api/.env) is loaded automatically when present.
 */
const here = dirname(fileURLToPath(import.meta.url));

/** apps/api folder — works from src/config (tsx) and from the dist/ bundle alike. */
function findApiRoot(): string {
  let dir = here;
  for (let i = 0; i < 6; i++) {
    const pkg = resolve(dir, 'package.json');
    if (existsSync(pkg)) {
      try {
        if ((JSON.parse(readFileSync(pkg, 'utf8')) as { name?: string }).name === '@vero/api') return dir;
      } catch {
        /* keep walking */
      }
    }
    dir = resolve(dir, '..');
  }
  return process.cwd();
}
export const API_ROOT = findApiRoot();

for (const candidate of [resolve(process.cwd(), '.env'), resolve(API_ROOT, '.env'), resolve(API_ROOT, '../../.env')]) {
  if (existsSync(candidate)) {
    try {
      process.loadEnvFile(candidate);
    } catch {
      /* ignore malformed env file */
    }
    break;
  }
}

const bool = (def: boolean) =>
  z
    .enum(['true', 'false', '1', '0', 'yes', 'no'])
    .optional()
    .transform((v) => (v === undefined ? def : ['true', '1', 'yes'].includes(v)));

const csv = z
  .string()
  .optional()
  .transform((v) =>
    (v ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  HOST: z.string().default('0.0.0.0'),
  MONGO_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/vero_tools?directConnection=true'),
  MONGO_TLS_ALLOW_INVALID: bool(false),
  /** multi-document transactions: auto = used when the deployment supports them (replica set / sharded); off = never */
  MONGO_TRANSACTIONS: z.enum(['auto', 'off']).default('auto'),
  REDIS_URL: z.string().optional(),

  JWT_SECRET: z.string().min(16).default('dev-access-secret-change-me-please'),
  JWT_REFRESH_SECRET: z.string().min(16).default('dev-refresh-secret-change-me-please'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  COOKIE_SECURE: bool(false),
  COOKIE_DOMAIN: z.string().optional(),
  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),

  CLIENT_URL: z.string().default('http://localhost:5173'),
  ADMIN_URL: z.string().default('http://localhost:5174'),
  /** deep-link scheme / URL used as payment return URL for the mobile app */
  MOBILE_RETURN_URL: z.string().default('ockeantools://orders'),
  CORS_ORIGINS: csv,
  /** public origin of this API, used to build absolute media URLs (local storage) */
  PUBLIC_API_URL: z.string().default('http://localhost:4000'),
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(1),

  STORAGE_DRIVER: z.enum(['local', 's3', 'cloudinary']).default('local'),
  UPLOAD_DIR: z.string().default(resolve(API_ROOT, 'storage/uploads')),
  CLOUDINARY_URL: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_URL: z.string().optional(),
  S3_FORCE_PATH_STYLE: bool(false),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: bool(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().default('OCKEAN TOOLS <no-reply@ockean.uz>'),

  SMS_PROVIDER: z.enum(['console', 'eskiz']).default('console'),
  ESKIZ_EMAIL: z.string().optional(),
  ESKIZ_PASSWORD: z.string().optional(),
  ESKIZ_FROM: z.string().default('4546'),

  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_ADMIN_CHAT_ID: z.string().optional(),

  EXPO_ACCESS_TOKEN: z.string().optional(),
  PUSH_ENABLED: bool(true),

  PAYME_MERCHANT_ID: z.string().optional(),
  PAYME_KEY: z.string().optional(),
  PAYME_TEST_MODE: bool(true),
  CLICK_SERVICE_ID: z.string().optional(),
  CLICK_MERCHANT_ID: z.string().optional(),
  CLICK_MERCHANT_USER_ID: z.string().optional(),
  CLICK_SECRET_KEY: z.string().optional(),
  /** which configured provider processes online Uzcard/Humo payments: payme | click */
  CARD_PAYMENT_PROVIDER: z.enum(['payme', 'click']).default('payme'),
  /** provider for Visa/Mastercard (empty = method disabled) */
  BANK_CARD_PROVIDER: z.enum(['payme', 'click', '']).default(''),
  INSTALLMENT_ENABLED: bool(true),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().default(12),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  JOBS_ENABLED: bool(true),
  /** allow search engines to index the storefront (robots.txt); only effective with NODE_ENV=production */
  SEO_INDEXING: bool(true),
  SEED_ADMIN_EMAIL: z.string().default('admin@ockean.uz'),
  SEED_ADMIN_PHONE: z.string().default('+998900000001'),
  SEED_ADMIN_PASSWORD: z.string().default('OckeanAdmin2026'),
  /** the owner's name as shown in the admin panel (editable later in the profile) */
  SEED_ADMIN_FIRST_NAME: z.string().trim().min(2).max(60).default('Store'),
  SEED_ADMIN_LAST_NAME: z.string().trim().min(2).max(60).default('Owner'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment configuration', z.treeifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

if (isProd) {
  const weak = ['dev-access-secret-change-me-please', 'dev-refresh-secret-change-me-please'];
  if (weak.includes(env.JWT_SECRET) || weak.includes(env.JWT_REFRESH_SECRET) || env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
    console.error('❌ JWT_SECRET and JWT_REFRESH_SECRET must be set to strong, different values in production');
    process.exit(1);
  }
}

// a remote storage driver without its credentials would silently store uploads on the local disk
// (S3 credentials may come from the environment / instance role, so only the bucket is mandatory)
if (env.STORAGE_DRIVER === 's3' && !env.S3_BUCKET) {
  console.error('❌ STORAGE_DRIVER=s3 requires S3_BUCKET (credentials: S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY or an instance role)');
  process.exit(1);
}
if (env.STORAGE_DRIVER === 'cloudinary' && !env.CLOUDINARY_URL) {
  console.error('❌ STORAGE_DRIVER=cloudinary requires CLOUDINARY_URL');
  process.exit(1);
}

export const corsOrigins = Array.from(new Set([env.CLIENT_URL, env.ADMIN_URL, ...env.CORS_ORIGINS].filter(Boolean)));
