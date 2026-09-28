import { UZ_PHONE_REGEX } from '@vero/config';

/**
 * Normalises any user input to "+998XXXXXXXXX".
 * Accepts "+998 90 123-45-67", "998901234567", "901234567", "8 90 123 45 67".
 * Returns null when the input cannot be a valid Uzbek number.
 */
export function normalizeUzPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let digits = String(input).replace(/\D/g, '');
  if (digits.length === 9) digits = `998${digits}`;
  else if (digits.length === 10 && digits.startsWith('8')) digits = `998${digits.slice(1)}`;
  if (digits.length !== 12 || !digits.startsWith('998')) return null;
  const phone = `+${digits}`;
  return UZ_PHONE_REGEX.test(phone) ? phone : null;
}

export function isValidUzPhone(input: string | null | undefined): boolean {
  return normalizeUzPhone(input) !== null;
}

/** "+998901234567" → "+998 90 123 45 67" */
export function formatUzPhone(input: string | null | undefined): string {
  const p = normalizeUzPhone(input);
  if (!p) return input ?? '';
  const d = p.slice(4);
  return `+998 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`;
}

/** "+998901234567" → "+998 90 *** ** 67" */
export function maskUzPhone(input: string | null | undefined): string {
  const p = normalizeUzPhone(input);
  if (!p) return '';
  const d = p.slice(4);
  return `+998 ${d.slice(0, 2)} *** ** ${d.slice(7, 9)}`;
}

export function isEmail(input: string | null | undefined): boolean {
  return !!input && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.trim());
}
