import { Schema, model, type Types } from 'mongoose';
import { clockNow } from '../lib/clock';

export interface IRefreshToken {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  tokenHash: string;
  family: string;
  client: 'web' | 'admin' | 'mobile';
  userAgent?: string;
  ip?: string;
  expiresAt: Date;
  revokedAt?: Date;
  replacedBy?: Types.ObjectId;
  lastUsedAt?: Date;
  createdAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true },
    family: { type: String, required: true, index: true },
    client: { type: String, enum: ['web', 'admin', 'mobile'], required: true },
    userAgent: { type: String, maxlength: 300 },
    ip: String,
    expiresAt: { type: Date, required: true },
    revokedAt: Date,
    replacedBy: { type: Schema.Types.ObjectId, ref: 'RefreshToken' },
    lastUsedAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false, currentTime: clockNow }, versionKey: false },
);
RefreshTokenSchema.index({ tokenHash: 1 }, { unique: true });
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = model<IRefreshToken>('RefreshToken', RefreshTokenSchema);

export type VerificationPurpose = 'verify_phone' | 'reset_password' | 'verify_email' | 'reset_password_email';

export interface IVerificationCode {
  _id: Types.ObjectId;
  purpose: VerificationPurpose;
  /** phone (+998…) or email */
  target: string;
  user?: Types.ObjectId;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  usedAt?: Date;
  lastSentAt: Date;
  createdAt: Date;
}

const VerificationCodeSchema = new Schema<IVerificationCode>(
  {
    purpose: { type: String, required: true },
    target: { type: String, required: true, lowercase: true, trim: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    usedAt: Date,
    lastSentAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false, currentTime: clockNow }, versionKey: false },
);
VerificationCodeSchema.index({ purpose: 1, target: 1, createdAt: -1 });
VerificationCodeSchema.index({ codeHash: 1 });
VerificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

export const VerificationCode = model<IVerificationCode>('VerificationCode', VerificationCodeSchema);
