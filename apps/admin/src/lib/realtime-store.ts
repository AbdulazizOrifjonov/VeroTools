import { create } from 'zustand';

export type LiveEventKind = 'order_new' | 'order_updated' | 'stock_low' | 'review_new';

export interface LiveEvent {
  id: string;
  kind: LiveEventKind;
  at: number;
  /** order events */
  orderId?: string;
  number?: string;
  total?: number;
  status?: string;
  customerName?: string;
  /** stock events */
  productId?: string;
  sku?: string;
  available?: number;
  /** review events */
  reviewId?: string;
  rating?: number;
}

interface LiveState {
  connected: boolean;
  events: LiveEvent[];
  lastSeenAt: number;
  setConnected: (connected: boolean) => void;
  push: (event: Omit<LiveEvent, 'id' | 'at'>) => void;
  markAllSeen: () => void;
  clear: () => void;
}

const MAX_EVENTS = 50;
let seq = 0;

/**
 * Last realtime events received from the admin Socket.IO room (new orders, status changes, low stock,
 * new reviews). Kept in memory for the notification bell — they are not stored by the API.
 */
export const useLiveStore = create<LiveState>((set) => ({
  connected: false,
  events: [],
  lastSeenAt: Date.now(),
  setConnected: (connected) => set({ connected }),
  push: (event) =>
    set((s) => {
      const at = Date.now();
      seq += 1;
      // collapse repeated updates of the same order into the latest one
      const rest =
        event.kind === 'order_updated' && event.orderId
          ? s.events.filter((e) => !(e.kind === 'order_updated' && e.orderId === event.orderId))
          : s.events;
      return { events: [{ ...event, id: `${at}-${seq}`, at }, ...rest].slice(0, MAX_EVENTS) };
    }),
  markAllSeen: () => set({ lastSeenAt: Date.now() }),
  clear: () => set({ events: [], lastSeenAt: Date.now() }),
}));

export function useUnseenCount(): number {
  return useLiveStore((s) => s.events.filter((e) => e.at > s.lastSeenAt).length);
}
