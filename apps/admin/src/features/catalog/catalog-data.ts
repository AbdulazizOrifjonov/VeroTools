import { useAdminList, useAdminQuery, useSession } from '@vero/api-client';
import type { AdminCategoryNode } from '@vero/types';
import { useMemo } from 'react';
import type { PickerOption } from '../../components/form/pickers';
import { useFormat } from '../../lib/format';

export interface FlatCategory {
  node: AdminCategoryNode;
  depth: number;
  /** ancestors (root first) */
  path: AdminCategoryNode[];
}

export function flattenTree(nodes: AdminCategoryNode[] | undefined, depth = 0, path: AdminCategoryNode[] = []): FlatCategory[] {
  const out: FlatCategory[] = [];
  for (const node of nodes ?? []) {
    out.push({ node, depth, path });
    out.push(...flattenTree(node.children, depth + 1, [...path, node]));
  }
  return out;
}

/** Category tree (admin, with LocalizedText names and product counts). */
export function useCategoryTree(enabled = true) {
  const { can } = useSession();
  return useAdminQuery(['categories', 'tree'], (api) => api.admin.categories.tree(), { enabled: enabled && can('categories.read'), staleTime: 60_000 });
}

/** Category options for pickers: indented tree order, path as a hint. */
export function useCategoryOptions(): { options: PickerOption[]; flat: FlatCategory[]; isLoading: boolean } {
  const f = useFormat();
  const tree = useCategoryTree();
  return useMemo(() => {
    const flat = flattenTree(tree.data);
    return {
      flat,
      isLoading: tree.isLoading,
      options: flat.map(({ node, depth, path }) => ({
        value: node.id,
        label: f.loc(node.name),
        depth,
        hint: path.length ? path.map((p) => f.loc(p.name)).join(' / ') : undefined,
      })),
    };
  }, [tree.data, tree.isLoading, f]);
}

/** Brands for pickers (the API caps a page at 200). */
export function useBrandOptions(): { options: PickerOption[]; isLoading: boolean } {
  const { can } = useSession();
  const brands = useAdminList('brands', (api, p) => api.admin.brands.list(p), { page: 1, limit: 200 }, { enabled: can('brands.read') });
  return useMemo(
    () => ({
      isLoading: brands.isLoading,
      options: (brands.data?.items ?? []).map((b) => ({ value: b.id, label: b.name, hint: b.productCount ? String(b.productCount) : undefined })),
    }),
    [brands.data, brands.isLoading],
  );
}

/** Specification definitions (products.read). */
export function useSpecDefinitions() {
  const { can } = useSession();
  return useAdminQuery(['specs', 'all'], (api) => api.admin.specs.list(), { enabled: can('products.read'), staleTime: 60_000 });
}
