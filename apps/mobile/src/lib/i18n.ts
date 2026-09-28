import {
  applyTranslationOverrides,
  createI18n,
  resolveLanguage,
  translateError,
  translateValidation,
  type Language,
} from '@vero/i18n';
import enMobile from '@vero/i18n/locales/en/mobile.json';
import ruMobile from '@vero/i18n/locales/ru/mobile.json';
import uzMobile from '@vero/i18n/locales/uz/mobile.json';
import { getLocales } from 'expo-localization';
import type { TFunction } from 'i18next';

/** Language of the device (expo-localization) mapped to uz / ru / en (fallback uz). */
export function deviceLanguage(): Language {
  try {
    const locales = getLocales();
    for (const l of locales) {
      const code = (l.languageCode ?? l.languageTag ?? '').toLowerCase();
      if (code.startsWith('uz') || code.startsWith('ru') || code.startsWith('en'))
        return resolveLanguage(code);
    }
  } catch {
    /* ignore */
  }
  return 'uz';
}

/**
 * App i18n instance: shared namespaces (common, shop, validation, errors) + the app namespace `mobile`.
 * Missing keys fall back to common → shop, missing languages to uz.
 */
export const i18n = createI18n({
  lng: deviceLanguage(),
  resources: { uz: { mobile: uzMobile }, ru: { mobile: ruMobile }, en: { mobile: enMobile } },
  defaultNS: 'mobile',
  // re-render when admin overrides (GET /api/translations) are added to the store
  init: { react: { useSuspense: false, bindI18nStore: 'added' } },
});

export function currentLanguage(): Language {
  return resolveLanguage(i18n.language);
}

const applied = new Set<string>();

/** Applies admin-edited texts (GET /api/translations?lng=) once per language and revision. */
export function applyOverrides(
  lng: Language,
  resources: Record<string, Record<string, string>>,
  revision = '',
): void {
  const key = `${lng}:${revision}`;
  if (applied.has(key)) return;
  applied.add(key);
  applyTranslationOverrides(i18n, lng, resources);
}

/** Error text for any thrown value (ApiError, network error, unknown). */
export function errorMessage(t: TFunction, error: unknown, params?: Record<string, unknown>): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return translateError(t, error as { code?: string; message?: string }, params);
  }
  return String(t('errors:UNKNOWN'));
}

export { translateValidation };
