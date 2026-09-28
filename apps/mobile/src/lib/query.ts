import NetInfo from '@react-native-community/netinfo';
import { isApiError } from '@vero/api-client';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform, type AppStateStatus } from 'react-native';

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error)) {
    // client errors (404, 401, validation …) are final; network / 5xx get two more attempts
    if (error.status >= 400 && error.status < 500) return false;
  }
  return failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      // fail fast when offline so screens can show the offline state with "Try again"
      networkMode: 'always',
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
      staleTime: 30_000,
      gcTime: 10 * 60_000,
    },
    mutations: { networkMode: 'always', retry: false },
  },
});

let wired = false;

/** React Query ↔ React Native: refetch on foreground (AppState) and on reconnect (NetInfo). */
export function wireQueryEnvironment(): () => void {
  if (wired) return () => undefined;
  wired = true;
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    }),
  );
  let sub: { remove: () => void } | null = null;
  if (Platform.OS !== 'web') {
    sub = AppState.addEventListener('change', (status: AppStateStatus) =>
      focusManager.setFocused(status === 'active'),
    );
  }
  return () => {
    wired = false;
    sub?.remove();
  };
}
