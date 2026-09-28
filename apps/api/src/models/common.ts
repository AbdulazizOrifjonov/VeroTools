import { Schema, type Types } from 'mongoose';
import { clockNow } from '../lib/clock';

export interface Localized {
  uz: string;
  ru: string;
  en: string;
}

export const LocalizedSchema = new Schema<Localized>(
  {
    uz: { type: String, default: '', trim: true },
    ru: { type: String, default: '', trim: true },
    en: { type: String, default: '', trim: true },
  },
  { _id: false },
);

export const localizedField = (required = false) => ({
  type: LocalizedSchema,
  default: () => ({ uz: '', ru: '', en: '' }),
  ...(required ? { required: true } : {}),
});

export interface ImageValue {
  media?: Types.ObjectId;
  url: string;
  thumb?: string;
  medium?: string;
  alt?: Localized;
  width?: number;
  height?: number;
}

export const ImageSchema = new Schema<ImageValue>(
  {
    media: { type: Schema.Types.ObjectId, ref: 'Media' },
    url: { type: String, required: true },
    thumb: String,
    medium: String,
    alt: { type: LocalizedSchema, default: undefined },
    width: Number,
    height: Number,
  },
  { _id: false },
);

export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

/** createdAt / updatedAt follow the business clock (real time, except when the seeder replays history). */
export const schemaOptions = { timestamps: { currentTime: clockNow }, versionKey: false } as const;

export const ObjectId = Schema.Types.ObjectId;
