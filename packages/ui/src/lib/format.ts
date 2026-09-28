/**
 * U+00A0 NO-BREAK SPACE. In Manrope it is 0.2em wide (a typographic thin space), so it is the default
 * digit-group separator ("1 250 000") and joins the amount with the currency label.
 * It is also what ICU / Intl.NumberFormat emits for the uz and ru locales.
 */
export const NBSP = '\u00A0';
/**
 * U+202F NARROW NO-BREAK SPACE. Manrope has no glyph for it, so browsers draw it with a fallback font
 * (≈0.1em on Linux / Android — almost invisible at small sizes). Only pass it to formatAmount() on purpose.
 */
export const THIN_NBSP = '\u202F';
/** U+2212 MINUS SIGN — typographic minus for negative amounts and discounts ("−15%"). */
export const MINUS = '\u2212';

/**
 * Formats an integer amount with thin non-breaking group separators: 1250000 → "1 250 000".
 * Non-integers are rounded (UZS has no minor units in retail). Returns '' for non-finite input.
 */
export function formatAmount(amount: number, groupSeparator: string = NBSP): string {
  if (!Number.isFinite(amount)) return '';
  const rounded = Math.round(Math.abs(amount));
  const grouped = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator);
  return amount < 0 && rounded !== 0 ? `${MINUS}${grouped}` : grouped;
}

/** "1 250 000 so'm" — amount + non-breaking space + currency label (the label comes from i18n). */
export function formatPrice(amount: number, currencyLabel?: string): string {
  const formatted = formatAmount(amount);
  return currencyLabel ? `${formatted}${NBSP}${currencyLabel}` : formatted;
}

/** Whole-number discount percentage (15 for 1 250 000 vs 1 470 000), or 0 when there is no discount. */
export function getDiscountPercent(amount: number, oldAmount?: number | null): number {
  if (oldAmount == null || !Number.isFinite(oldAmount) || oldAmount <= 0 || amount >= oldAmount) return 0;
  return Math.round((1 - amount / oldAmount) * 100);
}

/** "−15%" label for sale badges (typographic minus). */
export function formatDiscount(percent: number): string {
  return percent > 0 ? `${MINUS}${percent}%` : '';
}
