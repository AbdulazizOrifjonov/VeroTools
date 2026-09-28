import { createVeroApi } from '@vero/api-client';
import { toast } from '@vero/ui';
import { getGuestId } from './guest';
import { i18n } from './i18n';
import { getCurrentLanguage } from './language';

/**
 * The one API client of the storefront. Same-origin `/api` (Vite proxy in development, the Node server
 * in production). The refresh token is an httpOnly cookie; the access token only lives in memory.
 */
export const api = createVeroApi({
  baseUrl: '/api',
  client: 'web',
  credentials: 'include',
  getLanguage: getCurrentLanguage,
  getGuestId,
  onSessionExpired: () => {
    toast.warning(i18n.t('common:status.sessionExpired'));
  },
});

/** Restores the session (refresh cookie → access token) once on start. Never rejects. */
export const sessionReady = api.client.bootstrap();
