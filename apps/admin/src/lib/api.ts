import { createVeroApi } from '@vero/api-client';
import { toast } from '@vero/ui';
import { i18n } from './i18n';
import { getCurrentLanguage } from './language';

/**
 * The one API client of the admin panel. Same-origin `/api` (Vite proxy in development, the Node server in
 * production). The refresh token is the httpOnly `vt_art` cookie; the access token only lives in memory.
 */
export const api = createVeroApi({
  baseUrl: '/api',
  client: 'admin',
  credentials: 'include',
  getLanguage: getCurrentLanguage,
  onSessionExpired: () => {
    toast.warning(i18n.t('common:status.sessionExpired'));
  },
});

/**
 * Restores the session (refresh cookie → access token) exactly once on start. Module scope on purpose:
 * refresh tokens rotate, so two concurrent refreshes (e.g. StrictMode double effects) would log the user out.
 */
export const sessionReady = api.client.bootstrap();
