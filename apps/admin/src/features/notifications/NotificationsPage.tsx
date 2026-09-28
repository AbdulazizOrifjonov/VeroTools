import { useAdminList, useAdminMutation, useSession } from '@vero/api-client';
import { LANGUAGES, LANGUAGE_LABELS, type Language } from '@vero/config';
import type { AdminNotificationLog } from '@vero/types';
import { Badge, Button, Checkbox, cn, Form, FormControl, FormDescription, FormField, FormItem, FormLabel, RadioCard, RadioGroup, toast } from '@vero/ui';
import { broadcastSchema } from '@vero/validation';
import { BadgePercentIcon, BellRingIcon, InfoIcon, MegaphoneIcon, SendIcon, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Page, PageHeader, Panel, usePageMeta } from '../../components/common/page';
import { DataTable, type DataColumn } from '../../components/data-table/DataTable';
import { FieldMessage, TextField } from '../../components/form/fields';
import { UnsavedChangesGuard } from '../../components/form/form-kit';
import { LocalizedField } from '../../components/form/LocalizedField';
import { handleFormError } from '../../lib/errors';
import { formResolver } from '../../lib/forms';
import { useFormat } from '../../lib/format';
import { useListState } from '../../lib/url-state';

type Values = z.input<typeof broadcastSchema>;
type Output = z.output<typeof broadcastSchema>;

const TYPES = ['PROMOTION', 'DISCOUNT', 'SYSTEM'] as const;
const CHANNELS = ['in_app', 'push', 'email'] as const;
const AUDIENCES = ['all', 'active', 'with_orders'] as const;
const TYPE_ICONS: Record<string, LucideIcon> = { PROMOTION: MegaphoneIcon, DISCOUNT: BadgePercentIcon, SYSTEM: InfoIcon };

const emptyValues = (): Values => ({
  type: 'PROMOTION',
  title: { uz: '', ru: '', en: '' },
  body: { uz: '', ru: '', en: '' },
  url: '',
  channels: ['in_app', 'push'],
  audience: 'all',
});

function ChannelsField() {
  const { t } = useTranslation();
  const { control } = useFormContext<Values>();
  return (
    <FormField
      control={control}
      name="channels"
      render={({ field }) => {
        const value = (field.value ?? []) as string[];
        return (
          <FormItem>
            <FormLabel required>{t('notifications.compose.channels')}</FormLabel>
            <div className="grid gap-2 sm:grid-cols-3" role="group">
              {CHANNELS.map((c) => {
                const id = `channel-${c}`;
                return (
                  <label key={c} htmlFor={id} className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-input bg-surface-elevated p-3 text-sm has-[[data-state=checked]]:border-foreground/40">
                    <Checkbox
                      id={id}
                      checked={value.includes(c)}
                      onCheckedChange={(on) => field.onChange(on ? [...value, c] : value.filter((v) => v !== c))}
                      onBlur={field.onBlur}
                      className="mt-0.5"
                    />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-medium">{t(`enums.notificationChannel.${c}`)}</span>
                      <span className="text-xs text-muted-foreground">{t(`notifications.compose.channelHints.${c}`)}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            <FieldMessage />
          </FormItem>
        );
      }}
    />
  );
}

function ChoiceField({ name, label, options, hint, columns = 3 }: { name: 'type' | 'audience'; label: string; options: Array<{ value: string; label: string; icon?: LucideIcon }>; hint: (value: string) => string; columns?: 2 | 3 }) {
  const { control } = useFormContext<Values>();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel required>{label}</FormLabel>
          <FormControl>
            <RadioGroup value={String(field.value ?? '')} onValueChange={field.onChange} className={cn('grid gap-2', columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
              {options.map((o) => (
                <RadioCard key={o.value} value={o.value} className="p-3">
                  <span className="flex items-center gap-1.5 font-medium">
                    {o.icon ? <o.icon className="size-4 text-muted-foreground" aria-hidden="true" /> : null}
                    {o.label}
                  </span>
                </RadioCard>
              ))}
            </RadioGroup>
          </FormControl>
          <FormDescription>{hint(String(field.value ?? ''))}</FormDescription>
          <FieldMessage />
        </FormItem>
      )}
    />
  );
}

function Preview() {
  const { t } = useTranslation();
  const { control } = useFormContext<Values>();
  const [lang, setLang] = useState<Language>('uz');
  const [type, title, body, url] = useWatch({ control, name: ['type', 'title', 'body', 'url'] });
  const Icon = TYPE_ICONS[type] ?? BellRingIcon;
  const heading = title?.[lang]?.trim();
  const text = body?.[lang]?.trim();
  return (
    <Panel
      title={t('notifications.preview.title')}
      description={t('notifications.preview.hint')}
      actions={
        <div role="tablist" aria-label={t('form.languages')} className="inline-flex items-center gap-0.5 rounded-md bg-muted p-0.5 dark:bg-secondary">
          {LANGUAGES.map((l) => (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={lang === l}
              onClick={() => setLang(l)}
              className={cn('rounded-sm px-2 py-0.5 text-xs font-semibold uppercase transition-colors focus-visible:outline-2 focus-visible:outline-ring', lang === l ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground')}
              lang={l}
              title={LANGUAGE_LABELS[l].native}
            >
              {LANGUAGE_LABELS[l].short}
            </button>
          ))}
        </div>
      }
    >
      <div className="rounded-xl border border-border bg-background p-3.5 shadow-xs" lang={lang}>
        <div className="flex gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-soft-foreground">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className={cn('truncate text-sm font-semibold', !heading && 'text-muted-foreground')}>{heading || t('notifications.preview.emptyTitle')}</p>
              <span className="shrink-0 text-[11px] text-muted-foreground">{t('notifications.preview.now')}</span>
            </div>
            <p className={cn('text-[13px] leading-snug whitespace-pre-line', text ? 'text-foreground/90' : 'text-muted-foreground')}>{text || t('notifications.preview.emptyBody')}</p>
            {url ? <p className="truncate font-mono text-[11px] text-muted-foreground">{url}</p> : null}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function Composer() {
  const { t } = useTranslation();
  const form = useForm<Values, unknown, Output>({ resolver: formResolver<Values, typeof broadcastSchema>(broadcastSchema), defaultValues: emptyValues() });
  const [pending, setPending] = useState<Output | null>(null);
  const send = useAdminMutation((api, input: Output) => api.admin.notifications.broadcast(input), { invalidate: ['notifications'] });
  const submit = form.handleSubmit((values) => setPending(values));

  return (
    <Form {...form}>
      <form onSubmit={(e) => void submit(e)} noValidate className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel title={t('notifications.compose.title')} description={t('notifications.compose.description')}>
          <div className="flex flex-col gap-5">
            <ChoiceField
              name="type"
              label={t('notifications.compose.type')}
              options={TYPES.map((ty) => ({ value: ty, label: t(`notifications.compose.types.${ty}`), icon: TYPE_ICONS[ty] }))}
              hint={(v) => (v ? t(`notifications.compose.typeHints.${v}`) : '')}
            />
            <LocalizedField name="title" label={t('notifications.compose.titleLabel')} required="all" maxLength={120} />
            <LocalizedField name="body" label={t('notifications.compose.body')} required="all" multiline rows={4} maxLength={600} />
            <TextField name="url" label={t('notifications.compose.url')} optional maxLength={500} placeholder="/catalog/…" description={t('notifications.compose.urlHint')} />
            <ChannelsField />
            <ChoiceField
              name="audience"
              label={t('notifications.compose.audience')}
              options={AUDIENCES.map((a) => ({ value: a, label: t(`enums.notificationAudience.${a}`) }))}
              hint={(v) => (v ? t(`notifications.compose.audienceHints.${v}`) : '')}
            />
            <div className="flex justify-end border-t border-border pt-4">
              <Button type="submit" leftIcon={<SendIcon />}>
                {t('notifications.compose.send')}
              </Button>
            </div>
          </div>
        </Panel>
        <div className="flex flex-col gap-4 xl:sticky xl:top-20">
          <Preview />
        </div>
      </form>
      <UnsavedChangesGuard when={form.formState.isDirty && !send.isPending} />
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
        tone="brand"
        title={t('notifications.compose.confirmTitle')}
        description={t('notifications.compose.confirmText')}
        confirmLabel={t('notifications.compose.confirmSend')}
        onConfirm={async () => {
          if (!pending) return;
          try {
            const { recipients } = await send.mutateAsync(pending);
            if (recipients > 0) toast.success(t('notifications.compose.sent', { count: recipients }));
            else toast.warning(t('notifications.compose.noRecipients'));
            form.reset(emptyValues());
            setPending(null);
          } catch (error) {
            handleFormError(t, form, error);
            throw error;
          }
        }}
      >
        {pending ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-lg bg-muted/50 p-3 text-[13px]">
            <dt className="text-muted-foreground">{t('notifications.compose.type')}</dt>
            <dd className="font-medium">{t(`notifications.compose.types.${pending.type}`)}</dd>
            <dt className="text-muted-foreground">{t('notifications.compose.confirmAudience')}</dt>
            <dd className="font-medium">{t(`enums.notificationAudience.${pending.audience}`)}</dd>
            <dt className="text-muted-foreground">{t('notifications.compose.confirmChannels')}</dt>
            <dd className="font-medium">{pending.channels.map((c) => t(`enums.notificationChannel.${c}`)).join(', ')}</dd>
          </dl>
        ) : null}
      </ConfirmDialog>
    </Form>
  );
}

function History() {
  const { t } = useTranslation();
  const f = useFormat();
  const list = useListState({});
  const query = useAdminList('notifications', (api, p) => api.admin.notifications.logs(p), list.params);
  const columns = useMemo<DataColumn<AdminNotificationLog>[]>(
    () => [
      {
        id: 'date',
        header: t('notifications.history.date'),
        meta: { alwaysVisible: true },
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="tabular">{f.date(row.original.createdAt)}</span>
            <span className="text-xs text-muted-foreground tabular">{f.date(row.original.createdAt, 'time')}</span>
          </div>
        ),
      },
      {
        id: 'message',
        header: t('notifications.history.message'),
        meta: { cellClassName: 'whitespace-normal' },
        cell: ({ row }) => (
          <div className="flex max-w-md min-w-56 flex-col gap-0.5">
            <span className="flex items-center gap-2">
              <Badge variant={row.original.type === 'SYSTEM' ? 'secondary' : 'brand'} size="sm">
                {t(`common:notificationType.${row.original.type}`)}
              </Badge>
              <span className="truncate font-medium">{f.loc(row.original.title)}</span>
            </span>
            <span className="line-clamp-2 text-xs text-muted-foreground">{f.loc(row.original.body)}</span>
          </div>
        ),
      },
      { id: 'audience', header: t('notifications.history.audience'), cell: ({ row }) => t(`enums.notificationAudience.${row.original.audience}`, { defaultValue: row.original.audience }) },
      {
        id: 'channels',
        header: t('notifications.history.channels'),
        cell: ({ row }) => (
          <span className="flex flex-wrap gap-1">
            {row.original.channels.map((c) => (
              <Badge key={c} variant="outline" size="sm">
                {t(`enums.notificationChannel.${c}`, { defaultValue: c })}
              </Badge>
            ))}
          </span>
        ),
      },
      { id: 'recipients', header: t('notifications.history.recipients'), meta: { align: 'end' }, cell: ({ row }) => <span className="font-medium tabular">{f.number(row.original.recipients)}</span> },
      { id: 'sentBy', header: t('notifications.history.sentBy'), cell: ({ row }) => row.original.sentBy || <span className="text-muted-foreground">—</span> },
    ],
    [t, f],
  );
  return (
    <section aria-labelledby="broadcast-history" className="flex flex-col gap-3">
      <h2 id="broadcast-history" className="text-[15px] font-semibold tracking-[-0.01em]">
        {t('notifications.history.title')}
      </h2>
      <DataTable
        id="notification-logs"
        label={t('notifications.history.title')}
        columns={columns}
        data={query.data?.items}
        getRowId={(r) => r.id}
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
        hideColumnToggle
        empty={{ title: t('notifications.history.empty'), icon: <BellRingIcon /> }}
      />
    </section>
  );
}

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { can } = useSession();
  usePageMeta(t('notifications.title'));
  const canSend = can('notifications.send');
  return (
    <Page>
      <PageHeader title={t('notifications.title')} description={t('notifications.description')} />
      {canSend ? <Composer /> : <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-[13px] text-muted-foreground">{t('notifications.readOnly')}</p>}
      <History />
    </Page>
  );
}
