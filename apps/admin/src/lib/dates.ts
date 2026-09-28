import { BUSINESS_TIMEZONE } from '@vero/config';
import { TASHKENT_OFFSET_MINUTES } from '@vero/utils';

/**
 * The store works in Asia/Tashkent (UTC+05:00, no DST) whatever the timezone of the operator's browser.
 * `<input type="datetime-local">` / `type="date"` values are therefore converted explicitly instead of
 * relying on the browser's local time.
 */
const OFFSET_MS = TASHKENT_OFFSET_MINUTES * 60_000;
const pad = (n: number) => String(n).padStart(2, '0');

export const STORE_TIMEZONE = BUSINESS_TIMEZONE;

/** ISO instant → "YYYY-MM-DDTHH:mm" wall clock in Tashkent ('' for empty). */
export function isoToLocalInput(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() + OFFSET_MS);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** "YYYY-MM-DDTHH:mm" in Tashkent → ISO instant ('' when invalid / empty). */
export function localInputToIso(value: string | null | undefined): string {
  if (!value) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(value);
  if (!m) return '';
  const [, y, mo, d, h = '00', mi = '00'] = m;
  const utc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi)) - OFFSET_MS;
  return new Date(utc).toISOString();
}

/** ISO instant → "YYYY-MM-DD" (calendar date in Tashkent). */
export function isoToDateInput(iso: string | Date | null | undefined): string {
  return isoToLocalInput(iso).slice(0, 10);
}

/** "YYYY-MM-DD" → ISO instant at 00:00 Tashkent. */
export function dateInputToIso(value: string | null | undefined): string {
  return value ? localInputToIso(`${value}T00:00`) : '';
}

/** Today in Tashkent as "YYYY-MM-DD". */
export function todayInput(): string {
  return isoToDateInput(new Date());
}

/** A calendar Date (picker) → "YYYY-MM-DD" using the date's own components (pickers work in local time). */
export function calendarDateToInput(date: Date | undefined): string {
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "YYYY-MM-DD" → local Date for calendar pickers. */
export function inputToCalendarDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Exclusive upper bound for a list filter "to" date: next Tashkent midnight after the given day. */
export function endOfDayExclusiveIso(value: string): string {
  const start = dateInputToIso(value);
  return start ? new Date(new Date(start).getTime() + 86_400_000).toISOString() : '';
}
