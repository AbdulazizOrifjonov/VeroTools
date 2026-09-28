import { Schema, model, type Types } from 'mongoose';
import { localizedField, schemaOptions, type Localized, type Timestamps } from './common';

export interface IDeliveryZone extends Timestamps {
  _id: Types.ObjectId;
  code: string;
  name: Localized;
  regions: string[];
  price: number;
  freeThreshold: number;
  minDays: number;
  maxDays: number;
  priority: number;
  isActive: boolean;
}

const DeliveryZoneSchema = new Schema<IDeliveryZone>(
  {
    code: { type: String, required: true, lowercase: true, trim: true },
    name: localizedField(true),
    regions: { type: [String], default: [] },
    price: { type: Number, required: true, min: 0 },
    freeThreshold: { type: Number, default: 0 },
    minDays: { type: Number, default: 1 },
    maxDays: { type: Number, default: 3 },
    priority: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  schemaOptions,
);
DeliveryZoneSchema.index({ code: 1 }, { unique: true });
DeliveryZoneSchema.index({ regions: 1 });

export const DeliveryZone = model<IDeliveryZone>('DeliveryZone', DeliveryZoneSchema);

export interface IPickupPoint extends Timestamps {
  _id: Types.ObjectId;
  code: string;
  name: Localized;
  address: Localized;
  region: string;
  city: string;
  phone: string;
  workingHours: Localized;
  location: { lat: number; lng: number };
  isActive: boolean;
}

const PickupPointSchema = new Schema<IPickupPoint>(
  {
    code: { type: String, required: true, lowercase: true, trim: true },
    name: localizedField(true),
    address: localizedField(true),
    region: { type: String, required: true },
    city: { type: String, required: true },
    phone: { type: String, required: true },
    workingHours: localizedField(),
    location: { lat: { type: Number, required: true }, lng: { type: Number, required: true } },
    isActive: { type: Boolean, default: true },
  },
  schemaOptions,
);
PickupPointSchema.index({ code: 1 }, { unique: true });

export const PickupPoint = model<IPickupPoint>('PickupPoint', PickupPointSchema);
