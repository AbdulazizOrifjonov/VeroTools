import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, Button, cn } from '@vero/ui';
import { MenuIcon, SearchIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { navItemForPath } from '../../app/nav';
import { usePageMetaStore } from '../common/page';
import { LanguageMenu, ThemeMenu, UserMenu } from './menus';
import { LiveIndicator, NotificationsBell } from './NotificationsBell';
import { QuickSearchTrigger } from './QuickSearch';

/** Group › section › record, derived from the sidebar configuration and the page's own title. */
export function Breadcrumbs() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const detail = usePageMetaStore((s) => s.detail);
  const item = navItemForPath(pathname);
  const isRoot = item ? pathname === item.path : false;
  const profile = pathname === '/profile';
  return (
    <Breadcrumb aria-label={t('shell.breadcrumbs')} className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {item ? (
          <>
            {/* the group label only where there is room for all three levels */}
            <BreadcrumbItem className={cn('hidden shrink-0', !isRoot || detail ? 'xl:inline-flex' : 'md:inline-flex')}>
              <span className="text-muted-foreground">{t(`navGroups.${item.group}`)}</span>
            </BreadcrumbItem>
            <BreadcrumbSeparator className={cn('hidden shrink-0', !isRoot || detail ? 'xl:block' : 'md:block')} />
            {/* on phones a record page shows only its own title (the page has a back link to the section) */}
            <BreadcrumbItem className={cn('min-w-0 shrink', (!isRoot || detail) && 'max-w-[45%] max-md:hidden')}>
              {isRoot && !detail ? (
                <BreadcrumbPage className="truncate">{t(`nav.${item.key}`)}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={item.path} className="truncate">
                    {t(`nav.${item.key}`)}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!isRoot || detail ? (
              <>
                <BreadcrumbSeparator className="shrink-0 max-md:hidden" />
                <BreadcrumbItem className="min-w-0">
                  <BreadcrumbPage className="block truncate md:max-w-md">{detail ?? '…'}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : null}
          </>
        ) : profile ? (
          <BreadcrumbItem>
            <BreadcrumbPage>{t('nav.profile')}</BreadcrumbPage>
          </BreadcrumbItem>
        ) : (
          <BreadcrumbItem>
            <BreadcrumbPage>{detail ?? t('app.short')}</BreadcrumbPage>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function Topbar({ onOpenMenu, onOpenSearch }: { onOpenMenu: () => void; onOpenSearch: () => void }) {
  const { t } = useTranslation();
  return (
    <header className="no-print sticky top-0 z-20 flex h-(--topbar-height) shrink-0 items-center gap-2 border-b border-border bg-background px-3 sm:gap-3 sm:px-4 lg:px-6">
      <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={onOpenMenu} aria-label={t('shell.openMenu')}>
        <MenuIcon className="size-5" />
      </Button>
      <div className="min-w-0 flex-1">
        <Breadcrumbs />
      </div>
      <div className="hidden w-56 sm:block lg:w-72">
        <QuickSearchTrigger onOpen={onOpenSearch} />
      </div>
      <div className="flex items-center gap-0.5 sm:gap-1">
        <Button variant="ghost" size="icon-sm" className="sm:hidden" onClick={onOpenSearch} aria-label={t('quickSearch.title')}>
          <SearchIcon className="size-4" />
        </Button>
        <LiveIndicator />
        <NotificationsBell />
        <LanguageMenu />
        <ThemeMenu />
        <div className="ms-1">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
