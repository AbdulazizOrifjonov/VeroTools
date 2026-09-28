import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Inventory, InventoryMovement } from '../src/models/inventory.model';
import { Order } from '../src/models/order.model';
import { Product } from '../src/models/product.model';
import { api, auth, createCatalog, makeProduct, ownerToken, registerCustomer, setupDatabase, teardownDatabase, type Catalog, type Session } from './helpers';

let cat: Catalog;
let owner: string;
const L = (uz: string, ru: string, en: string) => ({ uz, ru, en });

beforeAll(async () => {
  await setupDatabase('commerce');
  cat = await createCatalog();
  owner = await ownerToken();
});
afterAll(teardownDatabase);

async function addressFor(s: Session) {
  const res = await api()
    .post('/api/addresses')
    .set(auth(s.token))
    .send({ firstName: 'Test', lastName: 'Customer', phone: s.phone, region: 'tashkent-city', city: 'Toshkent', street: 'Amir Temur', house: '1', isDefault: true });
  expect(res.status).toBe(201);
  return res.body.data.id as string;
}

const checkoutBody = (s: Session, addressId: string, method = 'cash') => ({
  customer: { firstName: 'Test', lastName: 'Customer', phone: s.phone },
  delivery: { method: 'courier', addressId },
  payment: { method },
});

async function stockOf(productId: string) {
  const inv = await Inventory.findOne({ product: productId }).lean();
  return { onHand: inv!.onHand, reserved: inv!.reserved };
}

describe('guest cart, wishlist and compare', () => {
  it('requires a guest id for anonymous carts and merges into the account on registration', async () => {
    const p = await makeProduct({ category: cat.drillsId, brand: cat.brandA, price: 300_000, stock: 20 });
    expect((await api().post('/api/cart/items').send({ productId: String(p._id), quantity: 1 })).status).toBe(400);

    const guest = randomUUID();
    const add = await api().post('/api/cart/items').set('X-Guest-Id', guest).send({ productId: String(p._id), quantity: 3 });
    expect(add.status).toBe(200);
    expect(add.body.data.items[0]).toMatchObject({ quantity: 3 });
    await api().post('/api/wishlist').set('X-Guest-Id', guest).send({ productId: String(p._id) });

    const s = await registerCustomer({}, { 'X-Guest-Id': guest });
    const cart = await api().get('/api/cart').set(auth(s.token));
    expect(cart.body.data.items).toHaveLength(1);
    expect(cart.body.data.items[0].quantity).toBe(3);
    const wishlist = await api().get('/api/wishlist').set(auth(s.token));
    expect(wishlist.body.data.items.map((i: { product: { id: string } }) => i.product.id)).toContain(String(p._id));
  });

  it('never lets the cart exceed available stock', async () => {
    const p = await makeProduct({ category: cat.drillsId, price: 100_000, stock: 2 });
    const s = await registerCustomer();
    const res = await api().post('/api/cart/items').set(auth(s.token)).send({ productId: String(p._id), quantity: 5 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('compares products of a category and marks differing specs', async () => {
    const a = await makeProduct({ category: cat.drillsId, price: 500_000, stock: 5, specs: [{ key: 'power_w', value: 500 }, { key: 'voltage_v', value: 18 }] });
    const b = await makeProduct({ category: cat.drillsId, price: 700_000, stock: 5, specs: [{ key: 'power_w', value: 900 }, { key: 'voltage_v', value: 18 }] });
    const s = await registerCustomer();
    await api().post('/api/compare').set(auth(s.token)).send({ productId: String(a._id) });
    await api().post('/api/compare').set(auth(s.token)).send({ productId: String(b._id) });
    const res = await api().get('/api/compare').set(auth(s.token)).set('Accept-Language', 'en');
    expect(res.status).toBe(200);
    const rows = res.body.data.groups[0].rows as Array<{ key: string; isDifferent: boolean }>;
    expect(rows.find((r) => r.key === 'power_w')?.isDifferent).toBe(true);
    expect(rows.find((r) => r.key === 'voltage_v')?.isDifferent).toBe(false);
  });
});

describe('checkout and order lifecycle', () => {
  it('creates an order, reserves stock and follows the status workflow', async () => {
    const p = await makeProduct({ category: cat.saws, brand: cat.brandB, name: L('Arra', 'Пила', 'Saw'), price: 800_000, costPrice: 560_000, stock: 5 });
    const s = await registerCustomer();
    const addressId = await addressFor(s);
    await api().post('/api/cart/items').set(auth(s.token)).send({ productId: String(p._id), quantity: 2 });

    const quote = await api().post('/api/checkout/quote').set(auth(s.token)).send({ delivery: { method: 'courier', addressId }, payment: { method: 'cash' } });
    expect(quote.status).toBe(200);
    expect(quote.body.data.subtotal).toBe(1_600_000);

    const created = await api().post('/api/orders').set(auth(s.token)).send(checkoutBody(s, addressId));
    expect(created.status).toBe(201);
    const order = created.body.data.order;
    expect(order.number).toMatch(/^VT-\d{6}-\d{3}$/);
    expect(order.status).toBe('PENDING');
    expect(await stockOf(String(p._id))).toEqual({ onHand: 5, reserved: 2 });
    // the cart is emptied after checkout
    expect((await api().get('/api/cart').set(auth(s.token))).body.data.items).toHaveLength(0);

    for (const status of ['CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED']) {
      const r = await api().post(`/api/admin/orders/${order.id}/status`).set(auth(owner)).send({ status });
      expect(r.status, status).toBe(200);
    }
    // shipping deducts the reserved stock
    expect(await stockOf(String(p._id))).toEqual({ onHand: 3, reserved: 0 });
    const delivered = await api().post(`/api/admin/orders/${order.id}/status`).set(auth(owner)).send({ status: 'DELIVERED' });
    expect(delivered.body.data.payment.status).toBe('PAID'); // cash is collected on delivery

    const mine = await api().get(`/api/orders/${order.id}`).set(auth(s.token));
    expect(mine.body.data.status).toBe('DELIVERED');
    const movements = await InventoryMovement.find({ product: p._id }).sort({ createdAt: 1 }).lean();
    expect(movements.map((m) => m.type)).toEqual(['IN', 'RESERVE', 'OUT']);
    expect(movements[2]!.reason ?? '').not.toBe('');

    const invalid = await api().post(`/api/admin/orders/${order.id}/status`).set(auth(owner)).send({ status: 'PENDING' });
    expect(invalid.status).toBe(409);
    expect(invalid.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    expect((await Product.findById(p._id).lean())!.soldCount).toBe(2);
  });

  it('customer cancellation releases the reservation; later statuses cannot be cancelled', async () => {
    const p = await makeProduct({ category: cat.saws, price: 200_000, stock: 4 });
    const s = await registerCustomer();
    const addressId = await addressFor(s);
    await api().post('/api/cart/items').set(auth(s.token)).send({ productId: String(p._id), quantity: 1 });
    const order = (await api().post('/api/orders').set(auth(s.token)).send(checkoutBody(s, addressId))).body.data.order;
    expect(await stockOf(String(p._id))).toEqual({ onHand: 4, reserved: 1 });
    const cancel = await api().post(`/api/orders/${order.id}/cancel`).set(auth(s.token)).send({ reason: 'changed my mind' });
    expect(cancel.status).toBe(200);
    expect(await stockOf(String(p._id))).toEqual({ onHand: 4, reserved: 0 });

    await api().post('/api/cart/items').set(auth(s.token)).send({ productId: String(p._id), quantity: 1 });
    const second = (await api().post('/api/orders').set(auth(s.token)).send(checkoutBody(s, addressId))).body.data.order;
    for (const status of ['CONFIRMED', 'PROCESSING']) await api().post(`/api/admin/orders/${second.id}/status`).set(auth(owner)).send({ status });
    const late = await api().post(`/api/orders/${second.id}/cancel`).set(auth(s.token)).send({});
    expect(late.status).toBe(409);
    expect(late.body.error.code).toBe('ORDER_CANNOT_CANCEL');
  });

  it('never oversells: concurrent checkouts for the last unit — exactly one succeeds', async () => {
    const p = await makeProduct({ category: cat.drillsId, price: 150_000, stock: 1 });
    const buyers = await Promise.all([registerCustomer(), registerCustomer(), registerCustomer()]);
    const addresses: string[] = [];
    for (const b of buyers) {
      addresses.push(await addressFor(b));
      const add = await api().post('/api/cart/items').set(auth(b.token)).send({ productId: String(p._id), quantity: 1 });
      expect(add.status).toBe(200);
    }
    const results = await Promise.all(buyers.map((b, i) => api().post('/api/orders').set(auth(b.token)).send(checkoutBody(b, addresses[i]!))));
    const statuses = results.map((r) => r.status).sort();
    expect(statuses.filter((x) => x === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409).every((r) => r.body.error.code === 'INSUFFICIENT_STOCK')).toBe(true);
    const inv = await stockOf(String(p._id));
    expect(inv).toEqual({ onHand: 1, reserved: 1 });
    expect(await Order.countDocuments({ 'items.product': p._id })).toBe(1);
  });

  it('refuses payment methods that are not available and unknown delivery regions', async () => {
    const p = await makeProduct({ category: cat.drillsId, price: 90_000, stock: 5 });
    const s = await registerCustomer();
    const addressId = await addressFor(s);
    await api().post('/api/cart/items').set(auth(s.token)).send({ productId: String(p._id), quantity: 1 });
    const bankCard = await api().post('/api/orders').set(auth(s.token)).send(checkoutBody(s, addressId, 'bank_card'));
    expect(bankCard.status).toBe(422);
    expect(bankCard.body.error.code).toBe('PAYMENT_METHOD_UNAVAILABLE');
    const installment = await api().post('/api/orders').set(auth(s.token)).send({ ...checkoutBody(s, addressId, 'installment'), payment: { method: 'installment', installmentMonths: 6 } });
    expect(installment.status).toBe(422); // below the installment minimum amount
  });

  it('online payment orders return a provider redirect instead of pretending to be paid', async () => {
    const p = await makeProduct({ category: cat.drillsId, price: 120_000, stock: 5 });
    const s = await registerCustomer();
    const addressId = await addressFor(s);
    await api().post('/api/cart/items').set(auth(s.token)).send({ productId: String(p._id), quantity: 1 });
    const res = await api().post('/api/orders').set(auth(s.token)).send(checkoutBody(s, addressId, 'payme'));
    expect(res.status).toBe(201);
    expect(res.body.data.payment.status).toBe('PENDING');
    expect(res.body.data.payment.action).toMatchObject({ type: 'redirect', url: expect.stringContaining('paycom.uz') });
    expect(res.body.data.order.status).toBe('PENDING');
  });
});
