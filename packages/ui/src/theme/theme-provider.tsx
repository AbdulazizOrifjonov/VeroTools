import * as React from 'react';

import { THEME_STORAGE_KEY, type ResolvedTheme, type ThemePreference } from './theme-script';

export interface ThemeContextValue {
  /** What the user chose. */
  preference: ThemePreference;
  /** What is actually applied (system preference resolved). */
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

/** @internal — prefer `useTheme()`. Null when no <ThemeProvider> is mounted. */
export const ThemeContext = React.createContext<ThemeContextValue | null>(null);

const DARK_QUERY = '(prefers-color-scheme: dark)';

function isPreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

function readStoredPreference(storageKey: string): ThemePreference | null {
  try {
    const value = window.localStorage.getItem(storageKey);
    return isPreference(value) ? value : null;
  } catch {
    return null;
  }
}

function writeStoredPreference(storageKey: string, value: ThemePreference): void {
  try {
    window.localStorage.setItem(storageKey, value);
  } catch {
    /* storage unavailable (private mode / blocked) — keep in-memory preference */
  }
}

function subscribeSystemTheme(callback: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const mql = window.matchMedia(DARK_QUERY);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getSystemIsDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(DARK_QUERY).matches;
}

/** Temporarily disables CSS transitions so colours switch instantly instead of animating. */
function withoutTransitions(apply: () => void): void {
  const style = document.createElement('style');
  style.appendChild(
    document.createTextNode(
      '*,*::before,*::after{-webkit-transition:none!important;transition:none!important}',
    ),
  );
  document.head.appendChild(style);
  apply();
  // force a reflow, then re-enable transitions on the next frame
  void window.getComputedStyle(document.body).opacity;
  window.setTimeout(() => style.remove(), 1);
}

function applyTheme(theme: ResolvedTheme, disableTransitions: boolean): void {
  const root = document.documentElement;
  const apply = () => {
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    root.setAttribute('data-theme', theme);
  };
  const alreadyApplied =
    root.classList.contains('dark') === (theme === 'dark') && root.style.colorScheme === theme;
  if (alreadyApplied) return;
  if (disableTransitions && document.body) withoutTransitions(apply);
  else apply();
}

export interface ThemeProviderProps {
  children?: React.ReactNode;
  /** Used when nothing is stored yet. Default: 'system'. */
  defaultPreference?: ThemePreference;
  /** localStorage key. Default: 'vt.theme' (matches `themeInitScript`). */
  storageKey?: string;
  /** Switch colours without animating every transition. Default: true. */
  disableTransitionOnChange?: boolean;
}

/**
 * Light / dark / system theme. Toggles the `dark` class and `color-scheme` on <html>,
 * persists the preference in localStorage ('vt.theme') and follows the OS when 'system'.
 */
function ThemeProvider({
  children,
  defaultPreference = 'system',
  storageKey = THEME_STORAGE_KEY,
  disableTransitionOnChange = true,
}: ThemeProviderProps) {
  const [preference, setPreferenceState] = React.useState<ThemePreference>(() =>
    typeof window === 'undefined'
      ? defaultPreference
      : (readStoredPreference(storageKey) ?? defaultPreference),
  );
  const systemIsDark = React.useSyncExternalStore(subscribeSystemTheme, getSystemIsDark, () => false);
  const resolvedTheme: ResolvedTheme =
    preference === 'system' ? (systemIsDark ? 'dark' : 'light') : preference;

  React.useLayoutEffect(() => {
    applyTheme(resolvedTheme, disableTransitionOnChange);
  }, [resolvedTheme, disableTransitionOnChange]);

  // keep tabs in sync
  React.useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      setPreferenceState(isPreference(event.newValue) ? event.newValue : defaultPreference);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [storageKey, defaultPreference]);

  const setPreference = React.useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next);
      writeStoredPreference(storageKey, next);
    },
    [storageKey],
  );

  const value = React.useMemo<ThemeContextValue>(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

/** Current theme preference / resolved theme and a setter. Must be used inside <ThemeProvider>. */
function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) throw new Error('useTheme() must be used inside <ThemeProvider>.');
  return context;
}

export { ThemeProvider, useTheme };
export type { ResolvedTheme, ThemePreference };
