import { z } from 'zod';
import {
  CONTACT_MESSAGE_TYPES,
  DELIVERY_METHODS,
  PAYMENT_METHODS,
} from '@vero/types';
import { LIMITS } from '@vero/config';
import {
  V,
  email,
  intRange,
  languageSchema,
  objectId,
  optionalEmail,
  optionalObjectId,
  optionalText,
  password,
  personName,
  phone,
  regionCode,
  text,
  themeSchema,
} from './common';

/* ------------------------------- Auth ------------------------------- */

export const registerSchema = z.object({
  firstName: personName,
  lastName: personName,
  phone,
  email: optionalEmail,
  password,
  acceptTerms: z.literal(true, { error: V.acceptTerms }),
});
export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterData = z.output<typeof registerSchema>;

/** `login` accepts a phone number (any common format) or an e-mail address. */
export const loginSchema = z.object({
  login: z.string(V.required).trim().min(3, V.required).max(120, V.tooLong),
  password: z.string(V.required).min(1, V.required).max(72, V.tooLong),
});
export type LoginInput = z.input<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  login: z.string(V.required).trim().min(3, V.required).max(120, V.tooLong),
});
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;

/** Either an e-mail reset token, or phone + SMS code. */
export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(20).max(200).optional(),
    phone: z.string().trim().optional(),
    code: z.string().trim().regex(/^\d{6}$/, V.code).optional(),
    password,
    passwordConfirm: z.string(V.required),
  })
  .refine((v) => v.password === v.passwordConfirm, { error: V.passwordMismatch, path: ['passwordConfirm'] })
  .refine((v) => !!v.token || (!!v.phone && !!v.code), { error: V.code, path: ['code'] });
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;

export const sendOtpSchema = z.object({
  phone,
  purpose: z.enum(['verify_phone', 'reset_password']).default('verify_phone'),
});

export const verifyOtpSchema = z.object({
  phone,
  code: z.string().trim().regex(/^\d{6}$/, V.code),
});
export type VerifyOtpInput = z.input<typeof verifyOtpSchema>;

export const verifyEmailSchema = z.object({ token: z.string().trim().min(20).max(200) });

export const refreshSchema = z.object({ refreshToken: z.string().min(20).max(2000).optional() });

/* ------------------------------ Profile ----------------------------- */

export const updateProfileSchema = z.object({
  firstName: personName,
  lastName: personName,
  email: optionalEmail,
});
export type UpdateProfileInput = z.input<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string(V.required).min(1, V.required),
    newPassword: password,
    newPasswordConfirm: z.string(V.required),
  })
  .refine((v) => v.newPassword === v.newPasswordConfirm, { error: V.passwordMismatch, path: ['newPasswordConfirm'] });
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;

export const preferencesSchema = z.object({
  language: languageSchema.optional(),
  theme: themeSchema.optional(),
  notifications: z
    .object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      sms: z.boolean().optional(),
      promotions: z.boolean().optional(),
      priceDrops: z.boolean().optional(),
      backInStock: z.boolean().optional(),
    })
    .optional(),
});
export type PreferencesInput = z.input<typeof preferencesSchema>;

export const pushTokenSchema = z.object({
  token: z.string().trim().min(10).max(300),
  platform: z.enum(['ios', 'android', 'web']),
});

/* ------------------------------ Address ----------------------------- */

export const addressSchema = z.object({
  label: optionalText(40),
  firstName: personName,
  lastName: personName,
  phone,
  region: regionCode,
  city: text(2, 80),
  district: optionalText(80),
  street: text(2, 160),
  house: text(1, 30),
  apartment: optionalText(20),
  comment: optionalText(300),
  location: z
    .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
    .optional(),
  isDefault: z.boolean().optional(),
});
export type AddressInput = z.input<typeof addressSchema>;
export type AddressData = z.output<typeof addressSchema>;

/* ------------------------ Cart / wishlist / compare ------------------ */

export const addToCartSchema = z.object({
  productId: objectId,
  variantId: optionalObjectId,
  quantity: intRange(1, LIMITS.cartMaxLineQuantity).default(1),
});
export type AddToCartInput = z.input<typeof addToCartSchema>;

export const updateCartItemSchema = z.object({
  quantity: intRange(0, LIMITS.cartMaxLineQuantity),
});

export const applyCouponSchema = z.object({
  code: z
    .string(V.required)
    .trim()
    .toUpperCase()
    .min(3, V.code)
    .max(40, V.code)
    .regex(/^[A-Z0-9_-]+$/, V.code),
});
export type ApplyCouponInput = z.input<typeof applyCouponSchema>;

export const productRefSchema = z.object({ productId: objectId });

export const mergeGuestSchema = z.object({ guestId: z.string().uuid() });

/* ------------------------------ Checkout ---------------------------- */

export const checkoutCustomerSchema = z.object({
  firstName: personName,
  lastName: personName,
  phone,
  email: optionalEmail,
});
export type CheckoutCustomerInput = z.input<typeof checkoutCustomerSchema>;

export const checkoutAddressSchema = addressSchema.omit({ isDefault: true, label: true, firstName: true, lastName: true, phone: true });
export type CheckoutAddressInput = z.input<typeof checkoutAddressSchema>;

export const checkoutDeliverySchema = z
  .object({
    method: z.enum(DELIVERY_METHODS),
    addressId: optionalObjectId,
    address: checkoutAddressSchema.optional(),
    saveAddress: z.boolean().optional(),
    pickupPointId: optionalObjectId,
  })
  .superRefine((v, ctx) => {
    if (v.method === 'courier' && !v.addressId && !v.address) {
      ctx.addIssue({ code: 'custom', message: V.addressRequired, path: ['address'] });
    }
    if (v.method === 'pickup' && !v.pickupPointId) {
      ctx.addIssue({ code: 'custom', message: V.pickupRequired, path: ['pickupPointId'] });
    }
  });
export type CheckoutDeliveryInput = z.input<typeof checkoutDeliverySchema>;

export const checkoutPaymentSchema = z
  .object({
    method: z.enum(PAYMENT_METHODS),
    installmentMonths: z.coerce.number().int().min(1).max(36).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.method === 'installment' && !v.installmentMonths) {
      ctx.addIssue({ code: 'custom', message: V.installmentMonths, path: ['installmentMonths'] });
    }
  });
export type CheckoutPaymentInput = z.input<typeof checkoutPaymentSchema>;

export const checkoutSchema = z.object({
  customer: checkoutCustomerSchema,
  delivery: checkoutDeliverySchema,
  payment: checkoutPaymentSchema,
  couponCode: z.string().trim().toUpperCase().max(40).optional(),
  comment: optionalText(500),
});
export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutData = z.output<typeof checkoutSchema>;

/** Quote request (totals preview while the customer is on the checkout steps). */
export const checkoutQuoteSchema = z.object({
  delivery: z
    .object({
      method: z.enum(DELIVERY_METHODS),
      region: regionCode.optional(),
      addressId: optionalObjectId,
      pickupPointId: optionalObjectId,
    })
    .optional(),
  payment: z
    .object({ method: z.enum(PAYMENT_METHODS), installmentMonths: z.coerce.number().int().min(1).max(36).optional() })
    .optional(),
  couponCode: z.string().trim().toUpperCase().max(40).optional(),
});
export type CheckoutQuoteInput = z.input<typeof checkoutQuoteSchema>;

export const cancelOrderSchema = z.object({ reason: optionalText(300) });

/* --------------------------- Reviews & Q&A --------------------------- */

export const createReviewSchema = z.object({
  productId: objectId,
  rating: intRange(1, 5),
  title: optionalText(120),
  comment: text(10, 2000),
  pros: optionalText(500),
  cons: optionalText(500),
  images: z.array(objectId).max(LIMITS.reviewImagesMax).optional(),
});
export type CreateReviewInput = z.input<typeof createReviewSchema>;

export const createQuestionSchema = z.object({
  productId: objectId,
  question: text(10, 1000),
});
export type CreateQuestionInput = z.input<typeof createQuestionSchema>;

/* ------------------------------ Contact ----------------------------- */

export const contactMessageSchema = z.object({
  type: z.enum(CONTACT_MESSAGE_TYPES).default('contact'),
  name: personName,
  phone,
  email: optionalEmail,
  subject: optionalText(150),
  message: optionalText(3000),
  productId: optionalObjectId,
});
export type ContactMessageFormInput = z.input<typeof contactMessageSchema>;

export { email as emailSchema, phone as phoneSchema, password as passwordSchema };
