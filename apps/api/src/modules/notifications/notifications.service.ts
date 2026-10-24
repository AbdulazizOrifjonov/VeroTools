import type { Types } from 'mongoose';
import type { Language } from '@vero/config';
import { SOCKET_EVENTS } from '@vero/config';
import type { NotificationDTO, NotificationType, OrderStatus } from '@vero/types';
import { formatPrice } from '@vero/utils';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { events } from '../../lib/events';
import { absoluteUrl, iso, loc } from '../../lib/localize';
import { emailLayout, sendMail } from '../../lib/mailer';
import { sendPush } from '../../lib/push';
import { sendSms } from '../../lib/sms';
import { emitToUser, emitSync } from '../../lib/socket';
import { notifyAdminsTelegram, tgEscape } from '../../lib/telegram';
import { Notification, NotificationLog, type INotification } from '../../models/notification.model';
import { Order } from '../../models/order.model';
import { Product } from '../../models/product.model';
import { User, type IUser } from '../../models/user.model';
import { Wishlist } from '../../models/wishlist.model';
import { Review, ProductQuestion } from '../../models/review.model';
import { ContactMessage } from '../../models/content.model';
import type { Localized } from '../../models/common';
import { getSettings } from '../settings/settings.service';

type Channel = 'in_app' | 'push' | 'email' | 'sms';

export interface NotificationContent {
  title: Localized;
  body: Localized;
  data?: INotification['data'];
  image?: string;
}

export function toNotificationDTO(n: INotification, lang: Language): NotificationDTO {
  return {
    id: String(n._id),
    type: n.type,
    title: loc(n.title, lang),
    body: loc(n.body, lang),
    data: n.data && Object.values(n.data).some(Boolean) ? { ...n.data } : undefined,
    image: absoluteUrl(n.image),
    readAt: n.readAt ? iso(n.readAt)! : null,
    createdAt: iso(n.createdAt)!,
  };
}

/** Creates an in-app notification and fans out to push / e-mail / SMS according to user preferences. */
export async function notifyUser(
  user: Pick<IUser, '_id' | 'email' | 'phone' | 'pushTokens' | 'preferences' | 'firstName'>,
  type: NotificationType,
  content: NotificationContent,
  channels: Channel[] = ['in_app', 'push'],
  email?: { subject: Localized; html: (lang: Language) => string },
): Promise<void> {
  const lang = user.preferences?.language ?? 'uz';
  const prefs = user.preferences?.notifications;
  const sent: string[] = [];
  let doc: INotification | null = null;
  if (channels.includes('in_app')) {
    doc = (await Notification.create({ user: user._id, type, ...content, channels })).toObject() as INotification;
    sent.push('in_app');
    emitToUser(String(user._id), SOCKET_EVENTS.notification, toNotificationDTO(doc, lang));
    emitSync({ userId: String(user._id) }, 'notifications');
  }
  if (channels.includes('push') && prefs?.push !== false && user.pushTokens?.length) {
    const { invalidTokens } = await sendPush({
      to: user.pushTokens.map((t) => t.token),
      title: loc(content.title, lang),
      body: loc(content.body, lang),
      data: { type, ...(content.data ?? {}), notificationId: doc ? String(doc._id) : undefined },
    });
    if (invalidTokens.length) await User.updateOne({ _id: user._id }, { $pull: { pushTokens: { token: { $in: invalidTokens } } } });
    sent.push('push');
  }
  if (channels.includes('email') && email && user.email && prefs?.email !== false) {
    await sendMail({ to: user.email, subject: loc(email.subject, lang), html: email.html(lang) });
    sent.push('email');
  }
  if (channels.includes('sms') && prefs?.sms !== false && user.phone) {
    await sendSms(user.phone, `${loc(content.title, lang)}. ${loc(content.body, lang)}`);
    sent.push('sms');
  }
  if (doc && sent.length > 1) await Notification.updateOne({ _id: doc._id }, { $set: { channels: sent } });
}

/* ------------------------------ templates ------------------------------ */

const STATUS_TEXT: Record<OrderStatus, { type: NotificationType; title: Localized; body: (n: string) => Localized }> = {
  PENDING: {
    type: 'ORDER_CREATED',
    title: { uz: 'Buyurtma qabul qilindi', ru: 'Заказ принят', en: 'Order placed' },
    body: (n) => ({
      uz: `№ ${n} buyurtmangiz qabul qilindi. Operatorimiz tez orada tasdiqlaydi.`,
      ru: `Ваш заказ № ${n} принят. Оператор скоро его подтвердит.`,
      en: `Your order #${n} has been placed. Our operator will confirm it shortly.`,
    }),
  },
  CONFIRMED: {
    type: 'ORDER_CONFIRMED',
    title: { uz: 'Buyurtma tasdiqlandi', ru: 'Заказ подтверждён', en: 'Order confirmed' },
    body: (n) => ({ uz: `№ ${n} buyurtmangiz tasdiqlandi.`, ru: `Заказ № ${n} подтверждён.`, en: `Order #${n} has been confirmed.` }),
  },
  PROCESSING: {
    type: 'ORDER_PROCESSING',
    title: { uz: 'Buyurtma tayyorlanmoqda', ru: 'Заказ собирается', en: 'Order is being prepared' },
    body: (n) => ({ uz: `№ ${n} buyurtmangiz omborda yig'ilmoqda.`, ru: `Заказ № ${n} собирается на складе.`, en: `Order #${n} is being picked at the warehouse.` }),
  },
  PACKED: {
    type: 'ORDER_PACKED',
    title: { uz: 'Buyurtma qadoqlandi', ru: 'Заказ упакован', en: 'Order packed' },
    body: (n) => ({ uz: `№ ${n} buyurtmangiz jo'natishga tayyor.`, ru: `Заказ № ${n} упакован и готов к отправке.`, en: `Order #${n} is packed and ready to ship.` }),
  },
  SHIPPED: {
    type: 'ORDER_SHIPPED',
    title: { uz: "Buyurtma yo'lda", ru: 'Заказ в пути', en: 'Order shipped' },
    body: (n) => ({ uz: `№ ${n} buyurtmangiz kuryerga topshirildi.`, ru: `Заказ № ${n} передан курьеру.`, en: `Order #${n} has been handed to the courier.` }),
  },
  DELIVERED: {
    type: 'ORDER_DELIVERED',
    title: { uz: 'Buyurtma yetkazildi', ru: 'Заказ доставлен', en: 'Order delivered' },
    body: (n) => ({
      uz: `№ ${n} buyurtma yetkazildi. Xaridingiz uchun rahmat! Mahsulotga sharh qoldiring.`,
      ru: `Заказ № ${n} доставлен. Спасибо за покупку! Оставьте отзыв о товаре.`,
      en: `Order #${n} has been delivered. Thank you! Please leave a review.`,
    }),
  },
  CANCELLED: {
    type: 'ORDER_CANCELLED',
    title: { uz: 'Buyurtma bekor qilindi', ru: 'Заказ отменён', en: 'Order cancelled' },
    body: (n) => ({ uz: `№ ${n} buyurtma bekor qilindi.`, ru: `Заказ № ${n} отменён.`, en: `Order #${n} has been cancelled.` }),
  },
  RETURNED: {
    type: 'ORDER_RETURNED',
    title: { uz: 'Buyurtma qaytarildi', ru: 'Заказ возвращён', en: 'Order returned' },
    body: (n) => ({ uz: `№ ${n} buyurtma bo'yicha qaytarish rasmiylashtirildi.`, ru: `По заказу № ${n} оформлен возврат.`, en: `A return has been registered for order #${n}.` }),
  },
};

function orderEmail(number: string, orderId: string, status: OrderStatus, total: number) {
  const t = STATUS_TEXT[status];
  return {
    subject: { uz: `${t.title.uz} — № ${number}`, ru: `${t.title.ru} — № ${number}`, en: `${t.title.en} — #${number}` },
    html: (lang: Language) =>
      emailLayout({
        title: loc(t.title, lang),
        intro: loc(t.body(number), lang),
        body: `<p style="margin:16px 0 0;font-weight:700">${lang === 'ru' ? 'Сумма' : lang === 'en' ? 'Total' : 'Jami'}: ${formatPrice(total, lang)}</p>`,
        button: { label: lang === 'ru' ? 'Открыть заказ' : lang === 'en' ? 'View order' : "Buyurtmani ko'rish", url: `${env.CLIENT_URL}/account/orders/${orderId}` },
        footer: 'OCKEAN TOOLS · ockean.uz',
      }),
  };
}

/* ------------------------------- handlers ------------------------------ */

events.on('order.created', async ({ orderId }) => {
  const order = await Order.findById(orderId).lean();
  if (!order) return;
  const user = await User.findById(order.user).lean();
  if (user) {
    const t = STATUS_TEXT.PENDING;
    const s = await getSettings();
    const email = orderEmail(order.number, String(order._id), 'PENDING', order.total);
    await notifyUser(user, t.type, { title: t.title, body: t.body(order.number), data: { orderId: String(order._id), orderNumber: order.number, url: `/account/orders/${order._id}` } }, s['notifications.emailOrderStatus'] ? ['in_app', 'push', 'email'] : ['in_app', 'push'], email);
  }
  const s = await getSettings();
  if (s['notifications.telegramNewOrders']) {
    const lines = order.items.map((i) => `• ${tgEscape(i.name.uz || i.name.ru)} × ${i.quantity}`).join('\n');
    await notifyAdminsTelegram(
      `🛒 <b>Yangi buyurtma ${tgEscape(order.number)}</b>\n${tgEscape(order.customer.firstName)} ${tgEscape(order.customer.lastName)} · ${tgEscape(order.customer.phone)}\n${lines}\n<b>Jami: ${tgEscape(formatPrice(order.total, 'uz'))}</b>\nTo'lov: ${order.payment.method} · Yetkazish: ${order.delivery.method}`,
    );
  }
});

events.on('order.status_changed', async ({ orderId, to }) => {
  const order = await Order.findById(orderId).lean();
  if (!order) return;
  const user = await User.findById(order.user).lean();
  if (!user) return;
  const t = STATUS_TEXT[to];
  const s = await getSettings();
  const channels: Channel[] = ['in_app', 'push'];
  if (s['notifications.emailOrderStatus'] && ['CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].includes(to)) channels.push('email');
  if (s['notifications.smsOrderStatus'] && ['SHIPPED', 'DELIVERED'].includes(to)) channels.push('sms');
  await notifyUser(
    user,
    t.type,
    { title: t.title, body: t.body(order.number), data: { orderId: String(order._id), orderNumber: order.number, url: `/account/orders/${order._id}` } },
    channels,
    orderEmail(order.number, String(order._id), to, order.total),
  );
});

events.on('payment.paid', async ({ orderId }) => {
  const order = await Order.findById(orderId).lean();
  if (!order || order.payment.provider === 'cash') return;
  const user = await User.findById(order.user).lean();
  if (!user) return;
  await notifyUser(user, 'PAYMENT_RECEIVED', {
    title: { uz: "To'lov qabul qilindi", ru: 'Оплата получена', en: 'Payment received' },
    body: {
      uz: `№ ${order.number} buyurtma uchun ${formatPrice(order.total, 'uz')} to'lov qabul qilindi.`,
      ru: `Получена оплата ${formatPrice(order.total, 'ru')} за заказ № ${order.number}.`,
      en: `We received ${formatPrice(order.total, 'en')} for order #${order.number}.`,
    },
    data: { orderId: String(order._id), orderNumber: order.number, url: `/account/orders/${order._id}` },
  }, ['in_app']);
});

async function wishlistWatchers(productId: Types.ObjectId, pref: 'priceDrops' | 'backInStock') {
  const lists = await Wishlist.find({ user: { $type: 'objectId' }, 'items.product': productId }).select('user items').lean();
  const userIds = lists.map((l) => l.user).filter(Boolean);
  if (!userIds.length) return [];
  const users = await User.find({ _id: { $in: userIds }, status: 'active' }).lean();
  return users.filter((u) => u.preferences?.notifications?.[pref] !== false);
}

events.on('product.price_dropped', async ({ productId, oldPrice, newPrice }) => {
  const product = await Product.findById(productId).select('name slug images price').lean();
  if (!product) return;
  for (const user of await wishlistWatchers(productId, 'priceDrops')) {
    await notifyUser(user, 'PRICE_DROP', {
      title: { uz: 'Narx tushdi!', ru: 'Цена снизилась!', en: 'Price drop!' },
      body: {
        uz: `${product.name.uz}: ${formatPrice(oldPrice, 'uz')} → ${formatPrice(newPrice, 'uz')}`,
        ru: `${product.name.ru}: ${formatPrice(oldPrice, 'ru')} → ${formatPrice(newPrice, 'ru')}`,
        en: `${product.name.en}: ${formatPrice(oldPrice, 'en')} → ${formatPrice(newPrice, 'en')}`,
      },
      image: product.images?.[0]?.thumb ?? product.images?.[0]?.url,
      data: { productId: String(product._id), productSlug: product.slug, url: `/product/${product.slug}` },
    });
    await Wishlist.updateOne({ user: user._id, 'items.product': productId }, { $set: { 'items.$.notifiedPrice': newPrice } });
  }
});

events.on('product.back_in_stock', async ({ productId }) => {
  const product = await Product.findById(productId).select('name slug images').lean();
  if (!product) return;
  for (const user of await wishlistWatchers(productId, 'backInStock')) {
    await notifyUser(user, 'BACK_IN_STOCK', {
      title: { uz: 'Mahsulot sotuvga qaytdi', ru: 'Товар снова в наличии', en: 'Back in stock' },
      body: { uz: `${product.name.uz} yana mavjud.`, ru: `${product.name.ru} снова в наличии.`, en: `${product.name.en} is available again.` },
      image: product.images?.[0]?.thumb ?? product.images?.[0]?.url,
      data: { productId: String(product._id), productSlug: product.slug, url: `/product/${product.slug}` },
    });
  }
});

events.on('review.moderated', async ({ reviewId, approved, replied }) => {
  const review = await Review.findById(reviewId).populate('product', 'name slug').lean();
  if (!review) return;
  const user = await User.findById(review.user).lean();
  const product = review.product as unknown as { name: Localized; slug: string } | null;
  if (!user || !product) return;
  if (approved) {
    await notifyUser(user, 'REVIEW_APPROVED', {
      title: { uz: "Sharhingiz e'lon qilindi", ru: 'Ваш отзыв опубликован', en: 'Your review is live' },
      body: { uz: `${product.name.uz} haqidagi sharhingiz uchun rahmat!`, ru: `Спасибо за отзыв о товаре ${product.name.ru}!`, en: `Thanks for reviewing ${product.name.en}!` },
      data: { productSlug: product.slug, url: `/product/${product.slug}` },
    }, ['in_app']);
  }
  if (replied) {
    await notifyUser(user, 'REVIEW_REPLY', {
      title: { uz: 'Sharhingizga javob berildi', ru: 'Ответ на ваш отзыв', en: 'We replied to your review' },
      body: { uz: product.name.uz, ru: product.name.ru, en: product.name.en },
      data: { productSlug: product.slug, url: `/product/${product.slug}` },
    });
  }
});

events.on('question.answered', async ({ questionId }) => {
  const q = await ProductQuestion.findById(questionId).populate('product', 'name slug').lean();
  if (!q) return;
  const user = await User.findById(q.user).lean();
  const product = q.product as unknown as { name: Localized; slug: string } | null;
  if (!user || !product) return;
  await notifyUser(user, 'QUESTION_ANSWERED', {
    title: { uz: 'Savolingizga javob berildi', ru: 'Ответ на ваш вопрос', en: 'Your question was answered' },
    body: { uz: product.name.uz, ru: product.name.ru, en: product.name.en },
    data: { productSlug: product.slug, url: `/product/${product.slug}` },
  });
});

events.on('inventory.low_stock', async ({ sku, available, minStock }) => {
  await notifyAdminsTelegram(`⚠️ <b>Kam qoldi</b>: ${tgEscape(sku)} — ${available} dona (min ${minStock})`);
});

events.on('contact.created', async ({ messageId }) => {
  const m = await ContactMessage.findById(messageId).lean();
  if (!m) return;
  await notifyAdminsTelegram(
    `📩 <b>${m.type === 'callback' ? "Qayta qo'ng'iroq" : 'Yangi murojaat'}</b>\n${tgEscape(m.name)} · ${tgEscape(m.phone)}${m.message ? `\n${tgEscape(m.message.slice(0, 500))}` : ''}`,
  );
});

/* ------------------------------ broadcast ------------------------------ */

export async function broadcast(
  input: { type: NotificationType; title: Localized; body: Localized; url?: string; channels: Array<'in_app' | 'push' | 'email'>; audience: 'all' | 'active' | 'with_orders' },
  sender: { id?: Types.ObjectId; name?: string },
): Promise<number> {
  const filter: Record<string, unknown> = { roleKey: 'CUSTOMER', status: 'active' };
  if (input.audience === 'active') filter.lastLoginAt = { $gte: new Date(Date.now() - 90 * 86_400_000) };
  if (input.audience === 'with_orders') filter['stats.ordersCount'] = { $gt: 0 };
  if (input.type === 'PROMOTION' || input.type === 'DISCOUNT') filter['preferences.notifications.promotions'] = { $ne: false };
  let recipients = 0;
  const cursor = User.find(filter).lean().cursor();
  for await (const user of cursor) {
    try {
      await notifyUser(
        user,
        input.type,
        { title: input.title, body: input.body, data: input.url ? { url: input.url } : undefined },
        input.channels,
        input.channels.includes('email')
          ? {
              subject: input.title,
              html: (lang) =>
                emailLayout({
                  title: loc(input.title, lang),
                  intro: loc(input.body, lang),
                  button: input.url ? { label: 'OCKEAN TOOLS', url: input.url.startsWith('http') ? input.url : `${env.CLIENT_URL}${input.url}` } : undefined,
                  footer: 'OCKEAN TOOLS · ockean.uz',
                }),
            }
          : undefined,
      );
      recipients += 1;
    } catch (err) {
      logger.warn({ err, user: String(user._id) }, 'broadcast delivery failed');
    }
  }
  await NotificationLog.create({ ...input, recipients, sentBy: sender.id, sentByName: sender.name });
  return recipients;
}
