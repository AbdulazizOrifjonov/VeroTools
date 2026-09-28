import { Schema, model, type Types } from 'mongoose';
import { ImageSchema, localizedField, schemaOptions, type ImageValue, type Localized, type Timestamps } from './common';

export interface ICategory extends Timestamps {
  _id: Types.ObjectId;
  name: Localized;
  slug: string;
  description: Localized;
  parent: Types.ObjectId | null;
  ancestors: Types.ObjectId[];
  level: number;
  order: number;
  icon?: string;
  image?: ImageValue;
  isActive: boolean;
  /** filterable specification keys shown in this category (children inherit) */
  specKeys: string[];
  seoTitle: Localized;
  seoDescription: Localized;
  /** published products in this category and all descendants (denormalised) */
  productCount: number;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: localizedField(true),
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: localizedField(),
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    ancestors: { type: [Schema.Types.ObjectId], default: [] },
    level: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    icon: String,
    image: { type: ImageSchema, default: undefined },
    isActive: { type: Boolean, default: true },
    specKeys: { type: [String], default: [] },
    seoTitle: localizedField(),
    seoDescription: localizedField(),
    productCount: { type: Number, default: 0 },
  },
  schemaOptions,
);
CategorySchema.index({ slug: 1 }, { unique: true });
CategorySchema.index({ parent: 1, order: 1 });
CategorySchema.index({ ancestors: 1 });

export const Category = model<ICategory>('Category', CategorySchema);
