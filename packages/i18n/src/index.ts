import i18next, { type i18n as I18nInstance, type InitOptions, type Module, type TFunction } from 'i18next';
import { DEFAULT_LANGUAGE, LANGUAGES, type Language } from '@vero/config';

import uzCommon from '../locales/uz/common.json';
import uzShop from '../locales/uz/shop.json';
import uzValidation from '../locales/uz/validation.json';
import uzErrors from '../locales/uz/errors.json';
import ruCommon from '../locales/ru/common.json';
import ruShop from '../locales/ru/shop.json';
import ruValidation from '../locales/ru/validation.json';
import ruErrors from '../locales/ru/errors.json';
import enCommon from '../locales/en/common.json';
import enShop from '../locales/en/shop.json';
import enValidation from '../locales/en/validation.json';
import enErrors from '../locales/en/errors.json';

export type ResourceTree = { [key: string]: string | ResourceTree };
export type LanguageResources = Record<string, ResourceTree>;
export type Resources = Record<Language, LanguageResources>;

export const SHARED_NAMESPACES = ['common', 'shop', 'validation', 'errors'] as const;
export type SharedNamespace = (typeof SHARED_NAMESPACES)[number];

export const sharedResources: Resources = {
  uz: { common: uzCommon, shop: uzShop, validation: uzValidation, errors: uzErrors },
  ru: { common: ruCommon, shop: ruShop, validation: ruValidation, errors: ruErrors },
  en: { common: enCommon, shop: enShop, validation: enValidation, errors: enErrors },
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

/** Normalises "ru-RU", "uz-Latn-UZ", "en_US" … to a supported language (fallback: uz). */
export function resolveLanguage(value: string | null | undefined): Language {
  if (!value) return DEFAULT_LANGUAGE;
  const base = value.toLowerCase().split(/[-_]/)[0];
  return isLanguage(base) ? base : DEFAULT_LANGUAGE;
}

export interface CreateI18nOptions {
  lng?: Language;
  /** extra namespaces for the app, e.g. { uz: { web: {...} }, ru: {...}, en: {...} } */
  resources?: Partial<Resources>;
  defaultNS?: string;
  plugins?: Module[];
  init?: Partial<InitOptions>;
}

/** Creates an isolated, synchronously-initialised i18next instance with shared + app resources. */
export function createI18n(options: CreateI18nOptions = {}): I18nInstance {
  const instance = i18next.createInstance();
  for (const p of options.plugins ?? []) instance.use(p);
  const resources: Resources = { uz: { ...sharedResources.uz }, ru: { ...sharedResources.ru }, en: { ...sharedResources.en } };
  for (const lng of LANGUAGES) Object.assign(resources[lng], options.resources?.[lng] ?? {});
  const namespaces = Array.from(new Set(Object.keys(resources.uz)));
  void instance.init({
    lng: options.lng ?? DEFAULT_LANGUAGE,
    fallbackLng: [DEFAULT_LANGUAGE, 'ru', 'en'],
    supportedLngs: [...LANGUAGES],
    ns: namespaces,
    defaultNS: options.defaultNS ?? 'common',
    fallbackNS: ['common', 'shop'],
    resources,
    interpolation: { escapeValue: false },
    returnNull: false,
    initAsync: false,
    react: { useSuspense: false },
    ...options.init,
  } as InitOptions);
  return instance;
}

/** Flattens nested resources into dotted keys: { a: { b: 'x' } } → { 'a.b': 'x' } */
export function flattenResources(tree: ResourceTree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out[key] = v;
    else Object.assign(out, flattenResources(v, key));
  }
  return out;
}

export function unflattenResources(flat: Record<string, string>): ResourceTree {
  const root: ResourceTree = {};
  for (const [dotted, value] of Object.entries(flat)) {
    const parts = dotted.split('.');
    let node: ResourceTree = root;
    for (const p of parts.slice(0, -1)) {
      const next = node[p];
      if (typeof next !== 'object') node[p] = {};
      node = node[p] as ResourceTree;
    }
    node[parts[parts.length - 1]!] = value;
  }
  return root;
}

/**
 * Applies translation overrides edited in the admin panel (GET /api/translations?lng=).
 * `resources` = namespace → flat key → value.
 */
export function applyTranslationOverrides(
  instance: I18nInstance,
  lng: Language,
  resources: Record<string, Record<string, string>>,
): void {
  for (const [ns, flat] of Object.entries(resources)) {
    if (!flat || !Object.keys(flat).length) continue;
    instance.addResourceBundle(lng, ns, unflattenResources(flat), true, true);
  }
}

export interface ApiErrorLike {
  code?: string;
  message?: string;
  details?: unknown;
}

/** Translates an API error code (errors namespace), falling back to the server message. */
export function translateError(t: TFunction, error: ApiErrorLike | null | undefined, params?: Record<string, unknown>): string {
  if (!error) return String(t('errors:UNKNOWN'));
  const code = error.code ?? 'UNKNOWN';
  const key = `errors:${code}`;
  const translated = String(t(key, { ...(params ?? {}), defaultValue: '' }));
  if (translated) return translated;
  return error.message || String(t('errors:UNKNOWN'));
}

/**
 * Translates a field message key from zod (client) or the API (server field errors):
 * "validation.phone" → t('validation:phone'), "errors.PHONE_TAKEN" → t('errors:PHONE_TAKEN').
 */
export function translateValidation(t: TFunction, message: string | undefined): string | undefined {
  if (!message) return undefined;
  if (message.startsWith('validation.')) return String(t(`validation:${message.slice('validation.'.length)}`));
  if (message.startsWith('errors.')) return String(t(`errors:${message.slice('errors.'.length)}`));
  return message;
}

export { LANGUAGES, DEFAULT_LANGUAGE };
export type { Language };
