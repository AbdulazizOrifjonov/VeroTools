import { Schema, model, type Types } from 'mongoose';
import {
  DELIVERY_METHODS,
  INSTALLMENT_STATUSES,
  ORDER_SOURCES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_PROVIDERS,
  PAYMENT_STATUSES,
  type DeliveryMethod,
  type InstallmentStatus,
  type OrderSource,
  type OrderStatus,
  type PaymentMethod,
  type PaymentProviderCode,
  type PaymentStatus,
} from '@vero/types';
import { LocalizedSchema, schemaOptions, type Localized, type Timestamps } from './common';
import { AddressFields } from './address.model';
import { clockNow } from '../lib/clock';

/** OrderItem — immutable snapshot of the purchased product (embedded in Order). */
export interface IOrderItem {
  _id: Types.ObjectId;
  product: Types.ObjectId;
  variant?: Types.ObjectId | null;
  sku: string;
  slug: string;
  name: Localized;
  variantName?: Localized;
  image?: { url: string; thumb?: string };
  brandId?: Types.ObjectId | null;
  brandName?: string;
  categoryId?: Types.ObjectId | null;
  /** admin price before promotions */
  regularPrice: number;
  /** price paid per unit (after promotions, before coupon) */
  price: number;
  oldPrice?: number;
  costPrice: number;
  quantity: number;
  /** coupon share allocated to this line */
  couponDiscount: number;
  total: number;
  warrantyMonths: number;
  reviewed: boolean;
}

export interface IAddressSnapshot {
  firstName: string;
  lastName: string;
  phone: string;
  region: string;
  city: string;
  district?: string;
  street: string;
  house: string;
  apartment?: string;
  comment?: string;
}

/** Delivery — embedded in Order. */
export interface IOrderDelivery {
  method: DeliveryMethod;
  zone?: Types.ObjectId | null;
  zoneName?: Localized;
  address?: IAddressSnapshot;
  pickupPoint?: Types.ObjectId | null;
  pickupSnapshot?: { code: string; name: Localized; address: Localized; phone: string; workingHours: Localized; lat: number; lng: number };
  fee: number;
  minDays: number;
  maxDays: number;
  estimatedFrom?: Date;
  estimatedTo?: Date;
  carrier?: string;
  trackingNumber?: string;
  deliveredAt?: Date;
}

export interface IOrderPayment {
  method: PaymentMethod;
  provider: PaymentProviderCode;
  status: PaymentStatus;
  paymentId?: Types.ObjectId;
  paidAt?: Date;
  installment?: { months: number; markupPercent: number; monthlyPayment: number; total: number; status: InstallmentStatus; note?: string };
}

export interface IOrderStatusEvent {
  status: OrderStatus;
  at: Date;
  by?: Types.ObjectId;
  byName?: string;
  note?: string;
}

export interface IOrder extends Timestamps {
  _id: Types.ObjectId;
  number: string;
  user: Types.ObjectId;
  items: IOrderItem[];
  itemsCount: number;
  customer: { firstName: string; lastName: string; phone: string; email?: string };
  delivery: IOrderDelivery;
  payment: IOrderPayment;
  coupon?: { code: string; couponId: Types.ObjectId; discount: number };
  regularSubtotal: number;
  subtotal: number;
  oldSubtotal: number;
  productDiscount: number;
  promotionDiscount: number;
  couponDiscount: number;
  deliveryFee: number;
  total: number;
  costTotal: number;
  status: OrderStatus;
  statusHistory: IOrderStatusEvent[];
  comment?: string;
  adminNotes: Array<{ text: string; by?: Types.ObjectId; byName?: string; at: Date }>;
  cancelReason?: string;
  cancelledAt?: Date;
  deliveredAt?: Date;
  source: OrderSource;
  /** reserved → deducted (shipped/handed over) | released (cancelled) → returned */
  inventoryState: 'reserved' | 'deducted' | 'released' | 'returned';
  region?: string;
  ip?: string;
  userAgent?: string;
}

const AddressSnapshotSchema = new Schema<IAddressSnapshot>({ ...AddressFields }, { _id: false });

const OrderItemSchema = new Schema<IOrderItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variant: { type: Schema.Types.ObjectId, default: null },
  sku: { type: String, required: true },
  slug: { type: String, required: true },
  name: { type: LocalizedSchema, required: true },
  variantName: { type: LocalizedSchema, default: undefined },
  image: { url: String, thumb: String },
  brandId: { type: Schema.Types.ObjectId, ref: 'Brand', default: null },
  brandName: String,
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
  regularPrice: { type: Number, required: true },
  price: { type: Number, required: true },
  oldPrice: Number,
  costPrice: { type: Number, default: 0 },
  quantity: { type: Number, required: true, min: 1 },
  couponDiscount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  warrantyMonths: { type: Number, default: 0 },
  reviewed: { type: Boolean, default: false },
});

const OrderSchema = new Schema<IOrder>(
  {
    number: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [OrderItemSchema], required: true },
    itemsCount: { type: Number, required: true },
    customer: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      phone: { type: String, required: true },
      email: String,
    },
    delivery: {
      method: { type: String, enum: DELIVERY_METHODS, required: true },
      zone: { type: Schema.Types.ObjectId, ref: 'DeliveryZone', default: null },
      zoneName: { type: LocalizedSchema, default: undefined },
      address: { type: AddressSnapshotSchema, default: undefined },
      pickupPoint: { type: Schema.Types.ObjectId, ref: 'PickupPoint', default: null },
      pickupSnapshot: {
        type: new Schema(
          {
            code: String,
            name: LocalizedSchema,
            address: LocalizedSchema,
            phone: String,
            workingHours: LocalizedSchema,
            lat: Number,
            lng: Number,
          },
          { _id: false },
        ),
        default: undefined,
      },
      fee: { type: Number, default: 0 },
      minDays: { type: Number, default: 1 },
      maxDays: { type: Number, default: 3 },
      estimatedFrom: Date,
      estimatedTo: Date,
      carrier: String,
      trackingNumber: String,
      deliveredAt: Date,
    },
    payment: {
      method: { type: String, enum: PAYMENT_METHODS, required: true },
      provider: { type: String, enum: PAYMENT_PROVIDERS, required: true },
      status: { type: String, enum: PAYMENT_STATUSES, default: 'PENDING' },
      paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
      paidAt: Date,
      installment: {
        type: new Schema(
          {
            months: Number,
            markupPercent: Number,
            monthlyPayment: Number,
            total: Number,
            status: { type: String, enum: INSTALLMENT_STATUSES, default: 'UNDER_REVIEW' },
            note: String,
          },
          { _id: false },
        ),
        default: undefined,
      },
    },
    coupon: {
      type: new Schema({ code: String, couponId: { type: Schema.Types.ObjectId, ref: 'Coupon' }, discount: Number }, { _id: false }),
      default: undefined,
    },
    regularSubtotal: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },
    oldSubtotal: { type: Number, default: 0 },
    productDiscount: { type: Number, default: 0 },
    promotionDiscount: { type: Number, default: 0 },
    couponDiscount: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    total: { type: Number, required: true },
    costTotal: { type: Number, default: 0 },
    status: { type: String, enum: ORDER_STATUSES, default: 'PENDING' },
    statusHistory: {
      type: [
        {
          _id: false,
          status: { type: String, enum: ORDER_STATUSES },
          at: { type: Date, default: clockNow },
          by: { type: Schema.Types.ObjectId, ref: 'User' },
          byName: String,
          note: String,
        },
      ],
      default: [],
    },
    comment: { type: String, maxlength: 500 },
    adminNotes: {
      type: [{ _id: false, text: String, by: { type: Schema.Types.ObjectId, ref: 'User' }, byName: String, at: { type: Date, default: clockNow } }],
      default: [],
    },
    cancelReason: String,
    cancelledAt: Date,
    deliveredAt: Date,
    source: { type: String, enum: ORDER_SOURCES, default: 'web' },
    inventoryState: { type: String, enum: ['reserved', 'deducted', 'released', 'returned'], default: 'reserved' },
    region: String,
    ip: String,
    userAgent: String,
  },
  schemaOptions,
);
OrderSchema.index({ number: 1 }, { unique: true });
OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ 'payment.status': 1, status: 1, createdAt: 1 });
OrderSchema.index({ 'items.product': 1 });
OrderSchema.index({ 'coupon.code': 1, user: 1 });

export const Order = model<IOrder>('Order', OrderSchema);

export interface ICounter {
  _id: string;
  seq: number;
}
const CounterSchema = new Schema<ICounter>({ _id: { type: String, required: true }, seq: { type: Number, default: 0 } }, { versionKey: false });
export const Counter = model<ICounter>('Counter', CounterSchema);
