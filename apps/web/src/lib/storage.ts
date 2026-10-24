/**
 * Browser storage helpers. Every access is guarded: storage can be unavailable (private mode,
 * blocked cookies, quota) and the storefront must keep working without it.
 * Never store tokens here — the refresh token lives in an httpOnly cookie, the access token in memory.
 */
type Area = 'local' | 'session';

function area(kind: Area): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readString(key: string, kind: Area = 'local'): string | null {
  try {
    return area(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeString(key: string, value: string | null, kind: Area = 'local'): void {
  try {
    const s = area(kind);
    if (!s) return;
    if (value === null) s.removeItem(key);
    else s.setItem(key, value);
  } catch {
    /* quota exceeded / blocked — ignore */
  }
}

export function readJson<T>(key: string, fallback: T, kind: Area = 'local'): T {
  const raw = readString(key, kind);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown, kind: Area = 'local'): void {
  writeString(key, value === undefined ? null : JSON.stringify(value), kind);
}

/** App-specific keys (the shared ones live in STORAGE_KEYS from @vero/config). */
export const WEB_KEYS = {
  recentlyViewed: 'ot.recentlyViewed',
  listingView: 'ot.listingView',
  checkout: 'ot.checkout',
} as const;
