import { useQueryClient } from '@tanstack/react-query';
import { useAdminMutation, useSession } from '@vero/api-client';
import type { AdminCategoryNode } from '@vero/types';
import { Badge, Button, cn, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, Skeleton, toast } from '@vero/ui';
import { ArrowDownIcon, ArrowUpIcon, ChevronRightIcon, ChevronsDownUpIcon, ChevronsUpDownIcon, EllipsisIcon, EyeIcon, EyeOffIcon, FolderTreeIcon, PackageIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ConfirmDialog, useConfirm, useDialogTarget } from '../../components/common/ConfirmDialog';
import { DynamicIcon } from '../../components/common/DynamicIcon';
import { Page, PageHeader, Panel, usePageMeta } from '../../components/common/page';
import { ErrorState } from '../../components/common/states';
import { SearchInput } from '../../components/data-table/toolbar';
import { apiErrorCode, toastError } from '../../lib/errors';
import { useFormat } from '../../lib/format';
import { flattenTree, useCategoryTree, useSpecDefinitions } from '../catalog/catalog-data';
import { CategoryDialog, type CategoryDialogTarget } from './CategoryDialog';

const TREE_KEY = ['admin', 'categories', 'tree'];

const normalize = (s: string) => s.toLowerCase().replace(/['‘’ʻʼ`]/g, '');

/** Keeps nodes that match (or have a matching descendant); matching subtrees stay whole. */
function filterTree(nodes: AdminCategoryNode[], q: string): AdminCategoryNode[] {
  const out: AdminCategoryNode[] = [];
  for (const n of nodes) {
    const hit = [n.name.uz, n.name.ru, n.name.en, n.slug].some((v) => normalize(v ?? '').includes(q));
    if (hit) out.push(n);
    else {
      const children = filterTree(n.children, q);
      if (children.length) out.push({ ...n, children });
    }
  }
  return out;
}

/** Replaces the children list of `parentId` (null = roots) in a tree. */
function withSiblings(nodes: AdminCategoryNode[], parentId: string | null, siblings: AdminCategoryNode[]): AdminCategoryNode[] {
  if (parentId === null) return siblings;
  return nodes.map((n) => (n.id === parentId ? { ...n, children: siblings } : { ...n, children: withSiblings(n.children, parentId, siblings) }));
}

export default function CategoriesPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { can } = useSession();
  usePageMeta(t('categories.title'));
  const tree = useCategoryTree();
  const specs = useSpecDefinitions();
  const flat = useMemo(() => flattenTree(tree.data), [tree.data]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const dialog = useDialogTarget<CategoryDialogTarget>();
  const del = useConfirm<AdminCategoryNode>();

  const canCreate = can('categories.create');
  const canUpdate = can('categories.update');
  const canDelete = can('categories.delete');

  const reorder = useAdminMutation((api, items: Array<{ id: string; order: number }>) => api.admin.categories.reorder(items), { invalidate: ['categories', 'products'] });
  const setActive = useAdminMutation((api, v: { id: string; isActive: boolean }) => api.admin.categories.update(v.id, { isActive: v.isActive }), { invalidate: ['categories', 'products'] });
  const remove = useAdminMutation((api, id: string) => api.admin.categories.remove(id), { invalidate: ['categories', 'products'] });

  const query = normalize(q.trim());
  const shown = useMemo(() => (query ? filterTree(tree.data ?? [], query) : (tree.data ?? [])), [tree.data, query]);

  const move = async (node: AdminCategoryNode, siblings: AdminCategoryNode[], dir: -1 | 1) => {
    const index = siblings.findIndex((s) => s.id === node.id);
    const target = index + dir;
    if (index < 0 || target < 0 || target >= siblings.length) return;
    const next = [...siblings];
    [next[index], next[target]] = [next[target]!, next[index]!];
    const renumbered = next.map((s, order) => ({ ...s, order }));
    // optimistic: reorder locally, the server confirms (or the tree is refetched on error)
    qc.setQueryData<AdminCategoryNode[]>(TREE_KEY, (old) => (old ? withSiblings(old, node.parent, renumbered) : old));
    try {
      await reorder.mutateAsync(renumbered.map((s) => ({ id: s.id, order: s.order })));
      toast.success(t('categories.reordered'));
    } catch (error) {
      toastError(t, error);
      void qc.invalidateQueries({ queryKey: TREE_KEY });
    }
  };

  const toggleActive = async (node: AdminCategoryNode, isActive: boolean) => {
    try {
      await setActive.mutateAsync({ id: node.id, isActive });
      toast.success(t(isActive ? 'categories.activated' : 'categories.deactivated', { name: f.loc(node.name) }));
    } catch (error) {
      toastError(t, error);
    }
  };

  const renderLevel = (nodes: AdminCategoryNode[], depth: number) => (
    <ul className={cn('flex flex-col', depth > 0 && 'border-s border-border ms-5 ps-2')}>
      {nodes.map((node, index) => {
        const open = !!query || !collapsed.has(node.id);
        const name = f.loc(node.name);
        const hasChildren = node.children.length > 0;
        return (
          <li key={node.id} className="flex flex-col">
            <div className={cn('group flex min-h-12 items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/50', !node.isActive && 'opacity-70')}>
              {hasChildren ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-7 shrink-0"
                  aria-expanded={open}
                  aria-label={t(open ? 'categories.collapse' : 'categories.expand', { name })}
                  onClick={() =>
                    setCollapsed((s) => {
                      const next = new Set(s);
                      if (next.has(node.id)) next.delete(node.id);
                      else next.add(node.id);
                      return next;
                    })
                  }
                >
                  <ChevronRightIcon className={cn('transition-transform duration-150', open && 'rotate-90')} />
                </Button>
              ) : (
                <span className="size-7 shrink-0" aria-hidden="true" />
              )}
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground" aria-hidden="true">
                <DynamicIcon name={node.icon} className="size-4" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex min-w-0 items-center gap-2">
                  {canUpdate ? (
                    <button type="button" onClick={() => dialog.ask({ category: node })} className="truncate text-start text-sm font-semibold text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                      {name}
                    </button>
                  ) : (
                    <span className="truncate text-sm font-semibold">{name}</span>
                  )}
                  {!node.isActive ? (
                    <Badge variant="muted" size="sm">
                      {t('categories.hidden')}
                    </Badge>
                  ) : null}
                </span>
                <span className="truncate font-mono text-xs text-muted-foreground">/{node.slug}</span>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                {node.specKeys.length ? (
                  <Badge variant="outline" size="sm" className="tabular">
                    {t('categories.filters', { count: node.specKeys.length })}
                  </Badge>
                ) : null}
                <Badge variant={node.productCount ? 'secondary' : 'muted'} size="sm" className="tabular">
                  {t('categories.products', { count: node.productCount })}
                </Badge>
              </div>
              {canUpdate ? (
                <>
                  <div className="flex items-center">
                    <Button variant="ghost" size="icon-sm" className="size-7" disabled={index === 0 || !!query || reorder.isPending} onClick={() => void move(node, nodes, -1)} aria-label={t('categories.moveUp', { name })}>
                      <ArrowUpIcon />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="size-7" disabled={index === nodes.length - 1 || !!query || reorder.isPending} onClick={() => void move(node, nodes, 1)} aria-label={t('categories.moveDown', { name })}>
                      <ArrowDownIcon />
                    </Button>
                  </div>
                </>
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="size-8" aria-label={`${t('table.rowActions')}: ${name}`}>
                    <EllipsisIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {canUpdate ? (
                    <DropdownMenuItem onSelect={() => dialog.ask({ category: node })}>
                      <PencilIcon aria-hidden="true" />
                      {t('common.edit')}
                    </DropdownMenuItem>
                  ) : null}
                  {canUpdate ? (
                    <DropdownMenuItem onSelect={() => void toggleActive(node, !node.isActive)} disabled={setActive.isPending}>
                      {node.isActive ? <EyeOffIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
                      {node.isActive ? t('categories.hide') : t('categories.show')}
                    </DropdownMenuItem>
                  ) : null}
                  {canCreate ? (
                    <DropdownMenuItem onSelect={() => dialog.ask({ parent: node.id })}>
                      <PlusIcon aria-hidden="true" />
                      {t('categories.addChild')}
                    </DropdownMenuItem>
                  ) : null}
                  {can('products.read') ? (
                    <DropdownMenuItem onSelect={() => void navigate(`/products?category=${node.id}`)}>
                      <PackageIcon aria-hidden="true" />
                      {t('categories.viewProducts')}
                    </DropdownMenuItem>
                  ) : null}
                  {canDelete ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={() => del.ask(node)}>
                        <Trash2Icon aria-hidden="true" />
                        {t('common.delete')}
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {hasChildren && open ? renderLevel(node.children, depth + 1) : null}
          </li>
        );
      })}
    </ul>
  );

  const withChildren = flat.filter((c) => c.node.children.length).map((c) => c.node.id);

  return (
    <Page>
      <PageHeader
        title={t('categories.title')}
        description={t('categories.description')}
        actions={
          canCreate ? (
            <Button leftIcon={<PlusIcon />} onClick={() => dialog.ask({})}>
              {t('categories.add')}
            </Button>
          ) : undefined
        }
      />
      <Panel flush>
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <SearchInput value={q} onChange={setQ} placeholder={t('categories.searchPlaceholder')} className="sm:w-80" />
          {tree.data ? (
            <span className="text-[13px] text-muted-foreground">{t('categories.summary', { total: flat.length, roots: tree.data.length })}</span>
          ) : null}
          <div className="ms-auto flex items-center gap-1">
            <Button variant="ghost" size="sm" leftIcon={<ChevronsUpDownIcon />} onClick={() => setCollapsed(new Set())} disabled={!!query}>
              {t('categories.expandAll')}
            </Button>
            <Button variant="ghost" size="sm" leftIcon={<ChevronsDownUpIcon />} onClick={() => setCollapsed(new Set(withChildren))} disabled={!!query}>
              {t('categories.collapseAll')}
            </Button>
          </div>
        </div>
        <div className="p-2 sm:p-3">
          {tree.isError ? (
            <ErrorState error={tree.error} onRetry={() => void tree.refetch()} />
          ) : tree.isLoading ? (
            <div className="flex flex-col gap-2 p-1">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : !tree.data?.length ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <FolderTreeIcon className="size-8 text-muted-foreground" aria-hidden="true" />
              <p className="font-semibold">{t('categories.empty')}</p>
              <p className="max-w-sm text-sm text-muted-foreground">{t('categories.emptyHint')}</p>
              {canCreate ? (
                <Button size="sm" leftIcon={<PlusIcon />} onClick={() => dialog.ask({})}>
                  {t('categories.add')}
                </Button>
              ) : null}
            </div>
          ) : shown.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t('categories.noMatches')}</p>
          ) : (
            renderLevel(shown, 0)
          )}
        </div>
      </Panel>

      <CategoryDialog target={dialog.target} open={dialog.open} onOpenChange={dialog.onOpenChange} flat={flat} specs={specs.data ?? []} />
      <ConfirmDialog
        open={del.open}
        onOpenChange={del.onOpenChange}
        title={del.target ? t('categories.deleteTitle', { name: f.loc(del.target.name) }) : ''}
        description={t('categories.deleteText')}
        onConfirm={async () => {
          const node = del.target;
          if (!node) return;
          try {
            await remove.mutateAsync(node.id);
            toast.success(t('form.deleted'));
          } catch (error) {
            if (apiErrorCode(error) === 'IN_USE') toast.error(node.children.length ? t('categories.deleteHasChildren') : t('categories.deleteHasProducts'));
            else toastError(t, error);
            throw error;
          }
        }}
      />
    </Page>
  );
}
