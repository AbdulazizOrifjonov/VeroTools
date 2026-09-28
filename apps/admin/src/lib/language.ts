import { DEFAULT_LANGUAGE, LANGUAGES, type Language } from '@vero/config';
import { ADMIN_STORAGE, readString, writeString } from './storage';

/**
 * Admin UI language (uz · ru · en). Persisted per browser; also sent to the API as Accept-Language by the
 * client (report texts, region names and error messages come back in this language).
 */
export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

function initialLanguage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  const stored = readString(ADMIN_STORAGE.language);
  return isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
}

let current: Language = initialLanguage();
if (typeof document !== 'undefined') document.documentElement.lang = current;

export function getCurrentLanguage(): Language {
  return current;
}

export function setCurrentLanguage(lang: Language): void {
  current = lang;
  writeString(ADMIN_STORAGE.language, lang);
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}
