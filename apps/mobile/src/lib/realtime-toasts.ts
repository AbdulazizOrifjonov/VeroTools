/**
 * De-duplication of realtime banners: an order change arrives as an order event *and* a notification, and
 * changes made on this device already have their own feedback (success screen, "order cancelled").
 */
const TTL_MS = 15_000;
const recent = new Map<string, number>();

function prune(now: number) {
  for (const [key, at] of recent) if (now - at > TTL_MS) recent.delete(key);
}

/** True when `key` was shown (or suppressed) during the last 15 s; otherwise records it. */
export function seenRecently(key: string): boolean {
  const now = Date.now();
  prune(now);
  if (recent.has(key)) return true;
  recent.set(key, now);
  return false;
}

/** Skip the realtime banner for `key` for the next 15 s (e.g. `order:<id>:CANCELLED`, `type:ORDER_CREATED`). */
export function suppressRealtimeToast(key: string): void {
  recent.set(key, Date.now());
}

export function isSuppressed(key: string): boolean {
  prune(Date.now());
  return recent.has(key);
}
