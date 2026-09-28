import { Schema, model, type Types } from 'mongoose';
import { NOTIFICATION_TYPES, type NotificationType } from '@vero/types';
import { LocalizedSchema, localizedField, schemaOptions, type Localized, type Timestamps } from './common';

export interface INotification extends Timestamps {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  type: NotificationType;
  title: Localized;
  body: Localized;
  data?: { orderId?: string; orderNumber?: string; productId?: string; productSlug?: string; url?: string };
  image?: string;
  readAt?: Date | null;
  channels: string[];
}

const NotificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: LocalizedSchema, required: true },
    body: { type: LocalizedSchema, required: true },
    data: { orderId: String, orderNumber: String, productId: String, productSlug: String, url: String },
    image: String,
    readAt: { type: Date, default: null },
    channels: { type: [String], default: ['in_app'] },
  },
  schemaOptions,
);
NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, readAt: 1 });
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

export const Notification = model<INotification>('Notification', NotificationSchema);

export interface INotificationLog extends Timestamps {
  _id: Types.ObjectId;
  type: NotificationType;
  title: Localized;
  body: Localized;
  url?: string;
  audience: string;
  channels: string[];
  recipients: number;
  sentBy?: Types.ObjectId;
  sentByName?: string;
}

const NotificationLogSchema = new Schema<INotificationLog>(
  {
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: localizedField(true),
    body: localizedField(true),
    url: String,
    audience: String,
    channels: [String],
    recipients: { type: Number, default: 0 },
    sentBy: { type: Schema.Types.ObjectId, ref: 'User' },
    sentByName: String,
  },
  schemaOptions,
);
NotificationLogSchema.index({ createdAt: -1 });

export const NotificationLog = model<INotificationLog>('NotificationLog', NotificationLogSchema);
