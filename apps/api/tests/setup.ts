import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/* Test environment — evaluated before any application module (and before .env files are read). */
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_URI_TEST ?? 'mongodb://127.0.0.1:27017/?directConnection=true';
process.env.JWT_SECRET = 'test-access-secret-0123456789abcdef';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-0123456789abcdef';
process.env.BCRYPT_ROUNDS = '8';
process.env.UPLOAD_DIR = mkdtempSync(join(tmpdir(), 'vero-uploads-'));
process.env.STORAGE_DRIVER = 'local';
process.env.REDIS_URL = '';
process.env.SMTP_HOST = '';
process.env.SMS_PROVIDER = 'console';
process.env.TELEGRAM_BOT_TOKEN = '';
process.env.PUSH_ENABLED = 'false';
process.env.JOBS_ENABLED = 'false';
process.env.LOG_LEVEL = 'silent';
process.env.CLIENT_URL = 'http://shop.test';
process.env.PUBLIC_API_URL = 'http://api.test';
// payment provider *test* credentials so the provider protocols can be exercised end-to-end
process.env.PAYME_MERCHANT_ID = 'test-merchant-id';
process.env.PAYME_KEY = 'test-payme-key';
process.env.PAYME_TEST_MODE = 'true';
process.env.CLICK_SERVICE_ID = '1001';
process.env.CLICK_MERCHANT_ID = '2002';
process.env.CLICK_MERCHANT_USER_ID = '3003';
process.env.CLICK_SECRET_KEY = 'test-click-secret';
process.env.CARD_PAYMENT_PROVIDER = 'payme';
