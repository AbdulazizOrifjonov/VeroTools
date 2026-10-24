/**
 * @vero/ui — OCKEAN design system (React 19 + Tailwind CSS v4 + Radix).
 * Styles: `@import "@vero/ui/styles.css";` in the app's root stylesheet.
 */

// utilities
export { clamp, cn, mergeRefs, useMergedRefs } from './lib/utils';
export {
  formatAmount,
  formatDiscount,
  formatPrice,
  getDiscountPercent,
  MINUS,
  NBSP,
  THIN_NBSP,
} from './lib/format';

// hooks
export { useDebouncedValue } from './hooks/use-debounced-value';
export { MOBILE_MEDIA_QUERY, useIsMobile } from './hooks/use-is-mobile';
export { useMediaQuery } from './hooks/use-media-query';

// theme & brand
export {
  ThemeProvider,
  useTheme,
  type ThemeContextValue,
  type ThemeProviderProps,
} from './theme/theme-provider';
export {
  createThemeInitScript,
  THEME_STORAGE_KEY,
  themeInitScript,
  type ResolvedTheme,
  type ThemePreference,
  type ThemeScriptOptions,
} from './theme/theme-script';
export { Logo, LogoWordmark, type LogoProps, type LogoWordmarkProps } from './brand/logo';

// components
export * from './components/accordion';
export * from './components/alert';
export * from './components/alert-dialog';
export * from './components/avatar';
export * from './components/badge';
export * from './components/breadcrumb';
export * from './components/button';
export * from './components/calendar';
export * from './components/card';
export * from './components/checkbox';
export * from './components/collapsible';
export * from './components/date-range-picker';
export * from './components/dialog';
export * from './components/drawer';
export * from './components/dropdown-menu';
export * from './components/empty-state';
export * from './components/form';
export * from './components/input';
export * from './components/label';
export * from './components/native-select';
export * from './components/pagination';
export * from './components/phone-input';
export * from './components/popover';
export * from './components/price';
export * from './components/progress';
export * from './components/quantity-stepper';
export * from './components/radio-group';
export * from './components/rating';
export * from './components/scroll-area';
export * from './components/select';
export * from './components/separator';
export * from './components/sheet';
export * from './components/skeleton';
export * from './components/slider';
export * from './components/sonner';
export * from './components/spinner';
export * from './components/steps';
export * from './components/switch';
export * from './components/table';
export * from './components/tabs';
export * from './components/textarea';
export * from './components/toggle';
export * from './components/toggle-group';
export * from './components/tooltip';
