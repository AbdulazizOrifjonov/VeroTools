import { Schema, model, type Types } from 'mongoose';
import { BANNER_PLACEMENTS, COUPON_SCOPES, COUPON_TYPES, PROMOTION_TYPES, type BannerPlacement, type CouponScope, type CouponType, type PromotionType } from '@vero/types';
import { ImageSchema, localizedField, schemaOptions, type ImageValue, type Localized, type Timestamps } from './common';

export interface ICoupon extends Timestamps {
  _id: Types.ObjectId;
  code: string;
  description: Localized;
  type: CouponType;
  value: number;
  maxDiscount?: number;
  scope: CouponScope;
  products: Types.ObjectId[];
  categories: Types.ObjectId[];
  brands: Types.ObjectId[];
  minOrderAmount: number;
  firstOrderOnly: boolean;
  startsAt?: Date;
  expiresAt?: Date;
  usageLimit?: number;
  perUserLimit?: number;
  usedCount: number;
  isActive: boolean;
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    description: localizedField(),
    type: { type: String, enum: COUPON_TYPES, required: true },
    value: { type: Number, required: true, min: 0 },
    maxDiscount: Number,
    scope: { type: String, enum: COUPON_SCOPES, default: 'all' },
    products: { type: [Schema.Types.ObjectId], ref: 'Product', default: [] },
    categories: { type: [Schema.Types.ObjectId], ref: 'Category', default: [] },
    brands: { type: [Schema.Types.ObjectId], ref: 'Brand', default: [] },
    minOrderAmount: { type: Number, default: 0 },
    firstOrderOnly: { type: Boolean, default: false },
    startsAt: Date,
    expiresAt: Date,
    usageLimit: Number,
    perUserLimit: Number,
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  schemaOptions,
);
CouponSchema.index({ code: 1 }, { unique: true });

export const Coupon = model<ICoupon>('Coupon', CouponSchema);

export interface IPromotion extends Timestamps {
  _id: Types.ObjectId;
  slug: string;
  name: Localized;
  description: Localized;
  type: PromotionType;
  discountType: CouponType;
  discountValue: number;
  products: Types.ObjectId[];
  categories: Types.ObjectId[];
  brands: Types.ObjectId[];
  startsAt: Date;
  endsAt: Date;
  priority: number;
  isActive: boolean;
  showOnHome: boolean;
  image?: ImageValue;
  productCount: number;
}

const PromotionSchema = new Schema<IPromotion>(
  {
    slug: { type: String, required: true, lowercase: true, trim: true },
    name: localizedField(true),
    description: localizedField(),
    type: { type: String, enum: PROMOTION_TYPES, required: true },
    discountType: { type: String, enum: COUPON_TYPES, required: true },
    discountValue: { type: Number, required: true, min: 0 },
    products: { type: [Schema.Types.ObjectId], ref: 'Product', default: [] },
    categories: { type: [Schema.Types.ObjectId], ref: 'Category', default: [] },
    brands: { type: [Schema.Types.ObjectId], ref: 'Brand', default: [] },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    priority: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    showOnHome: { type: Boolean, default: true },
    image: { type: ImageSchema, default: undefined },
    productCount: { type: Number, default: 0 },
  },
  schemaOptions,
);
PromotionSchema.index({ slug: 1 }, { unique: true });
PromotionSchema.index({ isActive: 1, startsAt: 1, endsAt: 1 });

export const Promotion = model<IPromotion>('Promotion', PromotionSchema);

export interface IBanner extends Timestamps {
  _id: Types.ObjectId;
  placement: BannerPlacement;
  title: Localized;
  subtitle: Localized;
  buttonText: Localized;
  buttonUrl?: string;
  imageDesktop?: ImageValue;
  imageMobile?: ImageValue;
  textTheme: 'dark' | 'light';
  startsAt?: Date;
  endsAt?: Date;
  priority: number;
  isActive: boolean;
}

const BannerSchema = new Schema<IBanner>(
  {
    placement: { type: String, enum: BANNER_PLACEMENTS, required: true },
    title: localizedField(true),
    subtitle: localizedField(),
    buttonText: localizedField(),
    buttonUrl: String,
    imageDesktop: { type: ImageSchema, default: undefined },
    imageMobile: { type: ImageSchema, default: undefined },
    textTheme: { type: String, enum: ['dark', 'light'], default: 'dark' },
    startsAt: Date,
    endsAt: Date,
    priority: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  schemaOptions,
);
BannerSchema.index({ placement: 1, isActive: 1, priority: -1 });

export const Banner = model<IBanner>('Banner', BannerSchema);
