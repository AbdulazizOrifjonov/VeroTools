import { useSession } from '@vero/api-client';
import { cn, Logo, Tooltip, TooltipContent, TooltipTrigger } from '@vero/ui';
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import { NAV_GROUPS, type NavItem } from '../../app/nav';
import { useNavBadges } from './use-nav-badges';

function Brand({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation();
  return (
    <NavLink to="/" className="flex min-w-0 items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" aria-label={t('app.name')}>
      <Logo size={30} title="VERO TOOLS" />
      {collapsed ? null : (
        <span className="flex min-w-0 flex-col leading-none">
          <span className="truncate text-[15px] font-extrabold tracking-[-0.02em] text-foreground">VERO TOOLS</span>
          <span className="mt-0.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{t('app.short')}</span>
        </span>
      )}
    </NavLink>
  );
}

function NavEntry({ item, collapsed, count, onNavigate }: { item: NavItem; collapsed: boolean; count?: number; onNavigate?: () => void }) {
  const { t } = useTranslation();
  const Icon = item.icon;
  const label = t(`nav.${item.key}`);
  const badge = count && count > 0 ? (count > 99 ? '99+' : String(count)) : null;
  const link = (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      onClick={onNavigate}
      aria-label={collapsed ? (badge ? `${label} (${badge})` : label) : undefined}
      className={({ isActive }) =>
        cn(
          'group/nav relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium text-muted-foreground transition-colors duration-150',
          'hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring',
          isActive && 'bg-surface-elevated font-semibold text-foreground shadow-xs ring-1 ring-border dark:bg-secondary',
          collapsed && 'justify-center px-0',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('size-4 shrink-0', isActive ? 'text-primary dark:text-brand' : 'text-muted-foreground group-hover/nav:text-foreground')} aria-hidden="true" />
          {collapsed ? null : <span className="min-w-0 flex-1 truncate">{label}</span>}
          {badge ? (
            collapsed ? (
              <span className="absolute end-1 top-1 size-2 rounded-full bg-primary ring-2 ring-surface dark:bg-brand" aria-hidden="true" />
            ) : (
              <span className="ms-auto min-w-5 rounded-full bg-brand-soft px-1.5 text-center text-[11px] leading-5 font-bold text-brand-soft-foreground tabular">{badge}</span>
            )
          ) : null}
        </>
      )}
    </NavLink>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{badge ? `${label} · ${badge}` : label}</TooltipContent>
    </Tooltip>
  );
}

/** Grouped navigation filtered by the user's permissions. */
export function SidebarNav({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const { t } = useTranslation();
  const { can } = useSession();
  const badges = useNavBadges();
  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => can(i.permission)) })).filter((g) => g.items.length > 0);
  return (
    <nav aria-label={t('shell.mainNavigation')} className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-0.5">
          {collapsed ? (
            <div className="mx-auto mb-1 h-px w-6 bg-border" aria-hidden="true" />
          ) : (
            <h2 className="px-2.5 pb-1 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground/80 uppercase">{t(`navGroups.${group.key}`)}</h2>
          )}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <li key={item.key}>
                <NavEntry item={item} collapsed={collapsed} count={item.badge ? badges[item.badge] : undefined} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Desktop sidebar (≥ lg), collapsible to an icon rail. */
export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  return (
    <aside
      className={cn(
        'no-print fixed inset-y-0 start-0 z-30 hidden flex-col border-e border-border bg-surface transition-[width] duration-200 ease-brand lg:flex',
        collapsed ? 'w-(--sidebar-collapsed-width)' : 'w-(--sidebar-width)',
      )}
    >
      <div className={cn('flex h-(--topbar-height) shrink-0 items-center border-b border-border', collapsed ? 'justify-center px-2' : 'justify-between gap-2 px-4')}>
        <Brand collapsed={collapsed} />
        {collapsed ? null : (
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            aria-label={t('shell.collapse')}
            title={t('shell.collapse')}
          >
            <PanelLeftCloseIcon className="size-4" />
          </button>
        )}
      </div>
      <div className={cn('min-h-0 flex-1 overflow-y-auto py-4', collapsed ? 'px-2' : 'px-3')}>
        <SidebarNav collapsed={collapsed} />
      </div>
      {collapsed ? (
        <div className="flex shrink-0 justify-center border-t border-border py-2">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            aria-label={t('shell.expand')}
            title={t('shell.expand')}
          >
            <PanelLeftOpenIcon className="size-4" />
          </button>
        </div>
      ) : null}
    </aside>
  );
}

export { Brand };
