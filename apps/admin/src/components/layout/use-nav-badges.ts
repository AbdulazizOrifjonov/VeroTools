import { useAdminList, useSession } from '@vero/api-client';
import type { NavBadgeKey } from '../../app/nav';

const MINUTE = 60_000;

/**
 * Live counters for the sidebar (pending orders, reviews awaiting moderation, new messages). Each one is
 * the `meta.total` of a one-row list request, so it needs only the permission of that list; order and
 * review counters also refresh on realtime events (the queries live under ['admin', resource]).
 */
export function useNavBadges(): Partial<Record<NavBadgeKey, number>> {
  const { can } = useSession();
  const orders = useAdminList('orders', (api, p) => api.admin.orders.list(p), { status: 'PENDING', limit: 1 }, { enabled: can('orders.read'), refetchInterval: 2 * MINUTE });
  const reviews = useAdminList('reviews', (api, p) => api.admin.reviews.list(p), { status: 'PENDING', limit: 1 }, { enabled: can('reviews.read'), refetchInterval: 5 * MINUTE });
  const messages = useAdminList('messages', (api, p) => api.admin.messages.list(p), { status: 'NEW', limit: 1 }, { enabled: can('content.read'), refetchInterval: 5 * MINUTE });
  return {
    pendingOrders: orders.data?.meta.total,
    pendingReviews: reviews.data?.meta.total,
    newMessages: messages.data?.meta.total,
  };
}
