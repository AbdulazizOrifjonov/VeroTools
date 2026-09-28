import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { events } from '../src/lib/events';
import { Order } from '../src/models/order.model';
import { Payment } from '../src/models/payment.model';
import { Inventory, InventoryMovement } from '../src/models/inventory.model';
import { api, auth, createCatalog, makeProduct, ownerToken, registerCustomer, setupDatabase, staffToken, teardownDatabase, type Catalog } from './helpers';

/*
 * Provider protocols are exercised with TEST credentials from tests/setup.ts — exactly the requests Payme and
 * Click send to the merchant endpoints. Nothing marks an order as paid except a correctly signed provider call.
 */

let cat: Catalog;
const PAYME_AUTH = `Basic ${Buffer.from('Paycom:test-payme-key').toString('base64')}`;
const md5 = (s: string) => createHash('md5').update(s).digest('hex');

beforeAll(async () => {
  await setupDatabase('payments');
  cat = await createCatalog();
});
afterAll(teardownDatabase);

async function onlineOrder(method: 'payme' | 'click') {
  const p = await makeProduct({ category: cat.drillsId, price: 250_000, stock: 10 });
  const s = await registerCustomer();
  const address = await api()
    .post('/api/addresses')
    .set(auth(s.token))
    .send({ firstName: 'Olim', lastName: 'Tester', phone: s.phone, region: 'tashkent-city', city: 'Toshkent', street: 'Navoiy', house: '5', isDefault: true });
  await api().post('/api/cart/items').set(auth(s.token)).send({ productId: String(p._id), quantity: 1 });
  const res = await api()
    .post('/api/orders')
    .set(auth(s.token))
    .send({ customer: { firstName: 'Olim', lastName: 'Tester', phone: s.phone }, delivery: { method: 'courier', addressId: address.body.data.id }, payment: { method } });
  expect(res.status).toBe(201);
  return { order: res.body.data.order as { id: string; number: string; total: number }, session: s };
}

const rpc = (method: string, params: Record<string, unknown>, authHeader = PAYME_AUTH) =>
  api().post('/api/payments/payme').set('Authorization', authHeader).send({ jsonrpc: '2.0', id: 1, method, params });

describe('Payme merchant API', () => {
  it('rejects requests without the merchant key', async () => {
    const res = await rpc('CheckPerformTransaction', { amount: 100, account: { order_id: 'x' } }, 'Basic bm9wZTpub3Bl');
    expect(res.status).toBe(200);
    expect(res.body.error.code).toBe(-32504);
  });

  it('answers malformed JSON with a JSON-RPC parse error', async () => {
    const res = await api().post('/api/payments/payme').set('Authorization', PAYME_AUTH).set('Content-Type', 'application/json').send('{"broken"');
    expect(res.status).toBe(200);
    expect(res.body.error.code).toBe(-32700);
  });

  it('validates the order and the amount (tiyin)', async () => {
    const { order } = await onlineOrder('payme');
    expect((await rpc('CheckPerformTransaction', { amount: order.total * 100, account: { order_id: 'VT-000000-999' } })).body.error.code).toBe(-31050);
    expect((await rpc('CheckPerformTransaction', { amount: order.total * 100 - 100, account: { order_id: order.number } })).body.error.code).toBe(-31001);
    expect((await rpc('CheckPerformTransaction', { amount: order.total * 100, account: { order_id: order.number } })).body.result).toEqual({ allow: true });
  });

  it('create → perform marks the payment as paid and confirms the order; cancel after perform refunds', async () => {
    const { order } = await onlineOrder('payme');
    const time = Date.now();
    const created = await rpc('CreateTransaction', { id: 'payme-tx-1', time, amount: order.total * 100, account: { order_id: order.number } });
    expect(created.body.result).toMatchObject({ state: 1, transaction: expect.any(String) });
    // idempotent retry returns the same transaction
    const again = await rpc('CreateTransaction', { id: 'payme-tx-1', time, amount: order.total * 100, account: { order_id: order.number } });
    expect(again.body.result.transaction).toBe(created.body.result.transaction);
    // a second transaction for the same order is refused while the first is pending
    const other = await rpc('CreateTransaction', { id: 'payme-tx-2', time, amount: order.total * 100, account: { order_id: order.number } });
    expect(other.body.error.code).toBe(-31099);

    const performed = await rpc('PerformTransaction', { id: 'payme-tx-1' });
    expect(performed.body.result).toMatchObject({ state: 2, perform_time: expect.any(Number) });
    await events.drain();
    const paid = await Order.findById(order.id).lean();
    expect(paid?.payment.status).toBe('PAID');
    expect(paid?.status).toBe('CONFIRMED');

    const check = await rpc('CheckTransaction', { id: 'payme-tx-1' });
    expect(check.body.result.state).toBe(2);
    const cancel = await rpc('CancelTransaction', { id: 'payme-tx-1', reason: 5 });
    expect(cancel.body.result.state).toBe(-2);
    const payment = await Payment.findOne({ transactionId: 'payme-tx-1' }).lean();
    expect(payment?.refundStatus ?? payment?.status).toMatch(/REFUND|CANCELLED/);
  });

  it('unknown transactions and methods are reported with the protocol error codes', async () => {
    expect((await rpc('PerformTransaction', { id: 'missing' })).body.error.code).toBe(-31003);
    expect((await rpc('DoSomething', {})).body.error.code).toBe(-32601);
  });
});

describe('Click SHOP-API', () => {
  const sign = (b: Record<string, string>, withPrepare: boolean) =>
    md5(
      withPrepare
        ? `${b.click_trans_id}${b.service_id}test-click-secret${b.merchant_trans_id}${b.merchant_prepare_id}${b.amount}${b.action}${b.sign_time}`
        : `${b.click_trans_id}${b.service_id}test-click-secret${b.merchant_trans_id}${b.amount}${b.action}${b.sign_time}`,
    );

  it('rejects a bad signature', async () => {
    const { order } = await onlineOrder('click');
    const res = await api()
      .post('/api/payments/click/prepare')
      .type('form')
      .send({ click_trans_id: '1', service_id: '1001', click_paydoc_id: '1', merchant_trans_id: order.number, amount: String(order.total), action: '0', error: '0', sign_time: '2026-09-23 10:00:00', sign_string: 'deadbeef' });
    expect(res.body.error).toBe(-1);
  });

  it('prepare → complete marks the order paid', async () => {
    const { order } = await onlineOrder('click');
    const base = { click_trans_id: '777001', service_id: '1001', click_paydoc_id: '5001', merchant_trans_id: order.number, amount: String(order.total), error: '0', sign_time: '2026-09-23 10:00:00' };
    const prepareBody = { ...base, action: '0' };
    const prepare = await api().post('/api/payments/click/prepare').type('form').send({ ...prepareBody, sign_string: sign(prepareBody, false) });
    expect(prepare.body.error).toBe(0);
    const prepareId = String(prepare.body.merchant_prepare_id);

    const wrongAmount = { ...base, amount: String(order.total + 1), action: '1', merchant_prepare_id: prepareId };
    expect((await api().post('/api/payments/click/complete').type('form').send({ ...wrongAmount, sign_string: sign(wrongAmount, true) })).body.error).toBe(-2);

    const completeBody = { ...base, action: '1', merchant_prepare_id: prepareId };
    const complete = await api().post('/api/payments/click/complete').type('form').send({ ...completeBody, sign_string: sign(completeBody, true) });
    expect(complete.body.error).toBe(0);
    await events.drain();
    const paid = await Order.findById(order.id).lean();
    expect(paid?.payment.status).toBe('PAID');
    expect(paid?.status).toBe('CONFIRMED');
    // replays are answered "already paid" without paying twice
    const replay = await api().post('/api/payments/click/complete').type('form').send({ ...completeBody, sign_string: sign(completeBody, true) });
    expect(replay.body.error).toBe(-4);
  });
});

describe('staff payment changes', () => {
  const patch = (token: string, orderId: string, status: string, note?: string) =>
    api().patch(`/api/admin/orders/${orderId}/payment`).set(auth(token)).send({ status, note });

  it('online payments cannot be marked paid by hand', async () => {
    const owner = await ownerToken();
    const { order } = await onlineOrder('payme');
    const res = await patch(owner, order.id, 'PAID');
    expect(res.status).toBe(409);
    expect(res.body.error.details).toMatchObject({ provider: 'payme' });
    const stored = await Order.findById(order.id).lean();
    expect(stored?.payment.status).toBe('PENDING');
    expect(stored?.status).toBe('PENDING');
  });

  it('a failed online payment cancels the pending order at once and releases the stock', async () => {
    const owner = await ownerToken();
    const { order } = await onlineOrder('click');
    const reserved = await Inventory.findOne({ product: (await Order.findById(order.id).lean())!.items[0]!.product }).lean();
    expect(reserved?.reserved).toBe(1);
    const res = await patch(owner, order.id, 'FAILED', 'card declined by the bank');
    expect(res.status).toBe(200);
    expect(res.body.data.payment.status).toBe('FAILED');
    expect(res.body.data.status).toBe('CANCELLED');
    await events.drain();
    const released = await Inventory.findById(reserved!._id).lean();
    expect(released?.reserved).toBe(0);
    const history = (await Order.findById(order.id).lean())!.statusHistory.at(-1);
    expect(history).toMatchObject({ status: 'CANCELLED', byName: 'Store Owner' });
    // exactly one RELEASE movement — the event-driven path must not release a second time
    expect(await InventoryMovement.countDocuments({ inventory: reserved!._id, type: 'RELEASE' })).toBe(1);
  });

  it('offline payments can be recorded by staff with both permissions', async () => {
    const owner = await ownerToken();
    const manager = await staffToken('MANAGER');
    const p = await makeProduct({ category: cat.drillsId, price: 90_000, stock: 5 });
    const s = await registerCustomer();
    await api().post('/api/cart/items').set(auth(s.token)).send({ productId: String(p._id), quantity: 1 });
    const placed = await api()
      .post('/api/orders')
      .set(auth(s.token))
      .send({ customer: { firstName: 'Olim', lastName: 'Tester', phone: s.phone }, delivery: { method: 'pickup', pickupPointId: await firstPickupPoint() }, payment: { method: 'cash' } });
    expect(placed.status).toBe(201);
    const id = placed.body.data.order.id as string;
    expect((await patch(manager, id, 'PAID')).status).toBe(403);
    const paid = await patch(owner, id, 'PAID', 'paid at the pickup point');
    expect(paid.status).toBe(200);
    expect(paid.body.data.payment.status).toBe('PAID');
    expect(paid.body.data.status).toBe('CONFIRMED');
  });
});

async function firstPickupPoint(): Promise<string> {
  const res = await api().get('/api/delivery/pickup-points');
  return res.body.data[0].id as string;
}
