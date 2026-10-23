import { useEngagement, useSettings } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import { Button, cn, Dialog, DialogContent, DialogDescription, DialogTitle, Logo, useMediaQuery } from '@vero/ui';
import { formatUzPhone } from '@vero/utils';
import { ClockIcon, GitCompareArrowsIcon, HeartIcon, MenuIcon, PhoneIcon, SearchIcon, ShoppingCartIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { LocaleLink } from '../../hooks/use-lang';
import { AccountMenu } from './AccountMenu';
import { HeaderIconLink } from './HeaderIconLink';
import { LanguageSwitcher } from './LanguageSwitcher';
import { CatalogButton, MegaMenuPanel } from './MegaMenu';
import { MobileMenu } from './MobileMenu';
import { SearchBox } from './SearchBox';
import { ThemeToggle } from './ThemeToggle';

/** Compact state with hysteresis, so the height change never feeds back into the scroll position. */
function useCompactHeader(enter = 96, leave = 8) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        setCompact((c) => (c ? y > leave : y > enter));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, [enter, leave]);
  return compact;
}

/** Slim desktop bar above the sticky header: phone, working hours, quick links, language and theme. */
export function TopBar() {
  const { t } = useTranslation();
  const settings = useSettings();
  const store = settings.data?.store;
  return (
    <aside aria-label={t('common:labels.contacts')} className="hidden border-b border-border bg-surface text-[13px] lg:block">
      <div className="container-page flex h-9 items-center justify-between gap-6">
        <div className="flex min-w-0 items-center gap-5 text-muted-foreground">
          {store ? (
            <>
              <a href={`tel:${store.phone}`} className="inline-flex items-center gap-1.5 font-semibold whitespace-nowrap text-foreground tabular-nums hover:text-primary dark:hover:text-brand">
                <PhoneIcon className="size-3.5" aria-hidden="true" />
                {formatUzPhone(store.phone)}
              </a>
              <span className="hidden min-w-0 items-center gap-1.5 xl:inline-flex">
                <ClockIcon className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{store.workingHours}</span>
              </span>
            </>
          ) : (
            <span className="h-4" />
          )}
        </div>
        <nav aria-label={t('header.infoNavigation')} className="flex shrink-0 items-center gap-1">
          {[
            { to: STORE_ROUTES.promotions, label: t('common:nav.promotions') },
            { to: STORE_ROUTES.brands, label: t('common:nav.brands') },
            { to: STORE_ROUTES.page('delivery'), label: t('common:nav.delivery') },
            { to: STORE_ROUTES.page('payment'), label: t('common:nav.payment') },
            { to: STORE_ROUTES.contacts, label: t('common:nav.contact') },
          ].map((l) => (
            <LocaleLink
              key={l.to}
              to={l.to}
              className="rounded-sm px-2 py-1 font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              {l.label}
            </LocaleLink>
          ))}
          <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
          <LanguageSwitcher compact />
          <ThemeToggle compact />
        </nav>
      </div>
    </aside>
  );
}

function BrandLink({ compact }: { compact: boolean }) {
  const { t } = useTranslation();
  return (
    <LocaleLink
      to="/"
      aria-label={`${t('common:brand.name')} — ${t('common:nav.home')}`}
      className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
    >
      <Logo size={compact ? 40 : 44} title={t('common:brand.name')} className="transition-[width,height] duration-200" />
    </LocaleLink>
  );
}

/** Announces cart changes to screen readers (count updates also arrive from other devices). */
function CartAnnouncer({ count }: { count: number | undefined }) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const previous = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (count === undefined) return;
    if (previous.current !== undefined && previous.current !== count) setMessage(t('common:a11y.cartCount', { count }));
    previous.current = count;
  }, [count, t]);
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}

export function Header() {
  const { t } = useTranslation();
  const engagement = useEngagement();
  const location = useLocation();
  const compact = useCompactHeader();
  const desktop = useMediaQuery('(min-width: 1024px)', true);
  const [megaOpen, setMegaOpen] = useState(false);
  const [megaFocus, setMegaFocus] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const catalogRef = useRef<HTMLButtonElement>(null);

  const cartCount = engagement.data?.cartCount;
  const wishlistCount = engagement.data?.wishlistIds.length;
  const compareCount = engagement.data?.compareIds.length;

  useEffect(() => {
    setMegaOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  // sticky sub-navigation (product sections, filters) sits right under the real header height
  useEffect(() => {
    const target = headerRef.current?.querySelector<HTMLElement>('[data-header-bar]');
    if (!target) return;
    const apply = () => document.documentElement.style.setProperty('--header-offset', `${Math.round(target.getBoundingClientRect().height)}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(target);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!megaOpen) return;
    const onDown = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setMegaOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMegaOpen(false);
        catalogRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [megaOpen]);

  return (
    <header ref={headerRef} data-compact={compact || undefined} className="sticky top-0 z-40">
      {megaOpen ? <div className="fixed inset-0 z-0 bg-overlay/50 animate-fade-in" aria-hidden="true" /> : null}
      <div data-header-bar className={cn('relative z-10 border-b border-border bg-background transition-shadow duration-200', compact && 'shadow-xs')}>
        <div
          className={cn(
            'container-page flex items-center gap-1 transition-[height] duration-200 sm:gap-2 lg:gap-4',
            compact ? 'h-14 lg:h-16' : 'h-16 lg:h-[72px]',
          )}
        >
          <Button variant="ghost" size="icon" className="-ms-2 lg:hidden" aria-label={t('common:a11y.openMenu')} onClick={() => setMenuOpen(true)}>
            <MenuIcon className="size-[22px]" aria-hidden="true" />
          </Button>
          <BrandLink compact={compact} />
          <div className="hidden lg:block">
            <CatalogButton
              ref={catalogRef}
              open={megaOpen}
              compact={compact}
              onToggle={(viaKeyboard) => {
                setMegaFocus(viaKeyboard);
                setMegaOpen((o) => !o);
              }}
            />
          </div>
          <div className="hidden min-w-0 flex-1 lg:block">
            <SearchBox />
          </div>
          <div className="flex-1 lg:hidden" />
          <nav aria-label={t('header.userNavigation')} className="flex items-center gap-0.5 sm:gap-1 lg:gap-2">
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t('common:nav.search')} onClick={() => setSearchOpen(true)}>
              <SearchIcon className="size-[22px]" aria-hidden="true" />
            </Button>
            <HeaderIconLink
              to={STORE_ROUTES.compare}
              icon={<GitCompareArrowsIcon />}
              label={t('common:nav.compare')}
              count={compareCount}
              countLabel={compareCount ? t('common:a11y.compareCount', { count: compareCount }) : undefined}
              showLabel={!compact}
              className="hidden lg:flex"
            />
            <HeaderIconLink
              to={STORE_ROUTES.wishlist}
              icon={<HeartIcon />}
              label={t('common:nav.wishlist')}
              count={wishlistCount}
              countLabel={wishlistCount ? t('common:a11y.wishlistCount', { count: wishlistCount }) : undefined}
              showLabel={!compact}
              className="hidden lg:flex"
            />
            <HeaderIconLink
              to={STORE_ROUTES.cart}
              icon={<ShoppingCartIcon />}
              label={t('common:nav.cart')}
              count={cartCount}
              countLabel={cartCount ? t('common:a11y.cartCount', { count: cartCount }) : undefined}
              showLabel={!compact && desktop}
            />
            <div className="hidden lg:block">
              <AccountMenu showLabel={!compact} />
            </div>
          </nav>
        </div>
      </div>
      {megaOpen ? <MegaMenuPanel focusFirst={megaFocus} onClose={() => setMegaOpen(false)} /> : null}
      <CartAnnouncer count={cartCount} />
      <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} />
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent
          closeLabel={t('common:actions.close')}
          className="top-0 left-0 flex h-dvh max-h-none w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 p-0 pt-[env(safe-area-inset-top)] sm:max-w-none sm:p-0 [&>[data-slot=dialog-close-button]]:top-[calc(env(safe-area-inset-top)+0.9rem)]"
        >
          <DialogTitle className="sr-only">{t('common:nav.search')}</DialogTitle>
          <DialogDescription className="sr-only">{t('shop:search.placeholder')}</DialogDescription>
          <SearchBox variant="overlay" autoFocus onNavigate={() => setSearchOpen(false)} />
        </DialogContent>
      </Dialog>
    </header>
  );
}
