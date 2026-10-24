import { useSettings } from '@vero/api-client';
import { useEffect } from 'react';

function setMeta(name: string, content: string | null) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (content === null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

function setCanonical() {
  const el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (el) el.href = `${window.location.origin}${window.location.pathname}`;
}

export interface DocumentMeta {
  /** Page title without the store suffix ("Drills"). `undefined` = still loading (nothing is changed). */
  title?: string | null;
  description?: string | null;
  /** Private / transactional pages (account, cart, checkout…) */
  noindex?: boolean;
  /** Use the title as is (home page SEO title already contains the store name). */
  raw?: boolean;
}

/**
 * Client-side <title> / meta description per page. The production server injects the same tags
 * (plus canonical, hreflang, Open Graph, JSON-LD) for the first request of every URL.
 */
export function useDocumentMeta({ title, description, noindex = false, raw = false }: DocumentMeta): void {
  const settings = useSettings();
  const siteName = settings.data?.store.name || 'OCKEAN';
  const fallbackDescription = settings.data?.seo.description ?? null;

  useEffect(() => {
    if (title === undefined) return;
    const suffix = ` | ${siteName}`;
    // admin-entered SEO titles often already end with the store name
    const hasSuffix = !!title && title.toLocaleLowerCase().endsWith(suffix.toLocaleLowerCase());
    const full = !title ? (settings.data?.seo.title ?? siteName) : raw || hasSuffix ? title : `${title}${suffix}`;
    document.title = full;
    const desc = description ?? fallbackDescription;
    if (desc) setMeta('description', desc.replace(/\s+/g, ' ').trim().slice(0, 300));
    setMeta('robots', noindex ? 'noindex, follow' : null);
    setCanonical();
  }, [title, description, noindex, raw, siteName, fallbackDescription, settings.data?.seo.title]);
}
