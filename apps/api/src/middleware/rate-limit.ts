import type { Request } from 'express';
import { rateLimit, ipKeyGenerator, type Options } from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import { env, isTest } from '../config/env';
import { getRedis } from '../lib/redis';

function store(prefix: string): Options['store'] | undefined {
  const redis = getRedis();
  if (!redis) return undefined;
  return new RedisStore({
    prefix: `vt:rl:${prefix}:`,
    sendCommand: (command: string, ...args: string[]) => redis.call(command, ...args) as Promise<RedisReply>,
  });
}

const handler: Options['handler'] = (_req, res) => {
  res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' } });
};

const base = (prefix: string, windowMs: number, limit: number, extra: Partial<Options> = {}) =>
  rateLimit({
    windowMs,
    limit: isTest ? 10_000 : limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler,
    store: store(prefix),
    ...extra,
  });

const ipKey = (req: Request) => ipKeyGenerator(req.ip ?? '');

/** Global API limiter (payment callbacks and the storefront server's SEO lookups have their own rules). */
export const apiLimiter = base('api', env.RATE_LIMIT_WINDOW_MS, env.RATE_LIMIT_MAX, {
  skip: (req) => req.path.startsWith('/payments/payme') || req.path.startsWith('/payments/click') || req.path.startsWith('/seo/'),
});

/**
 * SEO meta lookups come from the storefront server (one IP for all visitors, responses cached per URL there),
 * so they get a separate, generous bucket instead of sharing the per-visitor API limit.
 */
export const seoLimiter = base('seo', 60_000, 3_000);

/** Login / register / password reset — keyed by IP + login identifier. */
export const authLimiter = base('auth', 15 * 60_000, env.AUTH_RATE_LIMIT_MAX * 3, {
  keyGenerator: (req) => `${ipKey(req)}:${String((req.body as { login?: string; phone?: string })?.login ?? (req.body as { phone?: string })?.phone ?? '').toLowerCase().slice(0, 80)}`,
});

export const otpLimiter = base('otp', 60 * 60_000, 8);
/** Public write actions (reviews, questions, contact form). */
export const writeLimiter = base('write', 10 * 60_000, 30);
export const uploadLimiter = base('upload', 10 * 60_000, 60);
/** Staff write actions — generous, keyed by the staff account (several operators may share one office IP). */
export const adminWriteLimiter = base('admin-write', 10 * 60_000, 1_500, {
  keyGenerator: (req) => (req.auth ? `user:${String(req.auth.id)}` : ipKey(req)),
});
