import { getRedis } from './redis';

/**
 * Small cache abstraction: Redis when configured (shared by all API instances), otherwise an in-process
 * TTL map. Keys are grouped by tag prefixes so admin changes can invalidate e.g. "catalog:*".
 */
const memory = new Map<string, { value: string; expires: number }>();
const MAX_MEMORY_KEYS = 2000;

export const cache = {
  async get<T>(key: string): Promise<T | undefined> {
    const redis = getRedis();
    if (redis && redis.status === 'ready') {
      const raw = await redis.get(`vt:${key}`).catch(() => null);
      return raw ? (JSON.parse(raw) as T) : undefined;
    }
    const hit = memory.get(key);
    if (!hit) return undefined;
    if (hit.expires < Date.now()) {
      memory.delete(key);
      return undefined;
    }
    return JSON.parse(hit.value) as T;
  },

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const raw = JSON.stringify(value);
    const redis = getRedis();
    if (redis && redis.status === 'ready') {
      await redis.set(`vt:${key}`, raw, 'EX', ttlSeconds).catch(() => undefined);
      return;
    }
    if (memory.size >= MAX_MEMORY_KEYS) {
      const oldest = memory.keys().next().value;
      if (oldest) memory.delete(oldest);
    }
    memory.set(key, { value: raw, expires: Date.now() + ttlSeconds * 1000 });
  },

  async wrap<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
    const hit = await cache.get<T>(key);
    if (hit !== undefined) return hit;
    const value = await fn();
    await cache.set(key, value, ttlSeconds);
    return value;
  },

  /** Deletes every key starting with one of the prefixes. */
  async invalidate(...prefixes: string[]): Promise<void> {
    for (const key of [...memory.keys()]) {
      if (prefixes.some((p) => key.startsWith(p))) memory.delete(key);
    }
    const redis = getRedis();
    if (redis && redis.status === 'ready') {
      for (const prefix of prefixes) {
        let cursor = '0';
        do {
          const [next, keys] = await redis.scan(cursor, 'MATCH', `vt:${prefix}*`, 'COUNT', 200);
          cursor = next;
          if (keys.length) await redis.del(...keys);
        } while (cursor !== '0');
      }
    }
  },
};

/** Cache tag prefixes */
export const CacheTags = {
  catalog: 'catalog:',
  home: 'home:',
  settings: 'settings:',
  content: 'content:',
  translations: 'translations:',
} as const;
