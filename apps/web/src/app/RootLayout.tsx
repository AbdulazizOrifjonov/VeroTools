import { ApiProvider } from '@vero/api-client';
import { parseLocalizedPath } from '@vero/config';
import { useLayoutEffect } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { api } from '../lib/api';
import { i18n } from '../lib/i18n';
import { setCurrentLanguage } from '../lib/language';
import { AppEffects } from './AppEffects';

/**
 * Root route: derives the language from the URL prefix and provides it to the API layer (query keys,
 * Accept-Language) and i18next. Everything below renders in that language.
 */
export function RootLayout() {
  const location = useLocation();
  const { lang } = parseLocalizedPath(location.pathname);
  // module-level value read by the API client for Accept-Language (no side effects on React state)
  setCurrentLanguage(lang);

  useLayoutEffect(() => {
    if (i18n.language !== lang) void i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <ApiProvider api={api} language={lang}>
      <AppEffects lang={lang} />
      <Outlet />
      <ScrollRestoration />
    </ApiProvider>
  );
}
