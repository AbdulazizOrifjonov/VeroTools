/**
 * Safe localStorage access for small UI preferences (language, sidebar state, table columns).
 * Never used for credentials: the refresh token is an httpOnly cookie, the access token lives in memory.
 */
export function readString(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeString(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode / quota) — preference stays in memory */
  }
}

export function readJson<T>(key: string, fallback: T): T {
  const raw = readString(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  writeString(key, JSON.stringify(value));
}

export const ADMIN_STORAGE = {
  language: 'vt.admin.language',
  sidebarCollapsed: 'vt.admin.sidebar',
  columns: (tableId: string) => `vt.admin.columns.${tableId}`,
  mediaView: 'vt.admin.media.view',
} as const;
