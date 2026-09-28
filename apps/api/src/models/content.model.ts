import { Schema, model, type Types } from 'mongoose';
import { CONTACT_MESSAGE_STATUSES, CONTACT_MESSAGE_TYPES, FAQ_CATEGORIES, type ContactMessageStatus, type ContactMessageType, type FaqCategory } from '@vero/types';
import { localizedField, schemaOptions, type Localized, type Timestamps } from './common';
import { clockNow } from '../lib/clock';

export interface IPage extends Timestamps {
  _id: Types.ObjectId;
  slug: string;
  title: Localized;
  content: Localized;
  seoTitle: Localized;
  seoDescription: Localized;
  isPublished: boolean;
}
const PageSchema = new Schema<IPage>(
  {
    slug: { type: String, required: true, lowercase: true, trim: true },
    title: localizedField(true),
    content: localizedField(),
    seoTitle: localizedField(),
    seoDescription: localizedField(),
    isPublished: { type: Boolean, default: true },
  },
  schemaOptions,
);
PageSchema.index({ slug: 1 }, { unique: true });
export const Page = model<IPage>('Page', PageSchema);

export interface IFaq extends Timestamps {
  _id: Types.ObjectId;
  category: FaqCategory;
  question: Localized;
  answer: Localized;
  order: number;
  isActive: boolean;
}
const FaqSchema = new Schema<IFaq>(
  {
    category: { type: String, enum: FAQ_CATEGORIES, required: true },
    question: localizedField(true),
    answer: localizedField(true),
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  schemaOptions,
);
FaqSchema.index({ category: 1, order: 1 });
export const Faq = model<IFaq>('Faq', FaqSchema);

export interface ITranslation extends Timestamps {
  _id: Types.ObjectId;
  namespace: string;
  key: string;
  values: Partial<Localized>;
  updatedBy?: Types.ObjectId;
}
const TranslationSchema = new Schema<ITranslation>(
  {
    namespace: { type: String, required: true },
    key: { type: String, required: true },
    values: { uz: String, ru: String, en: String },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  schemaOptions,
);
TranslationSchema.index({ namespace: 1, key: 1 }, { unique: true });
export const Translation = model<ITranslation>('Translation', TranslationSchema);

export interface ISetting extends Timestamps {
  _id: Types.ObjectId;
  key: string;
  value: unknown;
  group: string;
  isPublic: boolean;
  updatedBy?: Types.ObjectId;
}
const SettingSchema = new Schema<ISetting>(
  {
    key: { type: String, required: true },
    value: { type: Schema.Types.Mixed },
    group: { type: String, default: 'general' },
    isPublic: { type: Boolean, default: false },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  schemaOptions,
);
SettingSchema.index({ key: 1 }, { unique: true });
export const Setting = model<ISetting>('Setting', SettingSchema);

export interface IContactMessage extends Timestamps {
  _id: Types.ObjectId;
  type: ContactMessageType;
  name: string;
  phone: string;
  email?: string;
  subject?: string;
  message?: string;
  product?: Types.ObjectId;
  status: ContactMessageStatus;
  handledBy?: string;
  user?: Types.ObjectId;
  ip?: string;
}
const ContactMessageSchema = new Schema<IContactMessage>(
  {
    type: { type: String, enum: CONTACT_MESSAGE_TYPES, default: 'contact' },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: String,
    subject: String,
    message: { type: String, maxlength: 3000 },
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    status: { type: String, enum: CONTACT_MESSAGE_STATUSES, default: 'NEW' },
    handledBy: String,
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    ip: String,
  },
  schemaOptions,
);
ContactMessageSchema.index({ status: 1, createdAt: -1 });
export const ContactMessage = model<IContactMessage>('ContactMessage', ContactMessageSchema);

export interface ISearchQuery {
  _id: Types.ObjectId;
  query: string;
  display: string;
  count: number;
  resultsCount: number;
  lastSearchedAt: Date;
}
const SearchQuerySchema = new Schema<ISearchQuery>(
  {
    query: { type: String, required: true },
    display: { type: String, required: true },
    count: { type: Number, default: 1 },
    resultsCount: { type: Number, default: 0 },
    lastSearchedAt: { type: Date, default: clockNow },
  },
  { versionKey: false },
);
SearchQuerySchema.index({ query: 1 }, { unique: true });
SearchQuerySchema.index({ count: -1 });
export const SearchQuery = model<ISearchQuery>('SearchQuery', SearchQuerySchema);
