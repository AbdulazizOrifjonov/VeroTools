# VERO TOOLS — analytics and reports

> **Management information, not accounting.** Dashboard, analytics and reports give an operational estimate for
> running the store. They are not bookkeeping, tax or fiscal reporting (no VAT, no fiscal receipts, no accrual or
> cash-basis accounting rules) and do not replace the accountant's records.

Definitions implemented in `apps/api/src/modules/analytics/analytics.service.ts` (the comment at the top of that
file mirrors this page) and `reports.service.ts`. Every figure is computed on request from the database — nothing
on the dashboard is stored or static.

## 1. Time, periods and currency

* **Timezone Asia/Tashkent** (UTC+5, no daylight saving). "Today", days, weeks (Monday–Sunday) and months are
  Tashkent calendar periods, also in exported files.
* **Orders are dated by their creation time** (when the customer placed the order), expenses by their expense
  date. An order placed on 31 March and delivered on 2 April belongs to March.
* Presets: today, yesterday, last 7 days, last 30 days, this month, last month, this year, custom (`from` / `to`
  dates, both inclusive). A period never extends past the end of today; the longest range is 3 years.
* Granularity of charts and period reports: day for ranges up to 45 days, week up to 190 days, month above — or
  chosen explicitly.
* Comparisons ("previous period") use the period of the same length immediately before the selected one.
* Amounts are integer UZS (so'm). Expenses entered in USD are converted with the exchange rate stored on the
  expense (`amountUzs`).

## 2. Which orders count

| Order status | Counted as revenue ("accepted") | Why |
|---|:-:|---|
| `PENDING` | no | not accepted yet: unconfirmed cash orders, unpaid online orders, installment applications under review |
| `CONFIRMED`, `PROCESSING`, `PACKED`, `SHIPPED`, `DELIVERED` | **yes** | accepted orders (`REVENUE_ORDER_STATUSES`) |
| `CANCELLED` | no | reported separately as cancelled orders |
| `RETURNED` | no | reported separately as returned orders |

Consequences:

* Revenue follows the **order status, not the payment status**: a confirmed cash order counts before the courier has
  collected the money; an online order counts once it is paid (payment confirms it automatically).
* Figures of past periods change when an order is cancelled or returned later — the order keeps its creation date
  and simply stops counting.
* The KPI **Orders** counts every order placed in the period regardless of status; all money metrics use accepted
  orders only.

## 3. Metric definitions

| Metric | Definition |
|---|---|
| **Orders** | number of orders placed in the period (any status) |
| **Accepted orders** | orders of the period in an accepted status |
| **Revenue** | Σ `total` of accepted orders = goods after all discounts **+ delivery fees** |
| **Average order value (AOV)** | revenue ÷ accepted orders (rounded; 0 without accepted orders) |
| **Customers** | distinct customers who placed at least one order in the period (any status) |
| **New customers** | customer accounts registered in the period |
| **Items sold** | Σ quantities of accepted orders |
| **Gross sales** | Σ regular (pre-promotion) price × quantity of accepted orders |
| **Discounts** | promotion discounts + coupon discounts of accepted orders |
| **Net sales** | gross sales − discounts (goods only, without delivery) |
| **Delivery income** | Σ delivery fees charged on accepted orders |
| **Product cost** | Σ cost price × quantity of accepted orders. The cost price is a snapshot taken when the order was placed (variant cost price, otherwise the product's); later cost changes do not alter past orders |
| **Delivery expenses** | expenses of the category `DELIVERY` |
| **Operational expenses** | expenses of every other category (rent, salaries, marketing, advertising, utilities, warehouse, packaging, equipment, maintenance, taxes & fees, other, custom categories) |
| **Expenses** | delivery expenses + operational expenses |
| **Estimated profit** | revenue − product cost − delivery expenses − operational expenses |
| **Margin** | estimated profit ÷ revenue × 100, one decimal (0 when revenue is 0) |

Identity: **revenue = net sales + delivery income**.

**Example.** One accepted order: 2 drills, regular price 500 000 so'm, a −10 % promotion (450 000 each), a coupon of
50 000, delivery 30 000, cost price 300 000 each; in the same period expenses of 25 000 (delivery) and 100 000
(other categories):

| | so'm |
|---|---:|
| Gross sales | 1 000 000 |
| Discounts (promotion 100 000 + coupon 50 000) | 150 000 |
| Net sales | 850 000 |
| Delivery income | 30 000 |
| **Revenue** (order total) | **880 000** |
| Product cost | 600 000 |
| Delivery expenses | 25 000 |
| Operational expenses | 100 000 |
| **Estimated profit** | **155 000** |
| Margin | 17.6 % |

Data quality matters: products without a cost price count with cost 0 (profit is overstated), so enter cost prices
for products / variants before relying on profit figures.

## 4. How expenses are included

* **Statuses:** `PAID` and `PENDING` expenses are included (pending ones are obligations of the period);
  `CANCELLED` expenses are ignored in every total.
* **Date:** the expense date, not the date it was entered.
* **Category:** only `DELIVERY` counts as delivery expense; all other system and custom categories are operational.
* **Purchases of goods are not expenses in this model.** The cost of goods enters profit through the cost price of
  what was sold. Recording supplier payments for stock as expenses as well would count that cost twice.

## 5. Where the figures appear

| Screen / endpoint | Permission | Content |
|---|---|---|
| Dashboard — `GET /api/admin/dashboard` | `dashboard.read` | KPI cards for today, yesterday, this month (to date), last month and this year (to date): revenue, orders, expenses, profit, AOV, customers; daily series of the last 30 days and monthly series of the last 12 months; counters (customers, new customers this month, products, published, low stock, out of stock, pending / processing / delivered / cancelled orders, reviews awaiting moderation, new messages); best sellers, top categories and brands of the last 30 days; recent orders, recent customers, low-stock items. **Expenses and profit are shown only to users with `analytics.read` or `expenses.read`** (otherwise 0). |
| Analytics — `GET /api/admin/analytics` | `analytics.read` | totals of §3 for the period and the previous period, profit breakdown, time series, expenses by category, sales by payment method and by region (accepted orders), orders by status (all orders of the period), top 10 products / categories / brands |
| Reports — `GET /api/admin/reports/:type` | `reports.read` (+ `reports.export` for files) | see §6 |

Top products, categories and brands are ranked by revenue from order lines (line totals after promotions and the
coupon share, without delivery fees).

## 6. Reports and export formats

| Report | Rows | Summary |
|---|---|---|
| `sales` | one row per day / week / month: orders, accepted orders, items sold, gross sales, discounts, net sales, delivery income, revenue, AOV | the same totals + cancelled and returned orders |
| `orders` | every order placed in the period (any status): number, date and time, customer, phone, region, status, payment method, payment status, items, goods before promotions, discounts, delivery fee, total | orders, accepted, cancelled, returned, revenue |
| `expenses` (+ `expenses.read`) | every expense of the period **including cancelled ones** (with their status): date, title, category, payment method, responsible, status, amount, currency, amount in UZS | total and per-category sums **without** cancelled expenses |
| `profit` (+ `analytics.read`) | per period: revenue, product cost, delivery expenses, operational expenses, estimated profit, margin | gross sales, discounts, delivery income, revenue, costs, profit, margin and the "estimate" note |
| `inventory` | current stock snapshot (independent of the period): SKU, product, variant, on hand, reserved, available, minimum, incoming, unit cost, stock value (on hand × cost), stock status | SKUs, units, stock value, low stock, out of stock |
| `customers` | customers who ordered in the period: name, phone, e-mail, registration date, orders, spent (accepted orders), last order, lifetime orders and spend | buyers, new customers, revenue |
| `products` | products sold in accepted orders: SKU, product, brand, category, quantity, revenue, cost, gross profit, margin, current stock | products sold, items sold, revenue, cost, gross profit, margin |

Query: `?preset=thisMonth` (or `preset=custom&from=2026-09-01&to=2026-09-30`), optional `granularity`,
`format=json|csv|xlsx|pdf`, `lang=uz|ru|en` (labels and localised names).

| Format | Details |
|---|---|
| on screen (`json`) | the admin panel's report view |
| `csv` | UTF-8 with BOM (opens correctly in Excel with Cyrillic and Uzbek text); dates as Tashkent `YYYY-MM-DD` / `YYYY-MM-DD HH:mm` |
| `xlsx` | Excel workbook with title, period, formatted numbers (`#,##0`), percentages and dates |
| `pdf` | A4 (landscape for wide reports) with embedded DejaVu fonts (Latin and Cyrillic) |

* Downloading a file requires `reports.export`; every download is written to the audit log (`report.export` with
  report type, format, period and row count).
* Row-level reports are capped at 20 000 rows; the summary then states that the list was truncated — narrow the
  period.

## 7. Limitations

* Estimates only: no taxes, payment-provider fees, returns handling costs or stock write-offs are modelled unless
  recorded as expenses.
* Revenue is based on order statuses (§2); payment status (e.g. an unpaid confirmed cash order) is not considered.
* Refunded amounts of partially refunded orders are not subtracted — a returned order leaves revenue completely,
  a delivered order with a partial refund stays at its full total.
* Deleted products or categories keep their order history (order lines store name, SKU, brand and category ids);
  names shown for deleted categories fall back to "—".
