import { EventEmitter } from 'node:events';
import type { Types } from 'mongoose';
import type { OrderStatus } from '@vero/types';
import { logger } from '../config/logger';

/** Domain events (in-process). Handlers must never throw into the emitter. */
export interface DomainEvents {
  'order.created': { orderId: Types.ObjectId; origin?: string | null };
  'order.status_changed': { orderId: Types.ObjectId; from: OrderStatus; to: OrderStatus; byStaff: boolean; origin?: string | null };
  'payment.paid': { orderId: Types.ObjectId; paymentId: Types.ObjectId };
  'payment.failed': { orderId: Types.ObjectId; paymentId: Types.ObjectId };
  'product.price_dropped': { productId: Types.ObjectId; oldPrice: number; newPrice: number };
  'product.back_in_stock': { productId: Types.ObjectId };
  'inventory.low_stock': { productId: Types.ObjectId; sku: string; available: number; minStock: number };
  'review.created': { reviewId: Types.ObjectId };
  'review.moderated': { reviewId: Types.ObjectId; approved: boolean; replied: boolean };
  'question.answered': { questionId: Types.ObjectId };
  'contact.created': { messageId: Types.ObjectId };
  'user.registered': { userId: Types.ObjectId };
}

class TypedBus {
  private emitter = new EventEmitter({ captureRejections: true });
  private inFlight = new Set<Promise<void>>();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  on<K extends keyof DomainEvents>(event: K, handler: (payload: DomainEvents[K]) => void | Promise<void>) {
    this.emitter.on(event, (payload: DomainEvents[K]) => {
      const run = Promise.resolve()
        .then(() => handler(payload))
        .catch((err) => logger.error({ err, event }, 'domain event handler failed'))
        .finally(() => this.inFlight.delete(run));
      this.inFlight.add(run);
    });
  }

  /** Resolves once every running handler (including ones they trigger) has finished — used by seeding and tests. */
  async drain(): Promise<void> {
    while (this.inFlight.size) await Promise.allSettled([...this.inFlight]);
  }

  emit<K extends keyof DomainEvents>(event: K, payload: DomainEvents[K]) {
    this.emitter.emit(event, payload);
  }
}

export const events = new TypedBus();
