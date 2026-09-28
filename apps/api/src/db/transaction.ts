import mongoose, { type ClientSession } from 'mongoose';
import { supportsTransactions } from './connection';
import { logger } from '../config/logger';

const TRANSIENT_CODES = new Set([112 /* WriteConflict */, 251 /* NoSuchTransaction */, 244, 262]);

function isTransient(err: unknown): boolean {
  const e = err as { code?: number; errorLabels?: string[]; hasErrorLabel?: (l: string) => boolean };
  if (!e) return false;
  if (typeof e.hasErrorLabel === 'function' && (e.hasErrorLabel('TransientTransactionError') || e.hasErrorLabel('UnknownTransactionCommitResult'))) {
    return true;
  }
  if (e.errorLabels?.includes('TransientTransactionError')) return true;
  return typeof e.code === 'number' && TRANSIENT_CODES.has(e.code);
}

/**
 * Runs `fn` inside a multi-document transaction when the deployment supports it
 * (replica set / sharded). Retries transient write conflicts with jittered backoff.
 * On standalone servers `fn` runs without a session — callers keep compensating logic
 * (e.g. releasing reserved stock) so the result stays consistent.
 */
export async function withTransaction<T>(fn: (session: ClientSession | null) => Promise<T>, maxAttempts = 5): Promise<T> {
  if (!supportsTransactions()) return fn(null);
  let attempt = 0;
  for (;;) {
    attempt += 1;
    const session = await mongoose.startSession();
    try {
      session.startTransaction({ readConcern: { level: 'majority' }, writeConcern: { w: 'majority' } });
      const result = await fn(session);
      await session.commitTransaction();
      return result;
    } catch (err) {
      if (session.inTransaction()) {
        await session.abortTransaction().catch(() => undefined);
      }
      if (attempt < maxAttempts && isTransient(err)) {
        const delay = Math.round(25 * 2 ** attempt * (0.5 + Math.random()));
        logger.debug({ attempt, delay }, 'retrying transaction after transient error');
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    } finally {
      await session.endSession();
    }
  }
}

/** Mongoose query option helper: `{ session }` only when a session exists. */
export function sessionOpt(session: ClientSession | null | undefined): { session?: ClientSession } {
  return session ? { session } : {};
}
