import type { DeliveryMethod, PaymentMethod } from '@vero/types';
import type { CheckoutInput } from '@vero/validation';

export interface CheckoutAddressDraft {
  region: string;
  city: string;
  district: string;
  street: string;
  house: string;
  apartment: string;
  comment: string;
}

export interface CheckoutDraft {
  customer: { firstName: string; lastName: string; phone: string; email: string } | null;
  delivery: {
    method: DeliveryMethod;
    /** saved address id, or "new" for the inline form */
    addressId: string | null;
    address: CheckoutAddressDraft | null;
    saveAddress: boolean;
    pickupPointId: string | null;
  };
  payment: { method: PaymentMethod | null; installmentMonths: number | null };
  comment: string;
}

export const EMPTY_ADDRESS: CheckoutAddressDraft = {
  region: '',
  city: '',
  district: '',
  street: '',
  house: '',
  apartment: '',
  comment: '',
};

export const INITIAL_DRAFT: CheckoutDraft = {
  customer: null,
  delivery: { method: 'courier', addressId: null, address: null, saveAddress: true, pickupPointId: null },
  payment: { method: null, installmentMonths: null },
  comment: '',
};

/** 0 contact · 1 delivery · 2 payment · 3 review */
export const CHECKOUT_STEPS = ['customer', 'delivery', 'payment', 'confirm'] as const;

export type DraftUpdate = (
  patch: Partial<CheckoutDraft> | ((d: CheckoutDraft) => Partial<CheckoutDraft>),
) => void;

const trimOrUndefined = (v: string | undefined | null) => (v && v.trim() ? v.trim() : undefined);

export function buildOrderInput(draft: CheckoutDraft, usingNewAddress: boolean): CheckoutInput {
  const d = draft.delivery;
  const a = d.address ?? EMPTY_ADDRESS;
  const delivery: CheckoutInput['delivery'] =
    d.method === 'pickup'
      ? { method: 'pickup', pickupPointId: d.pickupPointId ?? undefined }
      : usingNewAddress
        ? {
            method: 'courier',
            address: {
              region: a.region,
              city: a.city,
              street: a.street,
              house: a.house,
              district: trimOrUndefined(a.district),
              apartment: trimOrUndefined(a.apartment),
              comment: trimOrUndefined(a.comment),
            },
            saveAddress: d.saveAddress,
          }
        : { method: 'courier', addressId: d.addressId ?? undefined };
  const c = draft.customer ?? { firstName: '', lastName: '', phone: '', email: '' };
  return {
    customer: {
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      email: trimOrUndefined(c.email),
    },
    delivery,
    payment: {
      method: draft.payment.method ?? 'cash',
      installmentMonths:
        draft.payment.method === 'installment' ? (draft.payment.installmentMonths ?? undefined) : undefined,
    },
    comment: trimOrUndefined(draft.comment),
  };
}

/** Maps an API / schema field path to the checkout step that owns it. */
export function stepOfPath(path: string): number {
  if (path.startsWith('customer')) return 0;
  if (path.startsWith('delivery')) return 1;
  if (path.startsWith('payment')) return 2;
  return 3;
}
