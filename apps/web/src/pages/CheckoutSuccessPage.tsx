import { useOrder } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import { Button, EmptyState, Skeleton, Steps, toast } from '@vero/ui';
import { ArrowRightIcon, CheckIcon, CopyIcon, PackageSearchIcon, ReceiptTextIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router';
import { ErrorState } from '../components/common/states';
import { useCheckoutStepLabels } from '../features/checkout/state';
import { DeliveryInfo, OrderItemsList, OrderStatusBadge, OrderTotals, PaymentPanel } from '../features/orders/order-ui';
import { useDocumentMeta } from '../hooks/use-document-meta';
import { useFormat } from '../hooks/use-format';
import { LocaleLink } from '../hooks/use-lang';
import { isNotFound } from '../lib/errors';

/** After returning from a payment provider the callback may take a moment: poll a little. */
const POLL_MS = 3000;
const POLL_ATTEMPTS = 20;

function CopyNumber({ number }: { number: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(number);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('common:status.error'));
    }
  };
  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-base font-bold tracking-wide tabular-nums hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
      aria-label={`${t('common:actions.copy')}: ${number}`}
    >
      {number}
      {copied ? <CheckIcon className="size-4 text-success" aria-hidden="true" /> : <CopyIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
      <span className="sr-only" aria-live="polite">
        {copied ? t('common:actions.copied') : ''}
      </span>
    </button>
  );
}

export default function CheckoutSuccessPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const returnedFromPayment = searchParams.get('payment') === 'return';
  const order = useOrder(orderId);
  const steps = useCheckoutStepLabels();
  const [attempts, setAttempts] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useDocumentMeta({ title: t('shop:checkout.successTitle'), noindex: true });

  const data = order.data;
  const awaitingOnline = !!data && data.payment.status === 'PENDING' && (data.payment.provider === 'click' || data.payment.provider === 'payme') && data.status === 'PENDING';
  const polling = returnedFromPayment && awaitingOnline && attempts < POLL_ATTEMPTS;

  const { refetch, isFetching } = order;
  useEffect(() => {
    if (!polling || isFetching) return;
    const id = window.setTimeout(() => {
      setAttempts((a) => a + 1);
      void refetch();
    }, POLL_MS);
    return () => window.clearTimeout(id);
  }, [polling, isFetching, refetch, attempts]);

  // move focus to the confirmation heading once (screen readers announce the result)
  const loadedId = data?.id;
  useEffect(() => {
    if (loadedId) headingRef.current?.focus({ preventScroll: true });
  }, [loadedId]);

  if (order.isPending) {
    return (
      <div className="container-page flex flex-col gap-5 py-5 sm:py-6" aria-busy="true">
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  if (order.isError || !data) {
    return (
      <div className="container-page py-8">
        {isNotFound(order.error) ? (
          <EmptyState
            icon={<PackageSearchIcon />}
            title={t('success.orderNotFound')}
            description={t('success.orderNotFoundText')}
            action={
              <Button asChild size="lg">
                <LocaleLink to={STORE_ROUTES.orders}>{t('common:nav.orders')}</LocaleLink>
              </Button>
            }
          />
        ) : (
          <ErrorState error={order.error} onRetry={() => void order.refetch()} />
        )}
      </div>
    );
  }

  return (
    <div className="container-page flex flex-col gap-5 py-5 sm:py-6">
      <Steps steps={steps} current={steps.length - 1} completedLabel={t('checkout.stepCompleted')} aria-label={t('shop:checkout.title')} className="rounded-xl border border-border bg-card p-4 sm:px-6" />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6 rounded-xl border border-border bg-card p-5 sm:p-8">
          <div className="flex flex-col items-start gap-4">
            <span className="flex size-14 items-center justify-center rounded-full bg-success-soft text-success" aria-hidden="true">
              <CheckIcon className="size-7" strokeWidth={2.5} />
            </span>
            <div className="flex flex-col gap-2">
              <h1 ref={headingRef} tabIndex={-1} className="text-2xl leading-tight font-bold tracking-tight outline-hidden sm:text-3xl">
                {t('shop:checkout.successTitle')}
              </h1>
              <p className="text-muted-foreground">{t('shop:checkout.successText', { number: data.number })}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <CopyNumber number={data.number} />
              <OrderStatusBadge status={data.status} size="lg" />
              <span className="text-sm text-muted-foreground tabular-nums">{t('shop:orders.placedOn', { date: f.date(data.createdAt, 'datetime') })}</span>
            </div>
          </div>

          <PaymentPanel
            order={data}
            checking={polling}
            timedOut={returnedFromPayment && awaitingOnline && attempts >= POLL_ATTEMPTS}
            onRefresh={awaitingOnline && !polling ? () => void order.refetch() : undefined}
            refreshing={order.isFetching}
          />

          <div className="grid gap-5 border-t border-border pt-5 sm:grid-cols-2">
            <section aria-labelledby="success-status" className="flex flex-col gap-1.5">
              <h2 id="success-status" className="text-sm font-bold">
                {t('common:labels.status')}
              </h2>
              <p className="text-sm text-muted-foreground">{t(`common:orderStatusHint.${data.status}`)}</p>
              <p className="text-xs text-muted-foreground">{t('shop:orders.liveUpdate')}</p>
            </section>
            <section aria-labelledby="success-delivery" className="flex flex-col gap-1.5">
              <h2 id="success-delivery" className="text-sm font-bold">
                {t('shop:orders.delivery')}
              </h2>
              <DeliveryInfo order={data} />
            </section>
            <section aria-labelledby="success-recipient" className="flex flex-col gap-1 text-sm">
              <h2 id="success-recipient" className="mb-0.5 font-bold">
                {t('shop:orders.recipient')}
              </h2>
              <p className="font-medium">
                {data.customer.firstName} {data.customer.lastName}
              </p>
              <p className="text-muted-foreground tabular-nums">{f.phone(data.customer.phone)}</p>
              {data.customer.email ? <p className="break-all text-muted-foreground">{data.customer.email}</p> : null}
            </section>
            {data.comment ? (
              <section aria-labelledby="success-comment" className="flex flex-col gap-1 text-sm">
                <h2 id="success-comment" className="mb-0.5 font-bold">
                  {t('shop:checkout.comment')}
                </h2>
                <p className="whitespace-pre-line text-muted-foreground">{data.comment}</p>
              </section>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-5 sm:flex-row">
            <Button asChild size="lg" leftIcon={<ReceiptTextIcon aria-hidden="true" />}>
              <LocaleLink to={STORE_ROUTES.order(data.id)}>{t('shop:checkout.trackOrder')}</LocaleLink>
            </Button>
            <Button asChild size="lg" variant="outline" rightIcon={<ArrowRightIcon aria-hidden="true" />}>
              <LocaleLink to={STORE_ROUTES.catalog}>{t('common:actions.continueShopping')}</LocaleLink>
            </Button>
          </div>
        </div>

        <aside className="flex flex-col gap-3 lg:sticky lg:top-[calc(var(--header-offset)+1rem)]" aria-labelledby="success-summary">
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
            <h2 id="success-summary" className="text-lg font-bold tracking-tight">
              {t('shop:orders.items', { count: data.itemsCount })}
            </h2>
            <OrderItemsList order={data} />
            <div className="border-t border-border pt-4">
              <OrderTotals order={data} />
            </div>
          </div>
          <p className="px-1 text-xs text-muted-foreground">{t('shop:checkout.syncNote')}</p>
        </aside>
      </div>
    </div>
  );
}
