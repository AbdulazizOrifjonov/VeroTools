import { Schema, model, type Types } from 'mongoose';
import { PRODUCT_STATUSES, PROMOTION_TYPES, type ProductStatus, type PromotionType } from '@vero/types';
import { ImageSchema, LocalizedSchema, localizedField, schemaOptions, type ImageValue, type Localized, type Timestamps } from './common';

export type SpecStoredValue = number | string | boolean | Localized;

/** A specification value on a product with normalised copies for filtering (n: number, t: token, b: boolean). */
export interface IProductSpecValue {
  key: string;
  value: SpecStoredValue;
  n?: number;
  t?: string;
  b?: boolean;
}

export interface IStockSnapshot {
  onHand: number;
  reserved: number;
  available: number;
  minStock: number;
  incoming: number;
}

/** ProductVariant — embedded in Product (e.g. "Body only" / "Kit 2×4.0Ah"). */
export interface IProductVariant {
  _id: Types.ObjectId;
  sku: string;
  name: Localized;
  attributes: Record<string, string>;
  regularPrice: number;
  regularOldPrice?: number;
  price: number;
  oldPrice?: number;
  discountPercent: number;
  costPrice: number;
  image?: ImageValue;
  isActive: boolean;
  stock: IStockSnapshot;
}

export interface IProductPromotionRef {
  id: Types.ObjectId;
  slug: string;
  name: Localized;
  type: PromotionType;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  endsAt: Date;
}

export interface IProduct extends Timestamps {
  _id: Types.ObjectId;
  name: Localized;
  slug: string;
  sku: string;
  brand: Types.ObjectId | null;
  category: Types.ObjectId;
  /** ancestors + own category (for "category incl. descendants" filters) */
  categoryPath: Types.ObjectId[];
  shortDescription: Localized;
  description: Localized;
  /** price set by the admin */
  regularPrice: number;
  /** optional compare-at price set by the admin */
  regularOldPrice?: number;
  costPrice: number;
  /** effective selling price after promotions (lowest active variant price when variants exist) */
  price: number;
  oldPrice?: number;
  discountPercent: number;
  isDiscounted: boolean;
  promotion?: IProductPromotionRef;
  stock: IStockSnapshot;
  inStock: boolean;
  images: ImageValue[];
  videos: string[];
  specs: IProductSpecValue[];
  tags: string[];
  searchText: string;
  warrantyMonths: number;
  deliveryDays: { min: number; max: number };
  weightKg?: number;
  seo: { title: Localized; description: Localized };
  flags: { featured: boolean; isNew: boolean; bestseller: boolean };
  status: ProductStatus;
  variants: IProductVariant[];
  rating: { average: number; count: number; distribution: Record<'1' | '2' | '3' | '4' | '5', number> };
  soldCount: number;
  viewCount: number;
  popularity: number;
  publishedAt?: Date;
}

const StockSnapshotSchema = new Schema<IStockSnapshot>(
  {
    onHand: { type: Number, default: 0 },
    reserved: { type: Number, default: 0 },
    available: { type: Number, default: 0 },
    minStock: { type: Number, default: 3 },
    incoming: { type: Number, default: 0 },
  },
  { _id: false },
);

const SpecValueSchema = new Schema<IProductSpecValue>(
  {
    key: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
    n: Number,
    t: String,
    b: Boolean,
  },
  { _id: false },
);

export const ProductVariantSchema = new Schema<IProductVariant>({
  sku: { type: String, required: true, uppercase: true, trim: true },
  name: { type: LocalizedSchema, required: true },
  attributes: { type: Map, of: String, default: {} },
  regularPrice: { type: Number, required: true, min: 0 },
  regularOldPrice: Number,
  price: { type: Number, required: true, min: 0 },
  oldPrice: Number,
  discountPercent: { type: Number, default: 0 },
  costPrice: { type: Number, default: 0, min: 0 },
  image: { type: ImageSchema, default: undefined },
  isActive: { type: Boolean, default: true },
  stock: { type: StockSnapshotSchema, default: () => ({}) },
});

const ProductSchema = new Schema<IProduct>(
  {
    name: localizedField(true),
    slug: { type: String, required: true, lowercase: true, trim: true },
    sku: { type: String, required: true, uppercase: true, trim: true },
    brand: { type: Schema.Types.ObjectId, ref: 'Brand', default: null },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    categoryPath: { type: [Schema.Types.ObjectId], default: [] },
    shortDescription: localizedField(),
    description: localizedField(),
    regularPrice: { type: Number, required: true, min: 0 },
    regularOldPrice: Number,
    costPrice: { type: Number, default: 0, min: 0 },
    price: { type: Number, required: true, min: 0 },
    oldPrice: Number,
    discountPercent: { type: Number, default: 0 },
    isDiscounted: { type: Boolean, default: false },
    promotion: {
      type: new Schema<IProductPromotionRef>(
        {
          id: { type: Schema.Types.ObjectId, ref: 'Promotion' },
          slug: String,
          name: LocalizedSchema,
          type: { type: String, enum: PROMOTION_TYPES },
          discountType: { type: String, enum: ['percent', 'fixed'] },
          discountValue: Number,
          endsAt: Date,
        },
        { _id: false },
      ),
      default: undefined,
    },
    stock: { type: StockSnapshotSchema, default: () => ({}) },
    inStock: { type: Boolean, default: false },
    images: { type: [ImageSchema], default: [] },
    videos: { type: [String], default: [] },
    specs: { type: [SpecValueSchema], default: [] },
    tags: { type: [String], default: [] },
    searchText: { type: String, default: '' },
    warrantyMonths: { type: Number, default: 12 },
    deliveryDays: { min: { type: Number, default: 1 }, max: { type: Number, default: 3 } },
    weightKg: Number,
    seo: { title: localizedField(), description: localizedField() },
    flags: {
      featured: { type: Boolean, default: false },
      isNew: { type: Boolean, default: false },
      bestseller: { type: Boolean, default: false },
    },
    status: { type: String, enum: PRODUCT_STATUSES, default: 'draft' },
    variants: { type: [ProductVariantSchema], default: [] },
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
      distribution: {
        '1': { type: Number, default: 0 },
        '2': { type: Number, default: 0 },
        '3': { type: Number, default: 0 },
        '4': { type: Number, default: 0 },
        '5': { type: Number, default: 0 },
      },
    },
    soldCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    popularity: { type: Number, default: 0 },
    publishedAt: Date,
  },
  schemaOptions,
);

ProductSchema.index({ slug: 1 }, { unique: true });
ProductSchema.index({ sku: 1 }, { unique: true });
ProductSchema.index({ 'variants.sku': 1 }, { unique: true, partialFilterExpression: { 'variants.sku': { $type: 'string' } } });
ProductSchema.index({ status: 1, categoryPath: 1, popularity: -1 });
ProductSchema.index({ status: 1, brand: 1 });
ProductSchema.index({ status: 1, price: 1 });
ProductSchema.index({ status: 1, createdAt: -1 });
ProductSchema.index({ status: 1, popularity: -1 });
ProductSchema.index({ status: 1, 'rating.average': -1 });
ProductSchema.index({ status: 1, discountPercent: -1 });
ProductSchema.index({ status: 1, 'flags.featured': 1 });
ProductSchema.index({ status: 1, 'flags.isNew': 1 });
ProductSchema.index({ status: 1, 'flags.bestseller': 1 });
ProductSchema.index({ 'specs.key': 1, 'specs.n': 1 });
ProductSchema.index({ 'specs.key': 1, 'specs.t': 1 });
ProductSchema.index({ 'promotion.id': 1 });
ProductSchema.index({ searchText: 'text' }, { default_language: 'none', name: 'product_text' });

export const Product = model<IProduct>('Product', ProductSchema);
