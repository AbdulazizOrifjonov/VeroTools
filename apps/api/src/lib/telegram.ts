import { env, isTest } from '../config/env';
import { logger } from '../config/logger';

export const telegramConfigured = () => Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_ADMIN_CHAT_ID);

/** Sends an HTML-formatted message to the store's admin Telegram chat (orders, low stock, inquiries). */
export async function notifyAdminsTelegram(html: string): Promise<boolean> {
  if (!telegramConfigured() || isTest) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_ADMIN_CHAT_ID, text: html, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    if (!res.ok) throw new Error(`Telegram API ${res.status}`);
    return true;
  } catch (err) {
    logger.warn({ err }, 'Telegram notification failed');
    return false;
  }
}

export const tgEscape = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
