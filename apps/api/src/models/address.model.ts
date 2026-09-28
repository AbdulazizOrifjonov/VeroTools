import { Schema, model, type Types } from 'mongoose';
import { schemaOptions, type Timestamps } from './common';

export interface IAddress extends Timestamps {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  label?: string;
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
  location?: { lat: number; lng: number };
  isDefault: boolean;
}

export const AddressFields = {
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  phone: { type: String, required: true },
  region: { type: String, required: true },
  city: { type: String, required: true, trim: true },
  district: { type: String, trim: true },
  street: { type: String, required: true, trim: true },
  house: { type: String, required: true, trim: true },
  apartment: { type: String, trim: true },
  comment: { type: String, trim: true, maxlength: 300 },
} as const;

const AddressSchema = new Schema<IAddress>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    label: { type: String, trim: true, maxlength: 40 },
    ...AddressFields,
    location: { lat: Number, lng: Number },
    isDefault: { type: Boolean, default: false },
  },
  schemaOptions,
);

export const Address = model<IAddress>('Address', AddressSchema);
