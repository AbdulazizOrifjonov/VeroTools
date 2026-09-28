import { useAdminQuery, useSession } from '@vero/api-client';
import type { AdminInventoryItem, DashboardDTO, PeriodKpi, SeriesPoint } from '@vero/types';
import { Alert, AlertDescription, Button, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, ToggleGroup, ToggleGroupItem } from '@vero/ui';
import {
  ArrowRightIcon,
  BanIcon,
  CircleCheckIcon,
  ClockIcon,
  InboxIcon,
  LoaderIcon,
  PackageCheckIcon,
  PackageXIcon,
  RotateCwIcon,
  StarIcon,
  TriangleAlertIcon,
  UserPlusIcon,
  UsersIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { StatusBadge } from '../../components/common/badges';
import { Delta } from '../../components/common/Delta';
import { Page, PageHeader, Panel, StatTile, usePageMeta } from '../../components/common/page';
import { ErrorState } from '../../components/common/states';
import { Thumb } from '../../components/common/Thumb';
import { AXIS_TICK, BarList, bucketLabel, ChartCard, ChartLegend, ChartTooltip, GRID_STROKE, SERIES_COLORS } from '../../components/charts/chart-kit';
import { useFormat } from '../../lib/format';
import { AdjustStockDialog, toAdjustTarget, type AdjustTarget } from '../inventory/AdjustStockDialog';

type PeriodKey = keyof DashboardDTO['kpis'];
const PERIODS: PeriodKey[] = ['today', 'yesterday', 'month', 'previousMonth', 'year'];

/** Comparable period for each KPI period — only from API figures (the year has no previous-year data). */
function comparable(d: DashboardDTO, period: PeriodKey): Partial<PeriodKpi> | null {
  switch (period) {
    case 'today':
      return d.kpis.yesterday;
    case 'month':
      return d.kpis.previousMonth;
    case 'yesterday': {
      // the day before yesterday is the third-from-last point of the 30-day series (same definitions)
      const p = d.daily[d.daily.length - 3];
      return p ? { revenue: p.revenue, orders: p.orders, customers: p.customers, expenses: p.expenses, profit: p.profit } : null;
    }
    case 'previousMonth': {
      const p = d.monthly[d.monthly.length - 3];
      return p ? { revenue: p.revenue, orders: p.orders, customers: p.customers, expenses: p.expenses, profit: p.profit } : null;
    }
    default:
      return null;
  }
}

function peakOf(series: SeriesPoint[], key: 'revenue' | 'orders') {
  return series.reduce<SeriesPoint | null>((best, p) => (!best || p[key] > best[key] ? p : best), null);
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-hidden="true">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[6.5rem] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-80 rounded-xl xl:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const { user, can } = useSession();
  usePageMeta(t('dashboard.title'));
  const [period, setPeriod] = useState<PeriodKey>('today');
  const [adjust, setAdjust] = useState<AdjustTarget | null>(null);
  const query = useAdminQuery(['dashboard'], (api) => api.admin.dashboard(), { refetchInterval: 120_000 });
  const d = query.data;

  return (
    <Page>
      <PageHeader
        title={user ? t('dashboard.greeting', { name: user.firstName }) : t('dashboard.title')}
        description={d ? `${t('common.generatedAt', { date: f.datetime(d.generatedAt) })} · ${d.timezone}` : undefined}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void query.refetch()} loading={query.isFetching && !query.isLoading} leftIcon={<RotateCwIcon />}>
              {t('dashboard.refresh')}
            </Button>
            {can('analytics.read') ? (
              <Button variant="outline" size="sm" asChild rightIcon={<ArrowRightIcon />}>
                <Link to="/analytics">{t('dashboard.toAnalytics')}</Link>
              </Button>
            ) : null}
          </>
        }
      />

      {query.isError && !d ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : !d ? (
        <DashboardSkeleton />
      ) : (
        <DashboardContent d={d} period={period} setPeriod={setPeriod} onAdjust={(item) => setAdjust(toAdjustTarget(item))} />
      )}

      <AdjustStockDialog target={adjust} open={!!adjust} onOpenChange={(o) => !o && setAdjust(null)} />
    </Page>
  );
}

function DashboardContent({ d, period, setPeriod, onAdjust }: { d: DashboardDTO; period: PeriodKey; setPeriod: (p: PeriodKey) => void; onAdjust: (item: AdminInventoryItem) => void }) {
  const { t } = useTranslation();
  const f = useFormat();
  const { can } = useSession();
  const kpi = d.kpis[period];
  const prev = comparable(d, period);
  const vs = t(`dashboard.vs.${period}`);

  const tiles: Array<{ key: string; label: string; value: string; current: number; previous?: number; invert?: boolean; hint?: string }> = [
    { key: 'revenue', label: t('dashboard.kpi.revenue'), value: f.money(kpi.revenue), current: kpi.revenue, previous: prev?.revenue, hint: t('dashboard.kpi.revenueHint') },
    { key: 'orders', label: t('dashboard.kpi.orders'), value: f.number(kpi.orders), current: kpi.orders, previous: prev?.orders },
    { key: 'aov', label: t('dashboard.kpi.aov'), value: f.money(kpi.averageOrderValue), current: kpi.averageOrderValue, previous: prev?.averageOrderValue },
    { key: 'customers', label: t('dashboard.kpi.customers'), value: f.number(kpi.customers), current: kpi.customers, previous: prev?.customers, hint: t('dashboard.kpi.customersHint') },
  ];
  if (d.financeVisible) {
    tiles.push(
      { key: 'expenses', label: t('dashboard.kpi.expenses'), value: f.money(kpi.expenses), current: kpi.expenses, previous: prev?.expenses, invert: true },
      { key: 'profit', label: t('dashboard.kpi.profit'), value: f.money(kpi.profit), current: kpi.profit, previous: prev?.profit, hint: t('dashboard.kpi.profitHint') },
    );
  }

  const c = d.counts;
  const countTiles = [
    { key: 'pendingOrders', value: c.pendingOrders, to: '/orders?status=PENDING', icon: <ClockIcon />, tone: c.pendingOrders ? ('warning' as const) : ('default' as const), perm: can('orders.read') },
    { key: 'processingOrders', value: c.processingOrders, to: '/orders', icon: <LoaderIcon />, tone: 'default' as const, perm: can('orders.read') },
    { key: 'completedOrders', value: c.completedOrders, to: '/orders?status=DELIVERED', icon: <CircleCheckIcon />, tone: 'success' as const, perm: can('orders.read') },
    { key: 'cancelledOrders', value: c.cancelledOrders, to: '/orders?status=CANCELLED', icon: <BanIcon />, tone: 'default' as const, perm: can('orders.read') },
    { key: 'lowStock', value: c.lowStock, to: '/inventory?stock=low', icon: <TriangleAlertIcon />, tone: c.lowStock ? ('warning' as const) : ('default' as const), perm: can('inventory.read') },
    { key: 'outOfStock', value: c.outOfStock, to: '/inventory?stock=out', icon: <PackageXIcon />, tone: c.outOfStock ? ('danger' as const) : ('default' as const), perm: can('inventory.read') },
    { key: 'pendingReviews', value: c.pendingReviews, to: '/reviews?status=PENDING', icon: <StarIcon />, tone: c.pendingReviews ? ('warning' as const) : ('default' as const), perm: can('reviews.read') },
    { key: 'newMessages', value: c.newMessages, to: '/messages?status=NEW', icon: <InboxIcon />, tone: c.newMessages ? ('warning' as const) : ('default' as const), perm: can('content.read') },
    { key: 'customers', value: c.customers, to: '/customers', icon: <UsersIcon />, tone: 'default' as const, perm: can('customers.read') },
    { key: 'newCustomersMonth', value: c.newCustomersMonth, to: '/customers?sort=-createdAt', icon: <UserPlusIcon />, tone: 'default' as const, perm: can('customers.read') },
    { key: 'publishedProducts', value: c.publishedProducts, to: '/products?status=published', icon: <PackageCheckIcon />, tone: 'default' as const, perm: can('products.read'), hint: t('dashboard.counts.ofTotal', { total: f.number(c.products) }) },
  ];

  const dailyPeak = peakOf(d.daily, 'revenue');
  const ordersPeak = peakOf(d.daily, 'orders');
  const dailyRevenueTotal = d.daily.reduce((s, p) => s + p.revenue, 0);
  const dailyOrdersTotal = d.daily.reduce((s, p) => s + p.orders, 0);
  const monthlyTotals = useMemo(
    () => d.monthly.reduce((acc, p) => ({ revenue: acc.revenue + p.revenue, expenses: acc.expenses + p.expenses, profit: acc.profit + p.profit }), { revenue: 0, expenses: 0, profit: 0 }),
    [d.monthly],
  );
  const dailyData = d.daily.map((p) => ({ ...p, label: bucketLabel(p.date, f.lang) }));
  const monthlyData = d.monthly.map((p) => ({ ...p, label: bucketLabel(p.date, f.lang) }));

  return (
    <>
      <section aria-labelledby="kpi-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="kpi-title" className="sr-only">
            {t('dashboard.periodLabel')}
          </h2>
          <ToggleGroup type="single" variant="segmented" value={period} onValueChange={(v) => v && setPeriod(v as PeriodKey)} aria-label={t('dashboard.periodLabel')} className="max-w-full overflow-x-auto no-scrollbar">
            {PERIODS.map((p) => (
              <ToggleGroupItem key={p} value={p} className="px-3 text-[13px] whitespace-nowrap">
                {t(`dashboard.period.${p}`)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className={d.financeVisible ? 'grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6' : 'grid grid-cols-2 gap-3 xl:grid-cols-4'}>
          {tiles.map((tile) => (
            <StatTile
              key={tile.key}
              label={tile.label}
              value={tile.value}
              delta={tile.previous !== undefined ? <Delta current={tile.current} previous={tile.previous} invert={tile.invert} label={vs} /> : <span className="text-muted-foreground">{period === 'year' ? vs : ' '}</span>}
            />
          ))}
        </div>
        {!d.financeVisible ? (
          <Alert variant="info" className="py-2.5">
            <AlertDescription className="text-[13px] text-foreground">{t('dashboard.financeHidden')}</AlertDescription>
          </Alert>
        ) : null}
      </section>

      <section aria-labelledby="counts-title" className="flex flex-col gap-3">
        <h2 id="counts-title" className="text-[15px] font-semibold tracking-[-0.01em]">
          {t('dashboard.counts.title')}
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {countTiles.map((ct) => (
            <li key={ct.key} className="contents">
              <StatTile label={t(`dashboard.counts.${ct.key}`)} value={f.number(ct.value)} icon={ct.icon} tone={ct.tone} to={ct.perm ? ct.to : undefined} hint={ct.hint} className="p-3.5" />
            </li>
          ))}
        </ul>
      </section>

      <div className="grid min-w-0 gap-4 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
          <ChartCard
            title={t('dashboard.charts.dailyRevenue')}
            description={t('dashboard.charts.daily')}
            summary={t('dashboard.charts.summaryDaily', { total: f.money(dailyRevenueTotal), peakDay: dailyPeak ? bucketLabel(dailyPeak.date, f.lang, true) : '—', peak: f.money(dailyPeak?.revenue ?? 0) })}
            height={220}
            table={{
              caption: t('dashboard.charts.dailyRevenue'),
              rows: d.daily,
              columns: [
                { key: 'date', label: t('dashboard.charts.day'), value: (p) => bucketLabel(p.date, f.lang, true) },
                { key: 'revenue', label: t('dashboard.charts.revenue'), value: (p) => f.money(p.revenue), numeric: true },
                { key: 'orders', label: t('dashboard.charts.orders'), value: (p) => f.number(p.orders), numeric: true },
                { key: 'customers', label: t('dashboard.charts.customers'), value: (p) => f.number(p.customers), numeric: true },
              ],
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
                <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: 'var(--chart-axis)' }} interval="preserveStartEnd" minTickGap={24} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={58} tickFormatter={(v: number) => f.compact(v)} />
                <Tooltip
                  cursor={{ stroke: 'var(--chart-axis)', strokeWidth: 1 }}
                  content={<ChartTooltip rows={[{ key: 'revenue', label: t('dashboard.charts.revenue'), color: SERIES_COLORS.revenue, format: f.money }, { key: 'orders', label: t('dashboard.charts.orders'), color: 'var(--muted-foreground)', format: (v) => f.number(v) }]} title={(_, point) => bucketLabel(String(point?.date ?? ''), f.lang, true)} />}
                />
                <Area type="monotone" dataKey="revenue" stroke={SERIES_COLORS.revenue} strokeWidth={2} fill={SERIES_COLORS.revenue} fillOpacity={0.1} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard
            title={t('dashboard.charts.dailyOrders')}
            description={t('dashboard.charts.daily')}
            summary={t('dashboard.charts.summaryOrders', { total: f.number(dailyOrdersTotal), peakDay: ordersPeak ? bucketLabel(ordersPeak.date, f.lang, true) : '—', peak: f.number(ordersPeak?.orders ?? 0) })}
            height={150}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 8, right: 12, bottom: 0, left: 4 }} barCategoryGap={2}>
                <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: 'var(--chart-axis)' }} interval="preserveStartEnd" minTickGap={24} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'var(--accent)' }} content={<ChartTooltip rows={[{ key: 'orders', label: t('dashboard.charts.orders'), color: SERIES_COLORS.orders, format: (v) => f.number(v), shape: 'square' }, { key: 'customers', label: t('dashboard.charts.customers'), color: 'var(--muted-foreground)', format: (v) => f.number(v), shape: 'square' }]} title={(_, point) => bucketLabel(String(point?.date ?? ''), f.lang, true)} />} />
                <Bar dataKey="orders" fill={SERIES_COLORS.orders} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <Panel title={t('dashboard.lists.bestSellers')} description={t('dashboard.lists.bestSellersHint')} actions={can('reports.read') ? <Button variant="ghost" size="xs" asChild><Link to="/reports?type=products">{t('dashboard.lists.viewAll')}</Link></Button> : undefined}>
          {d.bestSellers.length ? (
            <ol className="flex flex-col divide-y divide-border">
              {d.bestSellers.map((p, i) => (
                <li key={p.productId} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="w-4 shrink-0 text-center text-xs font-semibold text-muted-foreground tabular">{i + 1}</span>
                  <Thumb src={p.image?.thumb ?? p.image?.url} size="sm" alt="" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    {can('products.read') ? (
                      <Link to={`/products/${p.productId}`} className="line-clamp-1 text-[13px] font-medium hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                        {f.loc(p.name)}
                      </Link>
                    ) : (
                      <span className="line-clamp-1 text-[13px] font-medium">{f.loc(p.name)}</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {p.sku} · {t('dashboard.lists.sold', { count: p.quantity })}
                    </span>
                  </div>
                  <span className="shrink-0 text-[13px] font-semibold tabular">{f.money(p.revenue)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('dashboard.lists.noSales')}</p>
          )}
        </Panel>
      </div>

      {d.financeVisible ? (
        <ChartCard
          title={t('dashboard.charts.monthly')}
          description={t('dashboard.charts.monthlyHint')}
          summary={t('dashboard.charts.summaryMonthly', { revenue: f.money(monthlyTotals.revenue), expenses: f.money(monthlyTotals.expenses), profit: f.money(monthlyTotals.profit) })}
          legend={
            <ChartLegend
              items={[
                { label: t('dashboard.charts.revenue'), color: SERIES_COLORS.revenue },
                { label: t('dashboard.charts.expenses'), color: SERIES_COLORS.expenses },
                { label: t('dashboard.charts.profit'), color: SERIES_COLORS.profit, shape: 'line' },
              ]}
            />
          }
          height={260}
          table={{
            caption: t('dashboard.charts.monthly'),
            rows: d.monthly,
            columns: [
              { key: 'date', label: t('dashboard.charts.month'), value: (p) => bucketLabel(p.date, f.lang, true) },
              { key: 'revenue', label: t('dashboard.charts.revenue'), value: (p) => f.money(p.revenue), numeric: true },
              { key: 'expenses', label: t('dashboard.charts.expenses'), value: (p) => f.money(p.expenses), numeric: true },
              { key: 'profit', label: t('dashboard.charts.profit'), value: (p) => f.money(p.profit), numeric: true },
              { key: 'orders', label: t('dashboard.charts.orders'), value: (p) => f.number(p.orders), numeric: true },
            ],
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyData} margin={{ top: 8, right: 12, bottom: 0, left: 4 }} barGap={2} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke={GRID_STROKE} />
              <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: 'var(--chart-axis)' }} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={58} tickFormatter={(v: number) => f.compact(v)} />
              <Tooltip
                cursor={{ fill: 'var(--accent)' }}
                content={
                  <ChartTooltip
                    rows={[
                      { key: 'revenue', label: t('dashboard.charts.revenue'), color: SERIES_COLORS.revenue, format: f.money, shape: 'square' },
                      { key: 'expenses', label: t('dashboard.charts.expenses'), color: SERIES_COLORS.expenses, format: f.money, shape: 'square' },
                      { key: 'profit', label: t('dashboard.charts.profit'), color: SERIES_COLORS.profit, format: f.money },
                    ]}
                    title={(_, point) => bucketLabel(String(point?.date ?? ''), f.lang, true)}
                  />
                }
              />
              <Bar dataKey="revenue" fill={SERIES_COLORS.revenue} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
              <Bar dataKey="expenses" fill={SERIES_COLORS.expenses} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
              <Line type="monotone" dataKey="profit" stroke={SERIES_COLORS.profit} strokeWidth={2} dot={{ r: 3, strokeWidth: 2, stroke: 'var(--card)', fill: SERIES_COLORS.profit }} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : null}

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <Panel
          title={t('dashboard.lists.recentOrders')}
          flush
          actions={can('orders.read') ? <Button variant="ghost" size="xs" asChild><Link to="/orders">{t('dashboard.lists.viewAll')}</Link></Button> : undefined}
        >
          {d.recentOrders.length ? (
            <Table className="text-[13px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="h-9 ps-4 text-xs">{t('orders.columns.number')}</TableHead>
                  <TableHead className="h-9 text-xs">{t('orders.columns.customer')}</TableHead>
                  <TableHead className="h-9 text-xs">{t('common.status')}</TableHead>
                  <TableHead className="h-9 pe-4 text-end text-xs">{t('common.total')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.recentOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="py-2 ps-4">
                      <Link to={`/orders/${o.id}`} className="block font-semibold tabular hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                        {o.number}
                      </Link>
                      <span className="text-xs text-muted-foreground">{f.relative(o.createdAt)}</span>
                    </TableCell>
                    <TableCell className="max-w-40 truncate py-2">{o.customer.name}</TableCell>
                    <TableCell className="py-2">
                      <StatusBadge kind="order" value={o.status} size="sm" />
                    </TableCell>
                    <TableCell className="py-2 pe-4 text-end font-semibold tabular">{f.money(o.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t('dashboard.lists.noOrders')}</p>
          )}
        </Panel>

        <Panel
          title={t('dashboard.lists.lowStock')}
          description={t('dashboard.lists.lowStockHint')}
          actions={can('inventory.read') ? <Button variant="ghost" size="xs" asChild><Link to="/inventory?stock=low">{t('dashboard.lists.viewAll')}</Link></Button> : undefined}
        >
          {d.lowStockItems.length ? (
            <ul className="flex flex-col divide-y divide-border">
              {d.lowStockItems.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                  <Thumb src={item.product.image?.thumb ?? item.product.image?.url} size="sm" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="line-clamp-1 text-[13px] font-medium">{f.loc(item.product.name)}</span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="tabular">{item.sku}</span>
                      <StatusBadge kind="stock" value={item.status} size="sm" />
                    </span>
                  </div>
                  <span className="shrink-0 text-end text-[13px] tabular">
                    <strong>{f.number(item.available)}</strong>
                    <span className="text-muted-foreground"> / {f.number(item.minStock)}</span>
                  </span>
                  {can('inventory.update') ? (
                    <Button variant="outline" size="xs" onClick={() => onAdjust(item)}>
                      {t('dashboard.lists.adjust')}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('dashboard.lists.noLowStock')}</p>
          )}
        </Panel>
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Panel title={t('dashboard.lists.topCategories')} description={t('dashboard.lists.bestSellersHint')}>
          <BarList items={d.topCategories} label={(c) => f.loc(c.name)} value={(c) => c.revenue} format={f.money} aside={(c) => t('dashboard.lists.sold', { count: c.quantity })} emptyText={t('dashboard.lists.noSales')} />
        </Panel>
        <Panel title={t('dashboard.lists.topBrands')} description={t('dashboard.lists.bestSellersHint')}>
          <BarList items={d.topBrands} label={(b) => f.loc(b.name)} value={(b) => b.revenue} format={f.money} aside={(b) => t('dashboard.lists.sold', { count: b.quantity })} emptyText={t('dashboard.lists.noSales')} />
        </Panel>
        <Panel title={t('dashboard.lists.recentCustomers')} actions={can('customers.read') ? <Button variant="ghost" size="xs" asChild><Link to="/customers">{t('dashboard.lists.viewAll')}</Link></Button> : undefined}>
          {d.recentCustomers.length ? (
            <ul className="flex flex-col divide-y divide-border">
              {d.recentCustomers.map((cu) => (
                <li key={cu.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 flex-col">
                    {can('customers.read') ? (
                      <Link to={`/customers/${cu.id}`} className="truncate text-[13px] font-medium hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                        {`${cu.firstName} ${cu.lastName}`.trim()}
                      </Link>
                    ) : (
                      <span className="truncate text-[13px] font-medium">{`${cu.firstName} ${cu.lastName}`.trim()}</span>
                    )}
                    <span className="text-xs text-muted-foreground tabular">{f.phone(cu.phone)}</span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <span className="text-xs text-muted-foreground">{f.relative(cu.createdAt)}</span>
                    <span className="text-xs tabular">{t('dashboard.lists.orders', { count: cu.ordersCount })}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('dashboard.lists.noCustomers')}</p>
          )}
        </Panel>
      </div>
    </>
  );
}
