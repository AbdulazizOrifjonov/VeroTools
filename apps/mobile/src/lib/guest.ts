import { STORAGE_KEYS } from '@vero/config';
import { uuid } from '@vero/utils';
import { kv } from './storage';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let cached: string | null = null;
let loading: Promise<string> | null = null;

/**
 * Anonymous device id (uuid v4, X-Guest-Id) for the guest cart / wishlist / compare.
 * Persisted in AsyncStorage; after sign-in the API merges the guest data into the account.
 */
export function getGuestId(): Promise<string> | string {
  if (cached) return cached;
  if (!loading) {
    loading = (async () => {
      const stored = await kv.get(STORAGE_KEYS.guestId);
      if (stored && UUID_RE.test(stored)) {
        cached = stored;
        return stored;
      }
      let id = uuid();
      while (!UUID_RE.test(id)) id = uuid();
      cached = id;
      await kv.set(STORAGE_KEYS.guestId, id);
      return id;
    })();
  }
  return loading;
}
