/**
 * De-duplication of realtime toasts: an order change arrives as an order event *and* a notification, and
 * changes made by the customer in this tab already have their own feedback (success page, "order cancelled").
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

/** True while `key` is suppressed / recently shown (does not record anything). */
export function isSuppressed(key: string): boolean {
  prune(Date.now());
  return recent.has(key);
}

/** Skip the realtime toast for `key` for the next 15 s (e.g. `order:<id>:CANCELLED`, `type:ORDER_CREATED`). */
export function suppressRealtimeToast(key: string): void {
  recent.set(key, Date.now());
}
