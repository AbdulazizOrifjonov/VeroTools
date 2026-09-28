import { useAdminList, useAdminMutation, useSession } from '@vero/api-client';
import { CONTACT_MESSAGE_STATUSES, CONTACT_MESSAGE_TYPES, type AdminContactMessage, type ContactMessageStatus } from '@vero/types';
import { Badge, Button, Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, toast } from '@vero/ui';
import { CheckCheckIcon, InboxIcon, MailIcon, PanelRightOpenIcon, PhoneIcon, PlayIcon, RotateCcwIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '../../components/common/badges';
import { Page, PageHeader, usePageMeta } from '../../components/common/page';
import { StatusTabs, useFilterCounts } from '../../components/common/StatusTabs';
import { DataTable, type DataColumn } from '../../components/data-table/DataTable';
import { FilterSelect } from '../../components/data-table/toolbar';
import { toastError } from '../../lib/errors';
import { useFormat } from '../../lib/format';
import { useListState } from '../../lib/url-state';

const FILTERS = ['status', 'type'] as const;

/** The next step for a message in the NEW → IN_PROGRESS → DONE flow (and back to NEW). */
const NEXT: Record<ContactMessageStatus, Array<{ status: ContactMessageStatus; key: 'take' | 'done' | 'reopen' }>> = {
  NEW: [
    { status: 'IN_PROGRESS', key: 'take' },
    { status: 'DONE', key: 'done' },
  ],
  IN_PROGRESS: [
    { status: 'DONE', key: 'done' },
    { status: 'NEW', key: 'reopen' },
  ],
  DONE: [{ status: 'NEW', key: 'reopen' }],
};
const ICONS = { take: PlayIcon, done: CheckCheckIcon, reopen: RotateCcwIcon };

function useSetStatus() {
  const { t } = useTranslation();
  const mutation = useAdminMutation((api, v: { id: string; status: ContactMessageStatus }) => api.admin.messages.setStatus(v.id, v.status), { invalidate: ['messages'] });
  const run = async (id: string, status: ContactMessageStatus) => {
    try {
      const saved = await mutation.mutateAsync({ id, status });
      toast.success(t('messages.statusChanged', { status: t(`status.message.${status}`) }));
      return saved;
    } catch (error) {
      toastError(t, error);
      return null;
    }
  };
  return { run, isPending: mutation.isPending };
}

function MessageSheet({ message, open, onOpenChange, onChanged }: { message: AdminContactMessage | null; open: boolean; onOpenChange: (open: boolean) => void; onChanged: (m: AdminContactMessage) => void }) {
  const { t } = useTranslation();
  const f = useFormat();
  const { can } = useSession();
  const setStatus = useSetStatus();
  if (!message) return null;
  const canEdit = can('content.update');
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-lg"
        closeLabel={t('common.close')}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement | null)?.focus();
        }}
      >
        <SheetHeader>
          <SheetTitle>{message.subject || t(`enums.messageType.${message.type}`)}</SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-2">
            <StatusBadge kind="message" value={message.status} size="sm" />
            <span>{t(`enums.messageType.${message.type}`)}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={message.createdAt} className="tabular">
              {f.datetime(message.createdAt)}
            </time>
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-5 pb-6">
          <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <p className="text-base font-semibold">{message.name}</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" leftIcon={<PhoneIcon />}>
                <a href={`tel:${message.phone}`}>
                  <span className="tabular">{f.phone(message.phone)}</span>
                </a>
              </Button>
              {message.email ? (
                <Button asChild variant="outline" size="sm" leftIcon={<MailIcon />}>
                  <a href={`mailto:${message.email}${message.subject ? `?subject=${encodeURIComponent(`Re: ${message.subject}`)}` : ''}`}>{message.email}</a>
                </Button>
              ) : null}
            </div>
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{t('messages.message')}</h3>
            {message.message ? (
              <p className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed break-words whitespace-pre-wrap">{message.message}</p>
            ) : (
              <p className="text-[13px] text-muted-foreground">{t('messages.noText')}</p>
            )}
          </section>
          {message.handledBy ? <p className="text-xs text-muted-foreground">{t('messages.handledBy', { name: message.handledBy })}</p> : null}
        </SheetBody>
        {canEdit ? (
          <SheetFooter className="flex-row flex-wrap justify-end gap-2">
            {NEXT[message.status].map((step, i) => {
              const Icon = ICONS[step.key];
              return (
                <Button
                  key={step.status}
                  variant={i === 0 ? 'default' : 'outline'}
                  leftIcon={<Icon />}
                  disabled={setStatus.isPending}
                  onClick={async () => {
                    const saved = await setStatus.run(message.id, step.status);
                    if (saved) onChanged(saved);
                  }}
                >
                  {t(`messages.${step.key}`)}
                </Button>
              );
            })}
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export default function MessagesPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const { can } = useSession();
  usePageMeta(t('messages.title'));
  const list = useListState({ filters: FILTERS });
  const query = useAdminList('messages', (api, p) => api.admin.messages.list(p), list.params);
  const counts = useFilterCounts('messages', (api, p) => api.admin.messages.list(p), list.params, 'status', CONTACT_MESSAGE_STATUSES);
  const [selected, setSelected] = useState<AdminContactMessage | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const setStatus = useSetStatus();
  const canEdit = can('content.update');
  const open = (m: AdminContactMessage) => {
    setSelected(m);
    setSheetOpen(true);
  };

  const columns = useMemo<DataColumn<AdminContactMessage>[]>(
    () => [
      {
        id: 'from',
        header: t('messages.from'),
        meta: { alwaysVisible: true },
        cell: ({ row }) => (
          <div className="flex min-w-40 flex-col">
            <span className={row.original.status === 'NEW' ? 'font-semibold text-foreground' : 'font-medium text-foreground'}>{row.original.name}</span>
            <a href={`tel:${row.original.phone}`} className="text-xs text-muted-foreground tabular hover:underline">
              {f.phone(row.original.phone)}
            </a>
          </div>
        ),
      },
      {
        id: 'message',
        header: t('messages.message'),
        meta: { cellClassName: 'whitespace-normal' },
        cell: ({ row }) => (
          <div className="flex max-w-lg min-w-56 flex-col gap-0.5">
            <span className="flex items-center gap-2">
              <Badge variant="outline" size="sm">
                {t(`enums.messageType.${row.original.type}`)}
              </Badge>
              {row.original.subject ? <span className="truncate text-[13px] font-medium">{row.original.subject}</span> : null}
            </span>
            <span className="line-clamp-2 text-xs text-muted-foreground">{row.original.message || t('messages.noText')}</span>
          </div>
        ),
      },
      { id: 'status', header: t('messages.status'), cell: ({ row }) => <StatusBadge kind="message" value={row.original.status} size="sm" /> },
      {
        id: 'received',
        header: t('messages.received'),
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular" title={f.datetime(row.original.createdAt)}>
            {f.relative(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('table.actions')}</span>,
        meta: { align: 'end', alwaysVisible: true },
        cell: ({ row }) => {
          const m = row.original;
          const step = NEXT[m.status][0]!;
          const Icon = ICONS[step.key];
          return (
            <span className="flex items-center justify-end gap-1">
              {canEdit ? (
                <Button variant="ghost" size="sm" leftIcon={<Icon />} disabled={setStatus.isPending} onClick={() => void setStatus.run(m.id, step.status)}>
                  {t(`messages.${step.key}`)}
                </Button>
              ) : null}
              <Button variant="ghost" size="icon-sm" aria-label={`${t('messages.open')}: ${m.name}`} onClick={() => open(m)}>
                <PanelRightOpenIcon />
              </Button>
            </span>
          );
        },
      },
    ],
    [t, f, canEdit, setStatus],
  );

  const tabs = [{ key: '', label: t('table.all'), count: counts[''] }, ...CONTACT_MESSAGE_STATUSES.map((s) => ({ key: s, label: t(`status.message.${s}`), count: counts[s] }))];
  const filtered = !!list.filters.type;

  return (
    <Page>
      <PageHeader title={t('messages.title')} description={t('messages.description')} />
      <StatusTabs label={t('messages.status')} tabs={tabs} value={list.filters.status} onChange={(k) => list.setFilter('status', k)} />
      <DataTable
        id="messages"
        label={t('messages.title')}
        columns={columns}
        data={query.data?.items}
        getRowId={(m) => m.id}
        onRowActivate={open}
        rowClassName={(m) => (m.status === 'DONE' ? 'text-muted-foreground' : undefined)}
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
        filtered={filtered || !!list.filters.status}
        onResetFilters={list.reset}
        empty={{ title: t('messages.empty'), description: t('messages.emptyHint'), icon: <InboxIcon /> }}
        toolbar={
          <>
            <FilterSelect label={t('messages.type')} value={list.filters.type} onChange={(v) => list.setFilter('type', v)} options={CONTACT_MESSAGE_TYPES.map((ty) => ({ value: ty, label: t(`enums.messageType.${ty}`) }))} />
            {filtered ? (
              <Button variant="ghost" size="sm" onClick={() => list.resetOnly(['type'])}>
                {t('table.resetFilters')}
              </Button>
            ) : null}
          </>
        }
      />
      <MessageSheet message={selected} open={sheetOpen} onOpenChange={setSheetOpen} onChanged={setSelected} />
    </Page>
  );
}
