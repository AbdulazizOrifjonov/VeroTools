import { Schema, model, type Types } from 'mongoose';
import { ImageSchema, localizedField, schemaOptions, type ImageValue, type Localized, type Timestamps } from './common';

export interface IBrand extends Timestamps {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description: Localized;
  country: Localized;
  website?: string;
  logo?: ImageValue;
  isActive: boolean;
  productCount: number;
}

const BrandSchema = new Schema<IBrand>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: localizedField(),
    country: localizedField(),
    website: String,
    logo: { type: ImageSchema, default: undefined },
    isActive: { type: Boolean, default: true },
    productCount: { type: Number, default: 0 },
  },
  schemaOptions,
);
BrandSchema.index({ slug: 1 }, { unique: true });
BrandSchema.index({ name: 1 });

export const Brand = model<IBrand>('Brand', BrandSchema);
