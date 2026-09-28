/**
 * Imported FIRST by the seed entry point (before the env module is evaluated):
 * seeding never sends real e-mails / SMS / Telegram messages / push notifications and never starts the
 * background jobs. Set SEED_SEND_NOTIFICATIONS=true to opt out (e.g. to test providers with demo data).
 */
if (process.env.SEED_SEND_NOTIFICATIONS !== 'true') {
  process.env.SMTP_HOST = '';
  process.env.SMS_PROVIDER = 'console';
  process.env.TELEGRAM_BOT_TOKEN = '';
  process.env.PUSH_ENABLED = 'false';
}
process.env.JOBS_ENABLED = 'false';
if (!process.env.LOG_LEVEL) process.env.LOG_LEVEL = 'warn';

export {};
