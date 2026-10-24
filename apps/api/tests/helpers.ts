import { randomUUID } from 'node:crypto';
import mongoose, { type Types } from 'mongoose';
import request from 'supertest';
import { productInputSchema } from '@vero/validation';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase, syncIndexes } from '../src/db/connection';
import { events } from '../src/lib/events';
import { Category } from '../src/models/category.model';
import { Brand } from '../src/models/brand.model';
import { createProduct } from '../src/modules/admin/products.admin';
import { invalidateCatalogIndex } from '../src/modules/catalog/catalog-index';
import { recountCatalog } from '../src/modules/catalog/products.service';
import { SeedLog } from '../src/seed/steps/log';
import {
  ensureStaff,
  seedAccessControl,
  seedContent,
  seedDelivery,
  seedExpenseCategories,
  seedOwner,
  seedSettings,
  seedSpecDefinitions,
} from '../src/seed/steps/base';

export const app = createApp();
export const api = () => request(app);

export const OWNER = { login: 'admin@ockean.uz', password: 'OckeanAdmin2026' };

/** Fresh database for one test file, with the base data (roles, owner, settings, delivery …). */
export async function setupDatabase(name: string) {
  await connectDatabase(process.env.MONGO_URI!, { dbName: `vero_test_${name}_${process.pid}` });
  await mongoose.connection.db!.dropDatabase();
  await syncIndexes();
  const log = new SeedLog(true);
  await seedAccessControl(log);
  const ownerId = await seedOwner(log);
  await seedSettings(log, ownerId);
  await seedDelivery(log);
  await seedExpenseCategories(log);
  await seedContent(log);
  await seedSpecDefinitions(log);
  return { ownerId };
}

export async function teardownDatabase() {
  await events.drain();
  await mongoose.connection.db?.dropDatabase().catch(() => undefined);
  await disconnectDatabase();
}

let phoneSeq = 0;
export function uniquePhone() {
  phoneSeq += 1;
  return `+99890${String(process.pid % 1000).padStart(3, '0')}${String(phoneSeq).padStart(4, '0')}`;
}

export interface Session {
  token: string;
  refreshToken?: string;
  userId: string;
  phone: string;
}

/** Registers a customer through the public API (mobile client → refresh token in the body). */
export async function registerCustomer(overrides: Record<string, unknown> = {}, headers: Record<string, string> = {}): Promise<Session> {
  const phone = (overrides.phone as string) ?? uniquePhone();
  const res = await api()
    .post('/api/auth/register')
    .set('X-Client', 'mobile')
    .set(headers)
    .send({ firstName: 'Test', lastName: 'Customer', phone, password: 'Secret123', acceptTerms: true, ...overrides });
  if (res.status !== 201) throw new Error(`register failed ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.data.accessToken, refreshToken: res.body.data.refreshToken, userId: res.body.data.user.id, phone };
}

export async function login(loginValue: string, password: string, client: 'admin' | 'mobile' | 'web' = 'admin'): Promise<string> {
  const res = await api().post('/api/auth/login').set('X-Client', client).send({ login: loginValue, password });
  if (res.status !== 200) throw new Error(`login failed ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data.accessToken as string;
}

export const ownerToken = () => login(OWNER.login, OWNER.password);

export async function staffToken(roleKey: 'MANAGER' | 'ADMIN', suffix = roleKey.toLowerCase()) {
  const email = `${suffix}-${randomUUID().slice(0, 8)}@example.com`;
  await ensureStaff({ roleKey, firstName: 'Staff', lastName: roleKey, phone: uniquePhone(), email, password: 'StaffPass123' });
  return login(email, 'StaffPass123');
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

/* --------------------------------------------------------------- catalogue */

export interface Catalog {
  rootId: Types.ObjectId;
  drillsId: Types.ObjectId;
  saws: Types.ObjectId;
  brandA: Types.ObjectId;
  brandB: Types.ObjectId;
}

export async function createCatalog(): Promise<Catalog> {
  const L = (uz: string, ru: string, en: string) => ({ uz, ru, en });
  const root = await Category.create({ name: L('Elektr asboblar', 'Электроинструмент', 'Power tools'), slug: 'power-tools', level: 0, order: 0, specKeys: ['power_w'] });
  const drills = await Category.create({
    name: L('Drellar', 'Дрели', 'Drills'),
    slug: 'drills',
    parent: root._id,
    ancestors: [root._id],
    level: 1,
    order: 0,
    specKeys: ['power_w', 'voltage_v'],
  });
  const saws = await Category.create({ name: L('Arralar', 'Пилы', 'Saws'), slug: 'saws', parent: root._id, ancestors: [root._id], level: 1, order: 1 });
  const brandA = await Brand.create({ name: 'Alpha Tools', slug: 'alpha-tools' });
  const brandB = await Brand.create({ name: 'Beta Works', slug: 'beta-works' });
  invalidateCatalogIndex();
  return { rootId: root._id, drillsId: drills._id, saws: saws._id, brandA: brandA._id, brandB: brandB._id };
}

let skuSeq = 0;
export async function makeProduct(opts: {
  category: Types.ObjectId;
  brand?: Types.ObjectId;
  name?: { uz: string; ru: string; en: string };
  price: number;
  oldPrice?: number;
  costPrice?: number;
  stock: number;
  specs?: Array<{ key: string; value: number | string | boolean }>;
  status?: 'draft' | 'published' | 'archived';
  tags?: string[];
  variants?: Array<{ sku: string; name: { uz: string; ru: string; en: string }; price: number; costPrice: number; initialStock: number }>;
}) {
  skuSeq += 1;
  const n = opts.name ?? { uz: `Mahsulot ${skuSeq}`, ru: `Товар ${skuSeq}`, en: `Product ${skuSeq}` };
  const product = await createProduct(
    productInputSchema.parse({
      name: n,
      sku: `TST-${skuSeq}-${randomUUID().slice(0, 4).toUpperCase()}`,
      brand: opts.brand ? String(opts.brand) : undefined,
      category: String(opts.category),
      price: opts.price,
      oldPrice: opts.oldPrice,
      costPrice: opts.costPrice ?? Math.round(opts.price * 0.7),
      initialStock: opts.variants?.length ? undefined : opts.stock,
      minStock: 2,
      specs: opts.specs ?? [],
      tags: opts.tags ?? [],
      status: opts.status ?? 'published',
      variants: (opts.variants ?? []).map((v) => ({ ...v, isActive: true })),
    }),
  );
  await recountCatalog();
  return product;
}
