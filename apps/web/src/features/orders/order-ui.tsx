import { useSettings } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import { ORDER_TIMELINE, type OrderDetail, type OrderStatus, type PaymentStatus } from '@vero/types';
import { Alert, AlertDescription, AlertTitle, Badge, Button, cn, type BadgeVariant } from '@vero/ui';
import { CheckIcon, CircleXIcon, CreditCardIcon, ExternalLinkIcon, MapPinIcon, PhoneIcon, RotateCwIcon, StoreIcon, TruckIcon, UndoIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SmartImage } from '../../components/common/SmartImage';
import { useFormat } from '../../hooks/use-format';
import { LocaleLink, useLang } from '../../hooks/use-lang';
import { formatAddress } from '../address/address';

const ORDER_TONE: Record<OrderStatus, BadgeVariant> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  PROCESSING: 'info',
  PACKED: 'info',
  SHIPPED: 'brand',
  DELIVERED: 'success',
  CANCELLED: 'muted',
  RETURNED: 'muted',
};

const PAYMENT_TONE: Record<PaymentStatus, BadgeVariant> = {
  PENDING: 'warning',
  PAID: 'success',
  FAILED: 'danger',
  CANCELLED: 'muted',
  REFUND_PENDING: 'warning',
  REFUNDED: 'muted',
};

export function OrderStatusBadge({ status, size = 'default' }: { status: OrderStatus; size?: 'sm' | 'default' | 'lg' }) {
  const { t } = useTranslation();
  return (
    <Badge variant={ORDER_TONE[status]} size={size} dot>
      {t(`common:orderStatus.${status}`)}
    </Badge>
  );
}

export function PaymentStatusBadge({ status, size = 'default' }: { status: PaymentStatus; size?: 'sm' | 'default' | 'lg' }) {
  const { t } = useTranslation();
  return (
    <Badge variant={PAYMENT_TONE[status]} size={size}>
      {t(`common:paymentStatus.${status}`)}
    </Badge>
  );
}

/** Cash / card on delivery orders are paid on receipt — "awaiting payment" would be misleading there. */
export function isPayOnReceipt(order: Pick<OrderDetail, 'payment'>): boolean {
  return order.payment.provider === 'cash';
}

/** Payment line for lists: method + status, or "pay on receipt" for cash orders. */
export function PaymentSummary({ order }: { order: Pick<OrderDetail, 'payment' | 'paymentMethod' | 'paymentStatus'> }) {
  const { t } = useTranslation();
  const payOnReceipt = order.payment.provider === 'cash' && order.paymentStatus === 'PENDING';
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span>{t(`common:paymentMethod.${order.paymentMethod}`)}</span>
      {payOnReceipt ? null : <PaymentStatusBadge status={order.paymentStatus} size="sm" />}
    </span>
  );
}

/** Customer-facing status timeline (PENDING → DELIVERED) with the cancel / return branch. */
export function OrderTimeline({ order }: { order: OrderDetail }) {
  const { t } = useTranslation();
  const f = useFormat();
  const history = order.statusHistory;
  const eventOf = (status: OrderStatus) => [...history].reverse().find((e) => e.status === status);
  const terminal = order.status === 'CANCELLED' || order.status === 'RETURNED';
  // pickup orders normally skip "shipped"
  const steps = ORDER_TIMELINE.filter((s) => s !== 'SHIPPED' || order.deliveryMethod === 'courier' || !!eventOf('SHIPPED'));
  const reachedIndex = terminal
    ? Math.max(-1, ...steps.map((s, i) => (eventOf(s) ? i : -1)))
    : Math.max(0, steps.indexOf(order.status));
  const visible = terminal ? steps.slice(0, reachedIndex + 1) : steps;
  const terminalEvent = terminal ? eventOf(order.status) : undefined;

  return (
    <ol className="flex flex-col" aria-label={t('shop:orders.timeline')}>
      {visible.map((status, i) => {
        const event = eventOf(status);
        const done = i < reachedIndex || (i === reachedIndex && (terminal || status === 'DELIVERED'));
        const current = !terminal && i === reachedIndex && status !== 'DELIVERED';
        const last = i === visible.length - 1 && !terminal;
        return (
          <li key={status} className="relative flex gap-3.5 pb-5 last:pb-0" aria-current={current ? 'step' : undefined}>
            {!last ? (
              <span aria-hidden="true" className={cn('absolute start-[11px] top-7 bottom-1 w-px', i < reachedIndex || terminal ? 'bg-primary/70 dark:bg-brand/70' : 'bg-border')} />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                'relative z-[1] mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold',
                done && 'border-primary bg-primary text-primary-foreground dark:border-brand dark:bg-brand dark:text-graphite',
                current && 'border-primary bg-brand-soft text-primary ring-4 ring-brand-soft dark:border-brand dark:text-brand',
                !done && !current && 'border-border bg-card text-muted-foreground',
              )}
            >
              {done ? <CheckIcon className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className={cn('text-sm font-semibold', !done && !current && 'text-muted-foreground')}>
                {t(`common:orderStatus.${status}`)}
                {done || current ? <span className="sr-only">{done ? `, ${t('checkout.stepCompleted')}` : ''}</span> : null}
              </span>
              {event ? <span className="text-xs text-muted-foreground tabular-nums">{f.date(event.at, 'datetime')}</span> : null}
              {current ? <span className="text-xs text-muted-foreground">{t(`common:orderStatusHint.${status}`)}</span> : null}
              {event?.note && (done || current) ? <span className="text-xs text-muted-foreground">{event.note}</span> : null}
            </div>
          </li>
        );
      })}
      {terminal ? (
        <li className="relative flex gap-3.5">
          <span aria-hidden="true" className="relative z-[1] mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-danger/30 bg-danger-soft text-danger">
            {order.status === 'RETURNED' ? <UndoIcon className="size-3.5" /> : <CircleXIcon className="size-3.5" />}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-semibold">{t(`common:orderStatus.${order.status}`)}</span>
            {terminalEvent ? <span className="text-xs text-muted-foreground tabular-nums">{f.date(terminalEvent.at, 'datetime')}</span> : null}
            {order.cancelReason ? <span className="text-xs text-muted-foreground">{t('order.reason', { reason: order.cancelReason })}</span> : null}
          </div>
        </li>
      ) : null}
    </ol>
  );
}

/** Items of an order with links to the products (and "write a review" for delivered orders). */
export function OrderItemsList({ order, reviewable = false, limit }: { order: OrderDetail; reviewable?: boolean; limit?: number }) {
  const { t } = useTranslation();
  const f = useFormat();
  const items = limit ? order.items.slice(0, limit) : order.items;
  return (
    <ul className="divide-y divide-border">
      {items.map((i) => (
        <li key={i.id} className="flex gap-3 py-3 first:pt-0 last:pb-0 sm:gap-4">
          <LocaleLink to={STORE_ROUTES.product(i.slug)} className="img-well size-16 shrink-0 overflow-hidden rounded-lg bg-well sm:size-20" tabIndex={-1} aria-hidden="true">
            <SmartImage image={i.image} prefer="thumb" sizes="80px" className="size-full object-contain" alt="" />
          </LocaleLink>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <LocaleLink to={STORE_ROUTES.product(i.slug)} className="line-clamp-2 text-sm leading-snug font-semibold hover:text-primary dark:hover:text-brand">
              {i.name}
            </LocaleLink>
            <span className="text-xs text-muted-foreground">
              {i.variantName ? `${i.variantName} · ` : ''}
              {t('common:product.sku')}: {i.sku}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">{t('shop:orders.qty', { count: i.quantity, price: f.price(i.price) })}</span>
            {i.warrantyMonths ? <span className="text-xs text-muted-foreground">{t('common:product.warrantyMonths', { count: i.warrantyMonths })}</span> : null}
            {reviewable ? (
              i.reviewed ? (
                <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-success">
                  <CheckIcon className="size-3.5" aria-hidden="true" />
                  {t('shop:orders.reviewed')}
                </span>
              ) : (
                <Button asChild variant="outline" size="xs" className="mt-1 w-fit">
                  <LocaleLink to={`${STORE_ROUTES.product(i.slug)}?review=1#reviews`}>{t('shop:orders.writeReview')}</LocaleLink>
                </Button>
              )
            ) : null}
          </div>
          <span className="shrink-0 text-sm font-bold tabular-nums">{f.price(i.total)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Amount breakdown (all numbers come from the API). */
export function OrderTotals({ order }: { order: OrderDetail }) {
  const { t } = useTranslation();
  const f = useFormat();
  const discount = order.productDiscount + order.couponDiscount;
  return (
    <dl className="flex flex-col gap-2 text-sm">
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">{t('shop:orders.subtotal')}</dt>
        <dd className="font-semibold tabular-nums">{f.price(order.oldSubtotal || order.subtotal)}</dd>
      </div>
      {discount > 0 ? (
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">
            {t('shop:orders.discount')}
            {order.coupon ? <span className="ms-1 font-mono text-xs">({order.coupon.code})</span> : null}
          </dt>
          <dd className="font-semibold text-success tabular-nums">−{f.price(discount)}</dd>
        </div>
      ) : null}
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">{t('shop:orders.deliveryFee')}</dt>
        <dd className="font-semibold tabular-nums">{order.deliveryFee > 0 ? f.price(order.deliveryFee) : t('common:labels.free')}</dd>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-border pt-3">
        <dt className="text-base font-bold">{t('shop:orders.total')}</dt>
        <dd className="text-lg font-bold tabular-nums">{f.price(order.total)}</dd>
      </div>
      {order.payment.installment ? (
        <div className="flex justify-between gap-3 rounded-lg bg-brand-soft px-3 py-2 text-brand-soft-foreground">
          <dt className="font-medium">{t('checkout.installmentFor', { count: order.payment.installment.months })}</dt>
          <dd className="font-bold tabular-nums">
            {f.price(order.payment.installment.monthlyPayment)} / {t('common:units.month')}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

/** Delivery method, address or pickup point, estimate and tracking. */
export function DeliveryInfo({ order }: { order: OrderDetail }) {
  const { t } = useTranslation();
  const f = useFormat();
  const lang = useLang();
  const d = order.delivery;
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <p className="flex items-center gap-2 font-semibold">
        {d.method === 'pickup' ? <StoreIcon className="size-4 text-muted-foreground" aria-hidden="true" /> : <TruckIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
        {t(`common:deliveryMethod.${d.method}`)}
        {d.zoneName ? <span className="font-normal text-muted-foreground">· {d.zoneName}</span> : null}
      </p>
      {d.method === 'pickup' && d.pickupPoint ? (
        <>
          <p className="font-medium">{d.pickupPoint.name}</p>
          <p className="flex gap-1.5 text-muted-foreground">
            <MapPinIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {d.pickupPoint.address}
          </p>
          <p className="text-muted-foreground">{d.pickupPoint.workingHours}</p>
          {d.pickupPoint.phone ? (
            <a href={`tel:${d.pickupPoint.phone}`} className="inline-flex w-fit items-center gap-1.5 text-muted-foreground tabular-nums hover:text-foreground">
              <PhoneIcon className="size-3.5" aria-hidden="true" />
              {f.phone(d.pickupPoint.phone)}
            </a>
          ) : null}
        </>
      ) : d.address ? (
        <p className="text-muted-foreground">{formatAddress(d.address, lang, t)}</p>
      ) : null}
      {d.estimatedFrom && d.estimatedTo && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && order.status !== 'RETURNED' ? (
        <p className="text-muted-foreground">
          {t('shop:orders.estimated', {
            date: d.estimatedFrom.slice(0, 10) === d.estimatedTo.slice(0, 10) ? f.date(d.estimatedTo, 'dayMonth') : `${f.date(d.estimatedFrom, 'dayMonth')} – ${f.date(d.estimatedTo, 'dayMonth')}`,
          })}
        </p>
      ) : null}
      {d.carrier ? <p className="text-muted-foreground">{t('shop:orders.carrier', { name: d.carrier })}</p> : null}
      {d.trackingNumber ? <p className="font-medium tabular-nums">{t('shop:orders.tracking', { number: d.trackingNumber })}</p> : null}
    </div>
  );
}

/**
 * Payment state and the next action. Online payments open the provider URL returned by the API —
 * an order is shown as paid only when the API reports `PAID`.
 */
export function PaymentPanel({
  order,
  checking = false,
  timedOut = false,
  onRefresh,
  refreshing = false,
}: {
  order: OrderDetail;
  /** waiting for the provider callback after returning from the payment page */
  checking?: boolean;
  timedOut?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const settings = useSettings();
  const [redirecting, setRedirecting] = useState(false);
  const p = order.payment;
  const phone = settings.data?.store.phone;
  const methodName = t(`common:paymentMethod.${p.method}`);
  const cancelledOrder = order.status === 'CANCELLED' || order.status === 'RETURNED';

  if (p.status === 'PAID') {
    return (
      <Alert variant="success">
        <AlertTitle>{t('shop:checkout.successPaid')}</AlertTitle>
        <AlertDescription>
          {methodName}
          {p.paidAt ? ` · ${t('payment.paidAt', { date: f.date(p.paidAt, 'datetime') })}` : ''}
        </AlertDescription>
      </Alert>
    );
  }

  if (p.status === 'FAILED' || p.status === 'CANCELLED' || p.status === 'REFUND_PENDING' || p.status === 'REFUNDED') {
    const failed = p.status === 'FAILED';
    return (
      <Alert variant={failed ? 'danger' : 'default'}>
        <AlertTitle>{t(`common:paymentStatus.${p.status}`)}</AlertTitle>
        <AlertDescription>
          <span>{methodName}</span>
          {failed && !cancelledOrder ? (
            <span>
              {t('payment.failedHint')}
              {phone ? (
                <>
                  {' '}
                  <a href={`tel:${phone}`} className="font-semibold text-foreground tabular-nums underline-offset-2 hover:underline">
                    {f.phone(phone)}
                  </a>
                </>
              ) : null}
            </span>
          ) : null}
        </AlertDescription>
      </Alert>
    );
  }

  // PENDING
  if (cancelledOrder) {
    return (
      <p className="text-sm text-muted-foreground">
        {methodName} · {t('common:orderStatus.CANCELLED')}
      </p>
    );
  }

  if (p.provider === 'cash') {
    return (
      <Alert variant="default" icon={<CreditCardIcon />}>
        <AlertTitle>{methodName}</AlertTitle>
        <AlertDescription>{order.deliveryMethod === 'pickup' ? t('payment.onReceiptPickup') : t('payment.onReceiptCourier')}</AlertDescription>
      </Alert>
    );
  }

  if (p.provider === 'installment') {
    return (
      <Alert variant="brand">
        <AlertTitle>
          {methodName}
          {p.installment && p.installment.status !== 'NONE' ? <span className="font-medium text-muted-foreground"> · {t(`common:installmentStatus.${p.installment.status}`)}</span> : null}
        </AlertTitle>
        <AlertDescription>
          <span>{t('shop:checkout.successInstallment')}</span>
          {p.action?.type === 'instructions' ? <span>{p.action.message}</span> : null}
        </AlertDescription>
      </Alert>
    );
  }

  // online provider, awaiting payment
  const action = p.action;
  return (
    <Alert variant={checking ? 'info' : 'warning'}>
      <AlertTitle>{checking ? t('payment.checking') : t('shop:checkout.successAwaitingPayment')}</AlertTitle>
      <AlertDescription>
        <span>{methodName}</span>
        {timedOut ? <span>{t('payment.notConfirmedYet')}</span> : null}
        {action?.type === 'instructions' ? <span>{action.message}</span> : null}
        {!action ? <span>{t('payment.unavailableNow')}</span> : null}
        <span className="mt-2 flex flex-wrap gap-2">
          {action?.type === 'redirect' ? (
            <Button asChild size="lg" rightIcon={<ExternalLinkIcon aria-hidden="true" />}>
              <a href={action.url} onClick={() => setRedirecting(true)} rel="noopener" aria-busy={redirecting || undefined}>
                {redirecting ? t('shop:checkout.redirecting') : `${t('shop:checkout.payNow')} · ${f.price(order.total)}`}
              </a>
            </Button>
          ) : null}
          {onRefresh ? (
            <Button variant="outline" size="lg" onClick={onRefresh} loading={refreshing} leftIcon={<RotateCwIcon aria-hidden="true" />}>
              {t('payment.refreshStatus')}
            </Button>
          ) : null}
        </span>
      </AlertDescription>
    </Alert>
  );
}
