import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuditLog } from '../src/models/audit-log.model';
import { InventoryMovement, Inventory } from '../src/models/inventory.model';
import { Role } from '../src/models/role.model';
import {
  api,
  auth,
  createCatalog,
  login,
  makeProduct,
  ownerToken,
  registerCustomer,
  setupDatabase,
  staffToken,
  teardownDatabase,
  uniquePhone,
  type Catalog,
} from './helpers';

let cat: Catalog;
let owner: string;

beforeAll(async () => {
  await setupDatabase('admin');
  cat = await createCatalog();
  owner = await ownerToken();
});
afterAll(teardownDatabase);

describe('roles & permissions', () => {
  it('manager can work with orders but not with finances or staff', async () => {
    const manager = await staffToken('MANAGER');
    expect((await api().get('/api/admin/orders').set(auth(manager))).status).toBe(200);
    expect((await api().get('/api/admin/inventory').set(auth(manager))).status).toBe(200);
    expect((await api().get('/api/admin/expenses').set(auth(manager))).status).toBe(403);
    expect((await api().get('/api/admin/analytics').set(auth(manager))).status).toBe(403);
    expect((await api().get('/api/admin/users').set(auth(manager))).status).toBe(403);
    expect((await api().post('/api/admin/products').set(auth(manager)).send({})).status).toBe(403);
  });

  it('dashboard hides finance figures from roles without finance permissions', async () => {
    const manager = await staffToken('MANAGER');
    const res = await api().get('/api/admin/dashboard').set(auth(manager));
    expect(res.status).toBe(200);
    expect(res.body.data.financeVisible).toBe(false);
    const full = await api().get('/api/admin/dashboard').set(auth(owner));
    expect(full.body.data.financeVisible).toBe(true);
  });

  it('custom roles are enforced server-side and only the owner may manage roles', async () => {
    const admin = await staffToken('ADMIN');
    const denied = await api().post('/api/admin/roles').set(auth(admin)).send({ key: 'CONTENT_EDITOR', name: 'Content editor', permissions: ['content.read'] });
    expect(denied.status).toBe(403);
    const created = await api()
      .post('/api/admin/roles')
      .set(auth(owner))
      .send({ key: 'CONTENT_EDITOR', name: 'Content editor', permissions: ['content.read', 'content.update', 'not.a.permission'] });
    expect(created.status).toBe(201);
    expect(created.body.data.permissions).toEqual(['content.read', 'content.update']);

    const role = await Role.findOne({ key: 'CONTENT_EDITOR' }).lean();
    const email = `editor-${Date.now()}@example.com`;
    const user = await api()
      .post('/api/admin/users')
      .set(auth(owner))
      .send({ firstName: 'Content', lastName: 'Editor', email, phone: uniquePhone(), password: 'EditorPass1', role: String(role!._id) });
    expect(user.status).toBe(201);
    const editor = await login(email, 'EditorPass1');
    expect((await api().get('/api/admin/pages').set(auth(editor))).status).toBe(200);
    expect((await api().get('/api/admin/orders').set(auth(editor))).status).toBe(403);
  });

  it('writes an audit trail for admin actions', async () => {
    await api().put('/api/admin/settings').set(auth(owner)).send({ values: { 'inventory.lowStockThreshold': 7 } });
    const entry = await AuditLog.findOne({ action: 'settings.change' }).lean();
    expect(entry).toBeTruthy();
    const list = await api().get('/api/admin/audit-logs').set(auth(owner));
    expect(list.body.data.length).toBeGreaterThan(0);
  });
});

describe('products & inventory', () => {
  it('creates a product with validation and records the initial stock', async () => {
    const bad = await api().post('/api/admin/products').set(auth(owner)).send({ name: { uz: 'X' }, sku: '??', price: -1 });
    expect(bad.status).toBe(422);
    const res = await api()
      .post('/api/admin/products')
      .set(auth(owner))
      .send({
        name: { uz: 'Test perforator', ru: 'Тестовый перфоратор', en: 'Test rotary hammer' },
        sku: 'ADM-RH-1',
        category: String(cat.drillsId),
        brand: String(cat.brandA),
        price: 1_000_000,
        costPrice: 700_000,
        initialStock: 12,
        minStock: 3,
        status: 'published',
        specs: [{ key: 'power_w', value: 900 }],
      });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ sku: 'ADM-RH-1', price: 1_000_000, stock: { onHand: 12, available: 12 } });
    // the initial stock movement is attributed to the staff member who created the product
    const initial = await InventoryMovement.findOne({ sku: 'ADM-RH-1', type: 'IN' }).lean();
    expect(initial).toMatchObject({ quantity: 12, reason: 'Initial stock', userName: 'Store Owner' });
    expect(initial!.user).toBeTruthy();
    const dup = await api()
      .post('/api/admin/products')
      .set(auth(owner))
      .send({ name: { uz: 'Dup', ru: 'Dup', en: 'Dup' }, sku: 'ADM-RH-1', category: String(cat.drillsId), price: 10, costPrice: 5 });
    expect(dup.status).toBe(409);
  });

  it('stock adjustments require a reason and are logged with before/after values', async () => {
    const p = await makeProduct({ category: cat.saws, price: 50_000, stock: 10 });
    const inv = await Inventory.findOne({ product: p._id }).lean();
    const noReason = await api().post(`/api/admin/inventory/${inv!._id}/adjust`).set(auth(owner)).send({ type: 'IN', quantity: 5 });
    expect(noReason.status).toBe(422);
    const ok = await api().post(`/api/admin/inventory/${inv!._id}/adjust`).set(auth(owner)).send({ type: 'IN', quantity: 5, reason: 'Supplier delivery #42' });
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({ stock: 15, available: 15 });
    const set = await api().post(`/api/admin/inventory/${inv!._id}/adjust`).set(auth(owner)).send({ type: 'SET', quantity: 9, reason: 'Stock count' });
    expect(set.body.data.stock).toBe(9);
    const moves = await InventoryMovement.find({ inventory: inv!._id }).sort({ createdAt: 1 }).lean();
    expect(moves.map((m) => [m.type, m.stockBefore, m.stockAfter, m.reason])).toEqual([
      ['IN', 0, 10, 'Initial stock'],
      ['IN', 10, 15, 'Supplier delivery #42'],
      ['ADJUSTMENT', 15, 9, 'Stock count'],
    ]);
  });

  it('staff without finance access never see or change cost prices', async () => {
    const p = await makeProduct({ category: cat.saws, price: 400_000, costPrice: 250_000, stock: 4 });
    const manager = await staffToken('MANAGER');

    const detail = await api().get(`/api/admin/products/${p._id}`).set(auth(manager));
    expect(detail.status).toBe(200);
    expect(detail.body.data.costPrice).toBe(0);
    const list = await api().get(`/api/admin/products?q=${encodeURIComponent(p.sku)}`).set(auth(manager));
    expect(list.body.data.map((i: { costPrice: number }) => i.costPrice)).toEqual([0]);
    const stock = await api().get(`/api/admin/inventory?product=${p._id}`).set(auth(manager));
    expect(stock.body.data[0]).toMatchObject({ costPrice: 0, stockValue: 0 });
    const finance = await api().get(`/api/admin/inventory?product=${p._id}`).set(auth(owner));
    expect(finance.body.data[0]).toMatchObject({ costPrice: 250_000, stockValue: 1_000_000 });

    // a manager's edit keeps the stored cost, whatever the request says
    const put = await api()
      .put(`/api/admin/products/${p._id}`)
      .set(auth(manager))
      .send({ name: p.name, sku: p.sku, category: String(cat.saws), price: 420_000, costPrice: 1, minStock: 2, status: 'published' });
    expect(put.status).toBe(200);
    expect(put.body.data).toMatchObject({ price: 420_000, costPrice: 0 });
    expect((await api().get(`/api/admin/products/${p._id}`).set(auth(owner))).body.data).toMatchObject({ price: 420_000, costPrice: 250_000 });
    // … and so does a stock receipt with a unit cost
    const inv = stock.body.data[0].id as string;
    const receipt = await api().post(`/api/admin/inventory/${inv}/adjust`).set(auth(manager)).send({ type: 'IN', quantity: 2, reason: 'Delivery', costPrice: 5 });
    expect(receipt.status).toBe(200);
    expect((await Inventory.findById(inv).lean())!.costPrice).toBe(250_000);
  });
});

describe('settings, translations & messages', () => {
  it('validates every setting with its own schema and saves dotted keys', async () => {
    const bad = await api()
      .put('/api/admin/settings')
      .set(auth(owner))
      .send({ values: { 'store.phone': '12345', 'store.map': { lat: 200, lng: 69.2 }, 'no.such.key': 1 } });
    expect(bad.status).toBe(422);
    expect(bad.body.error.fields).toMatchObject({ 'store.phone': 'validation.phone', 'store.map.lat': expect.stringMatching(/^validation\./), 'no.such.key': 'validation.oneOf' });

    const dup = await api()
      .put('/api/admin/settings')
      .set(auth(owner))
      .send({ values: { 'installment.plans': [{ months: 3, markupPercent: 0 }, { months: 3, markupPercent: 5 }] } });
    expect(dup.status).toBe(422);
    expect(dup.body.error.fields['installment.plans']).toBe('validation.duplicate');

    const good = await api()
      .put('/api/admin/settings')
      .set(auth(owner))
      .send({ values: { 'store.phone': '90 123 45 67', 'store.map': { lat: 41.3111, lng: 69.2797, zoom: 14 }, 'installment.plans': [{ months: 6, markupPercent: 7 }, { months: 3, markupPercent: 0 }] } });
    expect(good.status).toBe(200);
    const saved = new Map((good.body.data as Array<{ key: string; value: unknown }>).map((s) => [s.key, s.value]));
    expect(saved.get('store.phone')).toBe('+998901234567');
    expect(saved.get('store.map')).toEqual({ lat: 41.3111, lng: 69.2797, zoom: 14 });
    expect(saved.get('installment.plans')).toEqual([{ months: 6, markupPercent: 7 }, { months: 3, markupPercent: 0 }]);
    // storefront settings follow immediately
    const pub = await api().get('/api/settings/public');
    expect(JSON.stringify(pub.body.data)).toContain('+998901234567');
  });

  it('translation overrides can be filtered by edited state', async () => {
    const put = await api().put('/api/admin/translations').set(auth(owner)).send({ namespace: 'web', key: 'header.infoNavigation', values: { uz: "Xaridorlarga ma'lumot" } });
    expect(put.status).toBe(200);
    expect(put.body.data).toMatchObject({ defaults: { uz: "Xaridorlar uchun ma'lumot" }, overrides: { uz: "Xaridorlarga ma'lumot" } });
    const edited = await api().get('/api/admin/translations?namespace=web&edited=1').set(auth(owner));
    expect(edited.body.data.map((r: { key: string }) => r.key)).toEqual(['header.infoNavigation']);
    const untouched = await api().get('/api/admin/translations?namespace=web&edited=0&q=infoNavigation').set(auth(owner));
    expect(untouched.body.data).toEqual([]);
  });

  it('contact messages can be searched and deleted (audited)', async () => {
    const sent = await api().post('/api/contact').send({ name: 'Bobur Karimov', phone: '+998 97 765 43 21', subject: 'Wholesale', message: 'Need 40 grinders for a construction site' });
    expect(sent.status).toBe(201);
    const found = await api().get('/api/admin/messages?q=grinders').set(auth(owner));
    expect(found.body.data.map((m: { id: string }) => m.id)).toEqual([sent.body.data.id]);
    const manager = await staffToken('MANAGER');
    expect((await api().delete(`/api/admin/messages/${sent.body.data.id}`).set(auth(manager))).status).toBe(403);
    expect((await api().delete(`/api/admin/messages/${sent.body.data.id}`).set(auth(owner))).status).toBe(204);
    expect((await api().get('/api/admin/messages?q=grinders').set(auth(owner))).body.data).toEqual([]);
    expect(await AuditLog.exists({ action: 'message.delete' })).toBeTruthy();
  });
});

describe('expenses & analytics', () => {
  it('manages expenses and summarises them by category', async () => {
    const cats = await api().get('/api/admin/expense-categories').set(auth(owner));
    const rent = cats.body.data.find((c: { code: string }) => c.code === 'RENT');
    const today = new Date().toISOString().slice(0, 10);
    const created = await api()
      .post('/api/admin/expenses')
      .set(auth(owner))
      .send({ title: 'Office rent', category: rent.id, amount: 5_000_000, currency: 'UZS', date: today, paymentMethod: 'bank_transfer', status: 'PAID' });
    expect(created.status).toBe(201);
    const invalid = await api().post('/api/admin/expenses').set(auth(owner)).send({ title: '', amount: -5 });
    expect(invalid.status).toBe(422);
    const summary = await api().get('/api/admin/expenses/summary?preset=thisMonth').set(auth(owner));
    expect(summary.body.data.total).toBe(5_000_000);
    expect(summary.body.data.byCategory[0]).toMatchObject({ code: 'RENT', amount: 5_000_000 });
  });

  it('analytics are computed from real orders and expenses only', async () => {
    const p = await makeProduct({ category: cat.saws, price: 1_000_000, costPrice: 600_000, stock: 10 });
    const s = await registerCustomer();
    const address = await api()
      .post('/api/addresses')
      .set(auth(s.token))
      .send({ firstName: 'Ali', lastName: 'Valiyev', phone: s.phone, region: 'tashkent-city', city: 'Toshkent', street: 'Navoiy', house: '1', isDefault: true });
    const before = (await api().get('/api/admin/analytics?preset=today').set(auth(owner))).body.data;

    await api().post('/api/cart/items').set(auth(s.token)).send({ productId: String(p._id), quantity: 2 });
    const order = (
      await api()
        .post('/api/orders')
        .set(auth(s.token))
        .send({ customer: { firstName: 'Ali', lastName: 'Valiyev', phone: s.phone }, delivery: { method: 'courier', addressId: address.body.data.id }, payment: { method: 'cash' } })
    ).body.data.order;

    // a PENDING order is counted as an order but not as revenue
    const pending = (await api().get('/api/admin/analytics?preset=today').set(auth(owner))).body.data;
    expect(pending.totals.orders).toBe(before.totals.orders + 1);
    expect(pending.totals.revenue).toBe(before.totals.revenue);

    await api().post(`/api/admin/orders/${order.id}/status`).set(auth(owner)).send({ status: 'CONFIRMED' });
    const after = (await api().get('/api/admin/analytics?preset=today').set(auth(owner))).body.data;
    expect(after.totals.revenue - before.totals.revenue).toBe(order.total);
    expect(after.profit.productCost - before.profit.productCost).toBe(1_200_000);
    expect(after.salesByPaymentMethod.find((m: { method: string }) => m.method === 'cash')).toBeTruthy();

    const dashboard = (await api().get('/api/admin/dashboard').set(auth(owner))).body.data;
    expect(dashboard.kpis.today.revenue).toBe(after.totals.revenue);
    expect(dashboard.counts.processingOrders).toBeGreaterThanOrEqual(1);
  });

  it('exports reports as CSV, XLSX and PDF', async () => {
    const csv = await api().get('/api/admin/reports/sales?preset=last30&format=csv&lang=ru').set(auth(owner));
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.headers['content-disposition']).toMatch(/vero-tools-sales-.*\.csv/);
    const xlsx = await api().get('/api/admin/reports/orders?preset=last30&format=xlsx').set(auth(owner)).buffer(true).parse((res, cb) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    expect((xlsx.body as Buffer).subarray(0, 2).toString()).toBe('PK');
    const pdf = await api().get('/api/admin/reports/profit?preset=thisYear&format=pdf&lang=en').set(auth(owner)).buffer(true).parse((res, cb) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    expect((pdf.body as Buffer).subarray(0, 4).toString()).toBe('%PDF');
    const json = await api().get('/api/admin/reports/inventory').set(auth(owner));
    expect(json.body.data.columns.length).toBeGreaterThan(5);
  });
});

describe('media library', () => {
  it('optimises uploaded images into WebP sizes and rejects non-images', async () => {
    const png = await sharp({ create: { width: 1200, height: 900, channels: 3, background: '#ff4500' } }).png().toBuffer();
    const res = await api().post('/api/admin/media').set(auth(owner)).field('folder', 'products').attach('files', png, 'photo.png');
    expect(res.status).toBe(201);
    const media = res.body.data[0];
    expect(media.mime).toBe('image/webp');
    expect(media.url).toMatch(/\.webp$/);
    expect(media.thumbUrl).toMatch(/-360\.webp$/);
    expect(media.mediumUrl).toMatch(/-800\.webp$/);

    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    const bad = await api().post('/api/admin/media').set(auth(owner)).attach('files', svg, 'evil.svg');
    expect(bad.status).toBe(415);
    const fake = await api().post('/api/admin/media').set(auth(owner)).attach('files', Buffer.from('not really a png'), 'fake.png');
    expect(fake.status).toBe(415);

    const del = await api().delete(`/api/admin/media/${media.id}`).set(auth(owner));
    expect(del.status).toBe(204);
  });
});
