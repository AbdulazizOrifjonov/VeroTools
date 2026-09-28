import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/** URL-safe random token (default 48 bytes ≈ 64 chars). */
export const randomToken = (bytes = 48) => randomBytes(bytes).toString('base64url');

/** Numeric one-time code (6 digits). */
export const otpCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

/** Keyed hash for short codes (OTP) so a DB leak does not reveal active codes. */
export const hashCode = (target: string, code: string) =>
  createHmac('sha256', env.JWT_SECRET).update(`${target}:${code}`).digest('hex');

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export const md5 = (value: string) => createHash('md5').update(value).digest('hex');
