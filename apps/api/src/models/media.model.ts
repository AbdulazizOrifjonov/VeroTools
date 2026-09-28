import { Schema, model, type Types } from 'mongoose';
import { MEDIA_FOLDERS, MEDIA_PROVIDERS, type MediaFolder, type MediaProvider } from '@vero/types';
import { localizedField, schemaOptions, type Localized, type Timestamps } from './common';

/** Binary files never live in MongoDB — only metadata and storage keys (local disk / S3 / Cloudinary). */
export interface IMedia extends Timestamps {
  _id: Types.ObjectId;
  provider: MediaProvider;
  folder: MediaFolder;
  key: string;
  url: string;
  variants: { thumb?: { key: string; url: string }; medium?: { key: string; url: string } };
  filename: string;
  originalName: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
  alt: Localized;
  tags: string[];
  uploadedBy?: Types.ObjectId;
  uploadedByName?: string;
  usageCount: number;
}

const MediaSchema = new Schema<IMedia>(
  {
    provider: { type: String, enum: MEDIA_PROVIDERS, required: true },
    folder: { type: String, enum: MEDIA_FOLDERS, default: 'general' },
    key: { type: String, required: true },
    url: { type: String, required: true },
    variants: {
      thumb: { key: String, url: String },
      medium: { key: String, url: String },
    },
    filename: { type: String, required: true },
    originalName: { type: String, default: '' },
    mime: { type: String, required: true },
    size: { type: Number, required: true },
    width: Number,
    height: Number,
    alt: localizedField(),
    tags: { type: [String], default: [] },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    uploadedByName: String,
    usageCount: { type: Number, default: 0 },
  },
  schemaOptions,
);
MediaSchema.index({ folder: 1, createdAt: -1 });
MediaSchema.index({ createdAt: -1 });
MediaSchema.index({ tags: 1 });
MediaSchema.index({ key: 1 });

export const Media = model<IMedia>('Media', MediaSchema);
