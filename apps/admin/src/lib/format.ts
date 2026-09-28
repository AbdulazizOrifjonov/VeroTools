import type { Language, LocalizedText } from '@vero/config';
import { formatDate, formatNumber, formatPrice, formatRelative, formatUzPhone, pickLocalized, type DateFormat } from '@vero/utils';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export interface Formatters {
  lang: Language;
  /** 1250000 → "1 250 000 so'm" */
  money: (value: number | null | undefined) => string;
  /** 1250000 → "1 250 000" */
  amount: (value: number | null | undefined) => string;
  number: (value: number | null | undefined, fractionDigits?: number) => string;
  /** 1 250 000 → "1.3M" (chart axes) */
  compact: (value: number | null | undefined) => string;
  /** 13.4 → "13,4%" (uz/ru) / "13.4%" (en) */
  percent: (value: number | null | undefined, fractionDigits?: number) => string;
  /** signed change "+12.5%" / "−3%" */
  delta: (value: number | null | undefined) => string;
  date: (value: string | Date | null | undefined, format?: DateFormat) => string;
  datetime: (value: string | Date | null | undefined) => string;
  relative: (value: string | Date | null | undefined) => string;
  /** LocalizedText → string in the UI language (graceful fallback) */
  loc: (value: Partial<LocalizedText> | string | null | undefined) => string;
  phone: (value: string | null | undefined) => string;
  currency: string;
}

const COMPACT_UNITS: Record<Language, [string, string, string]> = { uz: ['ming', 'mln', 'mlrd'], ru: ['тыс.', 'млн', 'млрд'], en: ['K', 'M', 'B'] };

/** 18 000 000 → "18 mln" / "18 млн" / "18M"; 4 500 000 → "4,5 mln" (chart axes, compact tiles). */
function compactNumber(value: number, lang: Language): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  const [k, m, b] = COMPACT_UNITS[lang];
  const sep = lang === 'en' ? '' : '\u00a0';
  const fmt = (n: number, digits: number) => {
    const text = n.toFixed(digits).replace(/\.0$/, '');
    return lang === 'en' ? text : text.replace('.', ',');
  };
  // one decimal below 100 (13,5 mln stays 13,5 — axis ticks must not round to a wrong value)
  if (abs >= 1_000_000_000) return `${sign}${fmt(abs / 1_000_000_000, abs >= 100_000_000_000 ? 0 : 1)}${sep}${b}`;
  if (abs >= 1_000_000) return `${sign}${fmt(abs / 1_000_000, abs >= 100_000_000 ? 0 : 1)}${sep}${m}`;
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)}${sep}${k}`;
  return `${sign}${Math.round(abs)}`;
}

function decimal(value: number, digits: number, lang: Language): string {
  const text = formatNumber(value, digits);
  return lang === 'en' ? text.replace(',', '.') : text;
}

export function createFormatters(lang: Language, currency: string): Formatters {
  return {
    lang,
    currency,
    money: (v) => formatPrice(Math.round(v ?? 0), lang, currency),
    amount: (v) => formatNumber(Math.round(v ?? 0)),
    number: (v, digits = 0) => (v == null ? '—' : decimal(v, digits, lang)),
    compact: (v) => compactNumber(v ?? 0, lang),
    percent: (v, digits = 1) => {
      if (v == null || !Number.isFinite(v)) return '—';
      const rounded = Math.round(v * 10 ** digits) / 10 ** digits;
      return `${decimal(rounded, Number.isInteger(rounded) ? 0 : digits, lang)}%`;
    },
    delta: (v) => {
      if (v == null || !Number.isFinite(v)) return '—';
      const rounded = Math.round(v * 10) / 10;
      const abs = decimal(Math.abs(rounded), Number.isInteger(rounded) ? 0 : 1, lang);
      return rounded > 0 ? `+${abs}%` : rounded < 0 ? `−${abs}%` : '0%';
    },
    date: (v, format = 'short') => (v ? formatDate(v, lang, format) : '—'),
    datetime: (v) => (v ? `${formatDate(v, lang, 'short')}, ${formatDate(v, lang, 'time')}` : '—'),
    relative: (v) => (v ? formatRelative(v, lang) : '—'),
    loc: (v) => pickLocalized(v, lang),
    phone: (v) => (v ? formatUzPhone(v) : '—'),
  };
}

/** Formatting helpers bound to the current UI language. */
export function useFormat(): Formatters {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? i18n.language) as Language;
  const currency = t('common:currency');
  return useMemo(() => createFormatters(lang, currency), [lang, currency]);
}
