import { createVeroApi, resetSessionQueries } from '@vero/api-client';
import { STORAGE_KEYS } from '@vero/config';
import { API_URL } from '../config/env';
import { getGuestId } from './guest';
import { currentLanguage, i18n } from './i18n';
import { queryClient } from './query';
import { secure } from './storage';
import { toast } from './toast';

/**
 * The one API client of the app. The refresh token is returned to native clients (X-Client: mobile)
 * and kept in expo-secure-store; the access token only lives in memory.
 */
export const api = createVeroApi({
  baseUrl: API_URL,
  client: 'mobile',
  getLanguage: currentLanguage,
  getGuestId,
  tokens: {
    getRefreshToken: () => secure.get(STORAGE_KEYS.refreshToken),
    setRefreshToken: (token) => secure.set(STORAGE_KEYS.refreshToken, token),
  },
  onSessionExpired: () => {
    // the refresh token was rejected (password changed, signed out elsewhere): continue as a guest
    toast.warning(i18n.t('common:status.sessionExpired'));
    void resetSessionQueries(queryClient);
  },
  timeoutMs: 20_000,
});
