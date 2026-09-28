import { Schema, model, type Types } from 'mongoose';
import { LocalizedSchema, schemaOptions, type Localized, type Timestamps } from './common';

export interface IRole extends Timestamps {
  _id: Types.ObjectId;
  key: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
}

const RoleSchema = new Schema<IRole>(
  {
    key: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    permissions: { type: [String], default: [] },
    isSystem: { type: Boolean, default: false },
  },
  schemaOptions,
);
RoleSchema.index({ key: 1 }, { unique: true });

export const Role = model<IRole>('Role', RoleSchema);

export interface IPermission {
  _id: Types.ObjectId;
  key: string;
  group: string;
  description: Localized;
}

const PermissionSchema = new Schema<IPermission>(
  {
    key: { type: String, required: true },
    group: { type: String, required: true },
    description: { type: LocalizedSchema, default: () => ({ uz: '', ru: '', en: '' }) },
  },
  { versionKey: false },
);
PermissionSchema.index({ key: 1 }, { unique: true });

export const Permission = model<IPermission>('Permission', PermissionSchema);
