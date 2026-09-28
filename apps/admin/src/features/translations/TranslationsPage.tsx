import { useAdminList, useAdminMutation, useAdminQuery, useSession } from '@vero/api-client';
import { LANGUAGES, LANGUAGE_LABELS, type Language } from '@vero/config';
import type { AdminTranslationRow } from '@vero/types';
import { Badge, Button, cn, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Label, Switch, Textarea, toast } from '@vero/ui';
import { LanguagesIcon, PencilIcon, RotateCcwIcon, TriangleAlertIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Page, PageHeader, usePageMeta } from '../../components/common/page';
import { DataTable, type DataColumn } from '../../components/data-table/DataTable';
import { FilterSelect, SearchInput } from '../../components/data-table/toolbar';
import { toastError } from '../../lib/errors';
import { useFormat } from '../../lib/format';
import { useListState } from '../../lib/url-state';

const FILTERS = ['ns', 'missing', 'edited'] as const;
const VARIABLE = /{{\s*[\w.]+\s*}}/g;

const variablesOf = (text: string) => [...new Set(text.match(VARIABLE) ?? [])];
const effective = (row: AdminTranslationRow, lang: Language) => row.overrides[lang] || row.defaults[lang] || '';

function namespaceLabel(t: ReturnType<typeof useTranslation>['t'], ns: string) {
  return t(`translations.namespaces.${ns}`, { defaultValue: ns });
}

function ValueCell({ row, lang }: { row: AdminTranslationRow; lang: Language }) {
  const { t } = useTranslation();
  const value = effective(row, lang);
  const edited = !!row.overrides[lang];
  if (!value) return <span className="text-xs text-warning">{t('translations.emptyValue')}</span>;
  return (
    <span className="flex max-w-72 min-w-40 items-start gap-1.5" lang={lang}>
      {edited ? <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" title={t('translations.overridden')} aria-label={t('translations.overridden')} /> : null}
      <span className="line-clamp-2 text-[13px] break-words">{value}</span>
    </span>
  );
}

function EditDialog({ row, open, onOpenChange, canEdit }: { row: AdminTranslationRow | null; open: boolean; onOpenChange: (open: boolean) => void; canEdit: boolean }) {
  const { t } = useTranslation();
  const [values, setValues] = useState<Record<Language, string>>({ uz: '', ru: '', en: '' });
  const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => {
    if (open && row) setValues({ uz: row.overrides.uz ?? '', ru: row.overrides.ru ?? '', en: row.overrides.en ?? '' });
  }, [open, row]);
  const save = useAdminMutation((api, input: { namespace: string; key: string; values: Partial<Record<Language, string>> }) => api.admin.translations.update(input), { invalidate: ['translations'] });
  const reset = useAdminMutation((api, input: { namespace: string; key: string }) => api.admin.translations.reset(input.namespace, input.key), { invalidate: ['translations'] });
  if (!row) return null;

  const hadOverrides = LANGUAGES.some((l) => !!row.overrides[l]);
  const cleaned = Object.fromEntries(LANGUAGES.map((l) => [l, values[l].trim()]).filter(([, v]) => v)) as Partial<Record<Language, string>>;
  const changed = LANGUAGES.some((l) => (cleaned[l] ?? '') !== (row.overrides[l] ?? ''));
  const pending = save.isPending || reset.isPending;

  const submit = async () => {
    try {
      if (!Object.keys(cleaned).length) {
        if (hadOverrides) await reset.mutateAsync({ namespace: row.namespace, key: row.key });
        toast.success(t('translations.edit.resetDone'));
      } else {
        await save.mutateAsync({ namespace: row.namespace, key: row.key, values: cleaned });
        toast.success(t('translations.edit.saved'));
      }
      onOpenChange(false);
    } catch (error) {
      toastError(t, error);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
        <DialogContent size="lg" closeLabel={t('common.close')}>
          <DialogHeader>
            <DialogTitle>{t('translations.edit.title')}</DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" size="sm">
                {namespaceLabel(t, row.namespace)}
              </Badge>
              <span className="font-mono text-xs break-all">{row.key}</span>
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-5">
            {LANGUAGES.map((lang) => {
              const def = row.defaults[lang] ?? '';
              const vars = variablesOf(def || row.defaults.uz || '');
              const current = values[lang].trim();
              const missingVars = current ? vars.filter((v) => !current.includes(v)) : [];
              const id = `tr-${lang}`;
              return (
                <div key={lang} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={id}>{LANGUAGE_LABELS[lang].native}</Label>
                    {row.overrides[lang] ? (
                      <Badge variant="brand" size="sm">
                        {t('translations.overridden')}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-[13px]" lang={lang}>
                    <span className="me-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{t('translations.edit.defaultValue')}</span>
                    {def ? <span className="break-words whitespace-pre-wrap">{def}</span> : <span className="text-warning">{t('translations.emptyValue')}</span>}
                  </div>
                  <Textarea
                    id={id}
                    lang={lang}
                    rows={Math.min(6, Math.max(2, Math.ceil(Math.max(def.length, values[lang].length) / 70)))}
                    maxLength={4000}
                    value={values[lang]}
                    placeholder={def || t('translations.edit.overrideHint')}
                    onChange={(e) => setValues((v) => ({ ...v, [lang]: e.target.value }))}
                    readOnly={!canEdit}
                    aria-describedby={`${id}-hint`}
                  />
                  <p id={`${id}-hint`} className={cn('flex items-start gap-1.5 text-xs', missingVars.length ? 'text-warning' : 'text-muted-foreground')}>
                    {missingVars.length ? (
                      <>
                        <TriangleAlertIcon className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                        {t('translations.edit.missingVars', { vars: missingVars.join(' '), interpolation: { escapeValue: false } })}
                      </>
                    ) : vars.length ? (
                      t('translations.edit.variables', { vars: vars.join(' '), interpolation: { escapeValue: false } })
                    ) : (
                      t('translations.edit.overrideHint')
                    )}
                  </p>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground">{t('translations.cacheHint')}</p>
          </DialogBody>
          <DialogFooter className="sm:justify-between">
            {canEdit && hadOverrides ? (
              <Button type="button" variant="ghost" leftIcon={<RotateCcwIcon />} onClick={() => setConfirmReset(true)} disabled={pending}>
                {t('translations.edit.reset')}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                {canEdit ? t('common.cancel') : t('common.close')}
              </Button>
              {canEdit ? (
                <Button type="button" onClick={() => void submit()} loading={pending} disabled={!changed}>
                  {t('common.save')}
                </Button>
              ) : null}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        tone="warning"
        title={t('translations.edit.resetTitle')}
        description={t('translations.edit.resetText')}
        confirmLabel={t('translations.edit.reset')}
        onConfirm={async () => {
          try {
            await reset.mutateAsync({ namespace: row.namespace, key: row.key });
            toast.success(t('translations.edit.resetDone'));
            onOpenChange(false);
          } catch (error) {
            toastError(t, error);
            throw error;
          }
        }}
      />
    </>
  );
}

export default function TranslationsPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const { can } = useSession();
  usePageMeta(t('translations.title'));
  const canEdit = can('translations.update');
  const list = useListState({ filters: FILTERS, defaultLimit: 50 });
  const params = useMemo(() => {
    const { ns, ...rest } = list.params as Record<string, unknown>;
    return { ...rest, ...(ns ? { namespace: ns as string } : {}) };
  }, [list.params]);
  const query = useAdminList('translations', (api, p) => api.admin.translations.list(p as Parameters<typeof api.admin.translations.list>[0]), params);
  const namespaces = useAdminQuery(['translations', 'namespaces'], (api) => api.admin.translations.namespaces(), { staleTime: 10 * 60_000 });
  const [editing, setEditing] = useState<{ row: AdminTranslationRow | null; open: boolean }>({ row: null, open: false });
  const open = (row: AdminTranslationRow) => setEditing({ row, open: true });

  const columns = useMemo<DataColumn<AdminTranslationRow>[]>(
    () => [
      {
        id: 'key',
        header: t('translations.key'),
        meta: { alwaysVisible: true, cellClassName: 'whitespace-normal' },
        cell: ({ row }) => (
          <div className="flex max-w-64 min-w-44 flex-col gap-0.5">
            <span className="font-mono text-xs break-all text-foreground">{row.original.key}</span>
            <span className="text-[11px] text-muted-foreground">{namespaceLabel(t, row.original.namespace)}</span>
          </div>
        ),
      },
      ...LANGUAGES.map<DataColumn<AdminTranslationRow>>((lang) => ({
        id: lang,
        header: LANGUAGE_LABELS[lang].native,
        meta: { cellClassName: 'whitespace-normal align-top' },
        cell: ({ row }) => <ValueCell row={row.original} lang={lang} />,
      })),
      {
        id: 'updated',
        header: t('common.updatedAt'),
        meta: { defaultHidden: true },
        cell: ({ row }) => (row.original.updatedAt ? <span className="text-muted-foreground tabular">{f.date(row.original.updatedAt)}</span> : <span className="text-muted-foreground">—</span>),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('table.actions')}</span>,
        meta: { align: 'end', alwaysVisible: true },
        cell: ({ row }) => (
          <Button variant="ghost" size="icon-sm" aria-label={`${canEdit ? t('common.edit') : t('common.view')}: ${row.original.key}`} onClick={() => open(row.original)}>
            <PencilIcon />
          </Button>
        ),
      },
    ],
    [t, f, canEdit],
  );

  const filtered = list.activeFilterCount > 0 || !!list.q;

  return (
    <Page>
      <PageHeader
        title={t('translations.title')}
        description={t('translations.description')}
        meta={query.data ? <span className="text-sm text-muted-foreground tabular">{t('translations.total', { count: query.data.meta.total })}</span> : undefined}
      />
      <DataTable
        id="translations"
        label={t('translations.title')}
        columns={columns}
        data={query.data?.items}
        getRowId={(r) => `${r.namespace}:${r.key}`}
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
        empty={{ title: t('translations.empty'), icon: <LanguagesIcon /> }}
        toolbar={
          <>
            <SearchInput value={list.q} onChange={list.setQ} placeholder={t('translations.searchPlaceholder')} className="sm:w-72" />
            <FilterSelect
              label={t('translations.namespace')}
              value={list.filters.ns}
              onChange={(v) => list.setFilter('ns', v)}
              options={(namespaces.data ?? []).map((ns) => ({ value: ns, label: namespaceLabel(t, ns) }))}
            />
            <FilterSelect label={t('translations.missing')} value={list.filters.missing} onChange={(v) => list.setFilter('missing', v)} options={LANGUAGES.map((l) => ({ value: l, label: LANGUAGE_LABELS[l].native }))} />
            <label className="flex h-8 cursor-pointer items-center gap-2 rounded-md border border-input px-2.5 text-[13px]">
              <Switch size="sm" checked={list.filters.edited === '1'} onCheckedChange={(on) => list.setFilter('edited', on ? '1' : null)} aria-label={t('translations.edited')} />
              {t('translations.edited')}
            </label>
            {filtered ? (
              <Button variant="ghost" size="sm" onClick={list.reset}>
                {t('table.resetFilters')}
              </Button>
            ) : null}
          </>
        }
      />
      <EditDialog row={editing.row} open={editing.open} onOpenChange={(o) => setEditing((e) => ({ ...e, open: o }))} canEdit={canEdit} />
    </Page>
  );
}
