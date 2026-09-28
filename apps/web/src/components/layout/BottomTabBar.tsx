import { useEngagement, useSession } from '@vero/api-client';
import { parseLocalizedPath, STORE_ROUTES } from '@vero/config';
import { cn } from '@vero/ui';
import { HeartIcon, HouseIcon, LayoutGridIcon, ShoppingCartIcon, UserIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { LocaleLink } from '../../hooks/use-lang';

function Tab({ to, icon, label, active, count, dot }: { to: string; icon: ReactNode; label: string; active: boolean; count?: number; dot?: boolean }) {
  return (
    <li className="flex-1">
      <LocaleLink
        to={to}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'relative flex h-[3.75rem] flex-col items-center justify-center gap-1 text-[11px] leading-none font-semibold transition-colors',
          'focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring',
          active ? 'text-primary dark:text-brand' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <span className="relative [&_svg]:size-[22px]">
          {icon}
          {count ? (
            <span
              aria-hidden="true"
              className="absolute -end-2.5 -top-1.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-bold text-primary-foreground ring-2 ring-background tabular-nums"
            >
              {count > 99 ? '99+' : count}
            </span>
          ) : dot ? (
            <span aria-hidden="true" className="absolute -end-1 -top-0.5 size-2.5 rounded-full bg-primary ring-2 ring-background" />
          ) : null}
        </span>
        <span>
          {label}
          {count ? <span className="sr-only"> ({count})</span> : null}
        </span>
      </LocaleLink>
    </li>
  );
}

/** Mobile / tablet tab bar: Home, Catalog, Cart, Wishlist, Account (live counts). */
export function BottomTabBar() {
  const { t } = useTranslation();
  const location = useLocation();
  const engagement = useEngagement();
  const { isAuthenticated } = useSession();
  const { path } = parseLocalizedPath(location.pathname);
  const is = (prefix: string) => (prefix === '/' ? path === '/' : path === prefix || path.startsWith(`${prefix}/`));

  return (
    <nav
      aria-label={t('header.tabBar')}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/98 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto flex max-w-xl">
        <Tab to="/" icon={<HouseIcon />} label={t('common:nav.home')} active={is('/')} />
        <Tab
          to={STORE_ROUTES.catalog}
          icon={<LayoutGridIcon />}
          label={t('common:nav.catalog')}
          active={is('/catalog') || is('/product') || is('/search') || is('/brands') || is('/promotions')}
        />
        <Tab to={STORE_ROUTES.cart} icon={<ShoppingCartIcon />} label={t('common:nav.cart')} active={is('/cart') || is('/checkout')} count={engagement.data?.cartCount} />
        <Tab to={STORE_ROUTES.wishlist} icon={<HeartIcon />} label={t('common:nav.wishlist')} active={is('/wishlist')} count={engagement.data?.wishlistIds.length} />
        <Tab
          to={isAuthenticated ? STORE_ROUTES.account : STORE_ROUTES.login}
          icon={<UserIcon />}
          label={isAuthenticated ? t('common:nav.account') : t('common:nav.login')}
          active={is('/account') || is('/login') || is('/register')}
          dot={!!engagement.data?.unreadNotifications}
        />
      </ul>
    </nav>
  );
}
