import { Schema, model, type Types } from 'mongoose';
import { QUESTION_STATUSES, REVIEW_STATUSES, type QuestionStatus, type ReviewStatus } from '@vero/types';
import { ImageSchema, schemaOptions, type ImageValue, type Timestamps } from './common';

export interface IReview extends Timestamps {
  _id: Types.ObjectId;
  product: Types.ObjectId;
  user: Types.ObjectId;
  authorName: string;
  rating: number;
  title?: string;
  comment: string;
  pros?: string;
  cons?: string;
  images: ImageValue[];
  isVerifiedPurchase: boolean;
  status: ReviewStatus;
  language?: string;
  reply?: { text: string; by?: Types.ObjectId; byName?: string; at: Date };
  moderatedBy?: Types.ObjectId;
  moderatedAt?: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, maxlength: 120 },
    comment: { type: String, required: true, maxlength: 2000 },
    pros: { type: String, maxlength: 500 },
    cons: { type: String, maxlength: 500 },
    images: { type: [ImageSchema], default: [] },
    isVerifiedPurchase: { type: Boolean, default: false },
    status: { type: String, enum: REVIEW_STATUSES, default: 'PENDING' },
    language: String,
    reply: {
      type: new Schema({ text: String, by: { type: Schema.Types.ObjectId, ref: 'User' }, byName: String, at: Date }, { _id: false }),
      default: undefined,
    },
    moderatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    moderatedAt: Date,
  },
  schemaOptions,
);
ReviewSchema.index({ product: 1, user: 1 }, { unique: true });
ReviewSchema.index({ product: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ status: 1, createdAt: -1 });
ReviewSchema.index({ user: 1, createdAt: -1 });

export const Review = model<IReview>('Review', ReviewSchema);

export interface IProductQuestion extends Timestamps {
  _id: Types.ObjectId;
  product: Types.ObjectId;
  user: Types.ObjectId;
  authorName: string;
  question: string;
  answer?: { text: string; by?: Types.ObjectId; byName?: string; at: Date };
  status: QuestionStatus;
}

const ProductQuestionSchema = new Schema<IProductQuestion>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    question: { type: String, required: true, maxlength: 1000 },
    answer: {
      type: new Schema({ text: String, by: { type: Schema.Types.ObjectId, ref: 'User' }, byName: String, at: Date }, { _id: false }),
      default: undefined,
    },
    status: { type: String, enum: QUESTION_STATUSES, default: 'PENDING' },
  },
  schemaOptions,
);
ProductQuestionSchema.index({ product: 1, status: 1, createdAt: -1 });
ProductQuestionSchema.index({ status: 1, createdAt: -1 });

export const ProductQuestion = model<IProductQuestion>('ProductQuestion', ProductQuestionSchema);
