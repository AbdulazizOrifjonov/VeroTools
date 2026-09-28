import type { DeliveryMethod, PaymentMethod } from '@vero/types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { readJson, WEB_KEYS, writeJson } from '../../lib/storage';

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
  step: number;
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

export const EMPTY_ADDRESS: CheckoutAddressDraft = { region: '', city: '', district: '', street: '', house: '', apartment: '', comment: '' };

const INITIAL: CheckoutDraft = {
  step: 0,
  customer: null,
  delivery: { method: 'courier', addressId: null, address: null, saveAddress: true, pickupPointId: null },
  payment: { method: null, installmentMonths: null },
  comment: '',
};

/** Checkout progress survives a reload (sessionStorage — per tab, cleared after the order). */
export function useCheckoutDraft() {
  const [draft, setDraft] = useState<CheckoutDraft>(() => {
    const stored = readJson<Partial<CheckoutDraft> | null>(WEB_KEYS.checkout, null, 'session');
    return stored ? { ...INITIAL, ...stored, delivery: { ...INITIAL.delivery, ...stored.delivery }, payment: { ...INITIAL.payment, ...stored.payment } } : INITIAL;
  });

  useEffect(() => {
    writeJson(WEB_KEYS.checkout, draft, 'session');
  }, [draft]);

  const update = useCallback((patch: Partial<CheckoutDraft> | ((d: CheckoutDraft) => Partial<CheckoutDraft>)) => {
    setDraft((d) => ({ ...d, ...(typeof patch === 'function' ? patch(d) : patch) }));
  }, []);

  const reset = useCallback(() => {
    writeJson(WEB_KEYS.checkout, undefined, 'session');
    setDraft(INITIAL);
  }, []);

  return { draft, update, reset };
}

/** 0 contact · 1 delivery · 2 payment · 3 review · 4 done (success page) */
export const CHECKOUT_STEPS = ['customer', 'delivery', 'payment', 'confirm', 'done'] as const;

export function useCheckoutStepLabels() {
  const { t } = useTranslation();
  return CHECKOUT_STEPS.map((id) => ({ id, label: id === 'done' ? t('checkout.stepDone') : t(`shop:checkout.steps.${id}`) }));
}
