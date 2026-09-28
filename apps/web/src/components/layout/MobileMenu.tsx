import { useCategories, useEngagement, useLogout, useSession, useSettings } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import type { CategoryNode } from '@vero/types';
import { Logo, LogoWordmark, Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle, Skeleton, toast } from '@vero/ui';
import { formatUzPhone } from '@vero/utils';
import {
  ArrowLeftIcon,
  BadgePercentIcon,
  ChevronRightIcon,
  ClockIcon,
  GitCompareArrowsIcon,
  HeartIcon,
  LogOutIcon,
  PackageIcon,
  PhoneIcon,
  TagIcon,
  UserIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { LocaleLink, useLocaleNavigate } from '../../hooks/use-lang';
import { DynamicIcon } from '../common/DynamicIcon';
import { ErrorState } from '../common/states';
import { LanguageButtons } from './LanguageSwitcher';
import { ThemeButtons } from './ThemeToggle';
import { INFO_LINKS } from './links';

function Row({ to, icon, children, count, onClick }: { to: string; icon?: ReactNode; children: ReactNode; count?: number; onClick?: () => void }) {
  return (
    <LocaleLink
      to={to}
      onClick={onClick}
      className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-[15px] font-medium hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    >
      {icon ? <span className="flex size-5 items-center justify-center text-muted-foreground [&_svg]:size-5">{icon}</span> : null}
      <span className="min-w-0 flex-1">{children}</span>
      {count ? <span className="rounded-full bg-primary px-1.5 text-xs leading-5 font-bold text-primary-foreground tabular-nums">{count}</span> : null}
    </LocaleLink>
  );
}

/** Full-screen mobile navigation with catalogue drill-down. */
export function MobileMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const categories = useCategories();
  const settings = useSettings();
  const engagement = useEngagement();
  const { isAuthenticated, user } = useSession();
  const logout = useLogout();
  const navigate = useLocaleNavigate();
  const location = useLocation();
  const [stack, setStack] = useState<CategoryNode[]>([]);
  const backRef = useRef<HTMLButtonElement>(null);
  const current = stack[stack.length - 1];

  useEffect(() => {
    onOpenChange(false);
    // close when the route changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!open) setStack([]);
  }, [open]);

  useEffect(() => {
    if (current) backRef.current?.focus();
  }, [current]);

  const close = () => onOpenChange(false);
  const store = settings.data?.store;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" closeLabel={t('common:actions.close')} className="w-full max-w-md gap-0 sm:w-[420px]">
        <SheetHeader className="border-b border-border pb-3">
          <SheetTitle className="flex items-center gap-2.5">
            <Logo size={32} />
            <LogoWordmark height={18} className="text-foreground" aria-hidden="true" />
            <span className="sr-only">{t('common:nav.menu')}</span>
          </SheetTitle>
          <SheetDescription className="sr-only">{t('common:brand.tagline')}</SheetDescription>
        </SheetHeader>
        <SheetBody className="px-3 py-3 sm:px-4">
          {current ? (
            <div className="animate-fade-in">
              <button
                ref={backRef}
                type="button"
                onClick={() => setStack((s) => s.slice(0, -1))}
                className="mb-1 flex h-11 w-full items-center gap-2 rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                <ArrowLeftIcon className="size-4" aria-hidden="true" />
                {stack.length > 1 ? stack[stack.length - 2]!.name : t('common:nav.catalog')}
              </button>
              <h2 className="px-3 pt-1 pb-2 text-lg font-bold tracking-tight">{current.name}</h2>
              <ul>
                <li>
                  <Row to={STORE_ROUTES.category(current.slug)} icon={<TagIcon />} onClick={close}>
                    <span className="font-semibold text-primary dark:text-brand">{t('header.allInCategory', { count: current.productCount })}</span>
                  </Row>
                </li>
                {current.children.map((c) => (
                  <li key={c.id}>
                    {c.children.length ? (
                      <DrillButton category={c} onClick={() => setStack((s) => [...s, c])} />
                    ) : (
                      <Row to={STORE_ROUTES.category(c.slug)} icon={<DynamicIcon name={c.icon} />} onClick={close}>
                        {c.name}
                        <span className="ms-2 text-xs text-muted-foreground tabular-nums">{c.productCount}</span>
                      </Row>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <nav aria-label={t('common:a11y.mainNavigation')} className="flex flex-col gap-4">
              <div>
                <h2 className="px-3 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t('common:nav.catalog')}</h2>
                {categories.isPending ? (
                  <div className="flex flex-col gap-2 px-3 py-2">
                    {Array.from({ length: 6 }, (_, i) => (
                      <Skeleton key={i} className="h-9 w-full" />
                    ))}
                  </div>
                ) : categories.isError ? (
                  <ErrorState compact error={categories.error} onRetry={() => void categories.refetch()} />
                ) : (
                  <ul>
                    {(categories.data ?? []).map((c) => (
                      <li key={c.id}>
                        {c.children.length ? (
                          <DrillButton category={c} onClick={() => setStack([c])} />
                        ) : (
                          <Row to={STORE_ROUTES.category(c.slug)} icon={<DynamicIcon name={c.icon} />} onClick={close}>
                            {c.name}
                          </Row>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="border-t border-border pt-3">
                <Row to={STORE_ROUTES.promotions} icon={<BadgePercentIcon />} onClick={close}>
                  {t('common:nav.promotions')}
                </Row>
                <Row to={STORE_ROUTES.brands} icon={<TagIcon />} onClick={close}>
                  {t('common:nav.brands')}
                </Row>
                <Row to={STORE_ROUTES.compare} icon={<GitCompareArrowsIcon />} count={engagement.data?.compareIds.length} onClick={close}>
                  {t('common:nav.compare')}
                </Row>
                <Row to={STORE_ROUTES.wishlist} icon={<HeartIcon />} count={engagement.data?.wishlistIds.length} onClick={close}>
                  {t('common:nav.wishlist')}
                </Row>
              </div>
              <div className="border-t border-border pt-3">
                {isAuthenticated ? (
                  <>
                    <Row to={STORE_ROUTES.account} icon={<UserIcon />} onClick={close}>
                      {user?.fullName || t('common:nav.account')}
                    </Row>
                    <Row to={STORE_ROUTES.orders} icon={<PackageIcon />} onClick={close}>
                      {t('common:nav.orders')}
                    </Row>
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        logout.mutate(undefined, {
                          onSettled: () => {
                            toast.success(t('shop:auth.loggedOut'));
                            navigate('/');
                          },
                        });
                      }}
                      className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-[15px] font-medium text-danger hover:bg-danger-soft focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                    >
                      <LogOutIcon className="size-5" aria-hidden="true" />
                      {t('common:nav.logout')}
                    </button>
                  </>
                ) : (
                  <Row to={STORE_ROUTES.login} icon={<UserIcon />} onClick={close}>
                    {t('common:nav.login')} / {t('common:nav.register')}
                  </Row>
                )}
              </div>
              <div className="border-t border-border pt-3">
                <ul className="grid grid-cols-2 gap-x-2">
                  {INFO_LINKS.map((l) => (
                    <li key={l.to}>
                      <LocaleLink
                        to={l.to}
                        onClick={close}
                        className="flex min-h-10 items-center rounded-md px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {t(l.label)}
                      </LocaleLink>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-4 border-t border-border px-3 pt-4">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t('common:language.label')}</span>
                  <LanguageButtons />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t('common:theme.label')}</span>
                  <ThemeButtons />
                </div>
                {store ? (
                  <div className="flex flex-col gap-1.5 pb-4 text-sm">
                    <a href={`tel:${store.phone}`} className="inline-flex items-center gap-2 font-semibold tabular-nums">
                      <PhoneIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                      {formatUzPhone(store.phone)}
                    </a>
                    <span className="inline-flex items-start gap-2 text-muted-foreground">
                      <ClockIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      {store.workingHours}
                    </span>
                  </div>
                ) : null}
              </div>
            </nav>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function DrillButton({ category, onClick }: { category: CategoryNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-start text-[15px] font-medium hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    >
      <DynamicIcon name={category.icon} className="size-5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">{category.name}</span>
      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}
