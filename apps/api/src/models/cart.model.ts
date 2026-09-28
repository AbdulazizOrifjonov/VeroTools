import { Schema, model, type Types } from 'mongoose';
import { schemaOptions, type Timestamps } from './common';
import { clockNow } from '../lib/clock';

/** CartItem — embedded in Cart. */
export interface ICartItem {
  product: Types.ObjectId;
  variant?: Types.ObjectId | null;
  quantity: number;
  priceAtAdd: number;
  addedAt: Date;
}

export interface ICart extends Timestamps {
  _id: Types.ObjectId;
  user?: Types.ObjectId | null;
  guestId?: string | null;
  items: ICartItem[];
  couponCode?: string | null;
  /** guest carts expire (TTL) — authenticated carts never do */
  expiresAt?: Date | null;
}

export const CartItemSchema = new Schema<ICartItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variant: { type: Schema.Types.ObjectId, default: null },
    quantity: { type: Number, required: true, min: 1 },
    priceAtAdd: { type: Number, default: 0 },
    addedAt: { type: Date, default: clockNow },
  },
  { _id: false },
);

const CartSchema = new Schema<ICart>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    guestId: { type: String, default: null },
    items: { type: [CartItemSchema], default: [] },
    couponCode: { type: String, default: null },
    expiresAt: { type: Date, default: null },
  },
  schemaOptions,
);
CartSchema.index({ user: 1 }, { unique: true, partialFilterExpression: { user: { $type: 'objectId' } } });
CartSchema.index({ guestId: 1 }, { unique: true, partialFilterExpression: { guestId: { $type: 'string' } } });
CartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: 'date' } } });

export const Cart = model<ICart>('Cart', CartSchema);
