import {
  formatDate,
  formatNumber,
  formatPrice,
  formatRelative,
  formatUzPhone,
  type DateFormat,
} from '@vero/utils';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrefs } from './prefs';

/** Formatting bound to the current language (UZS amounts, Asia/Tashkent dates, +998 phones). */
export function useFormat() {
  const lang = usePrefs((s) => s.language);
  const { t } = useTranslation();
  const currency = t('common:currency');
  return useMemo(
    () => ({
      lang,
      currency,
      price: (amount: number) => formatPrice(amount, lang, currency),
      date: (value: string | number | Date | null | undefined, format: DateFormat = 'long') =>
        formatDate(value, lang, format),
      relative: (value: string | number | Date) => formatRelative(value, lang),
      phone: (value: string | null | undefined) => formatUzPhone(value),
      number: (value: number, fractionDigits = 0) => formatNumber(value, fractionDigits),
    }),
    [lang, currency],
  );
}

export type Formatter = ReturnType<typeof useFormat>;
