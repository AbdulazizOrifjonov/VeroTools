import { randomUUID } from 'node:crypto';
import { logger } from '../config/logger';
import { getRedis } from '../lib/redis';
import { refreshAllPricing } from '../modules/catalog/promotions.service';
import { expireUnpaidOrders } from '../modules/orders/orders.service';
import { SearchQuery } from '../models/content.model';
import { recountAllMediaUsage } from '../modules/media/media.service';

interface Job {
  name: string;
  everyMs: number;
  /** delay before the first run (lets the server finish booting) */
  initialDelayMs: number;
  run: () => Promise<unknown>;
}

/**
 * Background jobs. With REDIS_URL configured a short Redis lock makes sure only one API instance runs
 * each job per tick (safe for horizontal scaling); without Redis the single instance runs them itself.
 */
const JOBS: Job[] = [
  {
    // promotions start / end on schedule → recompute effective prices (no-op when nothing changed)
    name: 'promotions.refresh-pricing',
    everyMs: 60_000,
    initialDelayMs: 5_000,
    run: () => refreshAllPricing(),
  },
  {
    // online-payment orders that were never paid release their reserved stock
    name: 'orders.expire-unpaid',
    everyMs: 5 * 60_000,
    initialDelayMs: 20_000,
    run: () => expireUnpaidOrders(),
  },
  {
    // media library "used / unused" counters (deleting always re-checks real usage)
    name: 'media.recount-usage',
    everyMs: 10 * 60_000,
    initialDelayMs: 45_000,
    run: () => recountAllMediaUsage(),
  },
  {
    // search analytics: keep one year of raw queries
    name: 'search.prune-log',
    everyMs: 24 * 60 * 60_000,
    initialDelayMs: 60_000,
    run: () => SearchQuery.deleteMany({ lastSearchedAt: { $lt: new Date(Date.now() - 365 * 24 * 60 * 60_000) } }),
  },
];

const timers: NodeJS.Timeout[] = [];
const running = new Set<string>();
const instanceId = randomUUID();

async function acquire(name: string, ttlMs: number): Promise<boolean> {
  const redis = getRedis();
  if (!redis || redis.status !== 'ready') return true;
  const res = await redis.set(`vt:job:${name}`, instanceId, 'PX', Math.max(1_000, ttlMs - 500), 'NX').catch(() => null);
  return res === 'OK';
}

async function tick(job: Job) {
  if (running.has(job.name)) return; // previous run still in progress
  running.add(job.name);
  const started = Date.now();
  try {
    if (!(await acquire(job.name, job.everyMs))) return;
    const result = await job.run();
    logger.debug({ job: job.name, ms: Date.now() - started, result }, 'job finished');
  } catch (err) {
    logger.error({ err, job: job.name }, 'job failed');
  } finally {
    running.delete(job.name);
  }
}

export function startJobs() {
  for (const job of JOBS) {
    const first = setTimeout(() => {
      void tick(job);
      const interval = setInterval(() => void tick(job), job.everyMs);
      interval.unref();
      timers.push(interval);
    }, job.initialDelayMs);
    first.unref();
    timers.push(first);
  }
  logger.info({ jobs: JOBS.map((j) => j.name) }, 'background jobs scheduled');
}

export function stopJobs() {
  for (const t of timers) clearTimeout(t);
  timers.length = 0;
}
