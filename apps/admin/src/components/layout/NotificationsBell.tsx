import { Button, cn, Popover, PopoverContent, PopoverTrigger, Tooltip, TooltipContent, TooltipTrigger } from '@vero/ui';
import { BellIcon, PackageXIcon, ShoppingCartIcon, StarIcon, RefreshCwIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useFormat } from '../../lib/format';
import { useLiveStore, useUnseenCount, type LiveEvent } from '../../lib/realtime-store';

function eventLink(e: LiveEvent): string {
  switch (e.kind) {
    case 'order_new':
    case 'order_updated':
      return e.orderId ? `/orders/${e.orderId}` : '/orders';
    case 'stock_low':
      return e.sku ? `/inventory?q=${encodeURIComponent(e.sku)}` : '/inventory?stock=low';
    case 'review_new':
      return '/reviews?status=PENDING';
  }
}

function EventRow({ event, onNavigate, unseen }: { event: LiveEvent; onNavigate: () => void; unseen: boolean }) {
  const { t } = useTranslation();
  const f = useFormat();
  const Icon = event.kind === 'order_new' ? ShoppingCartIcon : event.kind === 'order_updated' ? RefreshCwIcon : event.kind === 'stock_low' ? PackageXIcon : StarIcon;
  const title =
    event.kind === 'order_new'
      ? t('bell.orderNew', { number: event.number })
      : event.kind === 'order_updated'
        ? t('bell.orderUpdated', { number: event.number, status: t(`common:orderStatus.${event.status}`, { defaultValue: event.status ?? '' }) })
        : event.kind === 'stock_low'
          ? t('bell.stockLow', { sku: event.sku })
          : t('bell.reviewNew', { rating: event.rating ?? '—' });
  const text =
    event.kind === 'order_new'
      ? t('bell.orderNewText', { customer: event.customerName ?? '—', total: f.money(event.total) })
      : event.kind === 'order_updated'
        ? f.money(event.total)
        : event.kind === 'stock_low'
          ? t('bell.stockLowText', { count: event.available ?? 0 })
          : t('bell.reviewNewText');
  return (
    <li>
      <Link to={eventLink(event)} onClick={onNavigate} className="flex items-start gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
        <span
          className={cn(
            'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
            event.kind === 'order_new' ? 'bg-brand-soft text-primary dark:text-brand' : event.kind === 'stock_low' ? 'bg-warning-soft text-warning' : event.kind === 'review_new' ? 'bg-info-soft text-info' : 'bg-muted text-muted-foreground',
          )}
          aria-hidden="true"
        >
          <Icon className="size-4" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
            <span className="truncate">{title}</span>
            {unseen ? <span className="size-1.5 shrink-0 rounded-full bg-primary dark:bg-brand" aria-hidden="true" /> : null}
          </span>
          <span className="truncate text-xs text-muted-foreground">{text}</span>
        </span>
        <span className="shrink-0 text-[11px] text-muted-foreground tabular">{f.relative(new Date(event.at))}</span>
      </Link>
    </li>
  );
}

/** Bell with the realtime events of this session (new orders, status changes, low stock, new reviews). */
export function NotificationsBell() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const events = useLiveStore((s) => s.events);
  const lastSeenAt = useLiveStore((s) => s.lastSeenAt);
  const markAllSeen = useLiveStore((s) => s.markAllSeen);
  const clear = useLiveStore((s) => s.clear);
  const unseen = useUnseenCount();
  const [seenAtOpen, setSeenAtOpen] = useState(lastSeenAt);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setSeenAtOpen(lastSeenAt);
          markAllSeen();
        }
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="relative" aria-label={unseen ? `${t('bell.open')} — ${t('bell.unseen', { count: unseen })}` : t('bell.open')}>
              <BellIcon className="size-4" />
              {unseen ? (
                <span className="absolute -end-0.5 -top-0.5 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] leading-4 font-bold text-primary-foreground tabular" aria-hidden="true">
                  {unseen > 9 ? '9+' : unseen}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{t('bell.title')}</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-1.5rem))] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{t('bell.title')}</span>
            <span className="text-[11px] text-muted-foreground">{t('bell.sessionOnly')}</span>
          </div>
          {events.length ? (
            <Button variant="ghost" size="xs" onClick={clear}>
              {t('bell.clear')}
            </Button>
          ) : null}
        </div>
        {events.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 px-6 py-10 text-center">
            <BellIcon className="size-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-semibold">{t('bell.empty')}</p>
            <p className="text-xs text-muted-foreground">{t('bell.emptyHint')}</p>
          </div>
        ) : (
          <ul className="max-h-96 overflow-y-auto p-1.5">
            {events.map((e) => (
              <EventRow key={e.id} event={e} unseen={e.at > seenAtOpen} onNavigate={() => setOpen(false)} />
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Realtime connection state (Socket.IO admin room). */
export function LiveIndicator() {
  const { t } = useTranslation();
  const connected = useLiveStore((s) => s.connected);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="status"
          tabIndex={0}
          aria-label={connected ? t('shell.live') : t('shell.offline')}
          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[12px] font-semibold text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span className="relative flex size-2" aria-hidden="true">
            {connected ? <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-40 motion-reduce:hidden" /> : null}
            <span className={cn('relative inline-flex size-2 rounded-full', connected ? 'bg-success' : 'bg-muted-foreground/50')} />
          </span>
          <span className="hidden xl:inline">{connected ? t('shell.liveShort') : t('shell.offlineShort')}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-60">
        <strong className="block">{connected ? t('shell.live') : t('shell.offline')}</strong>
        {connected ? t('shell.liveHint') : t('shell.offlineHint')}
      </TooltipContent>
    </Tooltip>
  );
}
