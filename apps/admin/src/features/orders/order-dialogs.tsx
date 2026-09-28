import { zodResolver } from '@hookform/resolvers/zod';
import { useAdminMutation } from '@vero/api-client';
import type { AdminOrder, OrderStatus, PaymentStatus } from '@vero/types';
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  Label,
  Textarea,
  toast,
} from '@vero/ui';
import { orderDeliveryUpdateSchema, orderStatusUpdateSchema } from '@vero/validation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { TextField, TextareaField } from '../../components/form/fields';
import { handleFormError, toastError } from '../../lib/errors';

type StatusValues = z.input<typeof orderStatusUpdateSchema>;
type StatusOutput = z.output<typeof orderStatusUpdateSchema>;

/** Status change with note; cancelling requires a reason, shipping asks for carrier + tracking number. */
export function StatusChangeDialog({ order, to, onOpenChange }: { order: AdminOrder; to: OrderStatus | null; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const form = useForm<StatusValues, unknown, StatusOutput>({
    resolver: zodResolver(orderStatusUpdateSchema),
    defaultValues: { status: to ?? 'CONFIRMED', note: '', carrier: order.delivery.carrier ?? '', trackingNumber: order.delivery.trackingNumber ?? '' },
  });
  useEffect(() => {
    if (to) form.reset({ status: to, note: '', carrier: order.delivery.carrier ?? '', trackingNumber: order.delivery.trackingNumber ?? '' });
  }, [to, order.delivery.carrier, order.delivery.trackingNumber, form]);

  const mutation = useAdminMutation((api, v: StatusOutput) => api.admin.orders.updateStatus(order.id, v), { invalidate: ['orders', 'inventory', 'movements', 'payments', 'customers'] });
  if (!to) return null;
  const cancelling = to === 'CANCELLED';
  const shipping = to === 'SHIPPED' && order.deliveryMethod === 'courier';

  const submit = form.handleSubmit(async (values) => {
    if (cancelling && !values.note?.trim()) {
      form.setError('note', { type: 'client', message: t('orders.status.reasonRequired') });
      return;
    }
    try {
      await mutation.mutateAsync(values);
      toast.success(t('orders.status.changed', { status: t(`common:orderStatus.${to}`) }));
      onOpenChange(false);
    } catch (error) {
      handleFormError(t, form, error);
    }
  });

  return (
    <Dialog open={!!to} onOpenChange={onOpenChange}>
      <DialogContent size="md" closeLabel={t('common.close')}>
        <DialogHeader>
          <DialogTitle>{t('orders.status.changeTo', { status: t(`common:orderStatus.${to}`) })}</DialogTitle>
          <DialogDescription>{t('orders.status.dialogText', { from: t(`common:orderStatus.${order.status}`), to: t(`common:orderStatus.${to}`) })}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void submit(e)} noValidate className="flex min-h-0 flex-1 flex-col gap-5">
            <DialogBody className="flex flex-col gap-4">
              {cancelling ? (
                <Alert variant="warning">
                  <AlertDescription className="text-foreground">{t('orders.status.cancelWarning')}</AlertDescription>
                </Alert>
              ) : to === 'SHIPPED' || to === 'DELIVERED' ? (
                order.inventoryDeducted ? null : (
                  <Alert variant="info">
                    <AlertDescription className="text-foreground">{t('orders.status.shippedHint')}</AlertDescription>
                  </Alert>
                )
              ) : to === 'RETURNED' ? (
                <Alert variant="info">
                  <AlertDescription className="text-foreground">{t('orders.status.returnedHint')}</AlertDescription>
                </Alert>
              ) : null}
              {shipping ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField name="carrier" label={t('orders.delivery.carrier')} placeholder={t('orders.delivery.carrierPlaceholder')} maxLength={80} />
                  <TextField name="trackingNumber" label={t('orders.delivery.tracking')} maxLength={80} />
                </div>
              ) : null}
              <TextareaField
                name="note"
                label={cancelling ? t('orders.status.cancelReason') : t('orders.status.note')}
                required={cancelling}
                optional={!cancelling}
                rows={3}
                maxLength={500}
                placeholder={cancelling ? t('orders.status.cancelReasonPlaceholder') : t('orders.status.notePlaceholder')}
              />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" variant={cancelling ? 'destructive' : 'default'} loading={mutation.isPending}>
                {t('orders.status.changeTo', { status: t(`common:orderStatus.${to}`) })}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

type DeliveryValues = z.input<typeof orderDeliveryUpdateSchema>;
type DeliveryOutput = z.output<typeof orderDeliveryUpdateSchema>;

export function DeliveryEditDialog({ order, open, onOpenChange }: { order: AdminOrder; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const form = useForm<DeliveryValues, unknown, DeliveryOutput>({
    resolver: zodResolver(orderDeliveryUpdateSchema),
    defaultValues: { carrier: order.delivery.carrier ?? '', trackingNumber: order.delivery.trackingNumber ?? '' },
  });
  useEffect(() => {
    if (open) form.reset({ carrier: order.delivery.carrier ?? '', trackingNumber: order.delivery.trackingNumber ?? '' });
  }, [open, order.delivery.carrier, order.delivery.trackingNumber, form]);
  const mutation = useAdminMutation((api, v: DeliveryOutput) => api.admin.orders.updateDelivery(order.id, { carrier: v.carrier ?? '', trackingNumber: v.trackingNumber ?? '' }), { invalidate: ['orders'] });
  const submit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values);
      toast.success(t('orders.delivery.saved'));
      onOpenChange(false);
    } catch (error) {
      handleFormError(t, form, error);
    }
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" closeLabel={t('common.close')}>
        <DialogHeader>
          <DialogTitle>{t('orders.delivery.edit')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-5">
            <div className="flex flex-col gap-4">
              <TextField name="carrier" label={t('orders.delivery.carrier')} placeholder={t('orders.delivery.carrierPlaceholder')} maxLength={80} />
              <TextField name="trackingNumber" label={t('orders.delivery.tracking')} maxLength={80} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" loading={mutation.isPending}>
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/** Manual payment status change (cash on delivery etc.) — only the transitions the API performs. */
export function PaymentStatusDialog({ order, to, onOpenChange }: { order: AdminOrder; to: Extract<PaymentStatus, 'PAID' | 'CANCELLED' | 'REFUNDED'> | null; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  useEffect(() => setNote(''), [to]);
  const mutation = useAdminMutation((api, v: { status: string; note?: string }) => api.admin.orders.updatePayment(order.id, v), { invalidate: ['orders', 'payments'] });
  const online = order.payment.provider === 'click' || order.payment.provider === 'payme';
  return (
    <ConfirmDialog
      open={!!to}
      onOpenChange={onOpenChange}
      tone={to === 'PAID' ? 'brand' : 'warning'}
      title={t('orders.payment.confirmTitle')}
      description={to ? t('orders.payment.confirmText', { status: t(`common:paymentStatus.${to}`) }) : undefined}
      confirmLabel={to === 'PAID' ? t('orders.payment.markPaid') : to === 'REFUNDED' ? t('orders.payment.markRefunded') : t('orders.payment.markCancelled')}
      onConfirm={async () => {
        if (!to) return;
        try {
          await mutation.mutateAsync({ status: to, note: note.trim() || undefined });
          toast.success(t('orders.payment.updated'));
        } catch (error) {
          toastError(t, error);
          throw error;
        }
      }}
    >
      <div className="flex flex-col gap-3">
        {online ? (
          <Alert variant="warning">
            <AlertDescription className="text-foreground">{t('orders.payment.onlineWarning')}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex flex-col gap-2">
          <Label htmlFor="payment-note">{t('orders.payment.noteLabel')}</Label>
          <Textarea id="payment-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={2} />
        </div>
      </div>
    </ConfirmDialog>
  );
}

export function InstallmentDecisionDialog({ order, decision, onOpenChange }: { order: AdminOrder; decision: 'APPROVED' | 'REJECTED' | null; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  useEffect(() => setNote(''), [decision]);
  const mutation = useAdminMutation((api, v: { status: 'APPROVED' | 'REJECTED'; note?: string }) => api.admin.orders.installmentDecision(order.id, v), { invalidate: ['orders', 'inventory'] });
  return (
    <ConfirmDialog
      open={!!decision}
      onOpenChange={onOpenChange}
      tone={decision === 'APPROVED' ? 'brand' : 'danger'}
      title={decision === 'APPROVED' ? t('orders.payment.approveTitle') : t('orders.payment.rejectTitle')}
      description={decision === 'APPROVED' ? t('orders.payment.approveText') : t('orders.payment.rejectText')}
      confirmLabel={decision === 'APPROVED' ? t('orders.payment.approve') : t('orders.payment.reject')}
      onConfirm={async () => {
        if (!decision) return;
        try {
          await mutation.mutateAsync({ status: decision, note: note.trim() || undefined });
          toast.success(t('orders.payment.decided'));
        } catch (error) {
          toastError(t, error);
          throw error;
        }
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="installment-note">{t('orders.payment.noteLabel')}</Label>
        <Textarea id="installment-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={2} />
      </div>
    </ConfirmDialog>
  );
}
