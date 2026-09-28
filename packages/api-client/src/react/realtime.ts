import { useEffect, useRef, useState } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { SOCKET_EVENTS, type SyncEntity } from '@vero/config';
import type { NotificationDTO } from '@vero/types';
import { qk } from './keys';
import { useApi, useSession } from './context';

export interface SyncEvent {
  entity: SyncEntity;
  id?: string;
  /** X-Client-Instance of the request that caused the change */
  origin?: string;
}

export interface OrderUpdatedEvent {
  orderId: string;
  number: string;
  status: string;
  origin?: string;
}

export interface AdminOrderEvent {
  orderId: string;
  number: string;
  total: number;
  status: string;
  customerName?: string;
}

export interface RealtimeOptions {
  /** Socket.IO server origin, e.g. "" (same origin) or "https://api.verotools.uz" */
  url: string;
  path?: string;
  enabled?: boolean;
  /** also join the admin room (requires staff permissions server-side) */
  admin?: boolean;
  onNotification?: (n: NotificationDTO) => void;
  onOrderUpdated?: (e: OrderUpdatedEvent) => void;
  onAdminOrder?: (e: AdminOrderEvent, kind: 'new' | 'updated') => void;
  onAdminEvent?: (event: string, payload: unknown) => void;
}

function invalidateEntity(qc: QueryClient, entity: SyncEntity) {
  const keys: ReadonlyArray<readonly unknown[]> =
    entity === 'cart'
      ? [qk.cartAll(), qk.engagement(), ['session', 'quote']]
      : entity === 'wishlist'
        ? [qk.wishlistAll(), qk.engagement()]
        : entity === 'compare'
          ? [qk.compareAll(), qk.engagement()]
          : entity === 'orders'
            ? [qk.ordersAll(), qk.orderAll()]
            : entity === 'notifications'
              ? [qk.notificationsAll(), qk.unread(), qk.engagement()]
              : entity === 'profile'
                ? [qk.me()]
                : entity === 'addresses'
                  ? [qk.addresses()]
                  : [['session', 'myReviews']];
  keys.forEach((queryKey) => void qc.invalidateQueries({ queryKey }));
}

/**
 * Keeps this device in sync with every other device of the same account (and with the admin panel)
 * through Socket.IO. Reconnects automatically when the access token changes (login / refresh / logout).
 */
export function useRealtimeSync(options: RealtimeOptions): { connected: boolean } {
  const api = useApi();
  const qc = useQueryClient();
  const { status } = useSession();
  const [connected, setConnected] = useState(false);
  const optsRef = useRef(options);
  optsRef.current = options;
  const enabled = (options.enabled ?? true) && status !== 'unknown';

  useEffect(() => {
    if (!enabled) return;
    let socket: Socket | null = null;
    let disposed = false;

    const connect = async () => {
      const guestId = api.client.config.getGuestId ? await api.client.config.getGuestId() : null;
      if (disposed) return;
      socket = io(optsRef.current.url || undefined, {
        path: optsRef.current.path ?? '/socket.io',
        transports: ['websocket', 'polling'],
        withCredentials: true,
        auth: (cb) => cb({ token: api.client.getAccessToken(), guestId, admin: !!optsRef.current.admin }),
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10_000,
      });
      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));
      socket.on(SOCKET_EVENTS.sync, (e: SyncEvent) => {
        if (e.origin && e.origin === api.instanceId) return;
        invalidateEntity(qc, e.entity);
      });
      socket.on(SOCKET_EVENTS.notification, (n: NotificationDTO) => {
        invalidateEntity(qc, 'notifications');
        optsRef.current.onNotification?.(n);
      });
      socket.on(SOCKET_EVENTS.orderUpdated, (e: OrderUpdatedEvent) => {
        invalidateEntity(qc, 'orders');
        if (e.origin !== api.instanceId) optsRef.current.onOrderUpdated?.(e);
      });
      socket.on(SOCKET_EVENTS.adminOrderNew, (e: AdminOrderEvent) => {
        void qc.invalidateQueries({ queryKey: qk.admin.resource('orders') });
        void qc.invalidateQueries({ queryKey: qk.admin.resource('dashboard') });
        void qc.invalidateQueries({ queryKey: qk.admin.resource('inventory') });
        optsRef.current.onAdminOrder?.(e, 'new');
      });
      socket.on(SOCKET_EVENTS.adminOrderUpdated, (e: AdminOrderEvent) => {
        void qc.invalidateQueries({ queryKey: qk.admin.resource('orders') });
        void qc.invalidateQueries({ queryKey: qk.admin.resource('dashboard') });
        optsRef.current.onAdminOrder?.(e, 'updated');
      });
      for (const ev of [SOCKET_EVENTS.adminStockLow, SOCKET_EVENTS.adminReviewNew]) {
        socket.on(ev, (payload: unknown) => {
          void qc.invalidateQueries({ queryKey: qk.admin.resource(ev === SOCKET_EVENTS.adminStockLow ? 'inventory' : 'reviews') });
          optsRef.current.onAdminEvent?.(ev, payload);
        });
      }
    };

    void connect();
    const off = api.client.onTokenChange(() => {
      if (!socket) return;
      socket.disconnect();
      socket.connect();
    });

    return () => {
      disposed = true;
      off();
      socket?.removeAllListeners();
      socket?.disconnect();
      setConnected(false);
    };
  }, [api, qc, enabled]);

  return { connected };
}
