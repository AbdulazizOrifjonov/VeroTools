import { DEFAULT_LANGUAGE, LANGUAGES, localizedPath, parseLocalizedPath, STORAGE_KEYS, type Language } from '@vero/config';
import { readString, writeString } from './storage';

/**
 * The storefront language is part of the URL (uz — no prefix, /ru/…, /en/…). This module keeps the
 * current value for code that runs outside React (API client headers, toasts) and the persisted choice.
 */
export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

export function getStoredLanguage(): Language | null {
  const value = readString(STORAGE_KEYS.language);
  return isLanguage(value) ? value : null;
}

/** Persists an explicit choice (language switcher, account settings). */
export function storeLanguage(lang: Language): void {
  writeString(STORAGE_KEYS.language, lang);
}

/**
 * First load of an unprefixed (Uzbek) URL by a visitor who explicitly chose Russian / English before:
 * open the same page in the chosen language. Runs before the router is created, so nothing flashes.
 * Explicitly prefixed URLs (/ru/…, /en/…) are always respected.
 */
function applyStoredLanguage(): void {
  if (typeof window === 'undefined') return;
  const { pathname, search, hash } = window.location;
  if (/^\/(uz|ru|en)(\/|$)/.test(pathname)) return;
  const stored = getStoredLanguage();
  if (!stored || stored === DEFAULT_LANGUAGE) return;
  const { path } = parseLocalizedPath(pathname);
  window.history.replaceState(window.history.state, '', `${localizedPath(stored, path)}${search}${hash}`);
}

applyStoredLanguage();

let current: Language = typeof window === 'undefined' ? DEFAULT_LANGUAGE : parseLocalizedPath(window.location.pathname).lang;

export function getCurrentLanguage(): Language {
  return current;
}

export function setCurrentLanguage(lang: Language): void {
  current = lang;
}
