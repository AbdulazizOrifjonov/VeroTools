import type { Language } from '@vero/config';
import type { InstallmentPlan } from '@vero/types';

/** Group separator: U+00A0 (Manrope renders it as a proper thin space). */
export const GROUP_SEPARATOR = ' ';

export const CURRENCY_LABELS: Record<Language, string> = {
  uz: "so'm",
  ru: 'сум',
  en: 'UZS',
};

/** 1250000 → "1 250 000" */
export function formatNumber(value: number, fractionDigits = 0): string {
  if (!Number.isFinite(value)) return '0';
  const negative = value < 0;
  const fixed = Math.abs(value).toFixed(fractionDigits);
  const [int, frac] = fixed.split('.');
  const grouped = (int ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEPARATOR);
  return `${negative ? '−' : ''}${grouped}${frac ? `,${frac}` : ''}`;
}

/** 1250000 → "1 250 000 so'm" (label defaults to the language's currency label). */
export function formatPrice(amount: number, lang: Language = 'uz', currencyLabel?: string): string {
  return `${formatNumber(Math.round(amount))}${GROUP_SEPARATOR}${currencyLabel ?? CURRENCY_LABELS[lang]}`;
}

/** Compact money for charts: 1 250 000 → "1.25M", 950 000 → "950K". */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 0 : 1)}B`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)}K`;
  return `${sign}${Math.round(abs)}`;
}

export function discountPercent(price: number, oldPrice?: number | null): number {
  if (!oldPrice || oldPrice <= price || oldPrice <= 0) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

/** Round up to the nearest step (default 1 000 so'm) — used for monthly installment amounts. */
export function roundUpTo(value: number, step = 1000): number {
  return Math.ceil(value / step) * step;
}

export function roundTo(value: number, step = 1): number {
  return Math.round(value / step) * step;
}

export interface InstallmentCalc {
  months: number;
  markupPercent: number;
  total: number;
  monthlyPayment: number;
}

export function calcInstallment(price: number, plan: InstallmentPlan): InstallmentCalc {
  const total = Math.round(price * (1 + plan.markupPercent / 100));
  return {
    months: plan.months,
    markupPercent: plan.markupPercent,
    total,
    monthlyPayment: roundUpTo(total / plan.months, 1000),
  };
}

/** The plan with the lowest monthly payment ("from X so'm / month"). */
export function cheapestInstallment(
  price: number,
  plans: readonly InstallmentPlan[] | undefined,
  minAmount = 0,
): InstallmentCalc | null {
  if (!plans?.length || price < minAmount) return null;
  let best: InstallmentCalc | null = null;
  for (const p of plans) {
    const c = calcInstallment(price, p);
    if (!best || c.monthlyPayment < best.monthlyPayment) best = c;
  }
  return best;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function percentChange(current: number, previous: number): number | null {
  if (!previous) return current ? null : 0;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}
