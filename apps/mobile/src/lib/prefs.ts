import { STORAGE_KEYS, THEMES, type Language, type ThemePreference } from '@vero/config';
import { isLanguage } from '@vero/i18n';
import { create } from 'zustand';
import { deviceLanguage, i18n } from './i18n';
import { kv, MOBILE_KEYS } from './storage';

interface PrefsState {
  hydrated: boolean;
  theme: ThemePreference;
  language: Language;
  /** the customer picked the language on this device (otherwise the device language is used) */
  languageChosen: boolean;
  /** the customer picked the theme on this device */
  themeChosen: boolean;
  setTheme: (theme: ThemePreference, options?: { explicit?: boolean }) => void;
  setLanguage: (language: Language, options?: { explicit?: boolean }) => void;
  hydrate: () => Promise<void>;
}

const THEME_CHOSEN = 'ot.themeChosen';

/** Per-device preferences (theme, language). Signed-in customers also keep them in the profile. */
export const usePrefs = create<PrefsState>((set, get) => ({
  hydrated: false,
  theme: 'system',
  language: deviceLanguage(),
  languageChosen: false,
  themeChosen: false,
  setTheme: (theme, options = {}) => {
    const explicit = options.explicit ?? true;
    set({ theme, themeChosen: get().themeChosen || explicit });
    void kv.set(STORAGE_KEYS.theme, theme);
    if (explicit) void kv.set(THEME_CHOSEN, '1');
  },
  setLanguage: (language, options = {}) => {
    const explicit = options.explicit ?? true;
    set({ language, languageChosen: get().languageChosen || explicit });
    if (i18n.language !== language) void i18n.changeLanguage(language);
    void kv.set(STORAGE_KEYS.language, language);
    if (explicit) void kv.set(MOBILE_KEYS.languageChosen, '1');
  },
  hydrate: async () => {
    const [theme, language, languageChosen, themeChosen] = await Promise.all([
      kv.get(STORAGE_KEYS.theme),
      kv.get(STORAGE_KEYS.language),
      kv.get(MOBILE_KEYS.languageChosen),
      kv.get(THEME_CHOSEN),
    ]);
    const nextTheme = (THEMES as readonly string[]).includes(theme ?? '')
      ? (theme as ThemePreference)
      : 'system';
    const nextLanguage = isLanguage(language) ? language : deviceLanguage();
    if (i18n.language !== nextLanguage) await i18n.changeLanguage(nextLanguage);
    set({
      hydrated: true,
      theme: nextTheme,
      language: nextLanguage,
      languageChosen: languageChosen === '1',
      themeChosen: themeChosen === '1',
    });
  },
}));
