import { useQuery } from '@tanstack/react-query';
import { useApi, useSession } from '@vero/api-client';
import type { Language } from '@vero/config';
import { Button, EmptyState, Logo } from '@vero/ui';
import { LogOutIcon, ShieldXIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, ScrollRestoration, useLocation } from 'react-router';
import { applyOverrides } from '../lib/i18n';
import { BootScreen } from './BootScreen';

/** Texts edited on the Translations screen, applied on top of the bundled ones for the current language. */
function TranslationOverrides() {
  const api = useApi();
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? i18n.language) as Language;
  const { data } = useQuery({
    queryKey: ['translations', lang],
    queryFn: () => api.catalog.translations(lang),
    staleTime: 10 * 60_000,
    retry: 1,
  });
  useEffect(() => {
    if (data?.resources) applyOverrides(lang, data.resources, data.updatedAt ?? '');
  }, [data, lang]);
  return null;
}

/** Waits for the session bootstrap (refresh cookie → access token) before rendering any route. */
export function RootLayout() {
  const session = useSession();
  return (
    <>
      <TranslationOverrides />
      {session.isReady ? <Outlet /> : <BootScreen />}
      <ScrollRestoration />
    </>
  );
}

/** Everything except /login needs a signed-in staff account. */
export function RequireStaff() {
  const { t } = useTranslation();
  const api = useApi();
  const session = useSession();
  const location = useLocation();

  if (!session.isAuthenticated) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={next && next !== '/' ? `/login?next=${encodeURIComponent(next)}` : '/login'} replace />;
  }
  if (!session.isStaff) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
        <Logo size={56} />
        <EmptyState
          titleAs="h1"
          icon={<ShieldXIcon />}
          title={t('errorPage.forbiddenTitle')}
          description={t('auth.notStaff')}
          action={
            <Button variant="outline" leftIcon={<LogOutIcon />} onClick={() => void api.auth.logout()}>
              {t('shell.logout')}
            </Button>
          }
        />
      </div>
    );
  }
  return <Outlet />;
}
