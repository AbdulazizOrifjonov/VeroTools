import './quiet';
import mongoose from 'mongoose';
import { env, isProd } from '../config/env';
import { connectDatabase, disconnectDatabase, syncIndexes } from '../db/connection';
import { events } from '../lib/events';
import { closeRedis } from '../lib/redis';
import { cache, CacheTags } from '../lib/cache';
import { recountCatalog } from '../modules/catalog/products.service';
import { recountAllMediaUsage } from '../modules/media/media.service';
import {
  seedAccessControl,
  seedCategories,
  seedContent,
  seedDelivery,
  seedExpenseCategories,
  seedOwner,
  seedSettings,
  seedSpecDefinitions,
} from './steps/base';
import { seedBanners, seedBrands, seedCoupons, seedProducts, seedPromotions } from './steps/catalog';
import {
  DEMO_CUSTOMER_PASSWORD,
  DEMO_STAFF,
  seedCustomers,
  seedDemoStaff,
  seedEngagement,
  seedExpenses,
  seedOrders,
  seedQuestions,
  seedReviews,
  seedSearches,
} from './steps/activity';
import { SeedLog } from './steps/log';
import { createRng } from './rng';
import { Product } from '../models/product.model';
import { Order } from '../models/order.model';

/*
 * OCKEAN TOOLS database seeding
 *
 *   npm run seed                  base + demo data (development)
 *   npm run seed -- --reset       drop the database first, then base + demo
 *   npm run seed -- --base        base data only: roles, permissions, owner account, settings, delivery,
 *                                 expense categories, pages & FAQ, specification definitions, category tree
 *   npm run seed:prod             (production bundle) base data only
 *
 * Demo data (fictional brands, 125 products, customers, orders, reviews, expenses …) exists to try the
 * system out. Never launch a real store with it: in production it requires --demo --force.
 */

const args = new Set(process.argv.slice(2));
const flag = (name: string) => args.has(`--${name}`);

async function main() {
  const reset = flag('reset');
  const force = flag('force');
  const demo = flag('demo') || (!flag('base') && !isProd);
  const log = new SeedLog();

  if (isProd && (reset || demo) && !force) {
    throw new Error('Refusing to reset the database or load demo data in production without --force.');
  }

  await connectDatabase();
  const dbName = mongoose.connection.db?.databaseName ?? '?';
  log.info(`\nOCKEAN TOOLS seed → database "${dbName}" (${demo ? 'base + demo' : 'base only'}${reset ? ', reset' : ''})\n`);

  if (reset) {
    await mongoose.connection.db!.dropDatabase();
    log.done('database reset', `dropped "${dbName}"`);
  }
  await syncIndexes();
  log.done('indexes');

  /* ---------------------------------------------------------------- base */
  await seedAccessControl(log);
  const ownerId = await seedOwner(log);
  const uploader = { id: ownerId, name: 'seed' };
  await seedSettings(log, ownerId);
  await seedDelivery(log);
  await seedExpenseCategories(log);
  await seedContent(log);
  await seedSpecDefinitions(log);
  const categories = await seedCategories(log, ownerId);

  if (demo) {
    const rng = createRng();
    if (await Order.exists({})) {
      log.skip('demo data', 'orders already exist — run with --reset for a fresh demo database');
    } else {
      /* ------------------------------------------------------------ catalogue */
      const brands = await seedBrands(log, uploader);
      const hadProducts = !!(await Product.exists({}));
      const products = await seedProducts(log, uploader, { categories, brands }, rng);
      const refs = { categories, brands, products };
      await seedPromotions(log, uploader, refs);
      await seedCoupons(log, refs);
      await seedBanners(log, uploader);
      /* ------------------------------------------------------------- activity */
      const staff = await seedDemoStaff(log);
      const customers = await seedCustomers(log, rng);
      await seedEngagement(log, rng, customers);
      const { orders } = await seedOrders(log, rng, customers, staff);
      await seedReviews(log, rng, orders, customers, staff);
      await seedQuestions(log, rng, customers, staff);
      await seedExpenses(log, rng, staff);
      await seedSearches(log, rng, customers);
      if (!hadProducts) await recountCatalog();
    }
  }

  await events.drain();
  const media = await recountAllMediaUsage();
  log.done('media usage counters', `${media.used} of ${media.total} files in use`);
  await cache.invalidate(CacheTags.catalog, CacheTags.home, CacheTags.settings, CacheTags.content, CacheTags.translations);

  log.info(`\nDone in ${log.total()}s.\n`);
  log.info(`  Admin panel owner : ${env.SEED_ADMIN_EMAIL} / ${env.SEED_ADMIN_PHONE}${env.SEED_ADMIN_PASSWORD === 'OckeanAdmin2026' ? ' / OckeanAdmin2026 (development default — change it)' : ''}`);
  if (demo) {
    log.info(`  Demo manager      : ${DEMO_STAFF.manager.email} / ${DEMO_STAFF.manager.password}`);
    log.info(`  Demo admin        : ${DEMO_STAFF.admin.email} / ${DEMO_STAFF.admin.password}`);
    log.info(`  Demo customers    : any phone from seed/data/customers.ts / ${DEMO_CUSTOMER_PASSWORD}`);
    log.info('  ⚠ Demo data is fictional. Use `npm run seed -- --base` (or seed:prod) for a real store.\n');
  }
}

main()
  .then(async () => {
    await disconnectDatabase();
    await closeRedis();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('\n✖ Seed failed:', err instanceof Error ? err.stack ?? err.message : err);
    await disconnectDatabase().catch(() => undefined);
    await closeRedis();
    process.exit(1);
  });
