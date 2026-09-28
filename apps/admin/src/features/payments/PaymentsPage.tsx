import { zodResolver } from '@hookform/resolvers/zod';
import { useAdminList, useAdminMutation, useAdminQuery, useSession } from '@vero/api-client';
import { PAYMENT_METHODS, PAYMENT_PROVIDERS, PAYMENT_STATUSES, REFUND_STATUSES, type AdminPayment, type AdminPaymentProviderStatus } from '@vero/types';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  cn,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Form,
  Skeleton,
  toast,
} from '@vero/ui';
import { refundUpdateSchema } from '@vero/validation';
import { BanknoteIcon, CircleAlertIcon, CircleCheckIcon, CreditCardIcon, EllipsisIcon, ExternalLinkIcon, InfoIcon, KeyRoundIcon, ReceiptIcon, Undo2Icon, WalletIcon } from 'lucide-react';
import { useEffect, useMemo, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import type { z } from 'zod';
import { StatusBadge } from '../../components/common/badges';
import { useDialogTarget } from '../../components/common/ConfirmDialog';
import { CopyButton } from '../../components/common/CopyButton';
import { Page, PageHeader, Panel, usePageMeta } from '../../components/common/page';
import { ErrorState } from '../../components/common/states';
import { DataTable, type DataColumn } from '../../components/data-table/DataTable';
import { DateRangeFilter, FilterSelect, SearchInput } from '../../components/data-table/toolbar';
import { MoneyField, SelectField, TextareaField } from '../../components/form/fields';
import { dateInputToIso, endOfDayExclusiveIso } from '../../lib/dates';
import { handleFormError } from '../../lib/errors';
import { useFormat } from '../../lib/format';
import { useListState } from '../../lib/url-state';

/** Server variables each provider reads (apps/api/src/config/env.ts) — names only, never values. */
const ENV_VARS: Record<string, string[]> = {
  payme: ['PAYME_MERCHANT_ID', 'PAYME_KEY', 'PAYME_TEST_MODE'],
  click: ['CLICK_SERVICE_ID', 'CLICK_MERCHANT_ID', 'CLICK_MERCHANT_USER_ID', 'CLICK_SECRET_KEY'],
  installment: ['INSTALLMENT_ENABLED'],
};

const PROVIDER_ICON: Record<string, ReactNode> = {
  cash: <BanknoteIcon className="size-4" />,
  payme: <WalletIcon className="size-4" />,
  click: <CreditCardIcon className="size-4" />,
  installment: <ReceiptIcon className="size-4" />,
};

function ProviderCard({ p }: { p: AdminPaymentProviderStatus }) {
  const { t } = useTranslation();
  const online = p.provider === 'payme' || p.provider === 'click';
  const misconfigured = p.enabled && !p.configured;
  const webhooks = p.webhookUrl?.split('|').map((u) => u.trim()).filter(Boolean) ?? [];
  return (
    <article className={cn('flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4', misconfigured ? 'border-warning/40' : 'border-border')}>
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-md bg-muted text-foreground" aria-hidden="true">
            {PROVIDER_ICON[p.provider]}
          </span>
          <div className="flex flex-col">
            <h3 className="text-sm font-semibold">{t(`payments.providers.names.${p.provider}`)}</h3>
            {p.testMode ? <span className="text-xs text-warning">{t('payments.providers.testMode')}</span> : null}
          </div>
        </div>
        {p.configured ? (
          <Badge variant="success" size="sm" dot>
            {t('payments.providers.configured')}
          </Badge>
        ) : (
          <Badge variant="muted" size="sm" dot>
            {t('payments.providers.notConfigured')}
          </Badge>
        )}
      </header>
      <div className="flex flex-wrap items-center gap-1.5">
        {p.methods.map((m) => (
          <Badge key={m} variant="outline" size="sm">
            {t(`common:paymentMethod.${m}`)}
          </Badge>
        ))}
      </div>
      <p className={cn('flex items-center gap-1.5 text-[13px]', p.enabled ? 'text-foreground' : 'text-muted-foreground')}>
        {p.enabled ? <CircleCheckIcon className="size-4 text-success" aria-hidden="true" /> : <CircleAlertIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
        {p.enabled ? t('payments.providers.enabled') : t('payments.providers.disabled')}
      </p>
      {misconfigured ? <p className="rounded-md bg-warning-soft px-2.5 py-2 text-xs text-warning">{t('payments.providers.misconfigured')}</p> : null}
      {online && webhooks.length ? (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">{t('payments.providers.webhook')}</span>
          {webhooks.map((u) => (
            <div key={u} className="flex items-center gap-1 rounded-md border border-border px-2 py-1">
              <code className="min-w-0 flex-1 truncate font-mono text-[11px]">{u}</code>
              <CopyButton value={u} />
            </div>
          ))}
        </div>
      ) : null}
      {ENV_VARS[p.provider] ? (
        <div className="mt-auto flex flex-col gap-1">
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <KeyRoundIcon className="size-3" aria-hidden="true" />
            {t('payments.providers.env')}
          </span>
          <div className="flex flex-wrap gap-1">
            {ENV_VARS[p.provider]!.map((v) => (
              <code key={v} className="rounded-xs bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {v}
              </code>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-auto text-xs text-muted-foreground">{t('payments.providers.manual')}</p>
      )}
    </article>
  );
}

type RefundValues = z.input<typeof refundUpdateSchema>;
type RefundOutput = z.output<typeof refundUpdateSchema>;

function RefundDialog({ payment, open, onOpenChange }: { payment: AdminPayment | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const f = useFormat();
  const form = useForm<RefundValues, unknown, RefundOutput>({ resolver: zodResolver(refundUpdateSchema), defaultValues: { refundStatus: 'PENDING', refundAmount: '', note: '' } });
  useEffect(() => {
    if (open && payment) form.reset({ refundStatus: payment.refundStatus === 'NONE' ? 'PENDING' : payment.refundStatus, refundAmount: payment.refundAmount ?? payment.amount, note: '' });
  }, [open, payment, form]);
  const save = useAdminMutation((api, v: RefundOutput) => api.admin.payments.updateRefund(payment!.id, v), { invalidate: ['payments', 'orders'] });
  if (!payment) return null;
  const submit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync(values);
      toast.success(t('payments.refund.saved'));
      onOpenChange(false);
    } catch (error) {
      handleFormError(t, form, error);
    }
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !save.isPending && onOpenChange(o)}>
      <DialogContent size="md" closeLabel={t('common.close')}>
        <DialogHeader>
          <DialogTitle>{t('payments.refund.title')}</DialogTitle>
          <DialogDescription>{t('payments.refund.description', { order: payment.order.number, amount: f.money(payment.amount) })}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void submit(e)} noValidate className="flex min-h-0 flex-1 flex-col gap-5">
            <DialogBody className="flex flex-col gap-4">
              <SelectField name="refundStatus" label={t('payments.refund.status')} required options={REFUND_STATUSES.map((s) => ({ value: s, label: t(`status.refund.${s}`) }))} />
              <MoneyField name="refundAmount" label={t('payments.refund.amount')} optional />
              <TextareaField name="note" label={t('payments.refund.note')} optional rows={2} maxLength={300} />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" loading={save.isPending}>
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const FILTERS = ['status', 'provider', 'method', 'refundStatus', 'from', 'to'] as const;

export default function PaymentsPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const navigate = useNavigate();
  const { can } = useSession();
  usePageMeta(t('payments.title'));
  const providers = useAdminQuery(['payments', 'providers'], (api) => api.admin.payments.providers(), { staleTime: 60_000 });
  const list = useListState({ filters: FILTERS });
  const params = useMemo(() => {
    const p = { ...list.params };
    delete p.from;
    delete p.to;
    if (list.filters.from) p.from = dateInputToIso(list.filters.from);
    if (list.filters.to) p.to = endOfDayExclusiveIso(list.filters.to);
    return p;
  }, [list.params, list.filters.from, list.filters.to]);
  const query = useAdminList('payments', (api, p) => api.admin.payments.list(p), params);
  const refund = useDialogTarget<AdminPayment>();
  const canRefund = can('payments.update');

  const columns = useMemo<DataColumn<AdminPayment>[]>(
    () => [
      {
        id: 'order',
        header: t('payments.list.columns.order'),
        meta: { alwaysVisible: true },
        cell: ({ row }) => (
          <div className="flex flex-col">
            {can('orders.read') ? (
              <Link to={`/orders/${row.original.order.id}`} className="font-semibold text-foreground tabular hover:underline">
                {row.original.order.number}
              </Link>
            ) : (
              <span className="font-semibold tabular">{row.original.order.number}</span>
            )}
            <span className="text-xs text-muted-foreground">{t(`common:orderStatus.${row.original.order.status}`)}</span>
          </div>
        ),
      },
      {
        id: 'customer',
        header: t('payments.list.columns.customer'),
        cell: ({ row }) => (
          <div className="flex max-w-48 flex-col">
            <span className="truncate">{row.original.customer.name || '—'}</span>
            <span className="text-xs text-muted-foreground tabular">{f.phone(row.original.customer.phone)}</span>
          </div>
        ),
      },
      {
        id: 'method',
        header: t('payments.list.columns.method'),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span>{t(`common:paymentMethod.${row.original.method}`)}</span>
            <span className="text-xs text-muted-foreground">{t(`enums.provider.${row.original.provider}`)}</span>
          </div>
        ),
      },
      { id: 'amount', header: t('payments.list.columns.amount'), meta: { align: 'end' }, cell: ({ row }) => <span className="font-semibold">{f.money(row.original.amount)}</span> },
      {
        id: 'status',
        header: t('payments.list.columns.status'),
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-1">
            <StatusBadge kind="payment" value={row.original.status} size="sm" />
            {row.original.paidAt ? <span className="text-xs text-muted-foreground tabular">{t('payments.list.paidAt', { date: f.datetime(row.original.paidAt) })}</span> : null}
          </div>
        ),
      },
      {
        id: 'transaction',
        header: t('payments.list.columns.transaction'),
        cell: ({ row }) =>
          row.original.transactionId ? (
            <span className="inline-flex max-w-44 items-center gap-1">
              <code className="truncate font-mono text-xs">{row.original.transactionId}</code>
              <CopyButton value={row.original.transactionId} />
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: 'refund',
        header: t('payments.list.columns.refund'),
        cell: ({ row }) =>
          row.original.refundStatus === 'NONE' ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <div className="flex flex-col items-start gap-1">
              <StatusBadge kind="refund" value={row.original.refundStatus} size="sm" />
              {row.original.refundAmount ? <span className="text-xs text-muted-foreground tabular">{f.money(row.original.refundAmount)}</span> : null}
            </div>
          ),
      },
      { id: 'date', header: t('payments.list.columns.date'), cell: ({ row }) => <span className="text-muted-foreground tabular">{f.datetime(row.original.createdAt)}</span> },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('table.actions')}</span>,
        meta: { align: 'end', alwaysVisible: true },
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`${t('table.rowActions')}: ${row.original.order.number}`}>
                <EllipsisIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {can('orders.read') ? (
                <DropdownMenuItem onSelect={() => void navigate(`/orders/${row.original.order.id}`)}>
                  <ExternalLinkIcon aria-hidden="true" />
                  {t('payments.list.openOrder')}
                </DropdownMenuItem>
              ) : null}
              {canRefund && (row.original.status === 'PAID' || row.original.status === 'REFUND_PENDING' || row.original.refundStatus !== 'NONE') ? (
                <DropdownMenuItem onSelect={() => refund.ask(row.original)}>
                  <Undo2Icon aria-hidden="true" />
                  {t('payments.list.refundAction')}
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [t, f, can, canRefund, navigate, refund.ask],
  );

  const filtered = list.activeFilterCount > 0 || !!list.q;

  return (
    <Page>
      <PageHeader title={t('payments.title')} description={t('payments.description')} />
      <Panel title={t('payments.providers.title')}>
        <div className="flex flex-col gap-4">
          <Alert variant="info" icon={<InfoIcon />}>
            <AlertDescription>{t('payments.providers.hint')}</AlertDescription>
          </Alert>
          {providers.isError ? (
            <ErrorState error={providers.error} onRetry={() => void providers.refetch()} compact />
          ) : !providers.data ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-52 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {providers.data.map((p) => (
                <ProviderCard key={p.provider} p={p} />
              ))}
            </div>
          )}
        </div>
      </Panel>
      <DataTable
        id="payments"
        label={t('payments.list.title')}
        columns={columns}
        data={query.data?.items}
        getRowId={(p) => p.id}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        page={list.page}
        limit={list.limit}
        total={query.data?.meta.total}
        pages={query.data?.meta.pages}
        onPageChange={list.setPage}
        onLimitChange={list.setLimit}
        filtered={filtered}
        onResetFilters={list.reset}
        empty={{ title: t('payments.list.empty'), description: t('payments.list.emptyHint'), icon: <WalletIcon /> }}
        toolbar={
          <>
            <SearchInput value={list.q} onChange={list.setQ} placeholder={t('payments.list.searchPlaceholder')} className="sm:w-72" />
            <FilterSelect label={t('payments.list.filters.status')} value={list.filters.status} onChange={(v) => list.setFilter('status', v)} options={PAYMENT_STATUSES.map((s) => ({ value: s, label: t(`common:paymentStatus.${s}`) }))} />
            <FilterSelect label={t('payments.list.filters.provider')} value={list.filters.provider} onChange={(v) => list.setFilter('provider', v)} options={PAYMENT_PROVIDERS.map((p) => ({ value: p, label: t(`enums.provider.${p}`) }))} />
            <FilterSelect label={t('payments.list.filters.method')} value={list.filters.method} onChange={(v) => list.setFilter('method', v)} options={PAYMENT_METHODS.map((m) => ({ value: m, label: t(`common:paymentMethod.${m}`) }))} />
            <FilterSelect label={t('payments.list.filters.refund')} value={list.filters.refundStatus} onChange={(v) => list.setFilter('refundStatus', v)} options={REFUND_STATUSES.map((s) => ({ value: s, label: t(`status.refund.${s}`) }))} />
            <DateRangeFilter from={list.filters.from} to={list.filters.to} onChange={(r) => list.setFilters({ from: r.from, to: r.to })} placeholder={t('payments.list.filters.period')} />
            {filtered ? (
              <Button variant="ghost" size="sm" onClick={list.reset}>
                {t('table.resetFilters')}
              </Button>
            ) : null}
          </>
        }
      />
      <RefundDialog payment={refund.target} open={refund.open} onOpenChange={refund.onOpenChange} />
    </Page>
  );
}
