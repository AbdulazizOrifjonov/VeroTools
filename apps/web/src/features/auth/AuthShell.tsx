import { useEngagement, useSession } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import { cn, Logo, LogoWordmark, toast } from '@vero/ui';
import { HeartIcon, MapPinnedIcon, PackageCheckIcon } from 'lucide-react';
import { useCallback, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useSearchParams } from 'react-router';
import { useLocalePath, useLocaleNavigate } from '../../hooks/use-lang';
import { safeNext } from '../../lib/paths';

/** Two-column auth card: form on the left, what an account gives on the right (≥1024px). */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  aside = true,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  aside?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const benefits = [
    { icon: PackageCheckIcon, text: t('auth.benefitOrders') },
    { icon: HeartIcon, text: t('auth.benefitLists') },
    { icon: MapPinnedIcon, text: t('auth.benefitCheckout') },
  ];
  return (
    <div className="container-page flex justify-center py-6 sm:py-10 lg:py-14">
      <div className={cn('grid w-full grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card', aside ? 'max-w-5xl lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]' : 'max-w-lg', className)}>
        <div className="flex min-w-0 flex-col gap-6 p-5 sm:p-10">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl leading-tight font-bold tracking-tight sm:text-[1.75rem]">{title}</h1>
            {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          {children}
          {footer ? <div className="border-t border-border pt-5 text-sm text-muted-foreground">{footer}</div> : null}
        </div>
        {aside ? (
          <aside className="relative hidden flex-col justify-between gap-10 overflow-hidden bg-graphite p-10 text-graphite-foreground lg:flex" aria-label={t('common:brand.name')}>
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-brand" />
            <div className="flex items-center gap-3">
              <Logo size={44} title={t('common:brand.name')} />
              <LogoWordmark height={22} className="text-white" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-6">
              <p className="text-xl leading-snug font-semibold tracking-tight text-balance text-white">{t('shop:auth.benefits')}</p>
              <ul className="flex flex-col gap-4">
                {benefits.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3 text-sm text-white/80">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-brand" aria-hidden="true">
                      <Icon className="size-[18px]" />
                    </span>
                    <span className="pt-2">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-white/60">{t('shop:account.syncedEverywhere')}</p>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

/** `?next=` of the current auth page (validated), for links between login / register / forgot. */
export function useNextParam(): string | null {
  const [searchParams] = useSearchParams();
  return safeNext(searchParams.get('next'));
}

/**
 * After a successful sign-in / sign-up: welcome toast, "cart merged" when the guest had items, then go to
 * `next` (or the account). Call `captureGuestState()` right before the request.
 */
export function useAuthSuccess() {
  const { t } = useTranslation();
  const navigate = useLocaleNavigate();
  const next = useNextParam();
  const engagement = useEngagement();
  const guestItems = useRef(0);

  const captureGuestState = useCallback(() => {
    guestItems.current = engagement.data?.cartCount ?? 0;
  }, [engagement.data?.cartCount]);

  const done = useCallback(
    (name: string, kind: 'login' | 'register') => {
      toast.success(kind === 'login' ? t('shop:auth.welcomeBack', { name }) : t('shop:auth.welcome', { name }));
      if (guestItems.current > 0) toast.info(t('shop:auth.cartMerged'));
      navigate(next ?? STORE_ROUTES.account, { replace: true });
    },
    [navigate, next, t],
  );

  return { captureGuestState, done };
}

/**
 * Visitors who are already signed in when they open /login or /register go straight to `next` (or the
 * account). The decision is taken once, when the session becomes known — a sign-in made on this page
 * navigates by itself (with its toasts).
 */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const session = useSession();
  const next = useNextParam();
  const lp = useLocalePath();
  const signedInOnArrival = useRef<boolean | null>(null);
  if (session.isReady && signedInOnArrival.current === null) signedInOnArrival.current = session.isAuthenticated;
  if (signedInOnArrival.current) return <Navigate to={lp(next ?? STORE_ROUTES.account)} replace />;
  return <>{children}</>;
}
