import { applyTranslationOverrides, createI18n, translateError, translateValidation, type Language } from '@vero/i18n';
import enWeb from '@vero/i18n/locales/en/web.json';
import ruWeb from '@vero/i18n/locales/ru/web.json';
import uzWeb from '@vero/i18n/locales/uz/web.json';
import type { TFunction } from 'i18next';
import { getCurrentLanguage } from './language';

/**
 * Storefront i18n instance: shared namespaces (common, shop, validation, errors) + the app namespace `web`.
 * Missing keys fall back to common → shop (see createI18n), missing languages to uz.
 */
export const i18n = createI18n({
  lng: getCurrentLanguage(),
  resources: { uz: { web: uzWeb }, ru: { web: ruWeb }, en: { web: enWeb } },
  defaultNS: 'web',
  // re-render when admin overrides (GET /api/translations) are added to the store
  init: { react: { useSuspense: false, bindI18nStore: 'added' } },
});

const applied = new Set<string>();

/** Applies admin-edited texts once per language and revision. */
export function applyOverrides(lng: Language, resources: Record<string, Record<string, string>>, revision = ''): void {
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
