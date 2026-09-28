import { Button, cn, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@vero/ui';
import { ChartColumnIcon, TableIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Formatters } from '../../lib/format';

/** Categorical chart colours (validated order, see styles.css): colour follows the metric, never its rank. */
export const SERIES_COLORS = {
  revenue: 'var(--chart-1)',
  expenses: 'var(--chart-2)',
  profit: 'var(--chart-3)',
  orders: 'var(--chart-1)',
  customers: 'var(--chart-2)',
  single: 'var(--chart-1)',
} as const;

export const AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 11 } as const;
export const GRID_STROKE = 'var(--chart-grid)';

const MONTHS: Record<string, string[]> = {
  uz: ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'],
  ru: ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

/** Axis / tooltip label of a series bucket: "2026-09-23" → "23 sen", "2026-09" → "sen 2026". */
export function bucketLabel(date: string, lang: string, long = false): string {
  const months = MONTHS[lang] ?? MONTHS.en!;
  const [y, m, d] = date.split('-');
  const month = months[Number(m) - 1] ?? m;
  if (!d) return long ? `${month} ${y}` : `${month} ${String(y).slice(2)}`;
  return long ? `${Number(d)} ${month} ${y}` : `${Number(d)} ${month}`;
}

export interface TooltipRow {
  key: string;
  label: string;
  color: string;
  format: (v: number) => string;
  /** line key in the tooltip (lines) vs square (bars) */
  shape?: 'line' | 'square';
}

/** Recharts tooltip: value first (strong), series name secondary, a short line key in the series colour. */
export function ChartTooltip({
  active,
  payload,
  label,
  rows,
  title,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; value?: number; payload?: Record<string, unknown> }>;
  label?: string | number;
  rows: TooltipRow[];
  title?: (label: string, point: Record<string, unknown> | undefined) => string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  return (
    <div className="min-w-44 rounded-lg border border-border bg-popover px-3 py-2.5 text-popover-foreground shadow-lg">
      <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{title ? title(String(label ?? ''), point) : String(label ?? '')}</p>
      <ul className="flex flex-col gap-1">
        {rows.map((row) => {
          const value = Number(point?.[row.key] ?? 0);
          return (
            <li key={row.key} className="flex items-center justify-between gap-4 text-xs">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span aria-hidden="true" className={cn(row.shape === 'square' ? 'size-2 rounded-[2px]' : 'h-0.5 w-3 rounded-full')} style={{ background: row.color }} />
                {row.label}
              </span>
              <span className="font-semibold text-foreground tabular">{row.format(value)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Legend for ≥ 2 series (identity never by colour alone: every swatch has its label). */
export function ChartLegend({ items }: { items: Array<{ label: string; color: string; shape?: 'line' | 'square' }> }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={cn(i.shape === 'line' ? 'h-0.5 w-3.5 rounded-full' : 'size-2.5 rounded-[3px]')} style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

export interface ChartTableColumn<T> {
  key: string;
  label: string;
  value: (row: T) => ReactNode;
  numeric?: boolean;
}

/**
 * Chart card with an accessible summary (aria-label on the plot) and a table view twin, so no value is
 * reachable only through hover.
 */
export function ChartCard<T>({
  title,
  description,
  summary,
  legend,
  actions,
  children,
  table,
  className,
  height = 240,
  empty,
}: {
  title: ReactNode;
  description?: ReactNode;
  summary: string;
  legend?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  table?: { rows: T[]; columns: ChartTableColumn<T>[]; caption: string };
  className?: string;
  height?: number;
  empty?: boolean;
}) {
  const { t } = useTranslation();
  const [view, setView] = useState<'chart' | 'table'>('chart');
  return (
    <section className={cn('flex min-w-0 flex-col rounded-xl border border-border bg-card', className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 pt-4 sm:px-5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-[15px] leading-snug font-semibold tracking-[-0.01em]">{title}</h2>
          {description ? <p className="text-[13px] text-muted-foreground">{description}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {table ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              aria-pressed={view === 'table'}
              onClick={() => setView((v) => (v === 'chart' ? 'table' : 'chart'))}
              leftIcon={view === 'chart' ? <TableIcon /> : <ChartColumnIcon />}
            >
              {view === 'chart' ? t('common.tableView') : t('common.chart')}
            </Button>
          ) : null}
        </div>
      </div>
      {legend && view === 'chart' ? <div className="px-4 pt-2 sm:px-5">{legend}</div> : null}
      <div className="min-w-0 px-2 pt-3 pb-3 sm:px-3">
        {empty ? (
          <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
            {t('common.noData')}
          </div>
        ) : view === 'table' && table ? (
          <div className="px-2">
            <Table containerClassName="max-h-80" stickyHeader className="text-[13px]">
              <caption className="sr-only">{table.caption}</caption>
              <TableHeader>
                <TableRow>
                  {table.columns.map((c) => (
                    <TableHead key={c.key} className={cn('h-9 px-3 text-xs', c.numeric && 'text-end')}>
                      {c.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.rows.map((row, i) => (
                  <TableRow key={i}>
                    {table.columns.map((c) => (
                      <TableCell key={c.key} className={cn('px-3 py-2', c.numeric && 'text-end tabular')}>
                        {c.value(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div role="img" aria-label={summary} style={{ height }} className="w-full min-w-0">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}

/** Horizontal bar list (top N): label · bar · value. Plain HTML — exact, readable, no hover needed. */
export function BarList<T>({
  items,
  label,
  value,
  format,
  color = SERIES_COLORS.single,
  colorOf,
  aside,
  emptyText,
}: {
  items: T[];
  label: (item: T) => ReactNode;
  value: (item: T) => number;
  format: (v: number) => string;
  color?: string;
  colorOf?: (item: T) => string;
  aside?: (item: T) => ReactNode;
  emptyText?: string;
}) {
  const { t } = useTranslation();
  const max = Math.max(1, ...items.map(value));
  if (!items.length) return <p className="py-6 text-center text-sm text-muted-foreground">{emptyText ?? t('common.noData')}</p>;
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item, i) => {
        const v = value(item);
        return (
          <li key={i} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate text-foreground">{label(item)}</span>
              <span className="flex shrink-0 items-baseline gap-2">
                {aside ? <span className="text-xs text-muted-foreground tabular">{aside(item)}</span> : null}
                <span className="font-semibold tabular">{format(v)}</span>
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div className="h-full rounded-full" style={{ width: `${Math.max(2, (v / max) * 100)}%`, background: colorOf?.(item) ?? color }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Y-axis tick formatter for money (compact: 1.2M). */
export function moneyTick(f: Formatters) {
  return (v: number) => f.compact(v);
}
