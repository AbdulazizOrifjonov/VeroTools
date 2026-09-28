import { Schema, model, type Types } from 'mongoose';
import {
  PAYMENT_METHODS,
  PAYMENT_PROVIDERS,
  PAYMENT_STATUSES,
  REFUND_STATUSES,
  type PaymentMethod,
  type PaymentProviderCode,
  type PaymentStatus,
  type RefundStatus,
} from '@vero/types';
import { schemaOptions, type Timestamps } from './common';
import { clockNow } from '../lib/clock';

export interface IPayment extends Timestamps {
  _id: Types.ObjectId;
  order: Types.ObjectId;
  orderNumber: string;
  user: Types.ObjectId;
  method: PaymentMethod;
  provider: PaymentProviderCode;
  /** UZS (so'm) */
  amount: number;
  currency: 'UZS';
  status: PaymentStatus;
  /** transaction id on the provider side (Payme transaction id, Click click_trans_id) */
  transactionId?: string;
  /** Payme transaction state: 1 created, 2 performed, -1 cancelled, -2 cancelled after perform */
  providerState?: number;
  providerCreateTime?: number;
  providerPerformTime?: number;
  providerCancelTime?: number;
  cancelReason?: number;
  refundStatus: RefundStatus;
  refundAmount?: number;
  refundedAt?: Date;
  paidAt?: Date;
  history: Array<{ status: string; at: Date; note?: string; by?: string }>;
  raw?: Record<string, unknown>;
}

const PaymentSchema = new Schema<IPayment>(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    orderNumber: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    provider: { type: String, enum: PAYMENT_PROVIDERS, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'UZS' },
    status: { type: String, enum: PAYMENT_STATUSES, default: 'PENDING' },
    transactionId: String,
    providerState: Number,
    providerCreateTime: Number,
    providerPerformTime: Number,
    providerCancelTime: Number,
    cancelReason: Number,
    refundStatus: { type: String, enum: REFUND_STATUSES, default: 'NONE' },
    refundAmount: Number,
    refundedAt: Date,
    paidAt: Date,
    history: { type: [{ _id: false, status: String, at: { type: Date, default: clockNow }, note: String, by: String }], default: [] },
    raw: { type: Schema.Types.Mixed },
  },
  schemaOptions,
);
PaymentSchema.index({ provider: 1, transactionId: 1 }, { unique: true, partialFilterExpression: { transactionId: { $type: 'string' } } });
PaymentSchema.index({ status: 1, createdAt: -1 });
PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ provider: 1, providerCreateTime: 1 });

export const Payment = model<IPayment>('Payment', PaymentSchema);
