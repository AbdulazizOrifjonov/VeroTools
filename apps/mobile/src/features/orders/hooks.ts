import { useApi, useApiLanguage, useSession } from '@vero/api-client';
import { useInfiniteQuery } from '@tanstack/react-query';

export type OrdersStatusFilter = 'active' | 'completed' | 'cancelled' | undefined;

/**
 * Infinite order history. The key lives under ['session', 'orders', …] so sign-out resets it and realtime
 * `orders` sync events (another device, the admin panel) invalidate it together with useOrders().
 */
export function useInfiniteOrders(status: OrdersStatusFilter, limit = 15) {
  const api = useApi();
  const lang = useApiLanguage();
  const { isAuthenticated } = useSession();
  return useInfiniteQuery({
    queryKey: ['session', 'orders', { status: status ?? 'all', limit, infinite: true }, lang],
    queryFn: ({ pageParam }) => api.orders.list({ page: pageParam, limit, status }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.pages ? last.meta.page + 1 : undefined),
    enabled: isAuthenticated,
  });
}

/** Infinite notifications list (same invalidation as useNotifications). */
export function useInfiniteNotifications(unread: boolean, limit = 20) {
  const api = useApi();
  const lang = useApiLanguage();
  const { isAuthenticated } = useSession();
  return useInfiniteQuery({
    queryKey: ['session', 'notifications', { unread, limit, infinite: true }, lang],
    queryFn: ({ pageParam }) =>
      api.notifications.list({ page: pageParam, limit, unread: unread || undefined }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.pages ? last.meta.page + 1 : undefined),
    enabled: isAuthenticated,
  });
}
