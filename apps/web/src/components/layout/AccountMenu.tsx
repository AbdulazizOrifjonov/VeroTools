import { useEngagement, useLogout, useSession } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Skeleton,
  toast,
} from '@vero/ui';
import { getInitials } from '@vero/utils';
import { LogOutIcon, UserIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { LocaleLink, useLocaleNavigate } from '../../hooks/use-lang';
import { assetUrl } from '../../lib/images';
import { withQuery } from '../../lib/paths';
import { parseLocalizedPath } from '@vero/config';
import { HeaderIconLink } from './HeaderIconLink';
import { useAccountNav } from '../../features/account/nav';

/** Sign-in link for guests; profile dropdown (orders, notifications with unread badge, logout) for customers. */
export function AccountMenu({ showLabel }: { showLabel: boolean }) {
  const { t } = useTranslation();
  const session = useSession();
  const engagement = useEngagement();
  const logout = useLogout();
  const navigate = useLocaleNavigate();
  const location = useLocation();
  const unread = engagement.data?.unreadNotifications ?? 0;
  const items = useAccountNav();

  if (!session.isReady) {
    return <Skeleton className="size-10 rounded-full" aria-hidden="true" />;
  }

  if (!session.isAuthenticated || !session.user) {
    const here = `${parseLocalizedPath(location.pathname).path}${location.search}`;
    const next = /^\/(login|register|forgot-password|reset-password)/.test(here) ? undefined : here;
    return (
      <HeaderIconLink
        to={withQuery(STORE_ROUTES.login, { next: next && next !== '/' ? next : undefined })}
        icon={<UserIcon />}
        label={t('common:nav.login')}
        showLabel={showLabel}
      />
    );
  }

  const user = session.user;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className={cn(
          'relative flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1.5 text-foreground outline-hidden',
          'hover:text-primary focus-visible:outline-2 focus-visible:outline-ring dark:hover:text-brand',
          showLabel ? 'h-14 min-w-16' : 'size-11',
        )}
        aria-label={`${t('common:nav.account')}: ${user.fullName}${unread ? ` — ${t('header.unread', { count: unread })}` : ''}`}
      >
        <span className="relative">
          <Avatar size="sm" className="size-7">
            {user.avatar ? <AvatarImage src={assetUrl(user.avatar.thumb ?? user.avatar.url)} alt="" /> : null}
            <AvatarFallback className="text-[11px]">{getInitials(user.fullName || user.firstName)}</AvatarFallback>
          </Avatar>
          {unread ? (
            <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-bold text-primary-foreground ring-2 ring-background tabular-nums">
              {unread > 99 ? '99+' : unread}
            </span>
          ) : null}
        </span>
        {showLabel ? <span className="max-w-20 truncate text-[11px] leading-tight font-semibold">{user.firstName}</span> : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-0.5 pb-2">
          <span className="truncate text-sm font-bold text-foreground">{user.fullName}</span>
          <span className="truncate font-medium">{user.email ?? user.phone}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map(({ to, icon: Icon, label, count }) => (
          <DropdownMenuItem key={to} asChild>
            <LocaleLink to={to}>
              <Icon aria-hidden="true" />
              <span className="flex-1">{label}</span>
              {count ? (
                <span className="rounded-full bg-primary px-1.5 text-[11px] leading-5 font-bold text-primary-foreground tabular-nums">{count}</span>
              ) : null}
            </LocaleLink>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() =>
            logout.mutate(undefined, {
              onSettled: () => {
                toast.success(t('shop:auth.loggedOut'));
                if (/\/(account|checkout)/.test(location.pathname)) navigate('/');
              },
            })
          }
        >
          <LogOutIcon aria-hidden="true" />
          {t('common:nav.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
