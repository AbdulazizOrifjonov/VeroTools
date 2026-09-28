import { saveBlob, useAdminQuery, useApi, useSession } from '@vero/api-client';
import type { Language } from '@vero/config';
import { EXPORT_FORMATS, REPORT_TYPES, type ExportFormat, type ReportColumnType, type ReportType } from '@vero/types';
import { Button, cn, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, toast } from '@vero/ui';
import { BoxesIcon, ChartNoAxesCombinedIcon, FileSpreadsheetIcon, FileTextIcon, LockIcon, ReceiptIcon, ShoppingCartIcon, TrendingUpIcon, UsersIcon, WalletIcon, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Page, PageHeader, Panel, usePageMeta } from '../../components/common/page';
import { PeriodPicker, usePeriodState } from '../../components/common/PeriodPicker';
import { ErrorState } from '../../components/common/states';
import { toastError } from '../../lib/errors';
import { useFormat, type Formatters } from '../../lib/format';
import { permissionLabel } from '../../lib/permissions';
import { useSearchParamState } from '../../lib/url-state';

const TYPE_ICON: Record<ReportType, LucideIcon> = {
  sales: TrendingUpIcon,
  orders: ShoppingCartIcon,
  expenses: WalletIcon,
  profit: ChartNoAxesCombinedIcon,
  inventory: BoxesIcon,
  customers: UsersIcon,
  products: ReceiptIcon,
};

/** Same extra rule as the API: money outside of sales needs the matching finance permission. */
const EXTRA_PERMISSION: Partial<Record<ReportType, 'analytics.read' | 'expenses.read'>> = { profit: 'analytics.read', expenses: 'expenses.read' };

const FORMAT_ICON: Record<ExportFormat, LucideIcon> = { csv: FileTextIcon, xlsx: FileSpreadsheetIcon, pdf: FileTextIcon };
const PREVIEW_ROWS = 200;

function formatCell(f: Formatters, type: ReportColumnType, value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  switch (type) {
    case 'money':
      return f.money(Number(value));
    case 'number':
      return f.number(Number(value), Number.isInteger(Number(value)) ? 0 : 1);
    case 'percent':
      return f.percent(Number(value));
    case 'date':
      return f.date(String(value));
    case 'datetime':
      return f.datetime(String(value));
    default:
      return String(value);
  }
}

const numeric = (type: ReportColumnType) => type === 'money' || type === 'number' || type === 'percent';

export default function ReportsPage() {
  const { t, i18n } = useTranslation();
  const f = useFormat();
  const api = useApi();
  const { can } = useSession();
  usePageMeta(t('reports.title'));
  const period = usePeriodState('thisMonth');
  const available = (type: ReportType) => !EXTRA_PERMISSION[type] || can(EXTRA_PERMISSION[type]!);
  const [typeParam, setType] = useSearchParamState('type', 'sales');
  const type = ((REPORT_TYPES as readonly string[]).includes(typeParam) && available(typeParam as ReportType) ? typeParam : REPORT_TYPES.find(available) ?? 'sales') as ReportType;
  const [langParam, setLang] = useSearchParamState('lang', i18n.language);
  const lang = (['uz', 'ru', 'en'].includes(langParam) ? langParam : 'uz') as Language;
  const canExport = can('reports.export');
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const query = useAdminQuery(['reports', type, period.query, lang], (a) => a.admin.report(type, { ...period.query, lang }), { staleTime: 30_000, enabled: available(type) });
  const report = query.data;

  const doExport = async (format: ExportFormat) => {
    setExporting(format);
    try {
      const { blob, filename } = await api.admin.exportReport(type, { ...period.query, format, lang });
      saveBlob(blob, filename);
      toast.success(t('reports.exported', { name: filename }));
    } catch (error) {
      toastError(t, error);
    } finally {
      setExporting(null);
    }
  };

  return (
    <Page>
      <PageHeader title={t('reports.title')} description={t('reports.description')} />
      <div className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <Panel title={t('reports.type')} className="self-start">
          <ul className="flex flex-col gap-1" role="radiogroup" aria-label={t('reports.type')}>
            {REPORT_TYPES.map((rt) => {
              const Icon = TYPE_ICON[rt];
              const ok = available(rt);
              const active = rt === type;
              return (
                <li key={rt}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={!ok}
                    onClick={() => setType(rt)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-start transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed',
                      active ? 'border-primary/50 bg-brand-soft/50 dark:border-brand/50' : 'border-transparent hover:bg-accent/60',
                      !ok && 'opacity-60 hover:bg-transparent',
                    )}
                  >
                    <span className={cn('mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md', active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')} aria-hidden="true">
                      {ok ? <Icon className="size-4" /> : <LockIcon className="size-3.5" />}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[13px] font-semibold">{t(`enums.reportType.${rt}`)}</span>
                      <span className="text-xs leading-snug text-muted-foreground">
                        {ok ? t(`reports.typeHint.${rt}`) : t('reports.needs', { permission: permissionLabel(t, EXTRA_PERMISSION[rt]!) })}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
            <div className="flex flex-wrap items-center gap-2">
              <PeriodPicker state={period} />
              <Select value={lang} onValueChange={(v) => setLang(v)}>
                <SelectTrigger size="sm" className="w-auto min-w-36" aria-label={t('reports.language')}>
                  <span className="me-0.5 text-muted-foreground">{t('reports.language')}:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['uz', 'ru', 'en'] as const).map((l) => (
                    <SelectItem key={l} value={l}>
                      {t(`common.languageNames.${l}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canExport ? (
                EXPORT_FORMATS.map((fmt) => {
                  const Icon = FORMAT_ICON[fmt];
                  return (
                    <Button key={fmt} variant={fmt === 'xlsx' ? 'default' : 'outline'} size="sm" leftIcon={exporting === fmt ? undefined : <Icon />} loading={exporting === fmt} disabled={!!exporting || !report} onClick={() => void doExport(fmt)}>
                      {t(`enums.exportFormat.${fmt}`)}
                    </Button>
                  );
                })
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <LockIcon className="size-3.5" aria-hidden="true" />
                  {t('reports.noExport')}
                </span>
              )}
            </div>
          </div>

          {query.isError && !report ? (
            <ErrorState error={query.error} onRetry={() => void query.refetch()} />
          ) : !report ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-96 rounded-xl" />
            </div>
          ) : (
            <div className={cn('flex flex-col gap-4 transition-opacity', query.isFetching && 'opacity-70')} aria-busy={query.isFetching || undefined}>
              <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4" aria-label={t('reports.summary')}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-[15px] font-semibold">{report.title}</h2>
                  <span className="text-xs text-muted-foreground tabular">
                    {f.date(report.range.from, 'long')} — {f.date(new Date(new Date(report.range.to).getTime() - 1), 'long')} · {t('reports.generated', { date: f.datetime(report.generatedAt) })}
                  </span>
                </div>
                {report.summary.length ? (
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                    {report.summary.map((s) => (
                      <div key={s.label} className="flex flex-col rounded-lg bg-surface px-3 py-2">
                        <dt className="text-xs text-muted-foreground">{s.label}</dt>
                        <dd className="text-base font-bold tabular">{formatCell(f, s.type, s.value)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </section>

              <section className="flex min-w-0 flex-col rounded-xl border border-border bg-card" aria-label={report.title}>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5 text-[13px] text-muted-foreground">
                  <span className="tabular">{t('reports.rows', { count: report.rows.length })}</span>
                  {report.rows.length > PREVIEW_ROWS ? <span>{t('reports.previewNote', { count: PREVIEW_ROWS })}</span> : null}
                </div>
                {report.rows.length === 0 ? (
                  <p className="px-4 py-12 text-center text-sm text-muted-foreground">{t('reports.empty')}</p>
                ) : (
                  <Table stickyHeader containerClassName="max-h-[70vh]" className="text-[13px]">
                    <TableHeader>
                      <TableRow>
                        {report.columns.map((c) => (
                          <TableHead key={c.key} className={cn('h-9 px-3 text-xs whitespace-nowrap first:ps-4 last:pe-4', numeric(c.type) && 'text-end')}>
                            {c.label}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.rows.slice(0, PREVIEW_ROWS).map((row, i) => (
                        <TableRow key={i}>
                          {report.columns.map((c) => (
                            <TableCell key={c.key} className={cn('px-3 py-2 whitespace-nowrap first:ps-4 last:pe-4', numeric(c.type) && 'text-end tabular')}>
                              {formatCell(f, c.type, row[c.key])}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}
