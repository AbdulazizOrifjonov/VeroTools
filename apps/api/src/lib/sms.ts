import { env, isProd, isTest } from '../config/env';
import { logger } from '../config/logger';

/**
 * SMS provider architecture. "console" (default, development) logs messages; "eskiz" uses the
 * Eskiz.uz HTTP API (credentials via ESKIZ_EMAIL / ESKIZ_PASSWORD; sender via ESKIZ_FROM).
 */
interface SmsProvider {
  send(phone: string, text: string): Promise<boolean>;
}

class ConsoleSms implements SmsProvider {
  async send(phone: string, text: string) {
    if (isTest) return true;
    if (isProd) {
      // verification codes must never end up in production logs
      logger.warn({ phone: `${phone.slice(0, 6)}***${phone.slice(-2)}` }, 'SMS not sent: no SMS provider configured (set SMS_PROVIDER=eskiz)');
      return false;
    }
    logger.info({ phone, text }, '[sms:console] message (development — no SMS provider configured)');
    return true;
  }
}

class EskizSms implements SmsProvider {
  private token: string | null = null;
  private tokenAt = 0;

  private async auth(): Promise<string> {
    if (this.token && Date.now() - this.tokenAt < 25 * 24 * 3600_000) return this.token;
    const form = new FormData();
    form.append('email', env.ESKIZ_EMAIL ?? '');
    form.append('password', env.ESKIZ_PASSWORD ?? '');
    const res = await fetch('https://notify.eskiz.uz/api/auth/login', { method: 'POST', body: form });
    const json = (await res.json()) as { data?: { token?: string } };
    if (!res.ok || !json.data?.token) throw new Error(`Eskiz auth failed (${res.status})`);
    this.token = json.data.token;
    this.tokenAt = Date.now();
    return this.token;
  }

  async send(phone: string, text: string) {
    try {
      const token = await this.auth();
      const form = new FormData();
      form.append('mobile_phone', phone.replace(/^\+/, ''));
      form.append('message', text);
      form.append('from', env.ESKIZ_FROM);
      const res = await fetch('https://notify.eskiz.uz/api/message/sms/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (res.status === 401) this.token = null;
      if (!res.ok) throw new Error(`Eskiz send failed (${res.status})`);
      return true;
    } catch (err) {
      logger.error({ err, phone }, 'SMS delivery failed');
      return false;
    }
  }
}

const provider: SmsProvider =
  env.SMS_PROVIDER === 'eskiz' && env.ESKIZ_EMAIL && env.ESKIZ_PASSWORD ? new EskizSms() : new ConsoleSms();

export const smsConfigured = () => env.SMS_PROVIDER === 'eskiz' && !!env.ESKIZ_EMAIL;
export const sendSms = (phone: string, text: string) => provider.send(phone, text);
