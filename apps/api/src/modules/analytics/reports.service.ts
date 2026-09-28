import { Types } from 'mongoose';
import { findRegion, type Language } from '@vero/config';
import { sharedResources, type ResourceTree } from '@vero/i18n';
import {
  REVENUE_ORDER_STATUSES,
  type ExpensePaymentMethod,
  type ExpenseStatus,
  type ReportColumnType,
  type ReportDTO,
  type ReportType,
} from '@vero/types';
import { pickLocalized, stockStatusFor } from '@vero/utils';
import { Order } from '../../models/order.model';
import { Expense, ExpenseCategory } from '../../models/expense.model';
import { User } from '../../models/user.model';
import { Inventory } from '../../models/inventory.model';
import { Product } from '../../models/product.model';
import { Category } from '../../models/category.model';
import { getSetting } from '../settings/settings.service';
import {
  acceptedMatch,
  customerFilter,
  distinctBuyers,
  expenseMatch,
  expenseTotal,
  inRange,
  orderMetricsTotal,
  profitBreakdown,
  resolveAnalyticsRange,
  seriesRows,
  type AnalyticsQueryInput,
  type AnalyticsRange,
} from './analytics.service';

/** Hard cap for row-level reports; the summary says when a report was truncated. */
export const REPORT_MAX_ROWS = 20_000;

type Tri = Record<Language, string>;
const t3 = (uz: string, ru: string, en: string): Tri => ({ uz, ru, en });

const TITLES: Record<ReportType, Tri> = {
  sales: t3('Savdo hisoboti', 'Отчёт по продажам', 'Sales report'),
  orders: t3('Buyurtmalar hisoboti', 'Отчёт по заказам', 'Orders report'),
  expenses: t3('Xarajatlar hisoboti', 'Отчёт по расходам', 'Expenses report'),
  profit: t3('Foyda hisoboti (taxminiy)', 'Отчёт по прибыли (оценка)', 'Profit report (estimate)'),
  inventory: t3('Ombor qoldiqlari hisoboti', 'Отчёт по складским остаткам', 'Inventory report'),
  customers: t3('Mijozlar hisoboti', 'Отчёт по клиентам', 'Customers report'),
  products: t3('Mahsulotlar savdosi hisoboti', 'Отчёт по продажам товаров', 'Product sales report'),
};

const LABELS = {
  period: t3('Davr', 'Период', 'Period'),
  date: t3('Sana', 'Дата', 'Date'),
  orders: t3('Buyurtmalar', 'Заказы', 'Orders'),
  acceptedOrders: t3('Qabul qilingan', 'Принятые', 'Accepted'),
  itemsSold: t3('Sotilgan (dona)', 'Продано (шт.)', 'Units sold'),
  grossSales: t3('Yalpi savdo', 'Валовые продажи', 'Gross sales'),
  discounts: t3('Chegirmalar', 'Скидки', 'Discounts'),
  netSales: t3('Sof savdo', 'Чистые продажи', 'Net sales'),
  deliveryIncome: t3('Yetkazish daromadi', 'Доход от доставки', 'Delivery income'),
  revenue: t3('Tushum', 'Выручка', 'Revenue'),
  aov: t3("O'rtacha chek", 'Средний чек', 'Average order value'),
  cancelled: t3('Bekor qilingan', 'Отменённые', 'Cancelled'),
  returned: t3('Qaytarilgan', 'Возвраты', 'Returned'),
  number: t3('Raqam', 'Номер', 'Number'),
  customer: t3('Mijoz', 'Клиент', 'Customer'),
  phone: t3('Telefon', 'Телефон', 'Phone'),
  email: t3('Email', 'Email', 'Email'),
  region: t3('Hudud', 'Регион', 'Region'),
  status: t3('Holat', 'Статус', 'Status'),
  paymentMethod: t3("To'lov usuli", 'Способ оплаты', 'Payment method'),
  paymentStatus: t3("To'lov holati", 'Статус оплаты', 'Payment status'),
  items: t3('Mahsulotlar (dona)', 'Товары (шт.)', 'Items'),
  subtotal: t3('Mahsulotlar summasi', 'Сумма товаров', 'Goods'),
  delivery: t3('Yetkazish', 'Доставка', 'Delivery'),
  total: t3('Jami', 'Итого', 'Total'),
  title: t3('Nomi', 'Название', 'Title'),
  category: t3('Kategoriya', 'Категория', 'Category'),
  responsible: t3("Mas'ul", 'Ответственный', 'Responsible'),
  amount: t3('Summa', 'Сумма', 'Amount'),
  currency: t3('Valyuta', 'Валюта', 'Currency'),
  amountUzs: t3("Summa (so'm)", 'Сумма (сум)', 'Amount (UZS)'),
  productCost: t3('Mahsulot tannarxi', 'Себестоимость товаров', 'Product cost'),
  deliveryExpenses: t3('Yetkazish xarajatlari', 'Расходы на доставку', 'Delivery expenses'),
  operationalExpenses: t3('Operatsion xarajatlar', 'Операционные расходы', 'Operating expenses'),
  expenses: t3('Xarajatlar', 'Расходы', 'Expenses'),
  profit: t3('Taxminiy foyda', 'Оценочная прибыль', 'Estimated profit'),
  margin: t3('Marja', 'Маржа', 'Margin'),
  sku: t3('Artikul', 'Артикул', 'SKU'),
  product: t3('Mahsulot', 'Товар', 'Product'),
  variant: t3('Variant', 'Вариант', 'Variant'),
  brand: t3('Brend', 'Бренд', 'Brand'),
  onHand: t3('Omborda', 'На складе', 'On hand'),
  reserved: t3('Band qilingan', 'В резерве', 'Reserved'),
  available: t3('Sotuvga mavjud', 'Доступно', 'Available'),
  minStock: t3('Min. qoldiq', 'Мин. остаток', 'Min. stock'),
  incoming: t3('Kutilmoqda', 'Ожидается', 'Incoming'),
  unitCost: t3('Tannarx (dona)', 'Себестоимость (шт.)', 'Unit cost'),
  stockValue: t3('Qoldiq qiymati', 'Стоимость остатка', 'Stock value'),
  stockStatus: t3('Qoldiq holati', 'Статус остатка', 'Stock status'),
  registered: t3("Ro'yxatdan o'tgan", 'Регистрация', 'Registered'),
  lastOrder: t3('Oxirgi buyurtma', 'Последний заказ', 'Last order'),
  spent: t3('Xaridlar summasi', 'Сумма покупок', 'Spent'),
  lifetimeOrders: t3('Jami buyurtmalar', 'Всего заказов', 'Lifetime orders'),
  lifetimeSpent: t3('Jami xaridlar', 'Всего покупок', 'Lifetime spent'),
  quantity: t3('Soni', 'Кол-во', 'Quantity'),
  cost: t3('Tannarx', 'Себестоимость', 'Cost'),
  grossProfit: t3('Yalpi foyda', 'Валовая прибыль', 'Gross profit'),
  currentStock: t3('Joriy qoldiq', 'Текущий остаток', 'Current stock'),
  skus: t3('SKU soni', 'Кол-во SKU', 'SKUs'),
  units: t3('Jami dona', 'Всего единиц', 'Total units'),
  lowStock: t3('Kam qolgan', 'Заканчивается', 'Low stock'),
  outOfStock: t3('Tugagan', 'Нет в наличии', 'Out of stock'),
  buyers: t3('Xaridorlar', 'Покупатели', 'Buyers'),
  newCustomers: t3('Yangi mijozlar', 'Новые клиенты', 'New customers'),
  productsSold: t3('Sotilgan mahsulot turlari', 'Продано позиций', 'Products sold'),
  truncated: t3("Ko'rsatilgan qatorlar (cheklangan)", 'Показано строк (ограничено)', 'Rows shown (truncated)'),
  note: t3('Izoh', 'Примечание', 'Note'),
  estimateNote: t3(
    'Taxminiy boshqaruv hisobi, buxgalteriya hisoboti emas',
    'Управленческая оценка, не бухгалтерская отчётность',
    'Management estimate, not accounting statements',
  ),
} satisfies Record<string, Tri>;

type LabelKey = keyof typeof LABELS;

const EXPENSE_METHODS: Record<ExpensePaymentMethod, Tri> = {
  cash: t3('Naqd', 'Наличные', 'Cash'),
  card: t3('Karta', 'Карта', 'Card'),
  bank_transfer: t3("Bank o'tkazmasi", 'Банковский перевод', 'Bank transfer'),
  click: t3('Click', 'Click', 'Click'),
  payme: t3('Payme', 'Payme', 'Payme'),
  other: t3('Boshqa', 'Другое', 'Other'),
};

const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, Tri> = {
  PAID: t3("To'langan", 'Оплачено', 'Paid'),
  PENDING: t3("To'lanmagan", 'Ожидает оплаты', 'Pending'),
  CANCELLED: t3('Bekor qilingan', 'Отменено', 'Cancelled'),
};

/** Reads shared UI translations (order / payment statuses etc.) so reports use the same wording as the apps. */
function commonLabel(group: 'orderStatus' | 'paymentStatus' | 'paymentMethod' | 'stock', key: string, lang: Language): string {
  const tree = sharedResources[lang].common?.[group] as ResourceTree | string | undefined;
  const value = tree && typeof tree === 'object' ? tree[key] : undefined;
  return typeof value === 'string' ? value : key;
}

const regionName = (code: string | undefined | null, lang: Language) => {
  const r = code ? findRegion(code) : undefined;
  return r ? pickLocalized(r.name, lang) : '';
};

class ReportBuilder {
  readonly columns: ReportDTO['columns'] = [];
  readonly rows: ReportDTO['rows'] = [];
  readonly summary: ReportDTO['summary'] = [];

  constructor(
    readonly type: ReportType,
    readonly range: AnalyticsRange,
    readonly lang: Language,
  ) {}

  col(key: string, label: LabelKey, type: ReportColumnType = 'text'): this {
    this.columns.push({ key, label: LABELS[label][this.lang], type });
    return this;
  }

  sum(label: LabelKey, value: number | string, type: ReportColumnType = 'money'): this {
    this.summary.push({ label: LABELS[label][this.lang], value, type });
    return this;
  }

  truncatedIf(count: number): this {
    if (count >= REPORT_MAX_ROWS) this.sum('truncated', REPORT_MAX_ROWS, 'number');
    return this;
  }

  build(): ReportDTO {
    return {
      type: this.type,
      title: TITLES[this.type][this.lang],
      range: { from: this.range.from.toISOString(), to: this.range.to.toISOString() },
      columns: this.columns,
      rows: this.rows,
      summary: this.summary,
      generatedAt: new Date().toISOString(),
    };
  }
}

/* --------------------------------------------------------------- reports */

async function salesReport(b: ReportBuilder): Promise<ReportDTO> {
  b.col('period', 'period')
    .col('orders', 'orders', 'number')
    .col('acceptedOrders', 'acceptedOrders', 'number')
    .col('itemsSold', 'itemsSold', 'number')
    .col('grossSales', 'grossSales', 'money')
    .col('discounts', 'discounts', 'money')
    .col('netSales', 'netSales', 'money')
    .col('deliveryIncome', 'deliveryIncome', 'money')
    .col('revenue', 'revenue', 'money')
    .col('aov', 'aov', 'money');
  const [series, m] = await Promise.all([seriesRows(b.range, b.range.granularity), orderMetricsTotal(b.range)]);
  for (const s of series) {
    const x = s.metrics;
    const discounts = x.promotionDiscount + x.couponDiscount;
    b.rows.push({
      period: s.date,
      orders: x.orders,
      acceptedOrders: x.acceptedOrders,
      itemsSold: x.itemsSold,
      grossSales: x.grossSales,
      discounts,
      netSales: x.grossSales - discounts,
      deliveryIncome: x.deliveryIncome,
      revenue: x.revenue,
      aov: x.acceptedOrders ? Math.round(x.revenue / x.acceptedOrders) : 0,
    });
  }
  const discounts = m.promotionDiscount + m.couponDiscount;
  return b
    .sum('orders', m.orders, 'number')
    .sum('acceptedOrders', m.acceptedOrders, 'number')
    .sum('cancelled', m.cancelledOrders, 'number')
    .sum('returned', m.returnedOrders, 'number')
    .sum('itemsSold', m.itemsSold, 'number')
    .sum('grossSales', m.grossSales)
    .sum('discounts', discounts)
    .sum('netSales', m.grossSales - discounts)
    .sum('deliveryIncome', m.deliveryIncome)
    .sum('revenue', m.revenue)
    .sum('aov', m.acceptedOrders ? Math.round(m.revenue / m.acceptedOrders) : 0)
    .build();
}

async function ordersReport(b: ReportBuilder): Promise<ReportDTO> {
  const { lang } = b;
  b.col('number', 'number')
    .col('date', 'date', 'datetime')
    .col('customer', 'customer')
    .col('phone', 'phone')
    .col('region', 'region')
    .col('status', 'status')
    .col('paymentMethod', 'paymentMethod')
    .col('paymentStatus', 'paymentStatus')
    .col('items', 'items', 'number')
    .col('subtotal', 'subtotal', 'money')
    .col('discounts', 'discounts', 'money')
    .col('delivery', 'delivery', 'money')
    .col('total', 'total', 'money');
  const orders = await Order.find({ createdAt: inRange(b.range) })
    .select('number createdAt customer region status payment.method payment.status itemsCount regularSubtotal subtotal promotionDiscount couponDiscount deliveryFee total')
    .sort({ createdAt: 1, _id: 1 })
    .limit(REPORT_MAX_ROWS)
    .lean();
  for (const o of orders) {
    b.rows.push({
      number: o.number,
      date: o.createdAt.toISOString(),
      customer: `${o.customer.firstName} ${o.customer.lastName}`.trim(),
      phone: o.customer.phone,
      region: regionName(o.region, lang),
      status: commonLabel('orderStatus', o.status, lang),
      paymentMethod: commonLabel('paymentMethod', o.payment.method, lang),
      paymentStatus: commonLabel('paymentStatus', o.payment.status, lang),
      items: o.itemsCount,
      subtotal: Math.max(o.regularSubtotal ?? 0, o.subtotal),
      discounts: (o.promotionDiscount ?? 0) + (o.couponDiscount ?? 0),
      delivery: o.deliveryFee ?? 0,
      total: o.total,
    });
  }
  const m = await orderMetricsTotal(b.range);
  return b
    .sum('orders', m.orders, 'number')
    .sum('acceptedOrders', m.acceptedOrders, 'number')
    .sum('cancelled', m.cancelledOrders, 'number')
    .sum('returned', m.returnedOrders, 'number')
    .sum('revenue', m.revenue)
    .truncatedIf(orders.length)
    .build();
}

async function expensesReport(b: ReportBuilder): Promise<ReportDTO> {
  const { lang } = b;
  b.col('date', 'date', 'date')
    .col('title', 'title')
    .col('category', 'category')
    .col('paymentMethod', 'paymentMethod')
    .col('responsible', 'responsible')
    .col('status', 'status')
    .col('amount', 'amount', 'number')
    .col('currency', 'currency')
    .col('amountUzs', 'amountUzs', 'money');
  const [expenses, categories] = await Promise.all([
    Expense.find({ date: inRange(b.range) }).sort({ date: 1, _id: 1 }).limit(REPORT_MAX_ROWS).lean(),
    ExpenseCategory.find().lean(),
  ]);
  const catName = new Map(categories.map((c) => [c.code, pickLocalized(c.name, lang)]));
  for (const e of expenses) {
    b.rows.push({
      date: e.date.toISOString(),
      title: e.title,
      category: catName.get(e.categoryCode) ?? e.categoryCode,
      paymentMethod: EXPENSE_METHODS[e.paymentMethod]?.[lang] ?? e.paymentMethod,
      responsible: e.responsible ?? '',
      status: EXPENSE_STATUS_LABELS[e.status]?.[lang] ?? e.status,
      amount: e.amount,
      currency: e.currency,
      amountUzs: e.amountUzs,
    });
  }
  const byCategory = await Expense.aggregate<{ _id: string; amount: number }>([
    { $match: expenseMatch(b.range) },
    { $group: { _id: '$categoryCode', amount: { $sum: '$amountUzs' } } },
    { $sort: { amount: -1 } },
  ]);
  const total = byCategory.reduce((s, c) => s + c.amount, 0);
  b.sum('expenses', total);
  for (const c of byCategory) b.summary.push({ label: catName.get(c._id) ?? c._id, value: c.amount, type: 'money' });
  return b.truncatedIf(expenses.length).build();
}

async function profitReport(b: ReportBuilder): Promise<ReportDTO> {
  b.col('period', 'period')
    .col('revenue', 'revenue', 'money')
    .col('productCost', 'productCost', 'money')
    .col('deliveryExpenses', 'deliveryExpenses', 'money')
    .col('operationalExpenses', 'operationalExpenses', 'money')
    .col('profit', 'profit', 'money')
    .col('margin', 'margin', 'percent');
  const [series, m, e] = await Promise.all([seriesRows(b.range, b.range.granularity), orderMetricsTotal(b.range), expenseTotal(b.range)]);
  for (const s of series) {
    const p = profitBreakdown(s.metrics, s.expenseMetrics);
    b.rows.push({
      period: s.date,
      revenue: s.metrics.revenue,
      productCost: p.productCost,
      deliveryExpenses: p.deliveryExpenses,
      operationalExpenses: p.operationalExpenses,
      profit: p.estimatedProfit,
      margin: p.margin,
    });
  }
  const p = profitBreakdown(m, e);
  return b
    .sum('grossSales', p.grossSales)
    .sum('discounts', p.discounts)
    .sum('deliveryIncome', p.deliveryIncome)
    .sum('revenue', m.revenue)
    .sum('productCost', p.productCost)
    .sum('deliveryExpenses', p.deliveryExpenses)
    .sum('operationalExpenses', p.operationalExpenses)
    .sum('profit', p.estimatedProfit)
    .sum('margin', p.margin, 'percent')
    .sum('note', LABELS.estimateNote[b.lang], 'text')
    .build();
}

async function inventoryReport(b: ReportBuilder): Promise<ReportDTO> {
  const { lang } = b;
  b.col('sku', 'sku')
    .col('product', 'product')
    .col('variant', 'variant')
    .col('onHand', 'onHand', 'number')
    .col('reserved', 'reserved', 'number')
    .col('available', 'available', 'number')
    .col('minStock', 'minStock', 'number')
    .col('incoming', 'incoming', 'number')
    .col('unitCost', 'unitCost', 'money')
    .col('stockValue', 'stockValue', 'money')
    .col('stockStatus', 'stockStatus');
  const [rows, low] = await Promise.all([
    Inventory.find().sort({ sku: 1 }).limit(REPORT_MAX_ROWS).lean(),
    getSetting('inventory.lowStockThreshold'),
  ]);
  const products = await Product.find({ _id: { $in: [...new Set(rows.map((r) => String(r.product)))].map((id) => new Types.ObjectId(id)) } })
    .select('name variants._id variants.name')
    .lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));
  let units = 0;
  let value = 0;
  let lowCount = 0;
  let outCount = 0;
  for (const r of rows) {
    const p = byId.get(String(r.product));
    const v = r.variant ? p?.variants.find((x) => String(x._id) === String(r.variant)) : undefined;
    const available = Math.max(0, r.onHand - r.reserved);
    const status = stockStatusFor(available, Math.max(low, r.minStock));
    if (status === 'low_stock') lowCount++;
    if (status === 'out_of_stock') outCount++;
    units += r.onHand;
    value += r.onHand * r.costPrice;
    b.rows.push({
      sku: r.sku,
      product: p ? pickLocalized(p.name, lang) : r.sku,
      variant: v ? pickLocalized(v.name, lang) : '',
      onHand: r.onHand,
      reserved: r.reserved,
      available,
      minStock: r.minStock,
      incoming: r.incoming,
      unitCost: r.costPrice,
      stockValue: r.onHand * r.costPrice,
      stockStatus: commonLabel('stock', status, lang),
    });
  }
  return b
    .sum('skus', rows.length, 'number')
    .sum('units', units, 'number')
    .sum('stockValue', value)
    .sum('lowStock', lowCount, 'number')
    .sum('outOfStock', outCount, 'number')
    .truncatedIf(rows.length)
    .build();
}

async function customersReport(b: ReportBuilder): Promise<ReportDTO> {
  b.col('customer', 'customer')
    .col('phone', 'phone')
    .col('email', 'email')
    .col('registered', 'registered', 'date')
    .col('orders', 'orders', 'number')
    .col('spent', 'spent', 'money')
    .col('lastOrder', 'lastOrder', 'datetime')
    .col('lifetimeOrders', 'lifetimeOrders', 'number')
    .col('lifetimeSpent', 'lifetimeSpent', 'money');
  const grouped = await Order.aggregate<{ _id: Types.ObjectId; orders: number; spent: number; lastOrder: Date }>([
    { $match: { createdAt: inRange(b.range) } },
    {
      $group: {
        _id: '$user',
        orders: { $sum: 1 },
        spent: { $sum: { $cond: [{ $in: ['$status', [...REVENUE_ORDER_STATUSES]] }, '$total', 0] } },
        lastOrder: { $max: '$createdAt' },
      },
    },
    { $sort: { spent: -1, orders: -1 } },
    { $limit: REPORT_MAX_ROWS },
  ]);
  const users = await User.find({ _id: { $in: grouped.map((g) => g._id) } })
    .select('firstName lastName phone email createdAt stats')
    .lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));
  let revenue = 0;
  for (const g of grouped) {
    const u = byId.get(String(g._id));
    revenue += g.spent;
    b.rows.push({
      customer: u ? `${u.firstName} ${u.lastName}`.trim() : String(g._id),
      phone: u?.phone ?? '',
      email: u?.email ?? '',
      registered: u?.createdAt ? u.createdAt.toISOString() : null,
      orders: g.orders,
      spent: g.spent,
      lastOrder: g.lastOrder ? new Date(g.lastOrder).toISOString() : null,
      lifetimeOrders: u?.stats?.ordersCount ?? 0,
      lifetimeSpent: u?.stats?.totalSpent ?? 0,
    });
  }
  const [buyers, newCustomers] = await Promise.all([distinctBuyers(b.range), User.countDocuments(customerFilter(b.range))]);
  return b
    .sum('buyers', buyers, 'number')
    .sum('newCustomers', newCustomers, 'number')
    .sum('revenue', revenue)
    .truncatedIf(grouped.length)
    .build();
}

async function productsReport(b: ReportBuilder): Promise<ReportDTO> {
  const { lang } = b;
  b.col('sku', 'sku')
    .col('product', 'product')
    .col('brand', 'brand')
    .col('category', 'category')
    .col('quantity', 'quantity', 'number')
    .col('revenue', 'revenue', 'money')
    .col('cost', 'cost', 'money')
    .col('grossProfit', 'grossProfit', 'money')
    .col('margin', 'margin', 'percent')
    .col('currentStock', 'currentStock', 'number');
  const rows = await Order.aggregate<{
    _id: Types.ObjectId;
    sku: string;
    name: Record<Language, string>;
    brandName?: string;
    categoryId?: Types.ObjectId | null;
    quantity: number;
    revenue: number;
    cost: number;
  }>([
    { $match: acceptedMatch(b.range) },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        sku: { $first: '$items.sku' },
        name: { $first: '$items.name' },
        brandName: { $first: '$items.brandName' },
        categoryId: { $first: '$items.categoryId' },
        quantity: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.total' },
        cost: { $sum: { $multiply: [{ $ifNull: ['$items.costPrice', 0] }, '$items.quantity'] } },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: REPORT_MAX_ROWS },
  ]);
  const [products, categories] = await Promise.all([
    Product.find({ _id: { $in: rows.map((r) => r._id) } }).select('stock').lean(),
    Category.find({ _id: { $in: rows.map((r) => r.categoryId).filter(Boolean) } }).select('name').lean(),
  ]);
  const stockById = new Map(products.map((p) => [String(p._id), p.stock?.available ?? 0]));
  const catById = new Map(categories.map((c) => [String(c._id), pickLocalized(c.name, lang)]));
  let units = 0;
  let revenue = 0;
  let cost = 0;
  for (const r of rows) {
    const gp = r.revenue - r.cost;
    units += r.quantity;
    revenue += r.revenue;
    cost += r.cost;
    b.rows.push({
      sku: r.sku,
      product: pickLocalized(r.name, lang),
      brand: r.brandName ?? '',
      category: r.categoryId ? (catById.get(String(r.categoryId)) ?? '') : '',
      quantity: r.quantity,
      revenue: r.revenue,
      cost: r.cost,
      grossProfit: gp,
      margin: r.revenue > 0 ? Math.round((gp / r.revenue) * 1000) / 10 : 0,
      currentStock: stockById.get(String(r._id)) ?? 0,
    });
  }
  return b
    .sum('productsSold', rows.length, 'number')
    .sum('itemsSold', units, 'number')
    .sum('revenue', revenue)
    .sum('cost', cost)
    .sum('grossProfit', revenue - cost)
    .sum('margin', revenue > 0 ? Math.round(((revenue - cost) / revenue) * 1000) / 10 : 0, 'percent')
    .truncatedIf(rows.length)
    .build();
}

const BUILDERS: Record<ReportType, (b: ReportBuilder) => Promise<ReportDTO>> = {
  sales: salesReport,
  orders: ordersReport,
  expenses: expensesReport,
  profit: profitReport,
  inventory: inventoryReport,
  customers: customersReport,
  products: productsReport,
};

export async function buildReport(type: ReportType, q: AnalyticsQueryInput, lang: Language, now = new Date()): Promise<ReportDTO> {
  const range = resolveAnalyticsRange(q, now);
  return BUILDERS[type](new ReportBuilder(type, range, lang));
}

/** e.g. vero-tools-sales-2026-09-01_2026-09-30 (dates in Tashkent time, inclusive end). */
export function reportFileName(report: ReportDTO): string {
  const day = (iso: string) => new Date(Date.parse(iso) + 5 * 3_600_000).toISOString().slice(0, 10);
  const end = new Date(Date.parse(report.range.to) - 1).toISOString();
  return `vero-tools-${report.type}-${day(report.range.from)}_${day(end)}`;
}
