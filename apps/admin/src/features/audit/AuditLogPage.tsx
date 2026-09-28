import { useAdminList, useAdminQuery, useSession } from '@vero/api-client';
import type { AdminAuditLog } from '@vero/types';
import { Badge, Button, Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@vero/ui';
import { ExternalLinkIcon, PanelRightOpenIcon, ScrollTextIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Page, PageHeader, usePageMeta } from '../../components/common/page';
import { DataTable, type DataColumn } from '../../components/data-table/DataTable';
import { DateRangeFilter, FilterSelect, SearchInput } from '../../components/data-table/toolbar';
import { Combobox } from '../../components/form/pickers';
import { dateInputToIso, endOfDayExclusiveIso } from '../../lib/dates';
import { useFormat } from '../../lib/format';
import { roleName } from '../../lib/permissions';
import { useListState } from '../../lib/url-state';
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES, AuditActionLabel, AuditChanges, AuditTargetLabel, auditActionText, auditTargetName, formatAuditValue, useAuditTargetLink } from './audit-ui';

const FILTERS = ['user', 'targetType', 'action', 'from', 'to'] as const;

function UserCell({ entry }: { entry: AdminAuditLog }) {
  const { t } = useTranslation();
  const { can } = useSession();
  if (!entry.user) return <span className="text-muted-foreground">{t('audit.system')}</span>;
  return can('users.read') ? (
    <Link to={`/users/${entry.user.id}`} className="font-medium text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring">
      {entry.user.name}
    </Link>
  ) : (
    <span className="font-medium">{entry.user.name}</span>
  );
}

function AuditEntrySheet({ entry, open, onOpenChange }: { entry: AdminAuditLog | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const f = useFormat();
  const href = useAuditTargetLink(entry ?? { action: '', target: undefined });
  if (!entry) return null;
  const changes = entry.changes && Object.keys(entry.changes).length ? entry.changes : null;
  const meta = entry.meta && Object.keys(entry.meta).length ? entry.meta : null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-xl"
        closeLabel={t('common.close')}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement | null)?.focus();
        }}
      >
        <SheetHeader>
          <SheetTitle>{auditActionText(t, entry.action)}</SheetTitle>
          <SheetDescription>
            <time dateTime={entry.createdAt} className="tabular">
              {f.datetime(entry.createdAt)}
            </time>
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-6 pb-6">
          <dl className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-[13px]">
            <dt className="text-muted-foreground">{t('audit.columns.user')}</dt>
            <dd className="flex flex-wrap items-center gap-2">
              <UserCell entry={entry} />
              {entry.user?.role ? (
                <Badge variant="secondary" size="sm">
                  {roleName(t, entry.user.role)}
                </Badge>
              ) : null}
            </dd>
            <dt className="text-muted-foreground">{t('audit.columns.action')}</dt>
            <dd className="font-mono text-xs leading-5">{entry.action}</dd>
            {entry.target ? (
              <>
                <dt className="text-muted-foreground">{t('audit.columns.target')}</dt>
                <dd className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">{auditTargetName(t, entry.target.type)}</span>
                  <AuditTargetLabel entry={entry} className="whitespace-normal break-all" />
                  {entry.target.id ? <span className="font-mono text-[11px] break-all text-muted-foreground">{entry.target.id}</span> : null}
                </dd>
              </>
            ) : null}
            {entry.ip ? (
              <>
                <dt className="text-muted-foreground">{t('audit.columns.ip')}</dt>
                <dd className="font-mono text-xs leading-5">{entry.ip}</dd>
              </>
            ) : null}
            {entry.userAgent ? (
              <>
                <dt className="text-muted-foreground">{t('audit.detail.userAgent')}</dt>
                <dd className="text-xs leading-5 break-words text-muted-foreground">{entry.userAgent}</dd>
              </>
            ) : null}
          </dl>

          <section aria-labelledby="audit-changes" className="flex flex-col gap-2">
            <h3 id="audit-changes" className="text-sm font-semibold">
              {t('audit.detail.changes')}
            </h3>
            {changes ? <AuditChanges changes={changes} /> : <p className="text-[13px] text-muted-foreground">{t('audit.detail.noChanges')}</p>}
          </section>

          {meta ? (
            <section aria-labelledby="audit-meta" className="flex flex-col gap-2">
              <h3 id="audit-meta" className="text-sm font-semibold">
                {t('audit.detail.meta')}
              </h3>
              <dl className="divide-y divide-border overflow-hidden rounded-lg border border-border text-[13px]">
                {Object.entries(meta).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-4 px-3 py-2">
                    <dt className="font-mono text-xs break-all text-muted-foreground">{key}</dt>
                    <dd className="min-w-0">{formatAuditValue(value, f, t)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {href ? (
            <Button asChild variant="outline" className="self-start" leftIcon={<ExternalLinkIcon />}>
              <Link to={href}>{t('audit.detail.open')}</Link>
            </Button>
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

export default function AuditLogPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const { can } = useSession();
  usePageMeta(t('audit.title'));
  const list = useListState({ filters: FILTERS, defaultLimit: 50 });
  const [selected, setSelected] = useState<AdminAuditLog | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const params = useMemo(() => {
    const p = { ...list.params };
    delete p.from;
    delete p.to;
    if (list.filters.from) p.from = dateInputToIso(list.filters.from);
    if (list.filters.to) p.to = endOfDayExclusiveIso(list.filters.to);
    return p;
  }, [list.params, list.filters.from, list.filters.to]);
  const query = useAdminList('auditLogs', (api, p) => api.admin.auditLogs(p), params);

  const users = useAdminQuery(['users', 'audit-filter'], (api) => api.admin.users.list({ limit: 100 }), { enabled: can('users.read'), staleTime: 60_000 });
  const userOptions = useMemo(
    () =>
      (users.data?.items ?? [])
        .map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}`.trim(), hint: roleName(t, u.role) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [users.data, t],
  );

  const actionOptions = useMemo(() => {
    const codes = list.filters.targetType ? (AUDIT_ACTIONS[list.filters.targetType] ?? []) : Object.values(AUDIT_ACTIONS).flat();
    return codes.map((code) => ({ value: code, label: auditActionText(t, code) }));
  }, [list.filters.targetType, t]);

  const open = (entry: AdminAuditLog) => {
    setSelected(entry);
    setSheetOpen(true);
  };

  const columns = useMemo<DataColumn<AdminAuditLog>[]>(
    () => [
      {
        id: 'time',
        header: t('audit.columns.time'),
        meta: { alwaysVisible: true },
        cell: ({ row }) => (
          <time dateTime={row.original.createdAt} className="flex flex-col" title={f.relative(row.original.createdAt)}>
            <span className="tabular">{f.date(row.original.createdAt)}</span>
            <span className="text-xs text-muted-foreground tabular">{f.date(row.original.createdAt, 'time')}</span>
          </time>
        ),
      },
      {
        id: 'user',
        header: t('audit.columns.user'),
        cell: ({ row }) => (
          <div className="flex min-w-36 flex-col items-start gap-0.5">
            <UserCell entry={row.original} />
            {row.original.user?.role ? <span className="text-xs text-muted-foreground">{roleName(t, row.original.user.role)}</span> : null}
          </div>
        ),
      },
      {
        id: 'action',
        header: t('audit.columns.action'),
        meta: { alwaysVisible: true },
        cell: ({ row }) => <AuditActionLabel action={row.original.action} className="min-w-52" />,
      },
      {
        id: 'target',
        header: t('audit.columns.target'),
        cell: ({ row }) => (
          <span className="flex max-w-64 min-w-32">
            <AuditTargetLabel entry={row.original} />
          </span>
        ),
      },
      {
        id: 'changes',
        header: t('audit.detail.changes'),
        meta: { cellClassName: 'whitespace-normal' },
        cell: ({ row }) => {
          const keys = Object.keys(row.original.changes ?? {});
          if (!keys.length) return <span className="text-muted-foreground">—</span>;
          return <span className="line-clamp-2 block max-w-56 min-w-28 font-mono text-[11px] text-muted-foreground">{keys.join(', ')}</span>;
        },
      },
      { id: 'ip', header: t('audit.columns.ip'), meta: { defaultHidden: true }, cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.ip ?? '—'}</span> },
      {
        id: 'details',
        header: () => <span className="sr-only">{t('common.details')}</span>,
        meta: { align: 'end', alwaysVisible: true },
        cell: ({ row }) => (
          <Button variant="ghost" size="icon-sm" aria-label={`${t('audit.openDetails')}: ${auditActionText(t, row.original.action)}`} title={t('audit.openDetails')} onClick={() => open(row.original)}>
            <PanelRightOpenIcon />
          </Button>
        ),
      },
    ],
    [t, f],
  );

  const filtered = list.activeFilterCount > 0 || !!list.q;

  return (
    <Page>
      <PageHeader title={t('audit.title')} description={t('audit.description')} meta={query.data ? <span className="text-sm text-muted-foreground tabular">{t('audit.total', { count: query.data.meta.total })}</span> : undefined} />
      <DataTable
        id="audit"
        label={t('audit.title')}
        columns={columns}
        data={query.data?.items}
        getRowId={(a) => a.id}
        onRowActivate={open}
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
        dense
        empty={{ title: t('audit.empty'), icon: <ScrollTextIcon /> }}
        toolbar={
          <>
            <SearchInput value={list.q} onChange={list.setQ} placeholder={t('audit.searchPlaceholder')} className="sm:w-56" />
            {can('users.read') ? (
              <div className="w-full sm:w-48">
                <Combobox
                  value={list.filters.user}
                  onChange={(v) => list.setFilter('user', v)}
                  options={userOptions}
                  placeholder={t('audit.filters.allUsers')}
                  allowClear
                  className="h-8 text-[13px]"
                />
              </div>
            ) : null}
            <FilterSelect
              label={t('audit.filters.target')}
              value={list.filters.targetType}
              onChange={(v) => {
                const keepAction = v && list.filters.action && AUDIT_ACTIONS[v]?.includes(list.filters.action);
                list.setFilters({ targetType: v, action: keepAction ? list.filters.action : null });
              }}
              options={AUDIT_TARGET_TYPES.map((type) => ({ value: type, label: auditTargetName(t, type) }))}
            />
            <FilterSelect label={t('audit.filters.action')} value={list.filters.action} onChange={(v) => list.setFilter('action', v)} options={actionOptions} className="max-w-72" />
            <DateRangeFilter from={list.filters.from} to={list.filters.to} onChange={(r) => list.setFilters({ from: r.from, to: r.to })} />
            {filtered ? (
              <Button variant="ghost" size="sm" onClick={list.reset}>
                {t('table.resetFilters')}
              </Button>
            ) : null}
          </>
        }
      />
      <AuditEntrySheet entry={selected} open={sheetOpen} onOpenChange={setSheetOpen} />
    </Page>
  );
}
