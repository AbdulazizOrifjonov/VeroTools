import {
  CUSTOMER_CANCELLABLE_STATUSES,
  ORDER_STATUS_TRANSITIONS,
  ORDER_TIMELINE,
  type OrderStatus,
  type StockStatus,
} from '@vero/types';

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isFinalOrderStatus(status: OrderStatus): boolean {
  return (ORDER_STATUS_TRANSITIONS[status]?.length ?? 0) === 0;
}

export function canCustomerCancel(status: OrderStatus): boolean {
  return CUSTOMER_CANCELLABLE_STATUSES.includes(status);
}

/** Index of the status on the customer timeline (−1 for CANCELLED / RETURNED). */
export function timelineIndex(status: OrderStatus): number {
  return ORDER_TIMELINE.indexOf(status);
}

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export function stockStatusFor(available: number, lowThreshold = DEFAULT_LOW_STOCK_THRESHOLD): StockStatus {
  if (available <= 0) return 'out_of_stock';
  if (available <= lowThreshold) return 'low_stock';
  return 'in_stock';
}

/** Cart/order line id: product id or "productId:variantId". */
export function lineId(productId: string, variantId?: string | null): string {
  return variantId ? `${productId}:${variantId}` : productId;
}

export function parseLineId(id: string): { productId: string; variantId?: string } {
  const [productId, variantId] = id.split(':');
  return variantId ? { productId: productId!, variantId } : { productId: productId! };
}
