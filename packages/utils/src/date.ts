import type { Language } from '@vero/config';
import type { DatePreset } from '@vero/types';

const MONTHS: Record<Language, string[]> = {
  uz: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'],
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

const MONTHS_SHORT: Record<Language, string[]> = {
  uz: ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'],
  ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

const MONTHS_NOMINATIVE: Record<Language, string[]> = {
  uz: MONTHS.uz,
  ru: ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'],
  en: MONTHS.en,
};

/** Asia/Tashkent is UTC+05:00 all year (no DST). */
export const TASHKENT_OFFSET_MINUTES = 300;

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Shifts a date into "wall clock" of the business timezone (read with getUTC* methods). */
function wall(value: Date | string | number, offsetMinutes = TASHKENT_OFFSET_MINUTES): Date {
  return new Date(toDate(value).getTime() + offsetMinutes * 60_000);
}

const pad = (n: number) => String(n).padStart(2, '0');

export type DateFormat = 'short' | 'long' | 'datetime' | 'time' | 'monthYear' | 'dayMonth' | 'numeric';

/**
 * Formats a date in the store timezone without depending on Intl locale data
 * (Hermes/older Android lack Uzbek locale data).
 */
export function formatDate(
  value: Date | string | number | null | undefined,
  lang: Language = 'uz',
  format: DateFormat = 'long',
  offsetMinutes = TASHKENT_OFFSET_MINUTES,
): string {
  if (value == null || value === '') return '';
  const d = wall(value, offsetMinutes);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.getUTCDate();
  const m = d.getUTCMonth();
  const y = d.getUTCFullYear();
  const time = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  switch (format) {
    case 'numeric':
      return `${pad(day)}.${pad(m + 1)}.${y}`;
    case 'short':
      return lang === 'en' ? `${day} ${MONTHS_SHORT.en[m]} ${y}` : `${day} ${MONTHS_SHORT[lang][m]} ${y}`;
    case 'time':
      return time;
    case 'monthYear':
      return lang === 'uz' ? `${y}-yil ${MONTHS_NOMINATIVE.uz[m]}` : `${MONTHS_NOMINATIVE[lang][m]} ${y}`;
    case 'dayMonth':
      return lang === 'uz' ? `${day}-${MONTHS.uz[m]}` : lang === 'en' ? `${day} ${MONTHS.en[m]}` : `${day} ${MONTHS.ru[m]}`;
    case 'datetime':
      return `${formatDate(value, lang, 'long', offsetMinutes)}, ${time}`;
    case 'long':
    default:
      if (lang === 'uz') return `${y}-yil ${day}-${MONTHS.uz[m]}`;
      if (lang === 'ru') return `${day} ${MONTHS.ru[m]} ${y}`;
      return `${day} ${MONTHS.en[m]} ${y}`;
  }
}

const REL: Record<Language, { now: string; min: string; hour: string; day: string; ago: (v: string) => string }> = {
  uz: { now: 'hozirgina', min: 'daqiqa', hour: 'soat', day: 'kun', ago: (v) => `${v} oldin` },
  ru: { now: 'только что', min: 'мин', hour: 'ч', day: 'дн', ago: (v) => `${v} назад` },
  en: { now: 'just now', min: 'min', hour: 'h', day: 'd', ago: (v) => `${v} ago` },
};

/** "5 daqiqa oldin" / "5 мин назад" / "5 min ago"; older than 7 days → short date. */
export function formatRelative(value: Date | string | number, lang: Language = 'uz', now: Date = new Date()): string {
  const diff = Math.round((now.getTime() - toDate(value).getTime()) / 1000);
  const r = REL[lang];
  if (diff < 60) return r.now;
  if (diff < 3600) return r.ago(`${Math.floor(diff / 60)} ${r.min}`);
  if (diff < 86400) return r.ago(`${Math.floor(diff / 3600)} ${r.hour}`);
  if (diff < 7 * 86400) return r.ago(`${Math.floor(diff / 86400)} ${r.day}`);
  return formatDate(value, lang, 'short');
}

/** YYYY-MM-DD of a moment in the business timezone. */
export function businessDateKey(value: Date | string | number, offsetMinutes = TASHKENT_OFFSET_MINUTES): string {
  const d = wall(value, offsetMinutes);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Start of the business day (as a real UTC instant) containing `value`. */
export function startOfBusinessDay(value: Date | string | number, offsetMinutes = TASHKENT_OFFSET_MINUTES): Date {
  const d = wall(value, offsetMinutes);
  const startWall = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return new Date(startWall - offsetMinutes * 60_000);
}

export function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * 86_400_000);
}

/** Adds business days (skips Sundays) — used for delivery estimates. */
export function addWorkingDays(value: Date, days: number, offsetMinutes = TASHKENT_OFFSET_MINUTES): Date {
  let d = new Date(value.getTime());
  let added = 0;
  while (added < days) {
    d = addDays(d, 1);
    if (wall(d, offsetMinutes).getUTCDay() !== 0) added += 1;
  }
  return d;
}

export interface DateRange {
  from: Date;
  /** exclusive */
  to: Date;
}

/** Resolves an analytics date preset to [from, to) in the business timezone. */
export function resolveDatePreset(
  preset: DatePreset,
  now: Date = new Date(),
  custom?: { from?: string | Date; to?: string | Date },
  offsetMinutes = TASHKENT_OFFSET_MINUTES,
): DateRange {
  const today = startOfBusinessDay(now, offsetMinutes);
  const w = wall(now, offsetMinutes);
  const monthStart = new Date(Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), 1) - offsetMinutes * 60_000);
  switch (preset) {
    case 'today':
      return { from: today, to: addDays(today, 1) };
    case 'yesterday':
      return { from: addDays(today, -1), to: today };
    case 'last7':
      return { from: addDays(today, -6), to: addDays(today, 1) };
    case 'last30':
      return { from: addDays(today, -29), to: addDays(today, 1) };
    case 'thisMonth': {
      const next = new Date(Date.UTC(w.getUTCFullYear(), w.getUTCMonth() + 1, 1) - offsetMinutes * 60_000);
      return { from: monthStart, to: next };
    }
    case 'lastMonth': {
      const prev = new Date(Date.UTC(w.getUTCFullYear(), w.getUTCMonth() - 1, 1) - offsetMinutes * 60_000);
      return { from: prev, to: monthStart };
    }
    case 'thisYear': {
      const y0 = new Date(Date.UTC(w.getUTCFullYear(), 0, 1) - offsetMinutes * 60_000);
      const y1 = new Date(Date.UTC(w.getUTCFullYear() + 1, 0, 1) - offsetMinutes * 60_000);
      return { from: y0, to: y1 };
    }
    case 'custom':
    default: {
      const from = custom?.from ? startOfBusinessDay(custom.from, offsetMinutes) : addDays(today, -29);
      const toBase = custom?.to ? startOfBusinessDay(custom.to, offsetMinutes) : today;
      return { from, to: addDays(toBase, 1) };
    }
  }
}

/** Previous range of equal length (for trend comparison). */
export function previousRange(range: DateRange): DateRange {
  const len = range.to.getTime() - range.from.getTime();
  return { from: new Date(range.from.getTime() - len), to: new Date(range.from.getTime()) };
}
