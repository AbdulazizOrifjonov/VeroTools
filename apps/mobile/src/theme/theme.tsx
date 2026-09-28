import { darkColors, lightColors, radius, spacing, type ThemeColors } from '@vero/config';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { usePrefs } from '../lib/prefs';

export interface AppColors extends ThemeColors {
  /** light grey sweep behind product photos (same in both themes, photos are shot on it) */
  imageWell: string;
  /** brand-coloured text / icons with enough contrast on the background */
  link: string;
  /** skeleton shimmer base / highlight */
  skeleton: string;
  skeletonHighlight: string;
  /** inactive tab icon / label */
  tabInactive: string;
  /** hairline divider */
  hairline: string;
  /** pressed state overlay */
  pressed: string;
  /** surface of sheets / cards */
  card: string;
  /** soft neutral fill (chips, steppers) */
  fill: string;
  /** discount badge fill */
  sale: string;
}

export interface Theme {
  dark: boolean;
  colors: AppColors;
  radius: typeof radius;
  spacing: typeof spacing;
}

export const lightTheme: Theme = {
  dark: false,
  colors: {
    ...lightColors,
    imageWell: '#EFEFEF',
    link: lightColors.primary,
    skeleton: '#EEEEF1',
    skeletonHighlight: '#F7F7F9',
    tabInactive: '#7A7A84',
    hairline: lightColors.border,
    pressed: 'rgba(20,20,22,0.06)',
    card: '#FFFFFF',
    fill: '#F2F2F4',
    sale: '#DC2626',
  },
  radius,
  spacing,
};

export const darkTheme: Theme = {
  dark: true,
  colors: {
    ...darkColors,
    imageWell: '#E9E9EA',
    link: darkColors.brand,
    skeleton: '#1C1C20',
    skeletonHighlight: '#26262B',
    tabInactive: '#8E8E98',
    hairline: darkColors.border,
    pressed: 'rgba(255,255,255,0.08)',
    card: darkColors.surface,
    fill: '#1E1E22',
    sale: '#DC2626',
  },
  radius,
  spacing,
};

const ThemeContext = createContext<Theme>(lightTheme);

/** Resolves the theme preference (light / dark / system) and keeps the native root background in sync. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = usePrefs((s) => s.theme);
  const system = useColorScheme();
  const dark = preference === 'dark' || (preference === 'system' && system === 'dark');
  const theme = dark ? darkTheme : lightTheme;

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.colors.background).catch(() => undefined);
  }, [theme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

export function useColors(): AppColors {
  return useContext(ThemeContext).colors;
}

/**
 * Themed StyleSheet factory. Styles are created once per theme object (light / dark) and cached.
 *   const useStyles = makeStyles((t) => ({ root: { backgroundColor: t.colors.background } }));
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: Theme) => T): () => T {
  const cache = new WeakMap<Theme, T>();
  return function useStyles(): T {
    const theme = useTheme();
    return useMemo(() => {
      let styles = cache.get(theme);
      if (!styles) {
        styles = StyleSheet.create(factory(theme)) as T;
        cache.set(theme, styles);
      }
      return styles;
    }, [theme]);
  };
}

export const hairline = StyleSheet.hairlineWidth;
