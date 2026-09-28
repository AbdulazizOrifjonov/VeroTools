import { STORE_ROUTES } from '@vero/config';

/** Static information pages (content managed in the admin panel). Labels are i18n keys. */
export const INFO_LINKS = [
  { to: STORE_ROUTES.page('about'), label: 'common:nav.about' },
  { to: STORE_ROUTES.page('delivery'), label: 'common:nav.delivery' },
  { to: STORE_ROUTES.page('payment'), label: 'common:nav.payment' },
  { to: STORE_ROUTES.page('warranty'), label: 'common:nav.warranty' },
  { to: STORE_ROUTES.page('returns'), label: 'common:nav.returns' },
  { to: STORE_ROUTES.contacts, label: 'common:nav.contact' },
  { to: STORE_ROUTES.faq, label: 'common:nav.faq' },
] as const;

export const LEGAL_LINKS = [
  { to: STORE_ROUTES.page('privacy'), label: 'common:nav.privacy' },
  { to: STORE_ROUTES.page('terms'), label: 'common:nav.terms' },
] as const;

export const CONTENT_PAGE_SLUGS = ['about', 'delivery', 'warranty', 'returns', 'payment', 'privacy', 'terms'] as const;
export type ContentPageSlug = (typeof CONTENT_PAGE_SLUGS)[number];
