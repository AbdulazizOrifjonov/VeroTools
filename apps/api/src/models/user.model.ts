import { Schema, model, type Types } from 'mongoose';
import { LANGUAGES } from '@vero/config';
import { ImageSchema, schemaOptions, type ImageValue, type Timestamps } from './common';
import { clockNow } from '../lib/clock';

export interface IUser extends Timestamps {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  passwordHash: string;
  role: Types.ObjectId;
  roleKey: string;
  /** extra permissions granted on top of the role */
  permissions: string[];
  avatar?: ImageValue;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  status: 'active' | 'blocked';
  preferences: {
    language: 'uz' | 'ru' | 'en';
    theme: 'light' | 'dark' | 'system';
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
      promotions: boolean;
      priceDrops: boolean;
      backInStock: boolean;
    };
  };
  searchHistory: Array<{ q: string; at: Date }>;
  pushTokens: Array<{ token: string; platform: 'ios' | 'android' | 'web'; createdAt: Date }>;
  stats: { ordersCount: number; totalSpent: number; lastOrderAt?: Date; reviewsCount: number };
  lastLoginAt?: Date;
  passwordChangedAt?: Date;
  /** incremented to invalidate all sessions (password change, block) */
  tokenVersion: number;
}

const UserSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 60 },
    lastName: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, trim: true, lowercase: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, match: /^\+998\d{9}$/ },
    passwordHash: { type: String, required: true, select: false },
    role: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    roleKey: { type: String, required: true, default: 'CUSTOMER', index: true },
    permissions: { type: [String], default: [] },
    avatar: { type: ImageSchema, default: undefined },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'blocked'], default: 'active', index: true },
    preferences: {
      language: { type: String, enum: LANGUAGES, default: 'uz' },
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        sms: { type: Boolean, default: true },
        promotions: { type: Boolean, default: true },
        priceDrops: { type: Boolean, default: true },
        backInStock: { type: Boolean, default: true },
      },
    },
    searchHistory: {
      type: [{ _id: false, q: { type: String, maxlength: 120 }, at: { type: Date, default: clockNow } }],
      default: [],
    },
    pushTokens: {
      type: [
        {
          _id: false,
          token: { type: String, required: true },
          platform: { type: String, enum: ['ios', 'android', 'web'], required: true },
          createdAt: { type: Date, default: clockNow },
        },
      ],
      default: [],
    },
    stats: {
      ordersCount: { type: Number, default: 0 },
      totalSpent: { type: Number, default: 0 },
      lastOrderAt: Date,
      reviewsCount: { type: Number, default: 0 },
    },
    lastLoginAt: Date,
    passwordChangedAt: Date,
    tokenVersion: { type: Number, default: 0 },
  },
  schemaOptions,
);

UserSchema.index({ phone: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ roleKey: 1, createdAt: -1 });

export const User = model<IUser>('User', UserSchema);
