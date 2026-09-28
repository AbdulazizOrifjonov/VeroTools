import type { Request } from 'express';
import { AuditLog } from '../models/audit-log.model';
import { logger } from '../config/logger';

const IGNORED = new Set(['updatedAt', 'createdAt', 'searchText', '__v', 'passwordHash']);

/** Shallow diff of top-level fields for the audit trail (large values are summarised). */
export function diff(before: Record<string, unknown> | null | undefined, after: Record<string, unknown> | null | undefined) {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  if (!before || !after) return out;
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const k of keys) {
    if (IGNORED.has(k)) continue;
    const a = JSON.stringify(before[k] ?? null);
    const b = JSON.stringify(after[k] ?? null);
    if (a !== b) {
      const trim = (v: string) => (v.length > 300 ? `${v.slice(0, 300)}…` : JSON.parse(v));
      out[k] = { from: trim(a), to: trim(b) };
    }
  }
  return out;
}

export interface AuditInput {
  action: string;
  target?: { type: string; id?: string; label?: string };
  changes?: Record<string, { from: unknown; to: unknown }>;
  meta?: Record<string, unknown>;
}

/** Writes an audit record for the current staff user. Never throws. */
export async function audit(req: Request, input: AuditInput): Promise<void> {
  try {
    await AuditLog.create({
      user: req.auth?.id,
      userName: req.auth ? `${req.auth.user.firstName} ${req.auth.user.lastName}` : undefined,
      userRole: req.auth?.roleKey,
      action: input.action,
      target: input.target,
      changes: input.changes && Object.keys(input.changes).length ? input.changes : undefined,
      meta: input.meta,
      ip: req.ctx?.ip,
      userAgent: req.ctx?.userAgent?.slice(0, 300),
    });
  } catch (err) {
    logger.error({ err, action: input.action }, 'audit log write failed');
  }
}
