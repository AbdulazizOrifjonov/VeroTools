import { Redis } from 'ioredis';
import { env } from '../config/env';
import { logger } from '../config/logger';

let client: Redis | null = null;

/** Shared Redis connection (cache, rate limiting, Socket.IO adapter). Null when REDIS_URL is not configured. */
export function getRedis(): Redis | null {
  if (!env.REDIS_URL) return null;
  if (!client) {
    client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2, enableOfflineQueue: true, lazyConnect: false });
    client.on('error', (err) => logger.warn({ err: err.message }, 'Redis error'));
    client.on('ready', () => logger.info('Redis connected'));
  }
  return client;
}

export async function closeRedis() {
  if (client) {
    await client.quit().catch(() => undefined);
    client = null;
  }
}
