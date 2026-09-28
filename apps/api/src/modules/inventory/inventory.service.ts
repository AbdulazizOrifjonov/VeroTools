import { type Types, type ClientSession } from 'mongoose';
import type { InventoryMovementType } from '@vero/types';
import { Inventory, InventoryMovement, type IInventory } from '../../models/inventory.model';
import { Product, type IProduct } from '../../models/product.model';
import { HttpError, badRequest, notFound } from '../../lib/http-error';
import { events } from '../../lib/events';
import { emitToAdmins } from '../../lib/socket';
import { SOCKET_EVENTS } from '@vero/config';
import { sessionOpt } from '../../db/transaction';
import { getSetting } from '../settings/settings.service';

export interface StockLine {
  product: Types.ObjectId;
  variant?: Types.ObjectId | null;
  quantity: number;
  sku?: string;
}

export interface MovementRef {
  type: 'order' | 'manual' | 'import' | 'seed' | 'return';
  id?: string;
  label?: string;
}

export interface Actor {
  id?: Types.ObjectId;
  name?: string;
}

const invFilter = (l: StockLine) => ({ product: l.product, variant: l.variant ?? null });

/**
 * Creates inventory records for a product (or each of its variants); removes records of deleted variants when empty.
 * Initial stock is written as an IN movement attributed to `actor` (the staff member who created the product).
 */
export async function ensureInventory(
  product: Pick<IProduct, '_id' | 'sku' | 'variants' | 'stock'>,
  opts: { minStock?: number; initial?: Map<string, number>; costPrice?: number; actor?: Actor; reference?: MovementRef } = {},
) {
  const wanted: Array<{ variant: Types.ObjectId | null; sku: string; cost?: number }> = product.variants?.length
    ? product.variants.map((v) => ({ variant: v._id, sku: v.sku, cost: v.costPrice }))
    : [{ variant: null, sku: product.sku, cost: opts.costPrice }];
  for (const w of wanted) {
    const existing = await Inventory.findOne({ product: product._id, variant: w.variant });
    if (existing) {
      if (existing.sku !== w.sku) existing.sku = w.sku;
      if (w.cost !== undefined) existing.costPrice = w.cost;
      if (opts.minStock !== undefined && !product.variants?.length) existing.minStock = opts.minStock;
      await existing.save();
      continue;
    }
    const initial = opts.initial?.get(w.sku) ?? 0;
    const inv = await Inventory.create({
      product: product._id,
      variant: w.variant,
      sku: w.sku,
      onHand: initial,
      minStock: opts.minStock ?? product.stock?.minStock ?? 3,
      costPrice: w.cost ?? 0,
    });
    if (initial > 0) {
      await InventoryMovement.create({
        inventory: inv._id,
        product: product._id,
        variant: w.variant,
        sku: w.sku,
        type: 'IN',
        quantity: initial,
        stockBefore: 0,
        stockAfter: initial,
        reservedBefore: 0,
        reservedAfter: 0,
        reason: 'Initial stock',
        reference: opts.reference ?? { type: 'manual' },
        user: opts.actor?.id,
        userName: opts.actor?.name,
      });
    }
  }
  // clean up inventory rows of removed variants (only when nothing is reserved)
  const variantIds = wanted.map((w) => w.variant).filter(Boolean) as Types.ObjectId[];
  if (product.variants?.length) {
    await Inventory.deleteMany({ product: product._id, reserved: 0, $or: [{ variant: null }, { variant: { $nin: variantIds } }] });
  } else {
    await Inventory.deleteMany({ product: product._id, reserved: 0, variant: { $ne: null } });
  }
  await syncProductStock([product._id]);
}

/** Recomputes the denormalised stock snapshot on products (and variants) from inventory records. */
export async function syncProductStock(productIds: Types.ObjectId[], session?: ClientSession | null) {
  const low = await getSetting('inventory.lowStockThreshold');
  for (const pid of productIds) {
    const [rows, product] = await Promise.all([
      Inventory.find({ product: pid }, null, sessionOpt(session)).lean(),
      Product.findById(pid, 'stock variants inStock sku status', sessionOpt(session)).lean(),
    ]);
    if (!product) continue;
    const sum = (f: (r: IInventory) => number) => rows.reduce((s, r) => s + f(r), 0);
    const stock = {
      onHand: sum((r) => r.onHand),
      reserved: sum((r) => r.reserved),
      available: sum((r) => Math.max(0, r.onHand - r.reserved)),
      minStock: rows.length ? Math.min(...rows.map((r) => r.minStock)) : product.stock?.minStock ?? 3,
      incoming: sum((r) => r.incoming),
    };
    const set: Record<string, unknown> = { stock, inStock: stock.available > 0 };
    (product.variants ?? []).forEach((v, i) => {
      const r = rows.find((x) => String(x.variant) === String(v._id));
      set[`variants.${i}.stock`] = r
        ? { onHand: r.onHand, reserved: r.reserved, available: Math.max(0, r.onHand - r.reserved), minStock: r.minStock, incoming: r.incoming }
        : { onHand: 0, reserved: 0, available: 0, minStock: 0, incoming: 0 };
    });
    await Product.updateOne({ _id: pid }, { $set: set }, sessionOpt(session));
    const wasAvailable = (product.stock?.available ?? 0) > 0;
    if (!wasAvailable && stock.available > 0 && product.status === 'published') events.emit('product.back_in_stock', { productId: pid });
    if (stock.available <= Math.max(low, stock.minStock) && (product.stock?.available ?? 0) > stock.available) {
      events.emit('inventory.low_stock', { productId: pid, sku: product.sku, available: stock.available, minStock: stock.minStock });
      emitToAdmins(SOCKET_EVENTS.adminStockLow, { productId: String(pid), sku: product.sku, available: stock.available });
    }
  }
}

async function record(
  inv: IInventory,
  type: InventoryMovementType,
  quantity: number,
  before: { onHand: number; reserved: number },
  after: { onHand: number; reserved: number },
  ref: MovementRef,
  actor: Actor | undefined,
  reason: string | undefined,
  session?: ClientSession | null,
) {
  await InventoryMovement.create(
    [
      {
        inventory: inv._id,
        product: inv.product,
        variant: inv.variant,
        sku: inv.sku,
        type,
        quantity,
        stockBefore: before.onHand,
        stockAfter: after.onHand,
        reservedBefore: before.reserved,
        reservedAfter: after.reserved,
        reason,
        reference: ref,
        user: actor?.id,
        userName: actor?.name,
      },
    ],
    sessionOpt(session),
  );
}

/**
 * Reserves stock for order lines atomically per SKU — the update only matches when
 * (onHand − reserved) ≥ quantity, so concurrent checkouts can never oversell.
 * On failure every reservation made by this call is released again (also correct without transactions).
 */
export async function reserve(lines: StockLine[], ref: MovementRef, session?: ClientSession | null): Promise<void> {
  const done: Array<{ inv: IInventory; qty: number }> = [];
  try {
    for (const line of lines) {
      const updated = await Inventory.findOneAndUpdate(
        { ...invFilter(line), $expr: { $gte: [{ $subtract: ['$onHand', '$reserved'] }, line.quantity] } },
        { $inc: { reserved: line.quantity } },
        { new: true, ...sessionOpt(session) },
      ).lean();
      if (!updated) {
        const current = await Inventory.findOne(invFilter(line), null, sessionOpt(session)).lean();
        throw new HttpError(409, 'INSUFFICIENT_STOCK', 'Not enough stock', {
          details: {
            productId: String(line.product),
            variantId: line.variant ? String(line.variant) : undefined,
            sku: current?.sku ?? line.sku,
            available: current ? Math.max(0, current.onHand - current.reserved) : 0,
            requested: line.quantity,
          },
        });
      }
      done.push({ inv: updated, qty: line.quantity });
      await record(
        updated,
        'RESERVE',
        line.quantity,
        { onHand: updated.onHand, reserved: updated.reserved - line.quantity },
        { onHand: updated.onHand, reserved: updated.reserved },
        ref,
        undefined,
        undefined,
        session,
      );
    }
  } catch (err) {
    if (!session) {
      for (const d of done) await Inventory.updateOne({ _id: d.inv._id }, { $inc: { reserved: -d.qty } });
    }
    throw err;
  }
  await syncProductStock(unique(lines.map((l) => l.product)), session);
}

/** Releases reservations (order cancelled before shipping). */
export async function release(lines: StockLine[], ref: MovementRef, actor?: Actor, session?: ClientSession | null) {
  for (const line of lines) {
    const inv = await Inventory.findOne(invFilter(line), null, sessionOpt(session)).lean();
    if (!inv) continue;
    const qty = Math.min(line.quantity, inv.reserved);
    if (qty <= 0) continue;
    const updated = await Inventory.findOneAndUpdate({ _id: inv._id, reserved: { $gte: qty } }, { $inc: { reserved: -qty } }, { new: true, ...sessionOpt(session) }).lean();
    if (!updated) continue;
    await record(updated, 'RELEASE', -qty, { onHand: inv.onHand, reserved: inv.reserved }, { onHand: updated.onHand, reserved: updated.reserved }, ref, actor, undefined, session);
  }
  await syncProductStock(unique(lines.map((l) => l.product)), session);
}

/** Converts reservations into an outgoing movement (order shipped / handed over). */
export async function deduct(lines: StockLine[], ref: MovementRef, actor?: Actor, session?: ClientSession | null) {
  for (const line of lines) {
    const inv = await Inventory.findOne(invFilter(line), null, sessionOpt(session)).lean();
    if (!inv) continue;
    const fromReserved = Math.min(line.quantity, inv.reserved);
    const updated = await Inventory.findOneAndUpdate(
      { _id: inv._id, onHand: { $gte: line.quantity } },
      { $inc: { onHand: -line.quantity, reserved: -fromReserved } },
      { new: true, ...sessionOpt(session) },
    ).lean();
    if (!updated) throw new HttpError(409, 'INSUFFICIENT_STOCK', `Not enough stock on hand for ${inv.sku}`);
    await record(updated, 'OUT', -line.quantity, { onHand: inv.onHand, reserved: inv.reserved }, { onHand: updated.onHand, reserved: updated.reserved }, ref, actor, 'Order fulfilment', session);
  }
  await syncProductStock(unique(lines.map((l) => l.product)), session);
}

/** Returned goods go back to stock. */
export async function returnStock(lines: StockLine[], ref: MovementRef, actor?: Actor, session?: ClientSession | null) {
  for (const line of lines) {
    const inv = await Inventory.findOne(invFilter(line), null, sessionOpt(session)).lean();
    if (!inv) continue;
    const updated = await Inventory.findOneAndUpdate({ _id: inv._id }, { $inc: { onHand: line.quantity } }, { new: true, ...sessionOpt(session) }).lean();
    if (!updated) continue;
    await record(updated, 'RETURN', line.quantity, { onHand: inv.onHand, reserved: inv.reserved }, { onHand: updated.onHand, reserved: updated.reserved }, ref, actor, 'Customer return', session);
  }
  await syncProductStock(unique(lines.map((l) => l.product)), session);
}

/**
 * Manual stock operations from the admin panel. A reason is always required so the history explains every change.
 *  IN          receive goods (+quantity)
 *  ADJUSTMENT  correction (±quantity, cannot drop below reserved)
 *  SET         set on-hand to an exact value (stock count)
 *  INCOMING    expected incoming stock (±quantity)
 */
export async function adjust(
  inventoryId: string,
  input: { type: 'IN' | 'ADJUSTMENT' | 'SET' | 'INCOMING'; quantity: number; reason: string; costPrice?: number },
  actor: Actor,
): Promise<IInventory> {
  const inv = await Inventory.findById(inventoryId).lean();
  if (!inv) throw notFound('Inventory item');
  let inc: Record<string, number> = {};
  let movementType: InventoryMovementType = input.type === 'SET' ? 'ADJUSTMENT' : input.type;
  let movementQty = input.quantity;
  switch (input.type) {
    case 'IN':
      if (input.quantity <= 0) throw badRequest('VALIDATION_ERROR', 'Quantity must be positive');
      inc = { onHand: input.quantity, ...(inv.incoming > 0 ? { incoming: -Math.min(inv.incoming, input.quantity) } : {}) };
      break;
    case 'ADJUSTMENT':
      if (input.quantity === 0) throw badRequest('VALIDATION_ERROR', 'Quantity must not be zero');
      if (inv.onHand + input.quantity < inv.reserved) throw new HttpError(409, 'INSUFFICIENT_STOCK', 'Stock cannot go below reserved quantity');
      inc = { onHand: input.quantity };
      break;
    case 'SET':
      if (input.quantity < inv.reserved) throw new HttpError(409, 'INSUFFICIENT_STOCK', 'Stock cannot be set below reserved quantity');
      movementQty = input.quantity - inv.onHand;
      movementType = 'ADJUSTMENT';
      inc = { onHand: movementQty };
      break;
    case 'INCOMING':
      if (inv.incoming + input.quantity < 0) throw badRequest('VALIDATION_ERROR', 'Incoming cannot be negative');
      inc = { incoming: input.quantity };
      movementType = 'INCOMING';
      break;
  }
  const set = input.costPrice ? { costPrice: input.costPrice } : {};
  const updated = await Inventory.findOneAndUpdate({ _id: inv._id }, { $inc: inc, $set: set }, { new: true }).lean();
  if (!updated) throw notFound('Inventory item');
  await record(updated, movementType, movementQty, { onHand: inv.onHand, reserved: inv.reserved }, { onHand: updated.onHand, reserved: updated.reserved }, { type: 'manual' }, actor, input.reason);
  if (input.costPrice) {
    if (updated.variant) await Product.updateOne({ _id: updated.product, 'variants._id': updated.variant }, { $set: { 'variants.$.costPrice': input.costPrice } });
    else await Product.updateOne({ _id: updated.product }, { $set: { costPrice: input.costPrice } });
  }
  await syncProductStock([updated.product]);
  return updated;
}

export async function setMinStock(inventoryId: string, minStock: number) {
  const updated = await Inventory.findByIdAndUpdate(inventoryId, { $set: { minStock } }, { new: true }).lean();
  if (!updated) throw notFound('Inventory item');
  await syncProductStock([updated.product]);
  return updated;
}

function unique(ids: Types.ObjectId[]): Types.ObjectId[] {
  const seen = new Set<string>();
  return ids.filter((id) => (seen.has(String(id)) ? false : (seen.add(String(id)), true)));
}
