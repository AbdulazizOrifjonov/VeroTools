import { isApiError } from '@vero/api-client';
import { QueryClient } from '@tanstack/react-query';

/** Retries network / 5xx failures twice; never retries 4xx (not found, validation, auth). */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: (count, error) => {
        if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
        return count < 2;
      },
    },
    mutations: { retry: false },
  },
});

// Account data (cart, wishlist, orders, notifications…) is pushed over Socket.IO; refreshing it when the
// tab regains focus is a cheap safety net for dropped connections.
queryClient.setQueryDefaults(['session'], { refetchOnWindowFocus: true });
