import { useAdminItem, useAdminMutation, useSession } from '@vero/api-client';
import type { AdminOrder, OrderStatus, PaymentStatus } from '@vero/types';
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  toast,
} from '@vero/ui';
import { ArrowRightIcon, CheckIcon, ChevronDownIcon, MapPinIcon, PencilIcon, PrinterIcon, StickyNoteIcon, TruckIcon, UserRoundIcon, XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { StatusBadge } from '../../components/common/badges';
import { CopyButton } from '../../components/common/CopyButton';
import { KeyValueList, Page, PageHeader, Panel, usePageMeta } from '../../components/common/page';
import { ErrorState } from '../../components/common/states';
import { Thumb } from '../../components/common/Thumb';
import { isNotFound, toastError } from '../../lib/errors';
import { useFormat } from '../../lib/format';
import { ItemNotFound } from '../errors/NotFoundPage';
import { DeliveryEditDialog, InstallmentDecisionDialog, PaymentStatusDialog, StatusChangeDialog } from './order-dialogs';
import { PrintOrder, type PrintKind } from './PrintOrder';

const FORWARD: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'];

function useFinanceVisible() {
  const { can } = useSession();
  // same rule as the API dashboard (financeVisible): analytics or expenses access
  return can(['analytics.read', 'expenses.read'], 'any');
}

function StatusStepper({ status }: { status: OrderStatus }) {
  const { t } = useTranslation();
  const terminal = status === 'CANCELLED' || status === 'RETURNED';
  const index = FORWARD.indexOf(status);
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2" aria-label={t('orders.status.title')}>
      {FORWARD.map((s, i) => {
        const done = !terminal && i <= index;
        const current = !terminal && i === index;
        return (
          <li key={s} className="flex items-center gap-1" aria-current={current ? 'step' : undefined}>
            <span
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold',
                current ? 'border-primary bg-brand-soft text-brand-soft-foreground dark:border-brand' : done ? 'border-success/30 bg-success-soft text-success' : 'border-border text-muted-foreground',
              )}
            >
              {done && !current ? <CheckIcon className="size-3" aria-hidden="true" /> : null}
              {t(`common:orderStatus.${s}`)}
            </span>
            {i < FORWARD.length - 1 ? <ArrowRightIcon className="size-3 text-muted-foreground/60" aria-hidden="true" /> : null}
          </li>
        );
      })}
      {terminal ? (
        <li className="ms-2">
          <StatusBadge kind="order" value={status} />
        </li>
      ) : null}
    </ol>
  );
}

function OrderSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3" aria-hidden="true">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const query = useAdminItem('orders', id, (api, orderId) => api.admin.orders.get(orderId));
  const order = query.data;
  usePageMeta(t('orders.title'), order ? t('orders.number', { number: order.number }) : undefined);

  if (query.isError && !order) {
    return isNotFound(query.error) ? <ItemNotFound backTo="/orders" /> : <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }
  return (
    <Page>
      {order ? <OrderView order={order} /> : <OrderSkeleton />}
    </Page>
  );
}

function OrderView({ order }: { order: AdminOrder }) {
  const { t } = useTranslation();
  const f = useFormat();
  const { can } = useSession();
  const finance = useFinanceVisible();
  const [statusTo, setStatusTo] = useState<OrderStatus | null>(null);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [paymentTo, setPaymentTo] = useState<Extract<PaymentStatus, 'PAID' | 'CANCELLED' | 'REFUNDED'> | null>(null);
  const [installment, setInstallment] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [printKind, setPrintKind] = useState<PrintKind | null>(null);
  const canUpdate = can('orders.update');
  const canPayment = can(['orders.update', 'payments.update']);

  useEffect(() => {
    const after = () => setPrintKind(null);
    window.addEventListener('afterprint', after);
    return () => window.removeEventListener('afterprint', after);
  }, []);

  const print = (kind: PrintKind) => {
    flushSync(() => setPrintKind(kind));
    window.print();
  };

  // online payments (Payme / Click) become paid only through the provider's confirmation — the API refuses it by hand
  const onlinePayment = order.payment.provider === 'payme' || order.payment.provider === 'click';
  const awaitingPayment = order.payment.status === 'PENDING' || order.payment.status === 'FAILED';
  const paymentActions: Array<Extract<PaymentStatus, 'PAID' | 'CANCELLED' | 'REFUNDED'>> = awaitingPayment
    ? onlinePayment
      ? ['CANCELLED']
      : ['PAID', 'CANCELLED']
    : order.payment.status === 'PAID' || order.payment.status === 'REFUND_PENDING'
      ? ['REFUNDED']
      : [];
  const addr = order.delivery.address;

  return (
    <>
      <PageHeader
        back={{ to: '/orders', label: t('orders.back') }}
        title={
          <span className="inline-flex items-center gap-1">
            <span className="tabular">{t('orders.number', { number: order.number })}</span>
            <CopyButton value={order.number} />
          </span>
        }
        meta={
          <>
            <StatusBadge kind="order" value={order.status} size="lg" />
            <StatusBadge kind="payment" value={order.paymentStatus} size="lg" />
          </>
        }
        description={t('orders.createdVia', { date: f.datetime(order.createdAt), source: t(`enums.source.${order.source}`) })}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" leftIcon={<PrinterIcon />} rightIcon={<ChevronDownIcon />}>
                {t('orders.print.menu')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => print('invoice')}>{t('orders.print.invoice')}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => print('packing')}>{t('orders.print.packingSlip')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <Panel title={t('orders.status.title')}>
            <div className="flex flex-col gap-4">
              <StatusStepper status={order.status} />
              {order.cancelReason ? <p className="text-[13px] text-muted-foreground">{t('orders.cancelReason', { reason: order.cancelReason })}</p> : null}
              {order.allowedTransitions.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">{t('orders.status.final')}</p>
              ) : canUpdate ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] text-muted-foreground">{t('orders.status.next')}:</span>
                  {order.allowedTransitions.map((to) => (
                    <Button key={to} size="sm" variant={to === 'CANCELLED' || to === 'RETURNED' ? 'outline' : 'default'} className={cn((to === 'CANCELLED' || to === 'RETURNED') && 'text-danger hover:text-danger')} onClick={() => setStatusTo(to)} leftIcon={to === 'CANCELLED' ? <XIcon /> : undefined}>
                      {t(`common:orderStatus.${to}`)}
                    </Button>
                  ))}
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">{order.inventoryDeducted ? t('orders.inventory.deducted') : order.status !== 'CANCELLED' ? t('orders.inventory.reserved') : null}</p>
            </div>
          </Panel>

          <Panel title={t('orders.items.title')} description={t('orders.items.count', { count: order.itemsCount })} flush>
            <Table className="text-[13px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="h-9 ps-4 text-xs">{t('orders.items.product')}</TableHead>
                  <TableHead className="h-9 text-end text-xs">{t('orders.items.price')}</TableHead>
                  <TableHead className="h-9 text-end text-xs">{t('orders.items.qty')}</TableHead>
                  {order.couponDiscount ? <TableHead className="h-9 text-end text-xs">{t('orders.items.coupon')}</TableHead> : null}
                  {finance ? <TableHead className="h-9 text-end text-xs">{t('orders.items.cost')}</TableHead> : null}
                  <TableHead className="h-9 pe-4 text-end text-xs">{t('orders.items.total')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="py-2.5 ps-4 whitespace-normal">
                      <div className="flex min-w-60 items-center gap-3">
                        <Thumb src={item.image?.thumb ?? item.image?.url} size="md" />
                        <div className="flex min-w-0 flex-col">
                          {can('products.read') ? (
                            <Link to={`/products/${item.product}`} className="line-clamp-2 font-medium hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                              {f.loc(item.name)}
                            </Link>
                          ) : (
                            <span className="line-clamp-2 font-medium">{f.loc(item.name)}</span>
                          )}
                          {item.variantName ? <span className="text-xs text-muted-foreground">{f.loc(item.variantName)}</span> : null}
                          <span className="text-xs text-muted-foreground tabular">{item.sku}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-end tabular">
                      <div className="flex flex-col items-end">
                        <span>{f.money(item.price)}</span>
                        {item.oldPrice && item.oldPrice > item.price ? <span className="text-xs text-muted-foreground line-through">{f.money(item.oldPrice)}</span> : null}
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-end tabular">× {item.quantity}</TableCell>
                    {order.couponDiscount ? <TableCell className="py-2.5 text-end text-danger tabular">{item.couponDiscount ? `−${f.money(item.couponDiscount)}` : '—'}</TableCell> : null}
                    {finance ? <TableCell className="py-2.5 text-end text-muted-foreground tabular">{f.money(item.costPrice * item.quantity)}</TableCell> : null}
                    <TableCell className="py-2.5 pe-4 text-end font-semibold tabular">{f.money(item.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t border-border px-4 py-3 sm:px-5">
              <dl className="ms-auto flex max-w-sm flex-col gap-1.5 text-[13px]">
                {order.productDiscount ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{t('orders.totals.subtotalBefore')}</dt>
                    <dd className="tabular">{f.money(order.oldSubtotal)}</dd>
                  </div>
                ) : null}
                {order.productDiscount ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground" title={t('orders.totals.discountNote')}>
                      {t('orders.totals.productDiscount')}
                    </dt>
                    <dd className="text-danger tabular">−{f.money(order.productDiscount)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{t('orders.totals.subtotal')}</dt>
                  <dd className="tabular">{f.money(order.subtotal)}</dd>
                </div>
                {order.couponDiscount ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{t('orders.totals.coupon', { code: order.coupon?.code ?? '' })}</dt>
                    <dd className="text-danger tabular">−{f.money(order.couponDiscount)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{t('orders.totals.delivery')}</dt>
                  <dd className="tabular">{order.deliveryFee ? f.money(order.deliveryFee) : t('orders.totals.free')}</dd>
                </div>
                <div className="mt-1 flex justify-between gap-4 border-t border-border pt-2 text-[15px] font-bold">
                  <dt>{t('orders.totals.total')}</dt>
                  <dd className="tabular">{f.money(order.total)}</dd>
                </div>
                {finance ? (
                  <>
                    <div className="mt-1 flex justify-between gap-4">
                      <dt className="text-muted-foreground">{t('orders.totals.cost')}</dt>
                      <dd className="text-muted-foreground tabular">{f.money(order.costTotal)}</dd>
                    </div>
                    <div className="flex justify-between gap-4" title={t('orders.totals.profitHint')}>
                      <dt className="text-muted-foreground">{t('orders.totals.profit')}</dt>
                      <dd className={cn('font-semibold tabular', order.estimatedProfit < 0 ? 'text-danger' : 'text-success')}>{f.money(order.estimatedProfit)}</dd>
                    </div>
                  </>
                ) : null}
              </dl>
            </div>
          </Panel>

          <Panel title={t('orders.timeline.title')}>
            {order.statusHistory.length ? (
              <ol className="relative flex flex-col gap-4 border-s border-border ps-5">
                {[...order.statusHistory].reverse().map((ev, i) => (
                  <li key={`${ev.status}-${ev.at}-${i}`} className="relative">
                    <span className={cn('absolute -start-[1.6rem] top-1 size-2.5 rounded-full ring-4 ring-card', i === 0 ? 'bg-primary dark:bg-brand' : 'bg-muted-foreground/40')} aria-hidden="true" />
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <StatusBadge kind="order" value={ev.status} size="sm" />
                      <time dateTime={ev.at} className="text-xs text-muted-foreground tabular">
                        {f.datetime(ev.at)}
                      </time>
                      <span className="text-xs text-muted-foreground">· {ev.by ?? t('orders.timeline.system')}</span>
                    </div>
                    {ev.note ? <p className="mt-1 text-[13px] text-foreground">{ev.note}</p> : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">{t('orders.timeline.empty')}</p>
            )}
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Panel
            title={t('orders.customer.title')}
            actions={
              can('customers.read') && order.customer.id ? (
                <Button variant="ghost" size="xs" asChild leftIcon={<UserRoundIcon />}>
                  <Link to={`/customers/${order.customer.id}`}>{t('orders.customer.open')}</Link>
                </Button>
              ) : undefined
            }
          >
            <KeyValueList
              items={[
                { label: t('common.name'), value: `${order.customerInfo.firstName} ${order.customerInfo.lastName}`.trim() },
                {
                  label: t('common.phone'),
                  value: (
                    <a href={`tel:${order.customerInfo.phone}`} className="tabular hover:underline">
                      {f.phone(order.customerInfo.phone)}
                    </a>
                  ),
                },
                { label: t('common.email'), value: order.customerInfo.email ? <a href={`mailto:${order.customerInfo.email}`} className="hover:underline">{order.customerInfo.email}</a> : '—' },
              ]}
            />
            {order.comment ? (
              <div className="mt-3 rounded-lg bg-surface px-3 py-2 text-[13px]">
                <p className="mb-0.5 text-xs font-semibold text-muted-foreground">{t('orders.customer.comment')}</p>
                <p className="whitespace-pre-line">{order.comment}</p>
              </div>
            ) : null}
          </Panel>

          <Panel
            title={t('orders.delivery.title')}
            actions={
              canUpdate && order.deliveryMethod === 'courier' ? (
                <Button variant="ghost" size="xs" onClick={() => setDeliveryOpen(true)} leftIcon={<PencilIcon />}>
                  {t('common.edit')}
                </Button>
              ) : undefined
            }
          >
            <KeyValueList
              items={[
                {
                  label: t('orders.delivery.method'),
                  value: (
                    <span className="inline-flex items-center gap-1.5">
                      {order.deliveryMethod === 'courier' ? <TruckIcon className="size-3.5 text-muted-foreground" aria-hidden="true" /> : <MapPinIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />}
                      {t(`common:deliveryMethod.${order.deliveryMethod}`)}
                    </span>
                  ),
                },
                {
                  label: order.deliveryMethod === 'pickup' ? t('orders.delivery.pickupPoint') : t('orders.delivery.address'),
                  value: addr ? (
                    <span className="flex flex-col">
                      <span>{[addr.regionName, addr.city, addr.district].filter(Boolean).join(', ')}</span>
                      <span>
                        {[addr.street, addr.house ? t('orders.delivery.house', { n: addr.house }) : null, addr.apartment ? t('orders.delivery.apartment', { n: addr.apartment }) : null].filter(Boolean).join(', ')}
                      </span>
                      {addr.comment ? <span className="text-xs text-muted-foreground">{addr.comment}</span> : null}
                    </span>
                  ) : order.delivery.pickupPoint ? (
                    <span className="flex flex-col">
                      <span>{order.delivery.pickupPoint.name}</span>
                      <span className="text-xs text-muted-foreground">{order.delivery.pickupPoint.address}</span>
                      {order.delivery.pickupPoint.workingHours ? <span className="text-xs text-muted-foreground">{order.delivery.pickupPoint.workingHours}</span> : null}
                    </span>
                  ) : (
                    '—'
                  ),
                },
                { label: t('orders.delivery.recipient'), value: addr ? `${addr.firstName} ${addr.lastName} · ${f.phone(addr.phone)}` : null, hidden: !addr || (addr.phone === order.customerInfo.phone && addr.firstName === order.customerInfo.firstName) },
                { label: t('orders.delivery.zone'), value: order.delivery.zone ? f.loc(order.delivery.zone.name) : null, hidden: !order.delivery.zone },
                { label: t('orders.delivery.fee'), value: order.delivery.fee ? f.money(order.delivery.fee) : t('orders.totals.free') },
                { label: t('orders.delivery.term'), value: t('orders.delivery.termValue', { min: order.delivery.minDays, max: order.delivery.maxDays }) },
                { label: t('orders.delivery.carrier'), value: order.delivery.carrier ?? '—', hidden: order.deliveryMethod !== 'courier' },
                {
                  label: t('orders.delivery.tracking'),
                  value: order.delivery.trackingNumber ? (
                    <span className="inline-flex items-center gap-1 tabular">
                      {order.delivery.trackingNumber}
                      <CopyButton value={order.delivery.trackingNumber} />
                    </span>
                  ) : (
                    '—'
                  ),
                  hidden: order.deliveryMethod !== 'courier',
                },
              ]}
            />
          </Panel>

          <Panel title={t('orders.payment.title')}>
            <KeyValueList
              items={[
                { label: t('orders.payment.method'), value: t(`common:paymentMethod.${order.payment.method}`) },
                { label: t('orders.payment.provider'), value: t(`enums.provider.${order.payment.provider}`) },
                { label: t('orders.payment.status'), value: <StatusBadge kind="payment" value={order.payment.status} /> },
                { label: t('orders.payment.transaction'), value: order.payment.transactionId ? <span className="font-mono text-xs break-all">{order.payment.transactionId}</span> : '—' },
                { label: t('orders.payment.paidAt'), value: order.payment.paidAt ? f.datetime(order.payment.paidAt) : '—' },
              ]}
            />
            {order.payment.installment ? (
              <div className="mt-4 flex flex-col gap-2 rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold">{t('orders.payment.installment')}</span>
                  <StatusBadge kind="installment" value={order.payment.installment.status} size="sm" />
                </div>
                <p className="text-[13px] text-muted-foreground tabular">
                  {t('orders.payment.installmentTerms', { months: order.payment.installment.months, markup: order.payment.installment.markupPercent, monthly: f.money(order.payment.installment.monthlyPayment) })}
                </p>
                <p className="text-[13px] tabular">{t('orders.payment.installmentTotal', { total: f.money(order.payment.installment.total) })}</p>
                {canUpdate && order.payment.installment.status === 'UNDER_REVIEW' ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setInstallment('APPROVED')} leftIcon={<CheckIcon />}>
                      {t('orders.payment.approve')}
                    </Button>
                    <Button size="sm" variant="outline" className="text-danger hover:text-danger" onClick={() => setInstallment('REJECTED')} leftIcon={<XIcon />}>
                      {t('orders.payment.reject')}
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
            {order.payment.id && onlinePayment && awaitingPayment ? <p className="mt-3 text-xs text-muted-foreground">{t('orders.payment.providerConfirms')}</p> : null}
            {order.payment.id && paymentActions.length ? (
              canPayment ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {paymentActions.map((to) => (
                    <Button key={to} size="sm" variant={to === 'PAID' ? 'default' : 'outline'} onClick={() => setPaymentTo(to)}>
                      {to === 'PAID' ? t('orders.payment.markPaid') : to === 'REFUNDED' ? t('orders.payment.markRefunded') : t('orders.payment.markCancelled')}
                    </Button>
                  ))}
                </div>
              ) : canUpdate ? (
                <p className="mt-3 text-xs text-muted-foreground">{t('orders.payment.needsPermission')}</p>
              ) : null
            ) : null}
          </Panel>

          <NotesPanel order={order} />
        </div>
      </div>

      <StatusChangeDialog order={order} to={statusTo} onOpenChange={(o) => !o && setStatusTo(null)} />
      <DeliveryEditDialog order={order} open={deliveryOpen} onOpenChange={setDeliveryOpen} />
      <PaymentStatusDialog order={order} to={paymentTo} onOpenChange={(o) => !o && setPaymentTo(null)} />
      <InstallmentDecisionDialog order={order} decision={installment} onOpenChange={(o) => !o && setInstallment(null)} />
      <PrintOrder order={order} kind={printKind} />
    </>
  );
}

function NotesPanel({ order }: { order: AdminOrder }) {
  const { t } = useTranslation();
  const f = useFormat();
  const { can } = useSession();
  const [text, setText] = useState('');
  const add = useAdminMutation((api, value: string) => api.admin.orders.addNote(order.id, value), { invalidate: ['orders'] });
  const submit = async () => {
    const value = text.trim();
    if (!value) return;
    try {
      await add.mutateAsync(value);
      setText('');
      toast.success(t('orders.notes.added'));
    } catch (error) {
      toastError(t, error);
    }
  };
  return (
    <Panel title={t('orders.notes.title')} description={t('orders.notes.hint')}>
      <div className="flex flex-col gap-3">
        {order.adminNotes.length ? (
          <ul className="flex flex-col gap-2">
            {[...order.adminNotes].reverse().map((n, i) => (
              <li key={`${n.at}-${i}`} className="rounded-lg bg-surface px-3 py-2">
                <p className="text-[13px] whitespace-pre-line">{n.text}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {n.by} · {f.datetime(n.at)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <StickyNoteIcon className="size-4" aria-hidden="true" />
            {t('orders.notes.empty')}
          </p>
        )}
        {can('orders.update') ? (
          <div className="flex flex-col gap-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('orders.notes.placeholder')}
              aria-label={t('orders.notes.add')}
              maxLength={1000}
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void submit();
              }}
            />
            <Button size="sm" variant="outline" className="self-end" onClick={() => void submit()} loading={add.isPending} disabled={!text.trim()}>
              {t('orders.notes.add')}
            </Button>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
