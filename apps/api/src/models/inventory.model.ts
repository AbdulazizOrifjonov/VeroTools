import { Schema, model, type Types } from 'mongoose';
import { INVENTORY_MOVEMENT_TYPES, type InventoryMovementType } from '@vero/types';
import { schemaOptions, type Timestamps } from './common';
import { clockNow } from '../lib/clock';

/** One document per stock keeping unit (product without variants, or each variant). */
export interface IInventory extends Timestamps {
  _id: Types.ObjectId;
  product: Types.ObjectId;
  variant: Types.ObjectId | null;
  sku: string;
  /** physically on hand */
  onHand: number;
  /** reserved by open orders (not yet shipped) */
  reserved: number;
  minStock: number;
  /** expected incoming stock (purchase orders) */
  incoming: number;
  costPrice: number;
  location?: string;
}

const InventorySchema = new Schema<IInventory>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    variant: { type: Schema.Types.ObjectId, default: null },
    sku: { type: String, required: true, uppercase: true, trim: true },
    onHand: { type: Number, default: 0, min: 0 },
    reserved: { type: Number, default: 0, min: 0 },
    minStock: { type: Number, default: 3, min: 0 },
    incoming: { type: Number, default: 0 },
    costPrice: { type: Number, default: 0 },
    location: String,
  },
  schemaOptions,
);
InventorySchema.index({ sku: 1 }, { unique: true });
InventorySchema.index({ product: 1, variant: 1 }, { unique: true });

export const Inventory = model<IInventory>('Inventory', InventorySchema);

export interface IInventoryMovement {
  _id: Types.ObjectId;
  inventory: Types.ObjectId;
  product: Types.ObjectId;
  variant: Types.ObjectId | null;
  sku: string;
  type: InventoryMovementType;
  /** signed change of the affected quantity (onHand for IN/OUT/ADJUSTMENT/RETURN, reserved for RESERVE/RELEASE, incoming for INCOMING) */
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  reservedBefore: number;
  reservedAfter: number;
  reason?: string;
  reference?: { type: 'order' | 'manual' | 'import' | 'seed' | 'return'; id?: string; label?: string };
  user?: Types.ObjectId;
  userName?: string;
  createdAt: Date;
}

const InventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    inventory: { type: Schema.Types.ObjectId, ref: 'Inventory', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variant: { type: Schema.Types.ObjectId, default: null },
    sku: { type: String, required: true },
    type: { type: String, enum: INVENTORY_MOVEMENT_TYPES, required: true },
    quantity: { type: Number, required: true },
    stockBefore: Number,
    stockAfter: Number,
    reservedBefore: Number,
    reservedAfter: Number,
    reason: { type: String, maxlength: 500 },
    reference: {
      type: { type: String, enum: ['order', 'manual', 'import', 'seed', 'return'] },
      id: String,
      label: String,
    },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    userName: String,
  },
  { timestamps: { createdAt: true, updatedAt: false, currentTime: clockNow }, versionKey: false },
);
InventoryMovementSchema.index({ inventory: 1, createdAt: -1 });
InventoryMovementSchema.index({ product: 1, createdAt: -1 });
InventoryMovementSchema.index({ type: 1, createdAt: -1 });
InventoryMovementSchema.index({ createdAt: -1 });

export const InventoryMovement = model<IInventoryMovement>('InventoryMovement', InventoryMovementSchema);
