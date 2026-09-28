import { useAdminList, useAdminMutation, useSession } from '@vero/api-client';
import type { AdminUser } from '@vero/types';
import { Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, toast } from '@vero/ui';
import { BanIcon, EllipsisIcon, ExternalLinkIcon, KeyRoundIcon, PencilIcon, PlusIcon, ShieldCheckIcon, UserCogIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { StatusBadge } from '../../components/common/badges';
import { ConfirmDialog, useConfirm, useDialogTarget } from '../../components/common/ConfirmDialog';
import { Page, PageHeader, usePageMeta } from '../../components/common/page';
import { PersonAvatar } from '../../components/common/PersonAvatar';
import { DataTable, type DataColumn } from '../../components/data-table/DataTable';
import { FilterSelect, SearchInput } from '../../components/data-table/toolbar';
import { toastError } from '../../lib/errors';
import { useFormat } from '../../lib/format';
import { imageRefThumb } from '../../lib/images';
import { roleName } from '../../lib/permissions';
import { useListState } from '../../lib/url-state';
import { ResetPasswordDialog, useAssignableRoles, useCanManageUser, UserDialog } from './user-dialogs';

export default function UsersPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const navigate = useNavigate();
  const { can, user: me } = useSession();
  usePageMeta(t('users.title'));
  const list = useListState({ filters: ['role', 'status'] as const });
  const query = useAdminList('users', (api, p) => api.admin.users.list(p), list.params);
  const { roles } = useAssignableRoles();
  const canManage = useCanManageUser();
  const edit = useDialogTarget<AdminUser | null>();
  const reset = useDialogTarget<AdminUser>();
  const deactivate = useConfirm<AdminUser>();
  const removeUser = useAdminMutation((api, id: string) => api.admin.users.remove(id), { invalidate: ['users', 'roles'] });
  const activate = useAdminMutation((api, id: string) => api.admin.users.update(id, { status: 'active' }), { invalidate: ['users', 'roles'] });

  const columns = useMemo<DataColumn<AdminUser>[]>(
    () => [
      {
        id: 'user',
        header: t('users.columns.user'),
        meta: { alwaysVisible: true },
        cell: ({ row }) => {
          const u = row.original;
          const name = `${u.firstName} ${u.lastName}`.trim();
          return (
            <div className="flex min-w-52 items-center gap-3">
              <PersonAvatar name={name} src={imageRefThumb(u.avatar)} />
              <div className="flex min-w-0 flex-col">
                <span className="flex items-center gap-1.5">
                  <Link to={`/users/${u.id}`} className="truncate font-semibold text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                    {name}
                  </Link>
                  {u.id === me?.id ? (
                    <Badge variant="brand" size="sm">
                      {t('users.you')}
                    </Badge>
                  ) : null}
                </span>
                <span className="truncate text-xs text-muted-foreground">{u.email ?? '—'}</span>
              </div>
            </div>
          );
        },
      },
      { id: 'phone', header: t('users.columns.phone'), cell: ({ row }) => <span className="tabular">{f.phone(row.original.phone)}</span> },
      {
        id: 'role',
        header: t('users.columns.role'),
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-0.5">
            <Badge variant={row.original.role.key === 'SUPER_ADMIN' ? 'default' : 'secondary'} size="sm">
              {roleName(t, row.original.role)}
            </Badge>
            {row.original.permissions.length ? <span className="text-xs text-muted-foreground">{t('users.extraCount', { count: row.original.permissions.length })}</span> : null}
          </div>
        ),
      },
      { id: 'status', header: t('users.columns.status'), cell: ({ row }) => <StatusBadge kind="user" value={row.original.status} size="sm" /> },
      {
        id: 'lastLogin',
        header: t('users.columns.lastLogin'),
        cell: ({ row }) => (row.original.lastLoginAt ? <span className="text-muted-foreground tabular" title={f.datetime(row.original.lastLoginAt)}>{f.relative(row.original.lastLoginAt)}</span> : <span className="text-muted-foreground">{t('users.never')}</span>),
      },
      { id: 'created', header: t('users.columns.created'), meta: { defaultHidden: true }, cell: ({ row }) => <span className="text-muted-foreground tabular">{f.date(row.original.createdAt)}</span> },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('table.actions')}</span>,
        meta: { align: 'end', alwaysVisible: true },
        cell: ({ row }) => {
          const u = row.original;
          const manageable = canManage(u);
          const isMe = u.id === me?.id;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`${t('table.rowActions')}: ${u.firstName} ${u.lastName}`}>
                  <EllipsisIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={() => void navigate(`/users/${u.id}`)}>
                  <ExternalLinkIcon aria-hidden="true" />
                  {t('common.open')}
                </DropdownMenuItem>
                {can('users.update') && manageable ? (
                  <>
                    <DropdownMenuItem onSelect={() => edit.ask(u)}>
                      <PencilIcon aria-hidden="true" />
                      {t('common.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => reset.ask(u)}>
                      <KeyRoundIcon aria-hidden="true" />
                      {t('users.reset.action')}
                    </DropdownMenuItem>
                    {u.status === 'blocked' ? (
                      <DropdownMenuItem
                        onSelect={async () => {
                          try {
                            await activate.mutateAsync(u.id);
                            toast.success(t('users.activated'));
                          } catch (error) {
                            toastError(t, error);
                          }
                        }}
                      >
                        <ShieldCheckIcon aria-hidden="true" />
                        {t('users.activate')}
                      </DropdownMenuItem>
                    ) : null}
                  </>
                ) : null}
                {can('users.delete') && manageable && !isMe && u.status === 'active' ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => deactivate.ask(u)}>
                      <BanIcon aria-hidden="true" />
                      {t('users.deactivate')}
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [t, f, can, me?.id, canManage, navigate, edit.ask, reset.ask, deactivate.ask, activate],
  );

  const filtered = list.activeFilterCount > 0 || !!list.q;

  return (
    <Page>
      <PageHeader
        title={t('users.title')}
        description={t('users.description')}
        actions={
          can('users.create') ? (
            <Button leftIcon={<PlusIcon />} onClick={() => edit.ask(null)}>
              {t('users.add')}
            </Button>
          ) : undefined
        }
      />
      <DataTable
        id="users"
        label={t('users.title')}
        columns={columns}
        data={query.data?.items}
        getRowId={(u) => u.id}
        rowHref={(u) => `/users/${u.id}`}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        page={list.page}
        limit={list.limit}
        total={query.data?.meta.total}
        pages={query.data?.meta.pages}
        onPageChange={list.setPage}
        onLimitChange={list.setLimit}
        filtered={filtered}
        onResetFilters={list.reset}
        rowClassName={(u) => (u.status === 'blocked' ? 'opacity-60' : undefined)}
        empty={{ title: t('users.empty'), icon: <UserCogIcon /> }}
        toolbar={
          <>
            <SearchInput value={list.q} onChange={list.setQ} placeholder={t('users.searchPlaceholder')} className="sm:w-72" />
            <FilterSelect label={t('users.filters.role')} value={list.filters.role} onChange={(v) => list.setFilter('role', v)} options={roles.filter((r) => r.key !== 'CUSTOMER').map((r) => ({ value: r.key, label: roleName(t, r) }))} />
            <FilterSelect label={t('users.filters.status')} value={list.filters.status} onChange={(v) => list.setFilter('status', v)} options={(['active', 'blocked'] as const).map((s) => ({ value: s, label: t(`status.user.${s}`) }))} />
            {filtered ? (
              <Button variant="ghost" size="sm" onClick={list.reset}>
                {t('table.resetFilters')}
              </Button>
            ) : null}
          </>
        }
      />
      <UserDialog user={edit.target} open={edit.open} onOpenChange={edit.onOpenChange} onSaved={(u) => (edit.target ? undefined : void navigate(`/users/${u.id}`))} />
      <ResetPasswordDialog user={reset.target} open={reset.open} onOpenChange={reset.onOpenChange} />
      <ConfirmDialog
        open={deactivate.open}
        onOpenChange={deactivate.onOpenChange}
        title={deactivate.target ? t('users.deactivateTitle', { name: `${deactivate.target.firstName} ${deactivate.target.lastName}` }) : ''}
        description={t('users.deactivateText')}
        confirmLabel={t('users.deactivate')}
        onConfirm={async () => {
          if (!deactivate.target) return;
          try {
            await removeUser.mutateAsync(deactivate.target.id);
            toast.success(t('users.deactivated'));
          } catch (error) {
            toastError(t, error);
            throw error;
          }
        }}
      />
    </Page>
  );
}
