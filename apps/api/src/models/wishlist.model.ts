import { Schema, model, type Types } from 'mongoose';
import { schemaOptions, type Timestamps } from './common';
import { clockNow } from '../lib/clock';

export interface IWishlistItem {
  product: Types.ObjectId;
  addedAt: Date;
  priceAtAdd: number;
  /** last price the customer was notified about (price-drop alerts) */
  notifiedPrice?: number;
}

export interface IWishlist extends Timestamps {
  _id: Types.ObjectId;
  user?: Types.ObjectId | null;
  guestId?: string | null;
  items: IWishlistItem[];
  expiresAt?: Date | null;
}

const WishlistSchema = new Schema<IWishlist>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    guestId: { type: String, default: null },
    items: {
      type: [
        {
          _id: false,
          product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
          addedAt: { type: Date, default: clockNow },
          priceAtAdd: { type: Number, default: 0 },
          notifiedPrice: Number,
        },
      ],
      default: [],
    },
    expiresAt: { type: Date, default: null },
  },
  schemaOptions,
);
WishlistSchema.index({ user: 1 }, { unique: true, partialFilterExpression: { user: { $type: 'objectId' } } });
WishlistSchema.index({ guestId: 1 }, { unique: true, partialFilterExpression: { guestId: { $type: 'string' } } });
WishlistSchema.index({ 'items.product': 1 });
WishlistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: 'date' } } });

export const Wishlist = model<IWishlist>('Wishlist', WishlistSchema);

export interface IComparison extends Timestamps {
  _id: Types.ObjectId;
  user?: Types.ObjectId | null;
  guestId?: string | null;
  items: Array<{ product: Types.ObjectId; addedAt: Date }>;
  expiresAt?: Date | null;
}

const ComparisonSchema = new Schema<IComparison>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    guestId: { type: String, default: null },
    items: {
      type: [{ _id: false, product: { type: Schema.Types.ObjectId, ref: 'Product', required: true }, addedAt: { type: Date, default: clockNow } }],
      default: [],
    },
    expiresAt: { type: Date, default: null },
  },
  schemaOptions,
);
ComparisonSchema.index({ user: 1 }, { unique: true, partialFilterExpression: { user: { $type: 'objectId' } } });
ComparisonSchema.index({ guestId: 1 }, { unique: true, partialFilterExpression: { guestId: { $type: 'string' } } });
ComparisonSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: 'date' } } });

export const Comparison = model<IComparison>('Comparison', ComparisonSchema);
