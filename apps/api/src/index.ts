import { createServer } from 'node:http';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './db/connection';
import { closeRedis } from './lib/redis';
import { closeSocket, initSocket } from './lib/socket';
import { startJobs, stopJobs } from './jobs/scheduler';
import { createApp } from './app';

async function main() {
  await connectDatabase();
  const app = createApp();
  const server = createServer(app);
  server.keepAliveTimeout = 65_000; // longer than typical load-balancer idle timeouts
  server.headersTimeout = 66_000;
  initSocket(server);

  await new Promise<void>((resolve) => server.listen(env.PORT, env.HOST, resolve));
  logger.info({ port: env.PORT, env: env.NODE_ENV, storage: env.STORAGE_DRIVER, redis: Boolean(env.REDIS_URL) }, 'VERO TOOLS API listening');
  if (env.JOBS_ENABLED) startJobs();

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutting down');
    const force = setTimeout(() => process.exit(1), 15_000);
    force.unref();
    stopJobs();
    await closeSocket();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await disconnectDatabase().catch(() => undefined);
    await closeRedis();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

process.on('unhandledRejection', (reason) => logger.error({ err: reason }, 'unhandled promise rejection'));

main().catch((err) => {
  logger.fatal({ err }, 'failed to start API');
  process.exit(1);
});
