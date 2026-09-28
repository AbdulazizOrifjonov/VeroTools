import { env, isTest } from '../config/env';
import { logger } from '../config/logger';

export interface PushMessage {
  to: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Expo Push API (works for both Android/FCM and iOS/APNs through Expo).
 * Returns tokens reported as invalid (DeviceNotRegistered) so callers can remove them.
 */
export async function sendPush(msg: PushMessage): Promise<{ invalidTokens: string[] }> {
  const tokens = msg.to.filter((t) => /^(Exponent|Expo)PushToken\[.+\]$/.test(t));
  if (!env.PUSH_ENABLED || isTest || tokens.length === 0) return { invalidTokens: [] };
  const invalidTokens: string[] = [];
  try {
    for (let i = 0; i < tokens.length; i += 100) {
      const chunk = tokens.slice(i, i + 100);
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}` } : {}),
        },
        body: JSON.stringify(chunk.map((to) => ({ to, title: msg.title, body: msg.body, data: msg.data ?? {}, sound: 'default' }))),
      });
      const json = (await res.json().catch(() => ({}))) as { data?: Array<{ status: string; details?: { error?: string } }> };
      json.data?.forEach((ticket, idx) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') invalidTokens.push(chunk[idx]!);
      });
    }
  } catch (err) {
    logger.warn({ err }, 'push delivery failed');
  }
  return { invalidTokens };
}
