import * as React from 'react';

/**
 * Subscribes to a CSS media query: `useMediaQuery('(min-width: 1024px)')`.
 * Returns `defaultValue` during SSR / when matchMedia is unavailable.
 */
export function useMediaQuery(query: string, defaultValue = false): boolean {
  const subscribe = React.useCallback(
    (callback: () => void) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    },
    [query],
  );

  const getSnapshot = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : defaultValue;

  return React.useSyncExternalStore(subscribe, getSnapshot, () => defaultValue);
}
