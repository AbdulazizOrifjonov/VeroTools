import { LIMITS, STORAGE_KEYS } from '@vero/config';
import { useSyncExternalStore } from 'react';
import { readJson, WEB_KEYS, writeJson } from './storage';

/** Small localStorage-backed list with change notifications (per-device conveniences only). */
function createListStore(key: string, max: number) {
  const listeners = new Set<() => void>();
  let snapshot: string[] = readJson<string[]>(key, []).filter((x) => typeof x === 'string').slice(0, max);

  const emit = () => listeners.forEach((l) => l());
  const set = (next: string[]) => {
    snapshot = next.slice(0, max);
    writeJson(key, snapshot);
    emit();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== key) return;
      snapshot = readJson<string[]>(key, []).slice(0, max);
      emit();
    });
  }

  return {
    get: () => snapshot,
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    push: (value: string) => {
      const v = value.trim();
      if (!v) return;
      set([v, ...snapshot.filter((x) => x.toLowerCase() !== v.toLowerCase())]);
    },
    remove: (value: string) => set(snapshot.filter((x) => x !== value)),
    clear: () => set([]),
  };
}

export const recentSearches = createListStore(STORAGE_KEYS.recentSearches, Math.min(8, LIMITS.searchHistoryMax));
export const recentlyViewed = createListStore(WEB_KEYS.recentlyViewed, 16);

export function useRecentSearches(): string[] {
  return useSyncExternalStore(recentSearches.subscribe, recentSearches.get, () => []);
}

export function useRecentlyViewed(): string[] {
  return useSyncExternalStore(recentlyViewed.subscribe, recentlyViewed.get, () => []);
}
