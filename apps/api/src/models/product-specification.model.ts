import { Schema, model, type Types } from 'mongoose';
import { SPEC_GROUPS, SPEC_TYPES, type SpecGroup, type SpecType } from '@vero/types';
import { localizedField, schemaOptions, type Localized, type Timestamps } from './common';

/**
 * ProductSpecification = catalogue attribute definition (e.g. "power_w", unit "W", numeric, filterable).
 * Product documents store the values in `product.specs`.
 */
export interface IProductSpecification extends Timestamps {
  _id: Types.ObjectId;
  key: string;
  label: Localized;
  unit?: string;
  type: SpecType;
  filterable: boolean;
  group: SpecGroup;
  order: number;
  categories: Types.ObjectId[];
}

const ProductSpecificationSchema = new Schema<IProductSpecification>(
  {
    key: { type: String, required: true, trim: true, match: /^[a-z0-9_]+$/ },
    label: localizedField(true),
    unit: String,
    type: { type: String, enum: SPEC_TYPES, required: true },
    filterable: { type: Boolean, default: false },
    group: { type: String, enum: SPEC_GROUPS, default: 'main' },
    order: { type: Number, default: 100 },
    categories: { type: [Schema.Types.ObjectId], ref: 'Category', default: [] },
  },
  schemaOptions,
);
ProductSpecificationSchema.index({ key: 1 }, { unique: true });

export const ProductSpecification = model<IProductSpecification>('ProductSpecification', ProductSpecificationSchema);
