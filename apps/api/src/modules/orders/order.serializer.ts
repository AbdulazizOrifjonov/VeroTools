import type { ClientApp, Language } from '@vero/config';
import { findRegion } from '@vero/config';
import type { OrderDetail, OrderItemDTO, OrderSummary } from '@vero/types';
import { canCustomerCancel } from '@vero/utils';
import type { IOrder } from '../../models/order.model';
import { absoluteUrl, iso, loc } from '../../lib/localize';
import { paymentAction } from '../payments/payments.service';

function itemDTO(i: IOrder['items'][number], lang: Language): OrderItemDTO {
  return {
    id: String(i._id),
    productId: String(i.product),
    variantId: i.variant ? String(i.variant) : undefined,
    slug: i.slug,
    sku: i.sku,
    name: loc(i.name, lang),
    variantName: i.variantName ? loc(i.variantName, lang) : undefined,
    image: i.image?.url ? { url: absoluteUrl(i.image.url)!, thumb: absoluteUrl(i.image.thumb ?? i.image.url), alt: loc(i.name, lang) } : undefined,
    price: i.price,
    oldPrice: i.oldPrice,
    quantity: i.quantity,
    total: i.total,
    warrantyMonths: i.warrantyMonths,
    reviewed: i.reviewed,
  };
}

export function toOrderSummary(o: IOrder, lang: Language): OrderSummary {
  return {
    id: String(o._id),
    number: o.number,
    status: o.status,
    paymentStatus: o.payment.status,
    paymentMethod: o.payment.method,
    deliveryMethod: o.delivery.method,
    total: o.total,
    itemsCount: o.itemsCount,
    preview: o.items.slice(0, 4).map((i) => ({
      name: loc(i.name, lang),
      image: i.image?.url ? { url: absoluteUrl(i.image.url)!, thumb: absoluteUrl(i.image.thumb ?? i.image.url) } : undefined,
    })),
    createdAt: iso(o.createdAt)!,
  };
}

export function toOrderDetail(o: IOrder, lang: Language, client: ClientApp = 'web'): OrderDetail {
  const addr = o.delivery.address;
  const pickup = o.delivery.pickupSnapshot;
  const action = paymentAction(o, client, lang);
  return {
    ...toOrderSummary(o, lang),
    items: o.items.map((i) => itemDTO(i, lang)),
    customer: { ...o.customer, email: o.customer.email || undefined },
    delivery: {
      method: o.delivery.method,
      address: addr ? { ...addr, regionName: findRegion(addr.region)?.name[lang] ?? addr.region } : undefined,
      pickupPoint:
        pickup && o.delivery.pickupPoint
          ? {
              id: String(o.delivery.pickupPoint),
              code: pickup.code,
              name: loc(pickup.name, lang),
              address: loc(pickup.address, lang),
              region: '',
              city: '',
              phone: pickup.phone,
              workingHours: loc(pickup.workingHours, lang),
              location: { lat: pickup.lat, lng: pickup.lng },
            }
          : undefined,
      zoneName: o.delivery.zoneName ? loc(o.delivery.zoneName, lang) : undefined,
      fee: o.delivery.fee,
      minDays: o.delivery.minDays,
      maxDays: o.delivery.maxDays,
      estimatedFrom: iso(o.delivery.estimatedFrom),
      estimatedTo: iso(o.delivery.estimatedTo),
      carrier: o.delivery.carrier || undefined,
      trackingNumber: o.delivery.trackingNumber || undefined,
    },
    payment: {
      method: o.payment.method,
      provider: o.payment.provider,
      status: o.payment.status,
      paidAt: iso(o.payment.paidAt),
      action: action.type === 'none' ? undefined : action,
      installment: o.payment.installment
        ? {
            months: o.payment.installment.months,
            markupPercent: o.payment.installment.markupPercent,
            monthlyPayment: o.payment.installment.monthlyPayment,
            total: o.payment.installment.total,
            status: o.payment.installment.status,
          }
        : undefined,
    },
    subtotal: o.subtotal,
    oldSubtotal: o.oldSubtotal,
    productDiscount: o.productDiscount,
    couponDiscount: o.couponDiscount,
    coupon: o.coupon ? { code: o.coupon.code } : undefined,
    deliveryFee: o.deliveryFee,
    comment: o.comment || undefined,
    statusHistory: o.statusHistory.map((h) => ({ status: h.status, at: iso(h.at)!, note: h.note || undefined })),
    canCancel: canCustomerCancel(o.status),
    cancelReason: o.cancelReason || undefined,
    source: o.source,
    updatedAt: iso(o.updatedAt)!,
  };
}
