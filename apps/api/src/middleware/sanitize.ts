import type { NextFunction, Request, Response } from 'express';

/**
 * NoSQL-injection defence in depth: removes keys that start with "$" (MongoDB operators) and prototype keys
 * from request bodies and drops non-string route params. Dotted keys are allowed (store settings use keys like
 * "store.name"); bodies only reach the database after zod validation, which keeps known fields only.
 * Query strings are never used raw (they are parsed by zod schemas into primitives).
 */
function clean(value: unknown, depth = 0): unknown {
  if (depth > 12) return undefined;
  if (Array.isArray(value)) return value.map((v) => clean(v, depth + 1));
  if (value && typeof value === 'object' && !(value instanceof Date) && !Buffer.isBuffer(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k.startsWith('$') || k.includes('\0') || k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      out[k] = clean(v, depth + 1);
    }
    return out;
  }
  return value;
}

export function sanitizeInput(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') req.body = clean(req.body);
  if (req.params) {
    for (const [k, v] of Object.entries(req.params)) {
      if (typeof v !== 'string') delete (req.params as Record<string, unknown>)[k];
    }
  }
  next();
}
