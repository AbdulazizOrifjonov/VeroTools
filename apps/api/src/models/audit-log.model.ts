import { Schema, model, type Types } from 'mongoose';
import { clockNow } from '../lib/clock';

export interface IAuditLog {
  _id: Types.ObjectId;
  user?: Types.ObjectId;
  userName?: string;
  userRole?: string;
  action: string;
  target?: { type: string; id?: string; label?: string };
  changes?: Record<string, { from: unknown; to: unknown }>;
  meta?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    userName: String,
    userRole: String,
    action: { type: String, required: true },
    target: { type: { type: String }, id: String, label: String },
    changes: { type: Schema.Types.Mixed },
    meta: { type: Schema.Types.Mixed },
    ip: String,
    userAgent: { type: String, maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false, currentTime: clockNow }, versionKey: false },
);
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ user: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ 'target.type': 1, 'target.id': 1 });

export const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema);
