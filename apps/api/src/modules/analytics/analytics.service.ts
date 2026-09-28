import type { PipelineStage } from 'mongoose';
import { findRegion, type Language } from '@vero/config';
import {
  REVENUE_ORDER_STATUSES,
  type AnalyticsDTO,
  type DashboardDTO,
  type DatePreset,
  type Granularity,
  type OrderStatus,
  type PaymentMethod,
  type PeriodKpi,
  type ProfitBreakdown,
  type SeriesPoint,
  type TopGroupRow,
  type TopProductRow,
} from '@vero/types';
import {
  addDays,
  pickLocalized,
  previousRange,
  resolveDatePreset,
  startOfBusinessDay,
  TASHKENT_OFFSET_MINUTES,
  type DateRange,
} from '@vero/utils';
import { HttpError } from '../../lib/http-error';
import { absoluteUrl } from '../../lib/localize';
import { Order } from '../../models/order.model';
import { Expense, ExpenseCategory } from '../../models/expense.model';
import { User } from '../../models/user.model';
import { Category } from '../../models/category.model';
import { Product } from '../../models/product.model';
import { Inventory } from '../../models/inventory.model';
import { Review } from '../../models/review.model';
import { ContactMessage } from '../../models/content.model';
import { getSetting } from '../settings/settings.service';
import { toAdminCustomer, toAdminOrderSummary } from '../admin/orders.admin';
import { toInventoryItems } from '../admin/operations.admin';

/*
 * Analytics definitions (documented in docs/ANALYTICS.md — keep both in sync):
 *
 *  - All periods are calendar days in Asia/Tashkent (UTC+5, no DST), orders are dated by `createdAt`.
 *  - "Accepted" orders = REVENUE_ORDER_STATUSES (CONFIRMED → DELIVERED). PENDING, CANCELLED and RETURNED
 *    orders never count as revenue.
 *  - orders            = every order placed in the period (any status)
 *  - revenue           = Σ order.total of accepted orders (goods after all discounts + delivery fee)
 *  - grossSales        = Σ regular (pre-promotion) price × qty of accepted orders
 *  - discounts         = promotion discounts + coupon discounts
 *  - netSales          = grossSales − discounts            (goods only)
 *  - deliveryIncome    = Σ delivery fee charged
 *  - productCost       = Σ cost price × qty (cost price snapshot taken when the order was placed)
 *  - deliveryExpenses  = expenses in category DELIVERY; operationalExpenses = every other category
 *    (expenses with status CANCELLED are ignored; PENDING ones are included as obligations)
 *  - estimatedProfit   = revenue − productCost − deliveryExpenses − operationalExpenses
 *  - customers         = distinct customers who placed an order in the period
 *
 * This is an operational estimate for store management, not accounting / tax reporting.
 */

export const ANALYTICS_TIMEZONE = 'Asia/Tashkent';
const OFFSET_MS = TASHKENT_OFFSET_MINUTES * 60_000;
const DAY_MS = 86_400_000;
const REVENUE: OrderStatus[] = [...REVENUE_ORDER_STATUSES];
const DELIVERY_EXPENSE_CODE = 'DELIVERY';
const MAX_RANGE_DAYS = 366 * 3;

/* ------------------------------------------------------------------ ranges */

export interface AnalyticsRange extends DateRange {
  granularity: Granularity;
}

export interface AnalyticsQueryInput {
  preset: DatePreset;
  from?: string;
  to?: string;
  granularity?: Granularity;
}

const invalidRange = (field: 'from' | 'to', key = 'validation.date') =>
  new HttpError(422, 'VALIDATION_ERROR', 'Invalid date range', { fields: { [field]: key } });

export function defaultGranularity(range: DateRange): Granularity {
  const days = Math.round((range.to.getTime() - range.from.getTime()) / DAY_MS);
  if (days <= 45) return 'day';
  if (days <= 190) return 'week';
  return 'month';
}

/** Resolves a preset / custom range. The end is clamped to the end of the current business day. */
export function resolveAnalyticsRange(q: AnalyticsQueryInput, now = new Date()): AnalyticsRange {
  if (q.preset === 'custom') {
    if (q.from && Number.isNaN(Date.parse(q.from))) throw invalidRange('from');
    if (q.to && Number.isNaN(Date.parse(q.to))) throw invalidRange('to');
  }
  const r = resolveDatePreset(q.preset, now, { from: q.from, to: q.to });
  const endOfToday = addDays(startOfBusinessDay(now), 1);
  const to = r.to > endOfToday ? endOfToday : r.to;
  if (r.from >= to) throw invalidRange('from', 'validation.dateRange');
  if ((to.getTime() - r.from.getTime()) / DAY_MS > MAX_RANGE_DAYS) throw invalidRange('from', 'validation.dateRange');
  const range = { from: r.from, to };
  return { ...range, granularity: q.granularity ?? defaultGranularity(range) };
}

/* ------------------------------------------------------------------ buckets */

const localDate = (field: string) => ({ $add: [field, OFFSET_MS] });

/** Aggregation expression producing the bucket key (YYYY-MM-DD day / Monday of the week, YYYY-MM month). */
export function bucketExpr(field: string, g: Granularity): Record<string, unknown> {
  const local = localDate(field);
  if (g === 'month') return { $dateToString: { format: '%Y-%m', date: local } };
  if (g === 'week') {
    // $dayOfWeek: 1 = Sunday … 7 = Saturday  →  days since Monday = (dow + 5) % 7
    const sinceMonday = { $mod: [{ $add: [{ $dayOfWeek: local }, 5] }, 7] };
    return { $dateToString: { format: '%Y-%m-%d', date: { $subtract: [local, { $multiply: [sinceMonday, DAY_MS] }] } } };
  }
  return { $dateToString: { format: '%Y-%m-%d', date: local } };
}

export function bucketKeyOf(date: Date, g: Granularity): string {
  const local = new Date(date.getTime() + OFFSET_MS);
  if (g === 'month') return local.toISOString().slice(0, 7);
  if (g === 'week') {
    const sinceMonday = (local.getUTCDay() + 6) % 7;
    return new Date(local.getTime() - sinceMonday * DAY_MS).toISOString().slice(0, 10);
  }
  return local.toISOString().slice(0, 10);
}

/** Every bucket key in the range, in order (so charts get explicit zero points). */
export function bucketKeys(range: DateRange, g: Granularity): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (let t = range.from.getTime(); t < range.to.getTime(); t += DAY_MS) {
    const k = bucketKeyOf(new Date(t), g);
    if (!seen.has(k)) {
      seen.add(k);
      keys.push(k);
    }
  }
  return keys;
}

/* ------------------------------------------------------------ aggregations */

export interface OrderMetrics {
  orders: number;
  acceptedOrders: number;
  revenue: number;
  grossSales: number;
  promotionDiscount: number;
  couponDiscount: number;
  deliveryIncome: number;
  productCost: number;
  itemsSold: number;
  cancelledOrders: number;
  returnedOrders: number;
}

export interface ExpenseMetrics {
  deliveryExpenses: number;
  operationalExpenses: number;
}

const emptyOrderMetrics = (): OrderMetrics => ({
  orders: 0,
  acceptedOrders: 0,
  revenue: 0,
  grossSales: 0,
  promotionDiscount: 0,
  couponDiscount: 0,
  deliveryIncome: 0,
  productCost: 0,
  itemsSold: 0,
  cancelledOrders: 0,
  returnedOrders: 0,
});

export const inRange = (r: DateRange) => ({ $gte: r.from, $lt: r.to });

function orderMetricsGroup(id: unknown): PipelineStage.Group {
  const accepted = (value: unknown) => ({ $sum: { $cond: ['$accepted', value, 0] } });
  return {
    $group: {
      _id: id,
      orders: { $sum: 1 },
      acceptedOrders: accepted(1),
      revenue: accepted('$total'),
      grossSales: accepted('$gross'),
      promotionDiscount: accepted('$promotionDiscount'),
      couponDiscount: accepted('$couponDiscount'),
      deliveryIncome: accepted('$deliveryFee'),
      productCost: accepted('$costTotal'),
      itemsSold: accepted('$itemsCount'),
      cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } },
      returnedOrders: { $sum: { $cond: [{ $eq: ['$status', 'RETURNED'] }, 1, 0] } },
    },
  } as PipelineStage.Group;
}

const orderProjection = (extra: Record<string, unknown> = {}): PipelineStage.Project => ({
  $project: {
    status: 1,
    total: { $ifNull: ['$total', 0] },
    gross: { $max: [{ $ifNull: ['$regularSubtotal', 0] }, { $ifNull: ['$subtotal', 0] }] },
    promotionDiscount: { $ifNull: ['$promotionDiscount', 0] },
    couponDiscount: { $ifNull: ['$couponDiscount', 0] },
    deliveryFee: { $ifNull: ['$deliveryFee', 0] },
    costTotal: { $ifNull: ['$costTotal', 0] },
    itemsCount: { $ifNull: ['$itemsCount', 0] },
    accepted: { $in: ['$status', REVENUE] },
    ...extra,
  },
});

type GroupedOrderMetrics = OrderMetrics & { _id: string | null };

export async function orderMetricsTotal(range: DateRange): Promise<OrderMetrics> {
  const [row] = await Order.aggregate<GroupedOrderMetrics>([
    { $match: { createdAt: inRange(range) } },
    orderProjection(),
    orderMetricsGroup(null),
  ]);
  if (!row) return emptyOrderMetrics();
  const { _id, ...m } = row;
  void _id;
  return { ...emptyOrderMetrics(), ...m };
}

async function orderMetricsSeries(range: DateRange, g: Granularity): Promise<Map<string, OrderMetrics>> {
  const rows = await Order.aggregate<GroupedOrderMetrics>([
    { $match: { createdAt: inRange(range) } },
    orderProjection({ bucket: bucketExpr('$createdAt', g) }),
    orderMetricsGroup('$bucket'),
  ]);
  return new Map(rows.map(({ _id, ...m }) => [String(_id), { ...emptyOrderMetrics(), ...m }]));
}

export const expenseMatch = (range: DateRange) => ({ date: inRange(range), status: { $ne: 'CANCELLED' } });

function expenseGroup(id: unknown): PipelineStage.Group {
  const isDelivery = { $eq: ['$categoryCode', DELIVERY_EXPENSE_CODE] };
  return {
    $group: {
      _id: id,
      deliveryExpenses: { $sum: { $cond: [isDelivery, '$amountUzs', 0] } },
      operationalExpenses: { $sum: { $cond: [isDelivery, 0, '$amountUzs'] } },
    },
  } as PipelineStage.Group;
}

export async function expenseTotal(range: DateRange): Promise<ExpenseMetrics> {
  const [row] = await Expense.aggregate<ExpenseMetrics>([{ $match: expenseMatch(range) }, expenseGroup(null)]);
  return { deliveryExpenses: row?.deliveryExpenses ?? 0, operationalExpenses: row?.operationalExpenses ?? 0 };
}

async function expenseSeries(range: DateRange, g: Granularity): Promise<Map<string, ExpenseMetrics>> {
  const rows = await Expense.aggregate<ExpenseMetrics & { _id: string }>([
    { $match: expenseMatch(range) },
    { $project: { categoryCode: 1, amountUzs: 1, bucket: bucketExpr('$date', g) } },
    expenseGroup('$bucket'),
  ]);
  return new Map(rows.map((r) => [String(r._id), { deliveryExpenses: r.deliveryExpenses, operationalExpenses: r.operationalExpenses }]));
}

/** Distinct customers who placed at least one order in the range. */
export async function distinctBuyers(range: DateRange): Promise<number> {
  const [row] = await Order.aggregate<{ n: number }>([
    { $match: { createdAt: inRange(range) } },
    { $group: { _id: '$user' } },
    { $count: 'n' },
  ]);
  return row?.n ?? 0;
}

async function distinctBuyersSeries(range: DateRange, g: Granularity): Promise<Map<string, number>> {
  const rows = await Order.aggregate<{ _id: string; n: number }>([
    { $match: { createdAt: inRange(range) } },
    { $group: { _id: { b: bucketExpr('$createdAt', g), u: '$user' } } },
    { $group: { _id: '$_id.b', n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.n]));
}

export const customerFilter = (range?: DateRange) => ({ roleKey: 'CUSTOMER', ...(range ? { createdAt: inRange(range) } : {}) });

/* -------------------------------------------------------------- composition */

function toKpi(m: OrderMetrics, e: ExpenseMetrics, customers: number): PeriodKpi {
  const expenses = e.deliveryExpenses + e.operationalExpenses;
  return {
    revenue: m.revenue,
    orders: m.orders,
    expenses,
    profit: m.revenue - m.productCost - expenses,
    averageOrderValue: m.acceptedOrders ? Math.round(m.revenue / m.acceptedOrders) : 0,
    customers,
  };
}

export function profitBreakdown(m: OrderMetrics, e: ExpenseMetrics): ProfitBreakdown {
  const estimatedProfit = m.revenue - m.productCost - e.deliveryExpenses - e.operationalExpenses;
  return {
    grossSales: m.grossSales,
    productCost: m.productCost,
    discounts: m.promotionDiscount + m.couponDiscount,
    deliveryIncome: m.deliveryIncome,
    deliveryExpenses: e.deliveryExpenses,
    operationalExpenses: e.operationalExpenses,
    estimatedProfit,
    margin: m.revenue > 0 ? Math.round((estimatedProfit / m.revenue) * 1000) / 10 : 0,
  };
}

export async function periodKpi(range: DateRange): Promise<PeriodKpi> {
  const [m, e, customers] = await Promise.all([orderMetricsTotal(range), expenseTotal(range), distinctBuyers(range)]);
  return toKpi(m, e, customers);
}

export interface SeriesRow extends SeriesPoint {
  metrics: OrderMetrics;
  expenseMetrics: ExpenseMetrics;
}

/** Zero-filled series (with the raw metrics kept for reports). */
export async function seriesRows(range: DateRange, g: Granularity): Promise<SeriesRow[]> {
  const [orders, expenses, buyers] = await Promise.all([
    orderMetricsSeries(range, g),
    expenseSeries(range, g),
    distinctBuyersSeries(range, g),
  ]);
  return bucketKeys(range, g).map((date) => {
    const m = orders.get(date) ?? emptyOrderMetrics();
    const e = expenses.get(date) ?? { deliveryExpenses: 0, operationalExpenses: 0 };
    const k = toKpi(m, e, buyers.get(date) ?? 0);
    return { date, revenue: k.revenue, expenses: k.expenses, profit: k.profit, orders: k.orders, customers: k.customers, metrics: m, expenseMetrics: e };
  });
}

const stripRow = ({ metrics, expenseMetrics, ...point }: SeriesRow): SeriesPoint => {
  void metrics;
  void expenseMetrics;
  return point;
};

/* ------------------------------------------------------------- top entities */

export const acceptedMatch = (range: DateRange) => ({ createdAt: inRange(range), status: { $in: REVENUE } });

export async function topProducts(range: DateRange, limit = 10): Promise<TopProductRow[]> {
  const rows = await Order.aggregate<{
    _id: unknown;
    quantity: number;
    revenue: number;
    cost: number;
    name: TopProductRow['name'];
    sku: string;
    image?: { url: string; thumb?: string };
  }>([
    { $match: acceptedMatch(range) },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        quantity: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.total' },
        cost: { $sum: { $multiply: [{ $ifNull: ['$items.costPrice', 0] }, '$items.quantity'] } },
        name: { $first: '$items.name' },
        sku: { $first: '$items.sku' },
        image: { $first: '$items.image' },
      },
    },
    { $sort: { revenue: -1, quantity: -1 } },
    { $limit: limit },
  ]);
  return rows.map((r) => ({
    productId: String(r._id),
    name: r.name,
    sku: r.sku,
    image: r.image?.url ? { url: absoluteUrl(r.image.url)!, thumb: absoluteUrl(r.image.thumb) } : undefined,
    quantity: r.quantity,
    revenue: r.revenue,
  }));
}

export async function topCategories(range: DateRange, limit = 8): Promise<TopGroupRow[]> {
  const rows = await Order.aggregate<{ _id: unknown; quantity: number; revenue: number }>([
    { $match: acceptedMatch(range) },
    { $unwind: '$items' },
    { $group: { _id: '$items.categoryId', quantity: { $sum: '$items.quantity' }, revenue: { $sum: '$items.total' } } },
    { $sort: { revenue: -1 } },
    { $limit: limit },
  ]);
  const ids = rows.map((r) => r._id).filter(Boolean);
  const cats = await Category.find({ _id: { $in: ids } }).select('name').lean();
  const byId = new Map(cats.map((c) => [String(c._id), c.name]));
  return rows.map((r) => {
    const name = r._id ? byId.get(String(r._id)) : undefined;
    return { id: r._id ? String(r._id) : 'none', name: name ?? '—', quantity: r.quantity, revenue: r.revenue };
  });
}

export async function topBrands(range: DateRange, limit = 8): Promise<TopGroupRow[]> {
  const rows = await Order.aggregate<{ _id: unknown; name?: string; quantity: number; revenue: number }>([
    { $match: acceptedMatch(range) },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.brandId',
        name: { $first: '$items.brandName' },
        quantity: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.total' },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: limit },
  ]);
  return rows.map((r) => ({ id: r._id ? String(r._id) : 'none', name: r.name || '—', quantity: r.quantity, revenue: r.revenue }));
}

/* -------------------------------------------------------------- analytics */

export async function analytics(q: AnalyticsQueryInput, lang: Language, now = new Date()): Promise<AnalyticsDTO> {
  const range = resolveAnalyticsRange(q, now);
  const prev = previousRange(range);

  const [m, e, buyers, newCustomers, previous, series, expenseCats, byMethod, byRegion, byStatus, products, categories, brands] =
    await Promise.all([
      orderMetricsTotal(range),
      expenseTotal(range),
      distinctBuyers(range),
      User.countDocuments(customerFilter(range)),
      periodKpi(prev),
      seriesRows(range, range.granularity),
      Expense.aggregate<{ _id: string; amount: number }>([
        { $match: expenseMatch(range) },
        { $group: { _id: '$categoryCode', amount: { $sum: '$amountUzs' } } },
        { $sort: { amount: -1 } },
      ]),
      Order.aggregate<{ _id: PaymentMethod; orders: number; amount: number }>([
        { $match: acceptedMatch(range) },
        { $group: { _id: '$payment.method', orders: { $sum: 1 }, amount: { $sum: '$total' } } },
        { $sort: { amount: -1 } },
      ]),
      Order.aggregate<{ _id: string | null; orders: number; amount: number }>([
        { $match: acceptedMatch(range) },
        { $group: { _id: '$region', orders: { $sum: 1 }, amount: { $sum: '$total' } } },
        { $sort: { amount: -1 } },
      ]),
      Order.aggregate<{ _id: OrderStatus; count: number }>([
        { $match: { createdAt: inRange(range) } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      topProducts(range, 10),
      topCategories(range, 10),
      topBrands(range, 10),
    ]);

  const categoryDocs = await ExpenseCategory.find({ code: { $in: expenseCats.map((c) => c._id) } }).lean();
  const catByCode = new Map(categoryDocs.map((c) => [c.code, c]));
  const kpi = toKpi(m, e, buyers);

  return {
    range: { from: range.from.toISOString(), to: range.to.toISOString(), granularity: range.granularity, timezone: ANALYTICS_TIMEZONE },
    totals: {
      ...kpi,
      grossSales: m.grossSales,
      discounts: m.promotionDiscount + m.couponDiscount,
      netSales: m.grossSales - m.promotionDiscount - m.couponDiscount,
      itemsSold: m.itemsSold,
      cancelledOrders: m.cancelledOrders,
      returnedOrders: m.returnedOrders,
      newCustomers,
    },
    previous,
    profit: profitBreakdown(m, e),
    series: series.map(stripRow),
    expensesByCategory: expenseCats.map((c) => {
      const doc = catByCode.get(c._id);
      return { code: c._id, name: doc?.name ?? { uz: c._id, ru: c._id, en: c._id }, color: doc?.color ?? '#75757F', amount: c.amount };
    }),
    salesByPaymentMethod: byMethod.map((r) => ({ method: r._id, orders: r.orders, amount: r.amount })),
    salesByRegion: byRegion.map((r) => {
      const region = r._id ? findRegion(r._id) : undefined;
      return { region: r._id ?? 'unknown', name: region ? pickLocalized(region.name, lang) : '—', orders: r.orders, amount: r.amount };
    }),
    ordersByStatus: byStatus.map((r) => ({ status: r._id, count: r.count })),
    topProducts: products,
    topCategories: categories,
    topBrands: brands,
  };
}

/* -------------------------------------------------------------- dashboard */

const PROCESSING_STATUSES: OrderStatus[] = ['CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED'];

export async function dashboard(opts: { financeVisible: boolean; lang?: Language }, now = new Date()): Promise<DashboardDTO> {
  const today = resolveDatePreset('today', now);
  const yesterday = resolveDatePreset('yesterday', now);
  const month = resolveDatePreset('thisMonth', now);
  const previousMonth = resolveDatePreset('lastMonth', now);
  const year = resolveDatePreset('thisYear', now);
  const endOfToday = today.to;
  const clamp = (r: DateRange): DateRange => ({ from: r.from, to: r.to > endOfToday ? endOfToday : r.to });

  const last30: DateRange = { from: addDays(today.from, -29), to: endOfToday };
  // 12 calendar months including the current one (Date.UTC rolls negative months into the previous year)
  const wall = new Date(now.getTime() + OFFSET_MS);
  const last12Months: DateRange = {
    from: new Date(Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth() - 11, 1) - OFFSET_MS),
    to: endOfToday,
  };

  const lowThreshold = await getSetting('inventory.lowStockThreshold');
  const available = { $subtract: ['$onHand', '$reserved'] };
  const lowStockExpr = { $and: [{ $gt: [available, 0] }, { $lte: [available, { $max: ['$minStock', lowThreshold] }] }] };

  const [
    kToday,
    kYesterday,
    kMonth,
    kPrevMonth,
    kYear,
    daily,
    monthly,
    customers,
    newCustomersMonth,
    products,
    publishedProducts,
    lowStock,
    outOfStock,
    pendingOrders,
    processingOrders,
    completedOrders,
    cancelledOrders,
    pendingReviews,
    newMessages,
    bestSellers,
    categories,
    brands,
    recentOrders,
    recentCustomers,
    lowStockRows,
  ] = await Promise.all([
    periodKpi(today),
    periodKpi(yesterday),
    periodKpi(clamp(month)),
    periodKpi(previousMonth),
    periodKpi(clamp(year)),
    seriesRows(last30, 'day'),
    seriesRows(last12Months, 'month'),
    User.countDocuments(customerFilter()),
    User.countDocuments(customerFilter(clamp(month))),
    Product.countDocuments({ status: { $ne: 'archived' } }),
    Product.countDocuments({ status: 'published' }),
    Inventory.countDocuments({ $expr: lowStockExpr }),
    Inventory.countDocuments({ $expr: { $lte: [available, 0] } }),
    Order.countDocuments({ status: 'PENDING' }),
    Order.countDocuments({ status: { $in: PROCESSING_STATUSES } }),
    Order.countDocuments({ status: 'DELIVERED' }),
    Order.countDocuments({ status: 'CANCELLED' }),
    Review.countDocuments({ status: 'PENDING' }),
    ContactMessage.countDocuments({ status: 'NEW' }),
    topProducts(last30, 8),
    topCategories(last30, 6),
    topBrands(last30, 6),
    Order.find().sort({ createdAt: -1, _id: -1 }).limit(8).lean(),
    User.find(customerFilter()).sort({ createdAt: -1, _id: -1 }).limit(6).lean(),
    Inventory.find({ $expr: { $lte: [available, { $max: ['$minStock', lowThreshold] }] } })
      .sort({ onHand: 1, updatedAt: -1 })
      .limit(8)
      .lean(),
  ]);

  const hideFinance = (k: PeriodKpi): PeriodKpi => (opts.financeVisible ? k : { ...k, expenses: 0, profit: 0 });
  const hidePoint = (p: SeriesPoint): SeriesPoint => (opts.financeVisible ? p : { ...p, expenses: 0, profit: 0 });

  return {
    generatedAt: now.toISOString(),
    timezone: ANALYTICS_TIMEZONE,
    financeVisible: opts.financeVisible,
    kpis: {
      today: hideFinance(kToday),
      yesterday: hideFinance(kYesterday),
      month: hideFinance(kMonth),
      previousMonth: hideFinance(kPrevMonth),
      year: hideFinance(kYear),
    },
    counts: {
      customers,
      newCustomersMonth,
      products,
      publishedProducts,
      lowStock,
      outOfStock,
      pendingOrders,
      processingOrders,
      completedOrders,
      cancelledOrders,
      pendingReviews,
      newMessages,
    },
    daily: daily.map(stripRow).map(hidePoint),
    monthly: monthly.map(stripRow).map(hidePoint),
    bestSellers,
    topCategories: categories,
    topBrands: brands,
    recentOrders: recentOrders.map((o) => toAdminOrderSummary(o, opts.lang ?? 'uz')),
    recentCustomers: recentCustomers.map(toAdminCustomer),
    lowStockItems: await toInventoryItems(lowStockRows, opts.financeVisible),
  };
}

