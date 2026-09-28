import { isApiError } from '@vero/api-client';
import { QueryClient } from '@tanstack/react-query';

/**
 * Retries network / 5xx failures twice; never retries 4xx (not found, validation, permissions).
 * Staff data changes all the time (other operators, the storefront) — refetch when the tab regains focus;
 * orders, stock and reviews additionally arrive over Socket.IO.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: true,
      retry: (count, error) => {
        if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
        return count < 2;
      },
    },
    mutations: { retry: false },
  },
});
