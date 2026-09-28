import { LIMITS, STORAGE_KEYS } from '@vero/config';
import { create } from 'zustand';
import { kv, MOBILE_KEYS } from './storage';

interface ListState {
  items: string[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  push: (value: string) => void;
  remove: (value: string) => void;
  clear: () => void;
}

/** Small AsyncStorage-backed list (per-device conveniences only). */
function createListStore(key: string, max: number, caseInsensitive: boolean) {
  return create<ListState>((set, get) => {
    const persist = (items: string[]) => void kv.setJson(key, items);
    return {
      items: [],
      hydrated: false,
      hydrate: async () => {
        if (get().hydrated) return;
        const stored = await kv.getJson<unknown>(key, []);
        const items = Array.isArray(stored)
          ? stored.filter((x): x is string => typeof x === 'string').slice(0, max)
          : [];
        set({ items, hydrated: true });
      },
      push: (value) => {
        const v = value.trim();
        if (!v) return;
        const same = (x: string) => (caseInsensitive ? x.toLowerCase() === v.toLowerCase() : x === v);
        const items = [v, ...get().items.filter((x) => !same(x))].slice(0, max);
        set({ items });
        persist(items);
      },
      remove: (value) => {
        const items = get().items.filter((x) => x !== value);
        set({ items });
        persist(items);
      },
      clear: () => {
        set({ items: [] });
        persist([]);
      },
    };
  });
}

export const useRecentSearches = createListStore(
  STORAGE_KEYS.recentSearches,
  Math.min(10, LIMITS.searchHistoryMax),
  true,
);
/** product ids, newest first */
export const useRecentlyViewed = createListStore(MOBILE_KEYS.recentlyViewed, 16, false);
