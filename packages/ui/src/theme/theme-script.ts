/**
 * Dependency-free theme bootstrap (safe to import from vite.config / server code).
 * Inline `themeInitScript` in <head> *before* the stylesheet so the first paint uses the right theme.
 */

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'vt.theme';

export interface ThemeScriptOptions {
  storageKey?: string;
  defaultPreference?: ThemePreference;
}

/** Builds the inline script. Keep options in sync with <ThemeProvider storageKey / defaultPreference>. */
export function createThemeInitScript({
  storageKey = THEME_STORAGE_KEY,
  defaultPreference = 'system',
}: ThemeScriptOptions = {}): string {
  const key = JSON.stringify(storageKey);
  const fallback = JSON.stringify(defaultPreference);
  return `(function(){var d=document.documentElement,p=${fallback};try{var s=window.localStorage.getItem(${key});if(s==="light"||s==="dark"||s==="system")p=s}catch(e){}var m=false;try{m=window.matchMedia("(prefers-color-scheme: dark)").matches}catch(e){}var t=p==="dark"||(p==="system"&&m)?"dark":"light";d.classList.toggle("dark",t==="dark");d.style.colorScheme=t;d.setAttribute("data-theme",t)})();`;
}

/** Inline script for index.html: `<script>{themeInitScript}</script>` (uses key 'vt.theme', default 'system'). */
export const themeInitScript: string = createThemeInitScript();
