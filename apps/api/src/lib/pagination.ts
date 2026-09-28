import type { PageMeta } from '@vero/types';

export interface PageInput {
  page?: number;
  limit?: number;
}

export function pageParams(input: PageInput, defaults = { limit: 20, max: 100 }) {
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const limit = Math.min(defaults.max, Math.max(1, Math.floor(input.limit ?? defaults.limit)));
  return { page, limit, skip: (page - 1) * limit };
}

export function pageMeta(page: number, limit: number, total: number): PageMeta {
  return { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) };
}

/** "-createdAt" → { createdAt: -1 } restricted to an allow-list. */
export function sortSpec(sort: string | undefined, allowed: readonly string[], fallback: Record<string, 1 | -1>) {
  if (!sort) return fallback;
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  if (!allowed.includes(field)) return fallback;
  return { [field]: desc ? -1 : 1, _id: -1 } as Record<string, 1 | -1>;
}
