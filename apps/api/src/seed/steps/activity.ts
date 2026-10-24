import { Types } from 'mongoose';
import type { Language } from '@vero/config';
import { REVENUE_ORDER_STATUSES, type OrderStatus, type PaymentMethod } from '@vero/types';
import { formatNumber, startOfBusinessDay } from '@vero/utils';
import { checkoutSchema, parseProductListQuery } from '@vero/validation';
import type { RequestContext } from '../../types/express';
import { clock } from '../../lib/clock';
import { events } from '../../lib/events';
import { cache, CacheTags } from '../../lib/cache';
import { User } from '../../models/user.model';
import { Address } from '../../models/address.model';
import { Product, type IProduct } from '../../models/product.model';
import { Inventory } from '../../models/inventory.model';
import { Order, type IOrder } from '../../models/order.model';
import { Coupon } from '../../models/marketing.model';
import { PickupPoint, DeliveryZone } from '../../models/delivery.model';
import { Review, ProductQuestion } from '../../models/review.model';
import { Notification } from '../../models/notification.model';
import { Expense, ExpenseCategory } from '../../models/expense.model';
import { register } from '../../modules/auth/auth.service';
import { addItem, applyCoupon, clearCart } from '../../modules/cart/cart.service';
import { addToCompare, addToWishlist } from '../../modules/cart/wishlist-compare.service';
import { changeStatus, createOrder, customerCancel } from '../../modules/orders/orders.service';
import { createReview, recomputeRating } from '../../modules/reviews/reviews.service';
import { listProducts } from '../../modules/catalog/products.service';
import { getSettings } from '../../modules/settings/settings.service';
import { CUSTOMERS } from '../data/customers';
import { REVIEW_TEMPLATES } from '../data/reviews';
import { EXPENSE_TEMPLATES } from '../data/expenses';
import { PRODUCTS } from '../data/products';
import type { SeedExpenseTemplate, SeedReviewTemplate } from '../data/types';
import type { Rng } from '../rng';
import { ensureStaff } from './base';
import type { SeedLog } from './log';

const DAY = 86_400_000;
const HOUR = 3_600_000;
const MIN = 60_000;

/** Password of every demo customer account (development only — documented in README). */
export const DEMO_CUSTOMER_PASSWORD = 'Demo2026';
export const DEMO_STAFF = {
  manager: { phone: '+998900000002', email: 'manager@example.com', password: 'Manager2026' },
  admin: { phone: '+998900000003', email: 'admin@example.com', password: 'Administrator2026' },
};

const ctxFor = (lang: Language, client: 'web' | 'mobile' = 'web'): RequestContext => ({
  lang,
  client,
  guestId: null,
  instanceId: null,
  ip: '127.0.0.1',
  userAgent: client === 'mobile' ? 'OCKEAN mobile (demo seed)' : 'Mozilla/5.0 (demo seed)',
});

interface DemoCustomer {
  id: Types.ObjectId;
  lang: Language;
  registeredAt: Date;
  addressId: Types.ObjectId;
  region: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}

interface Staff {
  id: Types.ObjectId;
  name: string;
  isStaff: true;
}

/* ------------------------------------------------------------------ staff */

export async function seedDemoStaff(log: SeedLog): Promise<{ manager: Staff; admin: Staff }> {
  const m = await ensureStaff({ roleKey: 'MANAGER', firstName: 'Sardor', lastName: 'Aliyev', ...DEMO_STAFF.manager });
  const a = await ensureStaff({ roleKey: 'ADMIN', firstName: 'Nodira', lastName: 'Qosimova', ...DEMO_STAFF.admin });
  log.done('demo staff', `manager ${DEMO_STAFF.manager.email}, admin ${DEMO_STAFF.admin.email}`);
  return {
    manager: { id: m.id, name: 'Sardor Aliyev', isStaff: true },
    admin: { id: a.id, name: 'Nodira Qosimova', isStaff: true },
  };
}

/* -------------------------------------------------------------- customers */

export async function seedCustomers(log: SeedLog, rng: Rng): Promise<DemoCustomer[]> {
  const now = Date.now();
  // registrations spread over the last ~13 months, oldest first
  const dates = CUSTOMERS.map(() => now - rng.int(20, 395) * DAY - rng.int(0, 20) * HOUR).sort((a, b) => a - b);
  const out: DemoCustomer[] = [];
  for (const [i, c] of CUSTOMERS.entries()) {
    const registeredAt = new Date(dates[i]!);
    clock.pin(registeredAt);
    const client = rng.chance(0.4) ? 'mobile' : 'web';
    const { user } = await register(
      { firstName: c.firstName, lastName: c.lastName, phone: c.phone, email: c.email, password: DEMO_CUSTOMER_PASSWORD, acceptTerms: true },
      ctxFor(c.language, client),
    );
    await User.updateOne(
      { _id: user._id },
      { $set: { isPhoneVerified: rng.chance(0.8), isEmailVerified: !!c.email && rng.chance(0.6), 'preferences.language': c.language, lastLoginAt: registeredAt } },
    );
    const address = await Address.create({
      user: user._id,
      label: c.address.label,
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      region: c.address.region,
      city: c.address.city,
      district: c.address.district,
      street: c.address.street,
      house: c.address.house,
      apartment: c.address.apartment,
      isDefault: true,
    });
    out.push({ id: user._id, lang: c.language, registeredAt, addressId: address._id, region: c.address.region, firstName: c.firstName, lastName: c.lastName, phone: c.phone, email: c.email });
  }
  clock.pin(null);
  await events.drain();
  log.done('customers', `${out.length} accounts with addresses (password "${DEMO_CUSTOMER_PASSWORD}")`);
  return out;
}

/* ----------------------------------------------------------------- orders */

type Plan = { at: number; path: OrderStatus[]; cancelBy?: 'customer' | 'staff'; installmentDecision?: 'APPROVED' | 'REJECTED' };

const FORWARD: OrderStatus[] = ['CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'];

/** Picks the status path an order of this age has plausibly gone through. */
function pathFor(ageDays: number, rng: Rng): Pick<Plan, 'path' | 'cancelBy'> {
  const cancel = (after: number, by: 'customer' | 'staff'): Pick<Plan, 'path' | 'cancelBy'> => ({ path: [...FORWARD.slice(0, after), 'CANCELLED'], cancelBy: by });
  if (ageDays > 14) {
    const r = rng.next();
    if (r < 0.08) return cancel(0, 'customer');
    if (r < 0.13) return cancel(1, 'staff');
    if (r < 0.18) return { path: [...FORWARD, 'RETURNED'] };
    return { path: [...FORWARD] };
  }
  if (ageDays > 3) {
    const r = rng.next();
    if (r < 0.1) return cancel(0, 'customer');
    if (r < 0.65) return { path: [...FORWARD] };
    if (r < 0.85) return { path: FORWARD.slice(0, 4) };
    return { path: FORWARD.slice(0, 3) };
  }
  return { path: FORWARD.slice(0, rng.weighted([[0, 3], [1, 3], [2, 2], [3, 1], [4, 1]] as const)) };
}

/** Delay before each next status (ms). */
function stepDelay(to: OrderStatus, rng: Rng, deliveryDays: number): number {
  switch (to) {
    case 'CONFIRMED':
      return rng.int(8, 90) * MIN;
    case 'PROCESSING':
      return rng.int(1, 5) * HOUR;
    case 'PACKED':
      return rng.int(2, 18) * HOUR;
    case 'SHIPPED':
      return rng.int(3, 20) * HOUR;
    case 'DELIVERED':
      return Math.max(4 * HOUR, deliveryDays * DAY - rng.int(0, 10) * HOUR);
    case 'RETURNED':
      return rng.int(3, 12) * DAY;
    case 'CANCELLED':
    default:
      return rng.int(20, 600) * MIN;
  }
}

function orderDates(total: number, rng: Rng): number[] {
  const now = Date.now();
  const todayStart = startOfBusinessDay(new Date(now)).getTime();
  const out: number[] = [];
  // a few orders today and yesterday so the dashboard "today" figures are populated
  const sinceMidnight = now - todayStart;
  for (let i = 0; i < 4; i++) out.push(sinceMidnight > 2 * HOUR ? todayStart + rng.int(Math.floor(sinceMidnight * 0.1), sinceMidnight - 20 * MIN) : now - rng.int(10, 110) * MIN);
  for (let i = 0; i < 3; i++) out.push(todayStart - DAY + rng.int(9, 21) * HOUR + rng.int(0, 59) * MIN);
  // shoppers order during the day: 09:00–22:59 Tashkent time
  const daytime = (dayStart: number) => dayStart + rng.int(9, 22) * HOUR + rng.int(0, 59) * MIN;
  for (let i = 0; i < 10; i++) out.push(daytime(todayStart - rng.int(2, 14) * DAY));
  // the rest over the past year with growth towards recent months
  while (out.length < total) {
    const monthsAgo = rng.weighted([[0, 12], [1, 11], [2, 10], [3, 9], [4, 8], [5, 7], [6, 6], [7, 5], [8, 4], [9, 4], [10, 3], [11, 3]] as const);
    const age = Math.max(15, monthsAgo * 30 + rng.int(0, 29));
    out.push(daytime(todayStart - age * DAY));
  }
  return out.sort((a, b) => a - b);
}

async function inStock(productId: Types.ObjectId, variantId: Types.ObjectId | null): Promise<number> {
  const inv = await Inventory.findOne({ product: productId, variant: variantId }).lean();
  return inv ? inv.onHand - inv.reserved : 0;
}

const CHEAP_CATEGORIES = new Set(PRODUCTS.filter((p) => p.price < 300_000).map((p) => p.sku));

export interface OrderSeedResult {
  orders: IOrder[];
}

export async function seedOrders(log: SeedLog, rng: Rng, customers: DemoCustomer[], staff: { manager: Staff }, count = 72): Promise<OrderSeedResult> {
  const settings = await getSettings();
  const products = await Product.find({ status: 'published' }).lean<IProduct[]>();
  const pickup = await PickupPoint.find({ isActive: true }).lean();
  const zones = await DeliveryZone.find({ isActive: true }).lean();
  const coupons = await Coupon.find({ isActive: true, expiresAt: { $gt: new Date() } }).lean();
  const dates = orderDates(count, rng);
  const now = Date.now();
  const created: IOrder[] = [];
  let skipped = 0;

  for (const at of dates) {
    const eligible = customers.filter((c) => c.registeredAt.getTime() < at - DAY);
    const customer = eligible.length ? rng.pick(eligible) : customers[0]!;
    const owner = { userId: customer.id };
    const lang = customer.lang;
    clock.pin(new Date(at - rng.int(4, 40) * MIN));
    await clearCart(owner, lang);

    // 1–3 lines; cheaper consumables / accessories are bought in larger quantities
    const lines = rng.weighted([[1, 5], [2, 3], [3, 1]] as const);
    let added = 0;
    for (const p of rng.sample(products, lines * 3)) {
      if (added >= lines) break;
      const variant = p.variants?.length ? rng.pick(p.variants.filter((v) => v.isActive !== false)) : null;
      const available = await inStock(p._id, variant?._id ?? null);
      const qty = CHEAP_CATEGORIES.has(p.sku) ? rng.int(1, 4) : rng.chance(0.12) ? 2 : 1;
      if (available < qty + 1) continue;
      try {
        await addItem(owner, { productId: String(p._id), variantId: variant ? String(variant._id) : undefined, quantity: qty }, lang);
        added++;
      } catch {
        /* out of stock etc. — try another product */
      }
    }
    if (!added) {
      skipped++;
      continue;
    }
    if (coupons.length && rng.chance(0.15)) {
      await applyCoupon(owner, rng.pick(coupons).code, lang).catch(() => undefined);
    }

    const plan: Plan = { at, ...pathFor((now - at) / DAY, rng) };
    const zone = zones.find((z) => z.regions.includes(customer.region));
    const courier = !!zone && rng.chance(0.72);
    const pickupPoint = rng.pick(pickup);
    let method: PaymentMethod = rng.weighted([['cash', 5], ['card_on_delivery', 4], ['installment', 1]] as const);

    clock.pin(new Date(at));
    let result;
    const checkout = (m: PaymentMethod) =>
      createOrder(
        customer.id,
        checkoutSchema.parse({
          customer: { firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone, email: customer.email },
          delivery: courier ? { method: 'courier', addressId: String(customer.addressId) } : { method: 'pickup', pickupPointId: String(pickupPoint._id) },
          payment: m === 'installment' ? { method: 'installment', installmentMonths: rng.pick(settings['installment.plans']).months } : { method: m },
          comment: rng.chance(0.15) ? (lang === 'ru' ? 'Позвоните, пожалуйста, за час до доставки.' : lang === 'en' ? 'Please call an hour before delivery.' : "Iltimos, yetkazishdan bir soat oldin qo'ng'iroq qiling.") : undefined,
        }),
        ctxFor(lang, rng.chance(0.4) ? 'mobile' : 'web'),
      );
    try {
      result = await checkout(method);
    } catch (err) {
      if ((err as { code?: string }).code === 'PAYMENT_METHOD_UNAVAILABLE' && method === 'installment') {
        method = 'cash';
        result = await checkout(method);
      } else {
        skipped++;
        continue;
      }
    }
    await events.drain();
    const orderId = new Types.ObjectId(result.order.id);

    // installment applications are reviewed first
    if (method === 'installment') {
      plan.installmentDecision = plan.path[0] === 'CANCELLED' ? 'REJECTED' : 'APPROVED';
      if (plan.installmentDecision === 'REJECTED') plan.cancelBy = 'staff';
    }

    let t = at;
    let deliveryDays = courier ? rng.int(zone!.minDays, zone!.maxDays) : 1;
    if (deliveryDays < 1) deliveryDays = 1;
    for (const to of plan.path) {
      t += stepDelay(to, rng, deliveryDays);
      if (t > now - 5 * MIN) break; // the future has not happened yet
      clock.pin(new Date(t));
      if (plan.installmentDecision && (to === 'CONFIRMED' || (to === 'CANCELLED' && plan.installmentDecision === 'REJECTED'))) {
        await Order.updateOne({ _id: orderId }, { $set: { 'payment.installment.status': plan.installmentDecision } });
      }
      if (to === 'CANCELLED' && plan.cancelBy === 'customer') {
        await customerCancel(String(orderId), customer.id, lang === 'ru' ? 'Передумал' : lang === 'en' ? 'Changed my mind' : "Fikrimdan qaytdim", ctxFor(lang));
      } else {
        const regional = courier && customer.region !== 'tashkent-city';
        await changeStatus(orderId, to, staff.manager, {
          note: to === 'RETURNED' ? 'Customer return within the return period' : plan.installmentDecision && to === 'CONFIRMED' ? 'installment approved' : undefined,
          cancelReason: to === 'CANCELLED' ? (plan.installmentDecision === 'REJECTED' ? 'installment_rejected' : 'customer_request') : undefined,
          carrier: to === 'SHIPPED' && regional ? 'Partner courier service' : to === 'SHIPPED' && courier ? 'OCKEAN courier' : undefined,
          trackingNumber: to === 'SHIPPED' && regional ? `VT${rng.int(10_000_000, 99_999_999)}` : undefined,
        });
      }
      await events.drain();
    }
    created.push((await Order.findById(orderId).lean<IOrder>())!);
  }
  clock.pin(null);

  // customers have read notifications older than a few days
  const threeDaysAgo = new Date(now - 3 * DAY);
  await Notification.updateMany({ createdAt: { $lt: threeDaysAgo }, readAt: null }, { $set: { readAt: new Date(now - 2 * DAY) } });
  // last sign-in ≈ last activity
  for (const c of customers) {
    const last = await Order.findOne({ user: c.id }).sort({ createdAt: -1 }).select('createdAt').lean();
    const lastActivity = Math.max(c.registeredAt.getTime(), last?.createdAt.getTime() ?? 0);
    await User.updateOne({ _id: c.id }, { $set: { lastLoginAt: new Date(Math.min(now - HOUR, lastActivity + rng.int(1, 30) * HOUR)) } });
  }
  await cache.invalidate(CacheTags.home, CacheTags.catalog);
  const byStatus = created.reduce<Record<string, number>>((acc, o) => ((acc[o.status] = (acc[o.status] ?? 0) + 1), acc), {});
  log.done('orders', `${created.length} through checkout + status workflow (${Object.entries(byStatus).map(([k, v]) => `${k} ${v}`).join(', ')})${skipped ? `, ${skipped} skipped` : ''}`);
  return { orders: created };
}

/* ---------------------------------------------------------------- reviews */

const REPLIES: Record<Language, { positive: string[]; negative: string[] }> = {
  uz: {
    positive: ["Fikringiz uchun rahmat! Xaridingiz sizga yoqqanidan xursandmiz.", "Batafsil sharh uchun rahmat — boshqa xaridorlarga ham foydali bo'ladi."],
    negative: ["Fikringiz uchun rahmat. Menejerimiz vaziyatni aniqlash uchun siz bilan bog'lanadi.", "Noqulaylik uchun uzr so'raymiz. Kafolat bo'yicha murojaatingizni ko'rib chiqishga tayyormiz."],
  },
  ru: {
    positive: ['Спасибо за отзыв! Рады, что покупка вам понравилась.', 'Спасибо за подробный отзыв — он поможет другим покупателям.'],
    negative: ['Спасибо за отзыв. Наш менеджер свяжется с вами, чтобы разобраться в ситуации.', 'Приносим извинения за неудобства. Готовы рассмотреть ваше обращение по гарантии.'],
  },
  en: {
    positive: ["Thank you for your review! We're glad you're happy with your purchase.", 'Thanks for the detailed review — it will help other customers.'],
    negative: ['Thank you for your feedback. Our manager will contact you to sort this out.', 'We apologise for the inconvenience and are ready to review your warranty request.'],
  },
};

function pickTemplate(rng: Rng, illustration: string, lang: Language): SeedReviewTemplate {
  const fitting = REVIEW_TEMPLATES.filter((t) => t.fits?.includes(illustration as never));
  const generic = REVIEW_TEMPLATES.filter((t) => !t.fits?.length);
  const pool = [...fitting, ...fitting, ...generic];
  const sameLang = pool.filter((t) => t.language === lang);
  return rng.pick(sameLang.length ? sameLang : pool);
}

export async function seedReviews(log: SeedLog, rng: Rng, orders: IOrder[], customers: DemoCustomer[], staff: { manager: Staff }, target = 56) {
  const now = Date.now();
  const langOf = new Map(customers.map((c) => [String(c.id), c.lang]));
  const illustrationOf = new Map(PRODUCTS.map((p) => [p.sku, p.illustration]));
  const pairs = new Map<string, { user: Types.ObjectId; product: Types.ObjectId; sku: string; after: number }>();
  for (const o of orders.filter((x) => x.status === 'DELIVERED' || x.status === 'RETURNED')) {
    for (const it of o.items) {
      const key = `${o.user}:${it.product}`;
      if (!pairs.has(key)) pairs.set(key, { user: o.user, product: it.product, sku: it.sku, after: (o.deliveredAt ?? o.createdAt).getTime() });
    }
  }
  const productSku = new Map((await Product.find().select('sku').lean()).map((p) => [String(p._id), p.sku]));
  const chosen = rng.shuffle([...pairs.values()]).slice(0, target);
  let approved = 0;
  let rejected = 0;
  let pending = 0;
  for (const pair of chosen) {
    const lang = langOf.get(String(pair.user)) ?? 'uz';
    const sku = productSku.get(String(pair.product)) ?? pair.sku;
    const tpl = pickTemplate(rng, illustrationOf.get(sku) ?? illustrationOf.get(pair.sku) ?? '', lang);
    const at = Math.min(now - 2 * HOUR, pair.after + rng.int(1, 12) * DAY + rng.int(0, 20) * HOUR);
    clock.pin(new Date(at));
    let review;
    try {
      review = await createReview(pair.user, { productId: String(pair.product), rating: tpl.rating, title: tpl.title, comment: tpl.comment, pros: tpl.pros, cons: tpl.cons }, tpl.language);
    } catch {
      continue;
    }
    await events.drain();
    // moderation by the manager a few hours later (the newest ones are still waiting)
    const moderatedAt = at + rng.int(2, 30) * HOUR;
    if (moderatedAt > now - HOUR) {
      pending++;
      continue;
    }
    clock.pin(new Date(moderatedAt));
    const reject = tpl.rating <= 2 && rng.chance(0.25);
    const reply = !reject && rng.chance(tpl.rating <= 3 ? 0.9 : 0.3) ? rng.pick(REPLIES[tpl.language][tpl.rating <= 3 ? 'negative' : 'positive']) : undefined;
    await Review.updateOne(
      { _id: review._id },
      {
        $set: {
          status: reject ? 'REJECTED' : 'APPROVED',
          moderatedBy: staff.manager.id,
          moderatedAt: new Date(moderatedAt),
          ...(reply ? { reply: { text: reply, by: staff.manager.id, byName: 'OCKEAN', at: new Date(moderatedAt) } } : {}),
        },
      },
    );
    await recomputeRating(review.product);
    events.emit('review.moderated', { reviewId: review._id, approved: !reject, replied: !!reply });
    await events.drain();
    if (reject) rejected++;
    else approved++;
  }
  clock.pin(null);
  await cache.invalidate(CacheTags.home, CacheTags.catalog);
  log.done('reviews', `${approved + rejected + pending} from delivered orders (${approved} approved, ${rejected} rejected, ${pending} awaiting moderation)`);
}

/* -------------------------------------------------------------- questions */

type QA = { q: Record<Language, string>; a: (p: IProduct, ctx: { minAmount: string; plans: string }) => Record<Language, string> };

const QUESTIONS: QA[] = [
  {
    q: { uz: 'Kafolat muddati qancha?', ru: 'Какой срок гарантии?', en: 'How long is the warranty?' },
    a: (p) => ({
      uz: `Ushbu mahsulotga ${p.warrantyMonths} oylik kafolat beriladi. Kafolat taloni va chek buyurtma bilan birga topshiriladi.`,
      ru: `На этот товар действует гарантия ${p.warrantyMonths} мес. Гарантийный талон и чек передаются вместе с заказом.`,
      en: `This product comes with a ${p.warrantyMonths}-month warranty. The warranty card and receipt are handed over with the order.`,
    }),
  },
  {
    q: { uz: "Muddatli to'lovga olsa bo'ladimi?", ru: 'Можно ли купить в рассрочку?', en: 'Can I buy it in installments?' },
    a: (_p, c) => ({
      uz: `Ha, ${c.minAmount} so'mdan yuqori buyurtmalar uchun muddatli to'lov mavjud (${c.plans} oy). Rasmiylashtirishda "Muddatli to'lov" usulini tanlang.`,
      ru: `Да, рассрочка доступна для заказов от ${c.minAmount} сум (${c.plans} мес.). Выберите способ «Рассрочка» при оформлении.`,
      en: `Yes, installments are available for orders from ${c.minAmount} UZS (${c.plans} months). Choose "Installment" at checkout.`,
    }),
  },
  {
    q: { uz: "Qabul qilishda tekshirib ko'rsa bo'ladimi?", ru: 'Можно ли проверить товар при получении?', en: 'Can I check the item on delivery?' },
    a: () => ({
      uz: "Albatta. Kuryer yoki olib ketish punktida mahsulotni ko'zdan kechirib, komplektni tekshirishingiz mumkin.",
      ru: 'Конечно. Вы можете осмотреть товар и проверить комплектацию у курьера или в пункте выдачи.',
      en: 'Of course. You can inspect the item and check the package contents with the courier or at the pickup point.',
    }),
  },
  {
    q: { uz: "Og'irligi qancha?", ru: 'Сколько весит?', en: 'How much does it weigh?' },
    a: (p) => ({
      uz: `Mahsulot og'irligi taxminan ${p.weightKg ?? '—'} kg. To'liq xususiyatlar "Xususiyatlar" bo'limida keltirilgan.`,
      ru: `Вес товара — около ${p.weightKg ?? '—'} кг. Полные характеристики указаны во вкладке «Характеристики».`,
      en: `The product weighs about ${p.weightKg ?? '—'} kg. Full details are listed under "Specifications".`,
    }),
  },
];

export async function seedQuestions(log: SeedLog, rng: Rng, customers: DemoCustomer[], staff: { manager: Staff }, count = 14) {
  const s = await getSettings();
  const ctx = { minAmount: formatNumber(s['installment.minAmount']), plans: s['installment.plans'].map((p) => p.months).join('/') };
  const products = await Product.find({ status: 'published' }).sort({ soldCount: -1 }).limit(40).lean<IProduct[]>();
  const now = Date.now();
  let answered = 0;
  for (let i = 0; i < count; i++) {
    const p = rng.pick(products);
    const c = rng.pick(customers);
    const qa = rng.pick(QUESTIONS);
    const at = now - rng.int(1, 120) * DAY;
    clock.pin(new Date(at));
    const user = await User.findById(c.id).select('firstName lastName').lean();
    const doc = await ProductQuestion.create({ product: p._id, user: c.id, authorName: `${user?.firstName ?? ''} ${(user?.lastName ?? '').slice(0, 1)}.`.trim(), question: qa.q[c.lang], status: 'PENDING' });
    if (i < count - 3) {
      const answerAt = at + rng.int(1, 20) * HOUR;
      clock.pin(new Date(answerAt));
      await ProductQuestion.updateOne({ _id: doc._id }, { $set: { status: 'PUBLISHED', answer: { text: qa.a(p, ctx)[c.lang], by: staff.manager.id, byName: 'OCKEAN', at: new Date(answerAt) } } });
      events.emit('question.answered', { questionId: doc._id });
      await events.drain();
      answered++;
    }
  }
  clock.pin(null);
  log.done('product questions', `${count} (${answered} answered, ${count - answered} waiting)`);
}

/* -------------------------------------------------- wishlists / compare / carts */

export async function seedEngagement(log: SeedLog, rng: Rng, customers: DemoCustomer[]) {
  const products = await Product.find({ status: 'published' }).select('_id category variants').lean();
  const now = Date.now();
  let wish = 0;
  let cmp = 0;
  let carts = 0;
  for (const c of rng.sample(customers, 14)) {
    for (const p of rng.sample(products, rng.int(2, 6))) {
      clock.pin(new Date(now - rng.int(1, 60) * DAY));
      await addToWishlist({ userId: c.id }, String(p._id)).then(() => wish++).catch(() => undefined);
    }
  }
  const byCategory = new Map<string, typeof products>();
  for (const p of products) byCategory.set(String(p.category), [...(byCategory.get(String(p.category)) ?? []), p]);
  const groups = [...byCategory.values()].filter((g) => g.length >= 2);
  for (const c of rng.sample(customers, 6)) {
    for (const p of rng.sample(rng.pick(groups), 3)) {
      clock.pin(new Date(now - rng.int(1, 14) * DAY));
      await addToCompare({ userId: c.id }, String(p._id)).then(() => cmp++).catch(() => undefined);
    }
  }
  // a few customers left products in their cart (visible on every device they sign in on)
  for (const c of rng.sample(customers, 5)) {
    clock.pin(new Date(now - rng.int(1, 5) * DAY));
    for (const p of rng.sample(products, rng.int(1, 2))) {
      const variant = p.variants?.length ? p.variants[0] : undefined;
      await addItem({ userId: c.id }, { productId: String(p._id), variantId: variant ? String(variant._id) : undefined, quantity: 1 }, c.lang)
        .then(() => carts++)
        .catch(() => undefined);
    }
  }
  clock.pin(null);
  await events.drain();
  log.done('wishlists, comparisons, carts', `${wish} wishlist items, ${cmp} compared products, ${carts} cart lines`);
}

/* --------------------------------------------------------------- expenses */

const MONTHLY_PICKS: Array<SeedExpenseTemplate['category']> = ['RENT', 'SALARY', 'SALARY', 'UTILITIES', 'ADVERTISING', 'MARKETING', 'PACKAGING', 'TAXES', 'MAINTENANCE', 'OTHER'];

/**
 * Demo expenses for the last 12 months. Amounts are sized to the demo order volume (a store with a few dozen
 * orders cannot carry the fixed costs of a large chain), so the demo P&L stays plausible. Real stores enter
 * their own expenses in Admin → Expenses; nothing here is used outside demo mode.
 */
export async function seedExpenses(log: SeedLog, rng: Rng, staff: { admin: Staff }) {
  const categories = new Map((await ExpenseCategory.find().lean()).map((c) => [c.code, c._id]));
  const now = new Date();
  const wallNow = new Date(now.getTime() + 5 * HOUR);
  let count = 0;
  let total = 0;
  for (let back = 11; back >= 0; back--) {
    const y = wallNow.getUTCFullYear();
    const m = wallNow.getUTCMonth() - back;
    const from = new Date(Date.UTC(y, m, 1) - 5 * HOUR);
    const to = new Date(Math.min(Date.UTC(y, m + 1, 1) - 5 * HOUR, now.getTime()));
    const [margin] = await Order.aggregate<{ revenue: number; cost: number }>([
      { $match: { createdAt: { $gte: from, $lt: to }, status: { $in: [...REVENUE_ORDER_STATUSES] } } },
      { $group: { _id: null, revenue: { $sum: '$total' }, cost: { $sum: '$costTotal' } } },
    ]);
    const gross = Math.max(0, (margin?.revenue ?? 0) - (margin?.cost ?? 0));
    const target = Math.max(1_500_000, gross * (0.5 + rng.next() * 0.35));

    const entries: Array<{ tpl: SeedExpenseTemplate; day: number }> = [];
    for (const cat of MONTHLY_PICKS) {
      const options = EXPENSE_TEMPLATES.filter((t) => t.category === cat && t.frequency === 'monthly');
      if (options.length) entries.push({ tpl: rng.pick(options), day: cat === 'RENT' ? rng.int(1, 5) : cat === 'SALARY' ? rng.int(24, 28) : rng.int(3, 26) });
    }
    const weekly = EXPENSE_TEMPLATES.filter((t) => t.frequency === 'weekly');
    for (const d of [4, 11, 18, 25]) entries.push({ tpl: rng.pick(weekly), day: d });
    const occasional = EXPENSE_TEMPLATES.filter((t) => t.frequency === 'occasional');
    for (let i = rng.int(0, 2); i > 0; i--) entries.push({ tpl: rng.pick(occasional), day: rng.int(2, 27) });

    const raw = entries.map((e) => rng.int(e.tpl.amountMin, e.tpl.amountMax));
    const scale = target / raw.reduce((s, x) => s + x, 0);
    for (const [i, e] of entries.entries()) {
      const date = new Date(Date.UTC(y, m, e.day, 5, 0) - 5 * HOUR + rng.int(0, 8) * HOUR);
      if (date > now) continue;
      const amount = Math.max(50_000, Math.round((raw[i]! * scale) / 10_000) * 10_000);
      const categoryId = categories.get(e.tpl.category);
      if (!categoryId) continue;
      clock.pin(new Date(Math.min(date.getTime() + rng.int(0, 6) * HOUR, now.getTime())));
      const recent = now.getTime() - date.getTime() < 4 * DAY;
      await Expense.create({
        title: e.tpl.title,
        category: categoryId,
        categoryCode: e.tpl.category,
        description: e.tpl.description,
        amount,
        currency: 'UZS',
        exchangeRate: 1,
        amountUzs: amount,
        date,
        paymentMethod: e.tpl.paymentMethod,
        responsible: e.tpl.responsible,
        status: recent && rng.chance(0.4) ? 'PENDING' : 'PAID',
        createdBy: staff.admin.id,
        createdByName: staff.admin.name,
      });
      count++;
      total += amount;
    }
  }
  clock.pin(null);
  log.done('expenses', `${count} entries over 12 months, ${formatNumber(total)} so'm (sized to demo order volume)`);
}

/* ------------------------------------------------------------ search log */

const SEARCHES: Array<[string, number]> = [
  ['perforator', 9],
  ['bolgarka', 8],
  ['шуруповерт', 8],
  ['generator', 7],
  ['компрессор', 6],
  ['drill', 5],
  ['payvandlash', 5],
  ['nasos', 5],
  ['лазерный уровень', 4],
  ['moyka', 4],
  ['пила', 4],
  ['trimmer', 3],
  ['disk 125', 3],
  ['akkumulyator', 3],
  ['набор ключей', 2],
];

export async function seedSearches(log: SeedLog, rng: Rng, customers: DemoCustomer[]) {
  const now = Date.now();
  let n = 0;
  for (const [q, weight] of SEARCHES) {
    for (let i = 0; i < weight; i++) {
      const c = rng.chance(0.5) ? rng.pick(customers) : undefined;
      clock.pin(new Date(now - rng.int(0, 60) * DAY - rng.int(0, 23) * HOUR));
      await listProducts(parseProductListQuery({ q, limit: 1 }), { lang: c?.lang ?? 'uz', userId: c?.id, track: true });
      n++;
    }
  }
  clock.pin(null);
  log.done('search activity', `${n} searches (feeds "popular searches" and customers' search history)`);
}
