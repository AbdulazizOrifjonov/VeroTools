import { useRealtimeSync, type AdminOrderEvent } from '@vero/api-client';
import { SOCKET_EVENTS } from '@vero/config';
import { cn, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, toast } from '@vero/ui';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate, useNavigation } from 'react-router';
import { Brand, Sidebar, SidebarNav } from '../components/layout/Sidebar';
import { QuickSearch } from '../components/layout/QuickSearch';
import { Topbar } from '../components/layout/Topbar';
import { createFormatters } from '../lib/format';
import { useLiveStore } from '../lib/realtime-store';
import { ADMIN_STORAGE, readString, writeString } from '../lib/storage';
import type { Language } from '@vero/config';

/** Socket.IO admin room: live query invalidation (in the hook), the notification bell and new-order toasts. */
function RealtimeEffects() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const push = useLiveStore((s) => s.push);
  const setConnected = useLiveStore((s) => s.setConnected);

  const onAdminOrder = useCallback(
    (e: AdminOrderEvent, kind: 'new' | 'updated') => {
      push({ kind: kind === 'new' ? 'order_new' : 'order_updated', orderId: e.orderId, number: e.number, total: e.total, status: e.status, customerName: e.customerName });
      if (kind === 'new') {
        const f = createFormatters((i18n.resolvedLanguage ?? 'uz') as Language, t('common:currency'));
        toast.success(t('bell.toastOrder', { number: e.number, total: f.money(e.total) }), {
          description: e.customerName,
          action: { label: t('common.open'), onClick: () => void navigate(`/orders/${e.orderId}`) },
          duration: 8000,
        });
      }
    },
    [push, t, i18n, navigate],
  );

  const onAdminEvent = useCallback(
    (event: string, payload: unknown) => {
      const p = (payload ?? {}) as Record<string, unknown>;
      if (event === SOCKET_EVENTS.adminStockLow) {
        push({ kind: 'stock_low', productId: String(p.productId ?? ''), sku: String(p.sku ?? ''), available: Number(p.available ?? 0) });
      } else if (event === SOCKET_EVENTS.adminReviewNew) {
        push({ kind: 'review_new', reviewId: String(p.reviewId ?? ''), rating: Number(p.rating ?? 0) });
      }
    },
    [push],
  );

  const { connected } = useRealtimeSync({ url: '', admin: true, onAdminOrder, onAdminEvent });
  useEffect(() => setConnected(connected), [connected, setConnected]);
  return null;
}

function RouteProgress() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  if (navigation.state === 'idle') return null;
  return (
    <div className="no-print fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden" role="progressbar" aria-label={t('shell.loadingPage')}>
      <div className="h-full w-1/3 animate-route-progress bg-primary" />
    </div>
  );
}

/** Admin layout: collapsible sidebar, top bar, page outlet. */
export function AppShell() {
  const { t } = useTranslation();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => readString(ADMIN_STORAGE.sidebarCollapsed) === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => writeString(ADMIN_STORAGE.sidebarCollapsed, collapsed ? '1' : null), [collapsed]);
  useEffect(() => setMobileOpen(false), [location.pathname]);

  // ⌘K / Ctrl+K and "/" open the quick search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if ((e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main"
        className="sr-only z-[70] rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:start-3 focus:top-3"
      >
        {t('shell.skipToContent')}
      </a>
      <RouteProgress />
      <RealtimeEffects />
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" closeLabel={t('common.close')} className="w-[18rem] max-w-[85vw] bg-surface p-0">
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle asChild>
              <div>
                <Brand collapsed={false} />
              </div>
            </SheetTitle>
            <SheetDescription className="sr-only">{t('shell.mainNavigation')}</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className={cn('flex min-h-dvh min-w-0 flex-col transition-[padding] duration-200 ease-brand', collapsed ? 'lg:ps-(--sidebar-collapsed-width)' : 'lg:ps-(--sidebar-width)')}>
        <Topbar onOpenMenu={() => setMobileOpen(true)} onOpenSearch={() => setSearchOpen(true)} />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1600px] min-w-0 flex-1 px-4 py-5 outline-none sm:px-6 sm:py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
      <QuickSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
