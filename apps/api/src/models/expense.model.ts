import { Schema, model, type Types } from 'mongoose';
import { CURRENCIES, EXPENSE_PAYMENT_METHODS, EXPENSE_STATUSES, type CurrencyCode, type ExpensePaymentMethod, type ExpenseStatus } from '@vero/types';
import { localizedField, schemaOptions, type Localized, type Timestamps } from './common';

export interface IExpenseCategory extends Timestamps {
  _id: Types.ObjectId;
  code: string;
  name: Localized;
  color: string;
  isActive: boolean;
  isSystem: boolean;
}
const ExpenseCategorySchema = new Schema<IExpenseCategory>(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    name: localizedField(true),
    color: { type: String, default: '#75757F' },
    isActive: { type: Boolean, default: true },
    isSystem: { type: Boolean, default: false },
  },
  schemaOptions,
);
ExpenseCategorySchema.index({ code: 1 }, { unique: true });
export const ExpenseCategory = model<IExpenseCategory>('ExpenseCategory', ExpenseCategorySchema);

export interface IExpense extends Timestamps {
  _id: Types.ObjectId;
  title: string;
  category: Types.ObjectId;
  categoryCode: string;
  description?: string;
  amount: number;
  currency: CurrencyCode;
  exchangeRate: number;
  /** amount converted to UZS (used by analytics) */
  amountUzs: number;
  date: Date;
  paymentMethod: ExpensePaymentMethod;
  responsible?: string;
  attachments: Array<{ media: Types.ObjectId; url: string; name: string; mime: string }>;
  status: ExpenseStatus;
  notes?: string;
  createdBy?: Types.ObjectId;
  createdByName?: string;
}
const ExpenseSchema = new Schema<IExpense>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    category: { type: Schema.Types.ObjectId, ref: 'ExpenseCategory', required: true },
    categoryCode: { type: String, required: true },
    description: { type: String, maxlength: 2000 },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: CURRENCIES, default: 'UZS' },
    exchangeRate: { type: Number, default: 1 },
    amountUzs: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    paymentMethod: { type: String, enum: EXPENSE_PAYMENT_METHODS, default: 'cash' },
    responsible: String,
    attachments: {
      type: [{ _id: false, media: { type: Schema.Types.ObjectId, ref: 'Media' }, url: String, name: String, mime: String }],
      default: [],
    },
    status: { type: String, enum: EXPENSE_STATUSES, default: 'PAID' },
    notes: { type: String, maxlength: 2000 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdByName: String,
  },
  schemaOptions,
);
ExpenseSchema.index({ date: -1 });
ExpenseSchema.index({ categoryCode: 1, date: -1 });
ExpenseSchema.index({ status: 1, date: -1 });
export const Expense = model<IExpense>('Expense', ExpenseSchema);
