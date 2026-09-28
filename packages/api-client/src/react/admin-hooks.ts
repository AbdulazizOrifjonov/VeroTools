import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import type { AdminListParams, Paginated } from '@vero/types';
import { qk, type AdminResource } from './keys';
import { useApi, type VeroApi } from './context';

/**
 * Generic admin data hooks. Every admin query lives under ['admin', resource, ...] so mutations can
 * invalidate a whole resource with `invalidate: ['products']`.
 *
 *   const list = useAdminList('products', (api, p) => api.admin.products.list(p), params);
 *   const save = useAdminMutation((api, v: ProductInput) => api.admin.products.create(v), { invalidate: ['products', 'inventory'] });
 */
export function useAdminList<T>(
  resource: AdminResource,
  fetcher: (api: VeroApi, params: AdminListParams) => Promise<Paginated<T>>,
  params: AdminListParams = {},
  options: { enabled?: boolean; refetchInterval?: number } = {},
) {
  const api = useApi();
  return useQuery({
    queryKey: qk.admin.list(resource, params),
    queryFn: () => fetcher(api, params),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
    refetchInterval: options.refetchInterval,
  });
}

export function useAdminQuery<T>(
  key: [AdminResource, ...unknown[]],
  fetcher: (api: VeroApi) => Promise<T>,
  options: { enabled?: boolean; staleTime?: number; refetchInterval?: number } = {},
) {
  const api = useApi();
  return useQuery({
    queryKey: ['admin', ...key] as QueryKey,
    queryFn: () => fetcher(api),
    enabled: options.enabled ?? true,
    staleTime: options.staleTime ?? 15_000,
    refetchInterval: options.refetchInterval,
  });
}

export function useAdminItem<T>(
  resource: AdminResource,
  id: string | undefined,
  fetcher: (api: VeroApi, id: string) => Promise<T>,
) {
  const api = useApi();
  return useQuery({
    queryKey: qk.admin.item(resource, id ?? ''),
    queryFn: () => fetcher(api, id!),
    enabled: !!id,
  });
}

export function useAdminMutation<TVars, TResult>(
  fn: (api: VeroApi, vars: TVars) => Promise<TResult>,
  options: { invalidate?: AdminResource[]; onSuccess?: (result: TResult, vars: TVars) => void } = {},
) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: TVars) => fn(api, vars),
    onSuccess: async (result, vars) => {
      const resources = new Set<AdminResource>([...(options.invalidate ?? []), 'dashboard']);
      await Promise.all(
        [...resources].map((r) => qc.invalidateQueries({ queryKey: qk.admin.resource(r) })),
      );
      options.onSuccess?.(result, vars);
    },
  });
}

/** Saves a Blob returned by api.client.download() in the browser. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
