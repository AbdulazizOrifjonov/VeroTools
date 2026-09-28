import { parseLocalizedPath, STORE_ROUTES } from '@vero/config';
import { ArrowLeftIcon } from 'lucide-react';
import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation } from 'react-router';
import { LoadingBlock } from '../../components/common/states';
import { AccountListNav, AccountSidebarNav, AccountUserCard } from '../../features/account/nav';
import { LocaleLink } from '../../hooks/use-lang';

/**
 * Account shell: sidebar on desktop; on phones the account home shows the sections as a list and every
 * section page gets a "back to account" link.
 */
export default function AccountLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const path = parseLocalizedPath(location.pathname).path.replace(/\/+$/, '') || '/';
  const isHome = path === STORE_ROUTES.account;
  const isOrderDetail = /^\/account\/orders\/[^/]+$/.test(path);

  return (
    <div className="container-page py-5 sm:py-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
        <aside className="hidden lg:block">
          <div className="sticky top-[calc(var(--header-offset)+1.5rem)] flex flex-col gap-5">
            <AccountUserCard className="px-3" />
            <AccountSidebarNav />
          </div>
        </aside>
        <div className="flex min-w-0 flex-col gap-5">
          {isHome ? (
            <div className="flex flex-col gap-4 lg:hidden">
              <AccountUserCard />
              <AccountListNav />
            </div>
          ) : !isOrderDetail ? (
            <LocaleLink
              to={STORE_ROUTES.account}
              className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground lg:hidden"
            >
              <ArrowLeftIcon className="size-4 rtl:rotate-180" aria-hidden="true" />
              {t('shop:account.title')}
            </LocaleLink>
          ) : null}
          <Suspense fallback={<LoadingBlock />}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
