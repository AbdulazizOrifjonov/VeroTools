import { parseLocalizedPath } from '@vero/config';
import { useSession } from '@vero/api-client';
import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation } from 'react-router';
import { PageSkeleton } from '../components/common/states';
import { BottomTabBar } from '../components/layout/BottomTabBar';
import { Footer } from '../components/layout/Footer';
import { Header, TopBar } from '../components/layout/Header';
import { useLocalePath } from '../hooks/use-lang';
import { withQuery } from '../lib/paths';

/** Storefront chrome for one language branch (uz — no prefix, /ru, /en). */
export function LangLayout() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-dvh flex-col pb-bottom-bar lg:pb-0">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
      >
        {t('common:a11y.skipToContent')}
      </a>
      <TopBar />
      <Header />
      <main id="main" tabIndex={-1} className="flex min-w-0 flex-1 flex-col outline-hidden">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <BottomTabBar />
    </div>
  );
}

/** Account, checkout: signed-in customers only (guests go to /login?next=…). */
export function RequireAuth() {
  const session = useSession();
  const location = useLocation();
  const lp = useLocalePath();
  if (!session.isReady) return <PageSkeleton />;
  if (!session.isAuthenticated) {
    const { path } = parseLocalizedPath(location.pathname);
    return <Navigate to={withQuery(lp('/login'), { next: `${path}${location.search}` })} replace />;
  }
  return <Outlet />;
}

/** "/uz/…" is the same page as the unprefixed Uzbek URL. */
export function UzRedirect() {
  const location = useLocation();
  const path = location.pathname.replace(/^\/uz(?=\/|$)/, '') || '/';
  return <Navigate to={`${path}${location.search}${location.hash}`} replace />;
}
