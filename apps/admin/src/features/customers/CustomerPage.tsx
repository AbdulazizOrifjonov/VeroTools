import { zodResolver } from '@hookform/resolvers/zod';
import { useAdminItem, useAdminMutation, useSession } from '@vero/api-client';
import type { AdminCustomerDetail } from '@vero/types';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  Skeleton,
  toast,
} from '@vero/ui';
import { customerUpdateSchema } from '@vero/validation';
import { BanIcon, CheckCircle2Icon, CircleAlertIcon, MailIcon, MapPinIcon, PencilIcon, PhoneIcon, ShieldCheckIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import type { z } from 'zod';
import { StatusBadge } from '../../components/common/badges';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { CopyButton } from '../../components/common/CopyButton';
import { KeyValueList, Page, PageHeader, Panel, StatTile, usePageMeta } from '../../components/common/page';
import { PersonAvatar } from '../../components/common/PersonAvatar';
import { ErrorState } from '../../components/common/states';
import { TextField } from '../../components/form/fields';
import { FieldGrid } from '../../components/form/form-kit';
import { apiErrorCode, handleFormError, isNotFound, toastError } from '../../lib/errors';
import { useFormat } from '../../lib/format';
import { imageRefThumb } from '../../lib/images';
import { ItemNotFound } from '../errors/NotFoundPage';

type EditValues = z.input<typeof customerUpdateSchema>;
type EditOutput = z.output<typeof customerUpdateSchema>;

function EditCustomerDialog({ customer, open, onOpenChange }: { customer: AdminCustomerDetail; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const form = useForm<EditValues, unknown, EditOutput>({
    resolver: zodResolver(customerUpdateSchema),
    defaultValues: { firstName: customer.firstName, lastName: customer.lastName, email: customer.email ?? '' },
  });
  useEffect(() => {
    if (open) form.reset({ firstName: customer.firstName, lastName: customer.lastName, email: customer.email ?? '' });
  }, [open, customer, form]);
  const save = useAdminMutation((api, v: EditOutput) => api.admin.customers.update(customer.id, v), { invalidate: ['customers', 'orders'] });
  const submit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync(values);
      toast.success(t('customers.edit.saved'));
      onOpenChange(false);
    } catch (error) {
      if (apiErrorCode(error) === 'EMAIL_TAKEN') form.setError('email', { type: 'server', message: 'errors:EMAIL_TAKEN' }, { shouldFocus: true });
      else handleFormError(t, form, error);
    }
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !save.isPending && onOpenChange(o)}>
      <DialogContent size="md" closeLabel={t('common.close')}>
        <DialogHeader>
          <DialogTitle>{t('customers.edit.title')}</DialogTitle>
          <DialogDescription>{t('customers.edit.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void submit(e)} noValidate className="flex min-h-0 flex-1 flex-col gap-5">
            <DialogBody className="flex flex-col gap-4">
              <FieldGrid>
                <TextField name="firstName" label={t('customers.edit.firstName')} required maxLength={60} autoComplete="off" />
                <TextField name="lastName" label={t('customers.edit.lastName')} required maxLength={60} autoComplete="off" />
              </FieldGrid>
              <TextField name="email" label={t('customers.edit.email')} type="email" optional maxLength={120} autoComplete="off" />
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

function Verified({ ok }: { ok: boolean }) {
  const { t } = useTranslation();
  return ok ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
      <CheckCircle2Icon className="size-3.5" aria-hidden="true" />
      {t('customers.verified')}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <CircleAlertIcon className="size-3.5" aria-hidden="true" />
      {t('customers.notVerified')}
    </span>
  );
}

export default function CustomerPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const f = useFormat();
  const { can } = useSession();
  const query = useAdminItem('customers', id, (api, cid) => api.admin.customers.get(cid));
  const c = query.data;
  const name = c ? `${c.firstName} ${c.lastName}`.trim() || f.phone(c.phone) : '';
  usePageMeta(t('customers.title'), c ? name : null);
  const [editing, setEditing] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const setStatus = useAdminMutation((api, status: 'active' | 'blocked') => api.admin.customers.update(id!, { status }), { invalidate: ['customers'] });

  if (query.isError && !c) return isNotFound(query.error) ? <ItemNotFound backTo="/customers" /> : <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (!c) {
    return (
      <Page>
        <Skeleton className="h-14 w-96" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl xl:col-span-2" />
        </div>
      </Page>
    );
  }

  const canUpdate = can('customers.update');
  const blocked = c.status === 'blocked';
  const unblock = async () => {
    try {
      await setStatus.mutateAsync('active');
      toast.success(t('customers.block.undone'));
    } catch (error) {
      toastError(t, error);
    }
  };

  return (
    <Page>
      <PageHeader
        back={{ to: '/customers', label: t('customers.detail.back') }}
        title={
          <span className="flex items-center gap-3">
            <PersonAvatar name={name} src={imageRefThumb(c.avatar)} size="lg" />
            <span className="min-w-0">{name}</span>
          </span>
        }
        meta={<StatusBadge kind="user" value={c.status} size="lg" />}
        description={t('customers.detail.since', { date: f.date(c.createdAt, 'long') })}
        actions={
          canUpdate ? (
            <>
              <Button variant="outline" size="sm" leftIcon={<PencilIcon />} onClick={() => setEditing(true)}>
                {t('customers.actions.edit')}
              </Button>
              {blocked ? (
                <Button variant="outline" size="sm" leftIcon={<ShieldCheckIcon />} loading={setStatus.isPending} onClick={() => void unblock()}>
                  {t('customers.actions.unblock')}
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="text-danger hover:text-danger" leftIcon={<BanIcon />} onClick={() => setConfirmBlock(true)}>
                  {t('customers.actions.block')}
                </Button>
              )}
            </>
          ) : undefined
        }
      />

      {blocked ? (
        <Alert variant="danger" icon={<BanIcon />}>
          <AlertTitle>{t('customers.detail.blockedAlertTitle')}</AlertTitle>
          <AlertDescription>{t('customers.detail.blockedAlertText')}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        <StatTile label={t('customers.detail.stats.orders')} value={f.number(c.ordersCount)} to={can('orders.read') ? `/orders?customer=${c.id}` : undefined} />
        <StatTile label={t('customers.detail.stats.spent')} value={f.money(c.totalSpent)} />
        <StatTile label={t('customers.detail.stats.average')} value={c.ordersCount ? f.money(c.totalSpent / c.ordersCount) : '—'} />
        <StatTile label={t('customers.detail.stats.reviews')} value={f.number(c.reviewsCount)} />
        <StatTile label={t('customers.detail.stats.wishlist')} value={f.number(c.wishlistCount)} hint={t('customers.detail.stats.items', { count: c.wishlistCount })} />
        <StatTile label={t('customers.detail.stats.cart')} value={f.number(c.cartItemsCount)} hint={t('customers.detail.stats.items', { count: c.cartItemsCount })} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel title={t('customers.detail.profile')}>
            <KeyValueList
              items={[
                {
                  label: t('common.phone'),
                  value: (
                    <span className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-1.5">
                        <PhoneIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                        <a href={`tel:${c.phone}`} className="tabular hover:underline">
                          {f.phone(c.phone)}
                        </a>
                        <CopyButton value={c.phone} />
                      </span>
                      <Verified ok={c.isPhoneVerified} />
                    </span>
                  ),
                },
                {
                  label: t('common.email'),
                  value: c.email ? (
                    <span className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-1.5">
                        <MailIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                        <a href={`mailto:${c.email}`} className="break-all hover:underline">
                          {c.email}
                        </a>
                      </span>
                      <Verified ok={c.isEmailVerified} />
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{t('customers.noEmail')}</span>
                  ),
                },
                { label: t('customers.detail.language'), value: t(`common.languageNames.${c.language}`) },
                { label: t('customers.detail.registered'), value: f.datetime(c.createdAt) },
                { label: t('customers.detail.lastLogin'), value: c.lastLoginAt ? f.datetime(c.lastLoginAt) : t('customers.never') },
                { label: t('customers.detail.lastOrder'), value: c.lastOrderAt ? f.datetime(c.lastOrderAt) : '—' },
              ]}
            />
          </Panel>
          <Panel title={t('customers.detail.addresses')}>
            {c.addresses.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('customers.detail.noAddresses')}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {c.addresses.map((a) => (
                  <li key={a.id} className="flex gap-2.5 rounded-lg border border-border p-3 text-[13px]">
                    <MapPinIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="flex flex-wrap items-center gap-2 font-semibold">
                        {a.label || `${a.firstName} ${a.lastName}`}
                        {a.isDefault ? (
                          <Badge variant="secondary" size="sm">
                            {t('customers.detail.defaultAddress')}
                          </Badge>
                        ) : null}
                      </span>
                      <span>
                        {[a.regionName, a.city, a.district].filter(Boolean).join(', ')}
                        {', '}
                        {[a.street, a.house ? t('orders.delivery.house', { n: a.house }) : null, a.apartment ? t('orders.delivery.apartment', { n: a.apartment }) : null].filter(Boolean).join(', ')}
                      </span>
                      <span className="text-muted-foreground tabular">
                        {a.firstName} {a.lastName} · {f.phone(a.phone)}
                      </span>
                      {a.comment ? <span className="text-muted-foreground italic">{a.comment}</span> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
        <Panel
          className="xl:col-span-2"
          title={t('customers.detail.recentOrders')}
          flush
          actions={
            can('orders.read') && c.ordersCount ? (
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/orders?customer=${c.id}`}>{t('customers.detail.allOrders')}</Link>
              </Button>
            ) : undefined
          }
        >
          {c.recentOrders.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">{t('customers.detail.noOrders')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-y border-border bg-surface text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 text-start font-medium sm:px-5">
                      {t('orders.columns.number')}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-start font-medium">
                      {t('orders.columns.date')}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-start font-medium">
                      {t('orders.columns.status')}
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-start font-medium">
                      {t('orders.columns.payment')}
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-end font-medium sm:px-5">
                      {t('orders.columns.total')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {c.recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-accent/40">
                      <td className="px-4 py-2.5 sm:px-5">
                        {can('orders.read') ? (
                          <Link to={`/orders/${o.id}`} className="font-semibold tabular hover:underline">
                            {o.number}
                          </Link>
                        ) : (
                          <span className="font-semibold tabular">{o.number}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground tabular">{f.datetime(o.createdAt)}</td>
                      <td className="px-3 py-2.5">
                        <StatusBadge kind="order" value={o.status} size="sm" />
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge kind="payment" value={o.paymentStatus} size="sm" />
                      </td>
                      <td className="px-4 py-2.5 text-end font-semibold whitespace-nowrap tabular sm:px-5">{f.money(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <EditCustomerDialog customer={c} open={editing} onOpenChange={setEditing} />
      <ConfirmDialog
        open={confirmBlock}
        onOpenChange={setConfirmBlock}
        title={t('customers.block.title', { name })}
        description={t('customers.block.text')}
        confirmLabel={t('customers.block.confirm')}
        onConfirm={async () => {
          try {
            await setStatus.mutateAsync('blocked');
            toast.success(t('customers.block.done'));
          } catch (error) {
            toastError(t, error);
            throw error;
          }
        }}
      />
    </Page>
  );
}
