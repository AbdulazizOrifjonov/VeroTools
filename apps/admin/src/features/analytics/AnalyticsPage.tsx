import { useAdminQuery } from '@vero/api-client';
import type { AnalyticsDTO, PeriodKpi } from '@vero/types';
import { Alert, AlertDescription, cn, Skeleton } from '@vero/ui';
import { InfoIcon } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AXIS_TICK, BarList, bucketLabel, ChartCard, ChartLegend, ChartTooltip, GRID_STROKE, SERIES_COLORS } from '../../components/charts/chart-kit';
import { Delta } from '../../components/common/Delta';
import { Page, PageHeader, Panel, StatTile, usePageMeta } from '../../components/common/page';
import { PeriodPicker, usePeriodState } from '../../components/common/PeriodPicker';
import { ErrorState } from '../../components/common/states';
import { Thumb } from '../../components/common/Thumb';
import { useFormat } from '../../lib/format';
import { imageRefThumb } from '../../lib/images';

function KpiTiles({ data }: { data: AnalyticsDTO }) {
  const { t } = useTranslation();
  const f = useFormat();
  const cur = data.totals;
  const prev = data.previous;
  const tiles: Array<{ key: keyof PeriodKpi; format: (v: number) => string; invert?: boolean }> = [
    { key: 'revenue', format: f.money },
    { key: 'orders', format: (v) => f.number(v) },
    { key: 'averageOrderValue', format: f.money },
    { key: 'customers', format: (v) => f.number(v) },
    { key: 'expenses', format: f.money, invert: true },
    { key: 'profit', format: f.money },
  ];
  const label = (k: keyof PeriodKpi) => t(`analytics.kpi.${k === 'averageOrderValue' ? 'aov' : k}`);
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
      {tiles.map((tile) => (
        <StatTile
          key={tile.key}
          label={label(tile.key)}
          value={<span className={cn(tile.key === 'profit' && cur.profit < 0 && 'text-danger')}>{tile.format(cur[tile.key])}</span>}
          delta={<Delta current={cur[tile.key]} previous={prev[tile.key]} invert={tile.invert} label={t('analytics.vsPrevious')} />}
          hint={t('analytics.previousValue', { value: tile.format(prev[tile.key]) })}
        />
      ))}
    </div>
  );
}

function ProfitBreakdown({ data }: { data: AnalyticsDTO }) {
  const { t } = useTranslation();
  const f = useFormat();
  const p = data.profit;
  const rows: Array<{ key: string; value: number; sign: '+' | '−' | '' ; strong?: boolean }> = [
    { key: 'grossSales', value: p.grossSales, sign: '' },
    { key: 'discounts', value: p.discounts, sign: '−' },
    { key: 'deliveryIncome', value: p.deliveryIncome, sign: '+' },
    { key: 'productCost', value: p.productCost, sign: '−' },
    { key: 'deliveryExpenses', value: p.deliveryExpenses, sign: '−' },
    { key: 'operationalExpenses', value: p.operationalExpenses, sign: '−' },
  ];
  return (
    <Panel title={t('analytics.profit.title')} className="h-full">
      <dl className="flex flex-col text-[13px]">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-3 border-b border-dashed border-border py-2">
            <dt className="text-muted-foreground">{t(`analytics.profit.${r.key}`)}</dt>
            <dd className="font-medium tabular">
              {r.sign ? <span className="me-1 text-muted-foreground">{r.sign}</span> : null}
              {f.money(r.value)}
            </dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 pt-3">
          <dt className="font-semibold">{t('analytics.profit.estimatedProfit')}</dt>
          <dd className={cn('text-lg font-bold tabular', p.estimatedProfit < 0 ? 'text-danger' : 'text-foreground')}>{f.money(p.estimatedProfit)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 pt-1">
          <dt className="text-muted-foreground">{t('analytics.profit.margin')}</dt>
          <dd className="font-semibold tabular">{f.percent(p.margin)}</dd>
        </div>
      </dl>
      <Alert variant="info" icon={<InfoIcon />} className="mt-4">
        <AlertDescription className="text-xs">{t('analytics.profit.note')}</AlertDescription>
      </Alert>
    </Panel>
  );
}

function Secondary({ data }: { data: AnalyticsDTO }) {
  const { t } = useTranslation();
  const f = useFormat();
  const s = data.totals;
  const items: Array<{ key: string; value: string }> = [
    { key: 'grossSales', value: f.money(s.grossSales) },
    { key: 'discounts', value: f.money(s.discounts) },
    { key: 'netSales', value: f.money(s.netSales) },
    { key: 'itemsSold', value: f.number(s.itemsSold) },
    { key: 'newCustomers', value: f.number(s.newCustomers) },
    { key: 'cancelledOrders', value: f.number(s.cancelledOrders) },
    { key: 'returnedOrders', value: f.number(s.returnedOrders) },
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-border bg-card px-4 py-3 text-[13px] sm:grid-cols-4 xl:grid-cols-7">
      {items.map((i) => (
        <div key={i.key} className="flex flex-col">
          <dt className="text-xs text-muted-foreground">{t(`analytics.secondary.${i.key}`)}</dt>
          <dd className="font-semibold tabular">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function TopTable<T>({ title, rows, columns }: { title: string; rows: T[]; columns: Array<{ key: string; label: string; cell: (row: T) => ReactNode; numeric?: boolean }> }) {
  const { t } = useTranslation();
  return (
    <Panel title={title} flush>
      {rows.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-muted-foreground">{t('analytics.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="border-y border-border bg-surface text-xs text-muted-foreground">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} scope="col" className={cn('px-4 py-2 font-semibold first:ps-5 last:pe-5', c.numeric ? 'text-end' : 'text-start')}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c.key} className={cn('px-4 py-2 first:ps-5 last:pe-5', c.numeric && 'text-end whitespace-nowrap tabular')}>
                      {c.cell(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const f = useFormat();
  usePageMeta(t('analytics.title'));
  const period = usePeriodState('last30');
  const query = useAdminQuery(['analytics', period.query], (api) => api.admin.analytics(period.query), { staleTime: 30_000 });
  const data = query.data;

  const series = useMemo(() => (data?.series ?? []).map((p) => ({ ...p, label: bucketLabel(p.date, f.lang) })), [data, f.lang]);
  const rangeLabel = data ? t('analytics.range', { from: f.date(data.range.from, 'long'), to: f.date(new Date(new Date(data.range.to).getTime() - 1), 'long') }) : '';
  const revenueTotal = data?.totals.revenue ?? 0;

  return (
    <Page>
      <PageHeader
        title={t('analytics.title')}
        description={data ? `${t('analytics.description')} ${rangeLabel}.` : t('analytics.description')}
        actions={<PeriodPicker state={period} withGranularity />}
      />
      {query.isError && !data ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : !data ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : (
        <div className={cn('flex flex-col gap-4 transition-opacity', query.isFetching && 'opacity-70')} aria-busy={query.isFetching || undefined}>
          <KpiTiles data={data} />
          <Secondary data={data} />
          <div className="grid gap-4 xl:grid-cols-3">
            <ChartCard
              className="xl:col-span-2"
              title={t('analytics.charts.finance')}
              description={rangeLabel}
              height={300}
              empty={series.every((s) => !s.revenue && !s.expenses)}
              summary={t('analytics.charts.financeSummary', { revenue: f.money(data.totals.revenue), expenses: f.money(data.totals.expenses), profit: f.money(data.totals.profit) })}
              legend={
                <ChartLegend
                  items={[
                    { label: t('analytics.kpi.revenue'), color: SERIES_COLORS.revenue },
                    { label: t('analytics.kpi.expenses'), color: SERIES_COLORS.expenses },
                    { label: t('analytics.kpi.profit'), color: SERIES_COLORS.profit, shape: 'line' },
                  ]}
                />
              }
              table={{
                caption: t('analytics.charts.finance'),
                rows: data.series,
                columns: [
                  { key: 'date', label: t('analytics.charts.period'), value: (r) => bucketLabel(r.date, f.lang, true) },
                  { key: 'revenue', label: t('analytics.kpi.revenue'), value: (r) => f.money(r.revenue), numeric: true },
                  { key: 'expenses', label: t('analytics.kpi.expenses'), value: (r) => f.money(r.expenses), numeric: true },
                  { key: 'profit', label: t('analytics.kpi.profit'), value: (r) => f.money(r.profit), numeric: true },
                ],
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: 4 }} barGap={2} barCategoryGap="24%">
                  <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                  <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: 'var(--chart-axis)' }} interval="preserveStartEnd" minTickGap={20} />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={58} tickFormatter={(v: number) => f.compact(v)} />
                  <Tooltip
                    cursor={{ fill: 'var(--accent)' }}
                    content={
                      <ChartTooltip
                        rows={[
                          { key: 'revenue', label: t('analytics.kpi.revenue'), color: SERIES_COLORS.revenue, format: f.money, shape: 'square' },
                          { key: 'expenses', label: t('analytics.kpi.expenses'), color: SERIES_COLORS.expenses, format: f.money, shape: 'square' },
                          { key: 'profit', label: t('analytics.kpi.profit'), color: SERIES_COLORS.profit, format: f.money },
                        ]}
                        title={(_, point) => bucketLabel(String(point?.date ?? ''), f.lang, true)}
                      />
                    }
                  />
                  <Bar dataKey="revenue" fill={SERIES_COLORS.revenue} radius={[4, 4, 0, 0]} maxBarSize={20} isAnimationActive={false} />
                  <Bar dataKey="expenses" fill={SERIES_COLORS.expenses} radius={[4, 4, 0, 0]} maxBarSize={20} isAnimationActive={false} />
                  <Line type="monotone" dataKey="profit" stroke={SERIES_COLORS.profit} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
            <ProfitBreakdown data={data} />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <ChartCard
              className="xl:col-span-2"
              title={t('analytics.charts.activity')}
              height={240}
              empty={series.every((s) => !s.orders)}
              summary={t('analytics.charts.activitySummary', { orders: f.number(data.totals.orders), customers: f.number(data.totals.customers) })}
              legend={
                <ChartLegend
                  items={[
                    { label: t('analytics.kpi.orders'), color: SERIES_COLORS.orders },
                    { label: t('analytics.kpi.customers'), color: SERIES_COLORS.customers, shape: 'line' },
                  ]}
                />
              }
              table={{
                caption: t('analytics.charts.activity'),
                rows: data.series,
                columns: [
                  { key: 'date', label: t('analytics.charts.period'), value: (r) => bucketLabel(r.date, f.lang, true) },
                  { key: 'orders', label: t('analytics.kpi.orders'), value: (r) => f.number(r.orders), numeric: true },
                  { key: 'customers', label: t('analytics.kpi.customers'), value: (r) => f.number(r.customers), numeric: true },
                ],
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: 4 }} barCategoryGap="24%">
                  <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                  <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: 'var(--chart-axis)' }} interval="preserveStartEnd" minTickGap={20} />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'var(--accent)' }}
                    content={
                      <ChartTooltip
                        rows={[
                          { key: 'orders', label: t('analytics.kpi.orders'), color: SERIES_COLORS.orders, format: (v) => f.number(v), shape: 'square' },
                          { key: 'customers', label: t('analytics.kpi.customers'), color: SERIES_COLORS.customers, format: (v) => f.number(v) },
                        ]}
                        title={(_, point) => bucketLabel(String(point?.date ?? ''), f.lang, true)}
                      />
                    }
                  />
                  <Bar dataKey="orders" fill={SERIES_COLORS.orders} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
                  <Line type="monotone" dataKey="customers" stroke={SERIES_COLORS.customers} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
            <Panel title={t('analytics.charts.byStatus')}>
              <BarList
                items={[...data.ordersByStatus].sort((a, b) => b.count - a.count)}
                label={(r) => t(`common:orderStatus.${r.status}`)}
                value={(r) => r.count}
                format={(v) => f.number(v)}
                color="var(--muted-foreground)"
                emptyText={t('analytics.empty')}
              />
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Panel title={t('analytics.charts.expensesByCategory')}>
              <BarList items={data.expensesByCategory} label={(r) => f.loc(r.name)} value={(r) => r.amount} format={f.money} colorOf={(r) => r.color} emptyText={t('analytics.empty')} />
            </Panel>
            <Panel title={t('analytics.charts.byPaymentMethod')}>
              <BarList
                items={data.salesByPaymentMethod}
                label={(r) => t(`common:paymentMethod.${r.method}`)}
                value={(r) => r.amount}
                format={f.money}
                aside={(r) => t('analytics.charts.ordersShort', { count: r.orders })}
                emptyText={t('analytics.empty')}
              />
            </Panel>
            <Panel title={t('analytics.charts.byRegion')}>
              <BarList items={data.salesByRegion} label={(r) => r.name} value={(r) => r.amount} format={f.money} aside={(r) => t('analytics.charts.ordersShort', { count: r.orders })} emptyText={t('analytics.empty')} />
            </Panel>
          </div>

          <TopTable
            title={t('analytics.tables.topProducts')}
            rows={data.topProducts}
            columns={[
              {
                key: 'product',
                label: t('analytics.tables.product'),
                cell: (r) => (
                  <div className="flex items-center gap-3">
                    <Thumb src={imageRefThumb(r.image)} size="sm" alt="" />
                    <div className="flex min-w-0 flex-col">
                      <span className="line-clamp-1 font-medium">{f.loc(r.name)}</span>
                      <span className="font-mono text-xs text-muted-foreground">{r.sku}</span>
                    </div>
                  </div>
                ),
              },
              { key: 'qty', label: t('analytics.tables.quantity'), cell: (r) => f.number(r.quantity), numeric: true },
              { key: 'revenue', label: t('analytics.tables.revenue'), cell: (r) => <span className="font-semibold">{f.money(r.revenue)}</span>, numeric: true },
              { key: 'share', label: t('analytics.tables.share'), cell: (r) => (revenueTotal ? f.percent((r.revenue / revenueTotal) * 100) : '—'), numeric: true },
            ]}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {(['topCategories', 'topBrands'] as const).map((key) => (
              <TopTable
                key={key}
                title={t(`analytics.tables.${key}`)}
                rows={data[key]}
                columns={[
                  { key: 'name', label: t('analytics.tables.name'), cell: (r) => <span className="font-medium">{typeof r.name === 'string' ? r.name : f.loc(r.name)}</span> },
                  { key: 'qty', label: t('analytics.tables.quantity'), cell: (r) => f.number(r.quantity), numeric: true },
                  { key: 'revenue', label: t('analytics.tables.revenue'), cell: (r) => <span className="font-semibold">{f.money(r.revenue)}</span>, numeric: true },
                ]}
              />
            ))}
          </div>
        </div>
      )}
    </Page>
  );
}
