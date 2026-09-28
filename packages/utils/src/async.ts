export function debounce<A extends unknown[]>(fn: (...args: A) => void, wait: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  const debounced = (...args: A) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
  debounced.cancel = () => t && clearTimeout(t);
  return debounced;
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function uniqueBy<T>(items: readonly T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

/** RFC4122 v4 UUID using crypto when available (browser, Node, Hermes with polyfill fallback). */
export function uuid(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
