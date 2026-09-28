import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from '../config/logger';

mongoose.set('strictQuery', true);
/*
 * NoSQL-injection protection: request bodies are stripped of "$" / "." keys (middleware/sanitize.ts) and every
 * body / query / param is parsed by a zod schema into plain primitives before it reaches a query, so user input
 * can never smuggle operators. (mongoose's global sanitizeFilter is not used: it would also neutralise the
 * operators of our own server-side queries.)
 */

let transactionsSupported: boolean | null = null;
/** set by disconnectDatabase(): an intentional close is not reported as a lost connection */
let closing = false;

export async function connectDatabase(uri: string = env.MONGO_URI, opts: { dbName?: string } = {}): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return mongoose;
  closing = false;
  await mongoose.connect(uri, {
    ...(opts.dbName ? { dbName: opts.dbName } : {}),
    autoIndex: true,
    serverSelectionTimeoutMS: 15_000,
    maxPoolSize: 20,
    ...(env.MONGO_TLS_ALLOW_INVALID ? { tlsAllowInvalidCertificates: true } : {}),
  });
  transactionsSupported = env.MONGO_TRANSACTIONS === 'off' ? false : await detectTransactions();
  logger.info({ transactions: transactionsSupported }, 'MongoDB connected');
  mongoose.connection.on('disconnected', () => (closing ? logger.debug('MongoDB connection closed') : logger.warn('MongoDB disconnected')));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
  return mongoose;
}

/** Replica sets and sharded clusters (mongos) support multi-document transactions; standalone servers do not. */
async function detectTransactions(): Promise<boolean> {
  try {
    const admin = mongoose.connection.db?.admin();
    if (!admin) return false;
    const hello = (await admin.command({ hello: 1 })) as { setName?: string; msg?: string; logicalSessionTimeoutMinutes?: number };
    return Boolean((hello.setName || hello.msg === 'isdbgrid') && hello.logicalSessionTimeoutMinutes);
  } catch {
    return false;
  }
}

export function supportsTransactions(): boolean {
  return transactionsSupported === true;
}

export async function disconnectDatabase(): Promise<void> {
  closing = true;
  await mongoose.disconnect();
}

/** Ensures all model indexes exist (used by tests and the seed script). */
export async function syncIndexes(): Promise<void> {
  for (const model of Object.values(mongoose.models)) {
    await model.createIndexes();
  }
}
