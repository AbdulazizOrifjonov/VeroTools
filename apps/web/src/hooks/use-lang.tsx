import { useApiLanguage } from '@vero/api-client';
import { localizedPath, type Language } from '@vero/config';
import { useCallback, type Ref } from 'react';
import { Link, NavLink, useNavigate, type LinkProps, type NavigateOptions, type NavLinkProps } from 'react-router';
import { localizeHref } from '../lib/paths';

/** Current storefront language (derived from the URL prefix, provided by the root layout). */
export function useLang(): Language {
  return useApiLanguage();
}

/** Builds a path in the current language: lp('/cart') → '/ru/cart'. */
export function useLocalePath(): (path: string) => string {
  const lang = useLang();
  return useCallback((path: string) => localizeHref(path, lang), [lang]);
}

/** navigate() that keeps the language prefix. */
export function useLocaleNavigate(): (path: string, options?: NavigateOptions) => void {
  const navigate = useNavigate();
  const lang = useLang();
  return useCallback((path: string, options?: NavigateOptions) => void navigate(localizeHref(path, lang), options), [navigate, lang]);
}

export type LocaleLinkProps = Omit<LinkProps, 'to'> & { to: string; ref?: Ref<HTMLAnchorElement> };

/** <Link> with the language prefix applied to internal paths. */
export function LocaleLink({ to, ...props }: LocaleLinkProps) {
  const lang = useLang();
  return <Link to={localizeHref(to, lang)} {...props} />;
}

export type LocaleNavLinkProps = Omit<NavLinkProps, 'to'> & { to: string; ref?: Ref<HTMLAnchorElement> };

export function LocaleNavLink({ to, ...props }: LocaleNavLinkProps) {
  const lang = useLang();
  return <NavLink to={localizeHref(to, lang)} {...props} />;
}

export { localizedPath };
