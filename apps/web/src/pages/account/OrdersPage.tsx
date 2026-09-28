import { useOrders } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import type { OrderSummary } from '@vero/types';
import { Button, cn, EmptyState, PaginationBar, Skeleton } from '@vero/ui';
import { ChevronRightIcon, PackageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { SmartImage } from '../../components/common/SmartImage';
import { ErrorState } from '../../components/common/states';
import { AccountHeading } from '../../features/account/AccountSection';
import { OrderStatusBadge, PaymentStatusBadge } from '../../features/orders/order-ui';
import { useDocumentMeta } from '../../hooks/use-document-meta';
import { useFormat } from '../../hooks/use-format';
import { LocaleLink } from '../../hooks/use-lang';

const FILTERS = [
  { value: undefined, label: 'shop:orders.filterAll' },
  { value: 'active', label: 'shop:orders.filterActive' },
  { value: 'completed', label: 'shop:orders.filterCompleted' },
  { value: 'cancelled', label: 'shop:orders.filterCancelled' },
] as const;
type StatusFilter = (typeof FILTERS)[number]['value'];
const PAGE_SIZE = 10;

function OrderCard({ order }: { order: OrderSummary }) {
  const { t } = useTranslation();
  const f = useFormat();
  const extra = order.itemsCount - order.preview.length;
  const payOnReceipt = (order.paymentMethod === 'cash' || order.paymentMethod === 'card_on_delivery') && order.paymentStatus === 'PENDING';
  return (
    <article className="group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors duration-150 hover:border-foreground/25 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-base font-bold tracking-tight">
            <LocaleLink to={STORE_ROUTES.order(order.id)} className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none group-focus-within:underline">
              {t('shop:orders.number', { number: order.number })}
            </LocaleLink>
          </h2>
          <OrderStatusBadge status={order.status} size="sm" />
          {!payOnReceipt && order.status !== 'CANCELLED' ? <PaymentStatusBadge status={order.paymentStatus} size="sm" /> : null}
        </div>
        <span className="text-lg font-bold tabular-nums">{f.price(order.total)}</span>
      </div>
      <p className="text-sm text-muted-foreground">
        {t('shop:orders.placedOn', { date: f.date(order.createdAt, 'long') })} · {t('shop:orders.items', { count: order.itemsCount })} ·{' '}
        {t(`common:deliveryMethod.${order.deliveryMethod}`)} · {t(`common:paymentMethod.${order.paymentMethod}`)}
      </p>
      <div className="flex items-center gap-2">
        <ul className="flex items-center gap-2" aria-label={t('shop:orders.details')}>
          {order.preview.slice(0, 4).map((p, i) => (
            <li key={i} className="img-well size-14 overflow-hidden rounded-lg border border-border bg-well" title={p.name}>
              <SmartImage image={p.image} prefer="thumb" sizes="56px" className="size-full object-contain" alt={p.name} />
            </li>
          ))}
        </ul>
        {extra > 0 ? <span className="flex h-14 items-center rounded-lg bg-muted px-3 text-sm font-semibold text-muted-foreground tabular-nums">+{extra}</span> : null}
        <ChevronRightIcon className="ms-auto size-5 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden="true" />
      </div>
    </article>
  );
}

export default function OrdersPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawStatus = searchParams.get('status');
  const status: StatusFilter = rawStatus === 'active' || rawStatus === 'completed' || rawStatus === 'cancelled' ? rawStatus : undefined;
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const orders = useOrders({ status, page, limit: PAGE_SIZE });
  useDocumentMeta({ title: t('shop:orders.title'), noindex: true });

  const setQuery = (next: { status?: StatusFilter; page?: number }) => {
    const sp = new URLSearchParams();
    if (next.status) sp.set('status', next.status);
    if (next.page && next.page > 1) sp.set('page', String(next.page));
    setSearchParams(sp, { preventScrollReset: false });
  };

  return (
    <div className="flex flex-col gap-5">
      <AccountHeading title={t('shop:orders.title')} description={t('shop:orders.liveUpdate')} />
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label={t('common:actions.filter')}>
        <div className="flex w-max gap-2">
          {FILTERS.map((fl) => {
            const active = fl.value === status;
            return (
              <button
                key={fl.label}
                type="button"
                aria-pressed={active}
                onClick={() => setQuery({ status: fl.value })}
                className={cn(
                  'h-9 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  active ? 'border-primary bg-brand-soft text-brand-soft-foreground' : 'border-border bg-card hover:bg-accent',
                )}
              >
                {t(fl.label)}
              </button>
            );
          })}
        </div>
      </div>

      {orders.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : orders.isError ? (
        <ErrorState error={orders.error} onRetry={() => void orders.refetch()} />
      ) : !orders.data.items.length ? (
        status ? (
          <EmptyState bordered icon={<PackageIcon />} title={t('common:status.empty')} action={<Button variant="outline" onClick={() => setQuery({})}>{t('shop:orders.filterAll')}</Button>} />
        ) : (
          <EmptyState
            bordered
            icon={<PackageIcon />}
            title={t('shop:orders.empty')}
            description={t('shop:orders.emptyHint')}
            action={
              <Button asChild size="lg">
                <LocaleLink to={STORE_ROUTES.catalog}>{t('common:nav.catalog')}</LocaleLink>
              </Button>
            }
          />
        )
      ) : (
        <div className={cn('flex flex-col gap-3 transition-opacity', orders.isPlaceholderData && 'opacity-60')}>
          {orders.data.items.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
          <PaginationBar
            className="mt-2"
            page={page}
            pages={orders.data.meta.pages}
            onPageChange={(p) => {
              setQuery({ status, page: p });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            labels={{ previous: t('common:a11y.previous'), next: t('common:a11y.next'), page: (n) => t('common:a11y.page', { page: n }), morePages: t('common:a11y.morePages') }}
          />
        </div>
      )}
    </div>
  );
}
