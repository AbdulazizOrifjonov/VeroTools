import { STORAGE_KEYS } from '@vero/config';
import { uuid } from '@vero/utils';
import { readString, writeString } from './storage';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let cached: string | null = null;

/**
 * Anonymous visitor id (uuid v4) used for the guest cart / wishlist / compare (X-Guest-Id).
 * It is persisted per device; after sign-in the API merges the guest data into the account.
 */
export function getGuestId(): string {
  if (cached) return cached;
  const stored = readString(STORAGE_KEYS.guestId);
  if (stored && UUID_RE.test(stored)) {
    cached = stored;
    return stored;
  }
  let id = uuid();
  if (!UUID_RE.test(id)) id = uuid();
  cached = id;
  writeString(STORAGE_KEYS.guestId, id);
  return id;
}
