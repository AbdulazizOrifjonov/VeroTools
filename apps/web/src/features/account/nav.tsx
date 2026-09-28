import { useEngagement, useLogout, useSession } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import { Avatar, AvatarFallback, AvatarImage, cn, toast } from '@vero/ui';
import { getInitials } from '@vero/utils';
import { BellIcon, ChevronRightIcon, HeartIcon, LogOutIcon, MapPinIcon, MessageSquareTextIcon, PackageIcon, SettingsIcon, UserIcon, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LocaleLink, LocaleNavLink, useLocaleNavigate } from '../../hooks/use-lang';
import { useFormat } from '../../hooks/use-format';
import { assetUrl } from '../../lib/images';

export interface AccountNavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  count?: number;
  /** exact match (the profile index) */
  end?: boolean;
}

/** Account sections — shared by the header dropdown, the desktop sidebar and the mobile list. */
export function useAccountNav(): AccountNavItem[] {
  const { t } = useTranslation();
  const engagement = useEngagement();
  const unread = engagement.data?.unreadNotifications ?? 0;
  return [
    { to: STORE_ROUTES.account, icon: UserIcon, label: t('common:nav.profile'), end: true },
    { to: STORE_ROUTES.orders, icon: PackageIcon, label: t('common:nav.orders') },
    { to: STORE_ROUTES.notifications, icon: BellIcon, label: t('common:nav.notifications'), count: unread },
    { to: STORE_ROUTES.addresses, icon: MapPinIcon, label: t('common:nav.addresses') },
    { to: STORE_ROUTES.reviews, icon: MessageSquareTextIcon, label: t('common:nav.myReviews') },
    { to: STORE_ROUTES.wishlist, icon: HeartIcon, label: t('common:nav.wishlist') },
    { to: STORE_ROUTES.settings, icon: SettingsIcon, label: t('common:nav.settings') },
  ];
}

/** Sign out, toast, leave private pages. */
export function useSignOut() {
  const { t } = useTranslation();
  const logout = useLogout();
  const navigate = useLocaleNavigate();
  return {
    pending: logout.isPending,
    signOut: () =>
      logout.mutate(undefined, {
        onSettled: () => {
          toast.success(t('shop:auth.loggedOut'));
          navigate('/', { replace: true });
        },
      }),
  };
}

function CountBadge({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <span className="ms-auto rounded-full bg-primary px-1.5 text-[11px] leading-5 font-bold text-primary-foreground tabular-nums">{count > 99 ? '99+' : count}</span>
  );
}

export function AccountUserCard({ className }: { className?: string }) {
  const { t } = useTranslation();
  const f = useFormat();
  const { user } = useSession();
  if (!user) return null;
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Avatar size="lg" className="size-12">
        {user.avatar ? <AvatarImage src={assetUrl(user.avatar.thumb ?? user.avatar.url)} alt="" /> : null}
        <AvatarFallback>{getInitials(user.fullName || user.firstName)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-bold">{user.fullName}</span>
        <span className="truncate text-sm text-muted-foreground tabular-nums">{f.phone(user.phone)}</span>
        <span className="sr-only">{t('common:nav.account')}</span>
      </div>
    </div>
  );
}

/** Desktop sidebar navigation. */
export function AccountSidebarNav() {
  const { t } = useTranslation();
  const items = useAccountNav();
  const { signOut, pending } = useSignOut();
  return (
    <nav aria-label={t('common:nav.account')} className="flex flex-col gap-0.5">
      {items.map(({ to, icon: Icon, label, count, end }) => (
        <LocaleNavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'relative flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors duration-150',
              'hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring',
              isActive && 'bg-accent font-semibold text-foreground before:absolute before:inset-y-2 before:start-0 before:w-[3px] before:rounded-full before:bg-primary dark:before:bg-brand',
            )
          }
        >
          <Icon className="size-[18px] shrink-0" aria-hidden="true" />
          <span className="truncate">{label}</span>
          <CountBadge count={count} />
        </LocaleNavLink>
      ))}
      <button
        type="button"
        onClick={signOut}
        disabled={pending}
        className="mt-2 flex h-11 items-center gap-3 rounded-lg border-t border-border px-3 pt-px text-sm font-medium text-muted-foreground hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
      >
        <LogOutIcon className="size-[18px]" aria-hidden="true" />
        {t('common:nav.logout')}
      </button>
    </nav>
  );
}

/** Mobile: the account home lists the sections like an app menu. */
export function AccountListNav() {
  const { t } = useTranslation();
  const items = useAccountNav().filter((i) => !i.end);
  const { signOut, pending } = useSignOut();
  return (
    <nav aria-label={t('common:nav.account')} className="overflow-hidden rounded-xl border border-border bg-card">
      <ul className="divide-y divide-border">
        {items.map(({ to, icon: Icon, label, count }) => (
          <li key={to}>
            <LocaleLink to={to} className="flex h-14 items-center gap-3 px-4 text-[15px] font-medium hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
              <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="flex-1 truncate">{label}</span>
              <CountBadge count={count} />
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
            </LocaleLink>
          </li>
        ))}
        <li>
          <button type="button" onClick={signOut} disabled={pending} className="flex h-14 w-full items-center gap-3 px-4 text-[15px] font-medium text-danger hover:bg-danger-soft disabled:opacity-60">
            <LogOutIcon className="size-5" aria-hidden="true" />
            {t('common:nav.logout')}
          </button>
        </li>
      </ul>
    </nav>
  );
}
