import { isApiError, useCancelOrder, useOrder, useReorder } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import type { OrderDetail } from '@vero/types';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  EmptyState,
  Label,
  Skeleton,
  Textarea,
  toast,
} from '@vero/ui';
import { ArrowLeftIcon, PackageSearchIcon, RefreshCwIcon, XCircleIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { ErrorState } from '../../components/common/states';
import { AccountCard } from '../../features/account/AccountSection';
import { DeliveryInfo, OrderItemsList, OrderStatusBadge, OrderTimeline, OrderTotals, PaymentPanel } from '../../features/orders/order-ui';
import { useDocumentMeta } from '../../hooks/use-document-meta';
import { useFormat } from '../../hooks/use-format';
import { LocaleLink, useLocaleNavigate } from '../../hooks/use-lang';
import { isNotFound } from '../../lib/errors';
import { errorMessage } from '../../lib/i18n';
import { suppressRealtimeToast } from '../../lib/realtime-toasts';

function CancelOrderDialog({ order, open, onOpenChange }: { order: OrderDetail; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const cancel = useCancelOrder();
  const [reason, setReason] = useState('');
  const reasonId = useId();

  const submit = async () => {
    try {
      suppressRealtimeToast(`order:${order.id}:CANCELLED`);
      await cancel.mutateAsync({ id: order.id, reason: reason.trim() || undefined });
      toast.success(t('shop:orders.cancelled'));
      onOpenChange(false);
      setReason('');
    } catch (error) {
      toast.error(errorMessage(t, error));
      if (isApiError(error) && error.code === 'ORDER_CANNOT_CANCEL') onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !cancel.isPending && onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('shop:orders.cancel')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('shop:orders.cancelConfirm')} {t('shop:orders.number', { number: order.number })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={reasonId}>{t('shop:orders.cancelReason')}</Label>
          <Textarea id={reasonId} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={3} />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancel.isPending}>{t('order.keepOrder')}</AlertDialogCancel>
          <Button variant="destructive" onClick={() => void submit()} loading={cancel.isPending}>
            {t('shop:orders.cancel')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function OrderPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const navigate = useLocaleNavigate();
  const { id } = useParams();
  const order = useOrder(id);
  const reorder = useReorder();
  const [cancelOpen, setCancelOpen] = useState(false);
  const data = order.data;
  useDocumentMeta({ title: data ? t('shop:orders.number', { number: data.number }) : t('shop:orders.details'), noindex: true });

  const backLink = (
    <LocaleLink to={STORE_ROUTES.orders} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
      <ArrowLeftIcon className="size-4 rtl:rotate-180" aria-hidden="true" />
      {t('shop:orders.title')}
    </LocaleLink>
  );

  if (order.isPending) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        {backLink}
        <Skeleton className="h-10 w-72 max-w-full" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }
  if (order.isError || !data) {
    return (
      <div className="flex flex-col gap-4">
        {backLink}
        {isNotFound(order.error) ? (
          <EmptyState
            bordered
            icon={<PackageSearchIcon />}
            title={t('success.orderNotFound')}
            description={t('success.orderNotFoundText')}
            action={
              <Button asChild>
                <LocaleLink to={STORE_ROUTES.orders}>{t('shop:orders.title')}</LocaleLink>
              </Button>
            }
          />
        ) : (
          <ErrorState error={order.error} onRetry={() => void order.refetch()} />
        )}
      </div>
    );
  }

  const onReorder = async () => {
    try {
      await reorder.mutateAsync(data.id);
      toast.success(t('shop:orders.repeatDone'), { action: { label: t('common:actions.goToCart'), onClick: () => navigate(STORE_ROUTES.cart) } });
    } catch (error) {
      toast.error(errorMessage(t, error));
    }
  };

  const delivered = data.status === 'DELIVERED';

  return (
    <div className="flex flex-col gap-5">
      {backLink}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl leading-tight font-bold tracking-tight tabular-nums sm:text-[1.75rem]">{t('shop:orders.number', { number: data.number })}</h1>
            <OrderStatusBadge status={data.status} size="lg" />
          </div>
          <p className="text-sm text-muted-foreground tabular-nums">
            {t('shop:orders.placedOn', { date: f.date(data.createdAt, 'datetime') })} · {t('shop:orders.liveUpdate')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void onReorder()} loading={reorder.isPending} leftIcon={<RefreshCwIcon aria-hidden="true" />}>
            {t('shop:orders.repeat')}
          </Button>
          {data.canCancel ? (
            <Button variant="ghost" className="text-danger hover:bg-danger-soft hover:text-danger" onClick={() => setCancelOpen(true)} leftIcon={<XCircleIcon aria-hidden="true" />}>
              {t('shop:orders.cancel')}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <AccountCard title={t('shop:orders.timeline')} id="timeline">
            <OrderTimeline order={data} />
          </AccountCard>
          <AccountCard title={t('shop:orders.items', { count: data.itemsCount })} id="items">
            <OrderItemsList order={data} reviewable={delivered} />
          </AccountCard>
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <AccountCard title={t('shop:orders.payment')} id="payment">
            <PaymentPanel order={data} />
            <div className="border-t border-border pt-4">
              <OrderTotals order={data} />
            </div>
          </AccountCard>
          <AccountCard title={t('shop:orders.delivery')} id="delivery">
            <DeliveryInfo order={data} />
          </AccountCard>
          <AccountCard title={t('shop:orders.recipient')} id="recipient">
            <div className="flex flex-col gap-1 text-sm">
              <p className="font-semibold">
                {data.customer.firstName} {data.customer.lastName}
              </p>
              <p className="text-muted-foreground tabular-nums">{f.phone(data.customer.phone)}</p>
              {data.customer.email ? <p className="break-all text-muted-foreground">{data.customer.email}</p> : null}
            </div>
            {data.comment ? (
              <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
                <span className="font-semibold">{t('shop:checkout.comment')}</span>
                <p className="whitespace-pre-line text-muted-foreground">{data.comment}</p>
              </div>
            ) : null}
          </AccountCard>
        </div>
      </div>
      {data.canCancel ? <CancelOrderDialog order={data} open={cancelOpen} onOpenChange={setCancelOpen} /> : null}
    </div>
  );
}
