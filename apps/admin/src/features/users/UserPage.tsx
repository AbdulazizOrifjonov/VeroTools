import { useAdminItem, useAdminList, useAdminMutation, useSession } from '@vero/api-client';
import { PERMISSION_GROUPS, type AdminUser } from '@vero/types';
import { Badge, Button, cn, Skeleton, toast } from '@vero/ui';
import { BanIcon, KeyRoundIcon, PencilIcon, ShieldCheckIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { StatusBadge } from '../../components/common/badges';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { KeyValueList, Page, PageHeader, Panel, usePageMeta } from '../../components/common/page';
import { PersonAvatar } from '../../components/common/PersonAvatar';
import { ErrorState } from '../../components/common/states';
import { ListFooter } from '../../components/data-table/ListFooter';
import { isNotFound, toastError } from '../../lib/errors';
import { useFormat } from '../../lib/format';
import { imageRefThumb } from '../../lib/images';
import { permissionLabel, roleName } from '../../lib/permissions';
import { AuditActionLabel, AuditTargetLabel } from '../audit/audit-ui';
import { ItemNotFound } from '../errors/NotFoundPage';
import { ResetPasswordDialog, useCanManageUser, UserDialog } from './user-dialogs';

function PermissionsPanel({ user }: { user: AdminUser }) {
  const { t } = useTranslation();
  const effective = new Set(user.effectivePermissions);
  const extra = new Set(user.permissions);
  const all = effective.has('*');
  return (
    <Panel title={t('users.detail.permissions')} description={all ? undefined : t('users.form.effective', { count: effective.size })}>
      {all ? (
        <p className="text-sm font-medium">{t('users.detail.allPermissions')}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {Object.entries(PERMISSION_GROUPS).map(([group, keys]) => {
            const granted = keys.filter((k) => effective.has(k));
            if (!granted.length) return null;
            return (
              <li key={group} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <span className="text-[13px] font-medium">{t(`enums.permissionGroup.${group}`)}</span>
                <span className="flex flex-wrap justify-end gap-1">
                  {granted.map((k) => (
                    <Badge key={k} variant={extra.has(k) ? 'brand' : 'secondary'} size="sm" title={extra.has(k) ? t('users.detail.extra') : t('users.detail.fromRole')}>
                      {t(`enums.permissionAction.${k.split('.')[1]}`)}
                    </Badge>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {!all && extra.size ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="brand" size="sm">
            {t('users.detail.extra')}
          </Badge>
          {[...extra].map((p) => permissionLabel(t, p)).join(', ')}
        </p>
      ) : null}
    </Panel>
  );
}

function ActivityPanel({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const f = useFormat();
  const [page, setPage] = useState(1);
  const query = useAdminList('users', (api, p) => api.admin.users.activity(userId, p), { page, limit: 15, activity: userId });
  const items = query.data?.items;
  return (
    <Panel title={t('users.detail.activity')} flush className="xl:col-span-2">
      {query.isError && !items ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />
      ) : !items ? (
        <div className="flex flex-col gap-2 p-4">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10 rounded-md" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-muted-foreground">{t('users.detail.noActivity')}</p>
      ) : (
        <ol className={cn('flex flex-col divide-y divide-border border-t border-border', query.isFetching && 'opacity-70')}>
          {items.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-2.5 text-[13px]">
              <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                <AuditActionLabel action={a.action} />
                <AuditTargetLabel entry={a} className="max-w-64 text-muted-foreground" fallback={null} />
              </span>
              <span className="flex items-center gap-3 text-xs text-muted-foreground tabular">
                {a.ip ? <span className="font-mono">{a.ip}</span> : null}
                <time dateTime={a.createdAt}>{f.datetime(a.createdAt)}</time>
              </span>
            </li>
          ))}
        </ol>
      )}
      {query.data ? <ListFooter page={page} limit={15} total={query.data.meta.total} pages={query.data.meta.pages} onPageChange={setPage} /> : null}
    </Panel>
  );
}

export default function UserPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const f = useFormat();
  const { can, user: me } = useSession();
  const canManage = useCanManageUser();
  const query = useAdminItem('users', id, (api, uid) => api.admin.users.get(uid));
  const u = query.data;
  const name = u ? `${u.firstName} ${u.lastName}`.trim() : '';
  usePageMeta(t('users.title'), u ? name : null);
  const [editing, setEditing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const deactivate = useAdminMutation((api, uid: string) => api.admin.users.remove(uid), { invalidate: ['users', 'roles'] });
  const activate = useAdminMutation((api, uid: string) => api.admin.users.update(uid, { status: 'active' }), { invalidate: ['users', 'roles'] });

  if (query.isError && !u) return isNotFound(query.error) ? <ItemNotFound backTo="/users" /> : <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (!u) {
    return (
      <Page>
        <Skeleton className="h-14 w-96" />
        <div className="grid gap-4 xl:grid-cols-3">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl xl:col-span-2" />
        </div>
      </Page>
    );
  }
  const manageable = canManage(u);
  const isMe = u.id === me?.id;

  return (
    <Page>
      <PageHeader
        back={{ to: '/users', label: t('users.detail.back') }}
        title={
          <span className="flex items-center gap-3">
            <PersonAvatar name={name} src={imageRefThumb(u.avatar)} size="lg" />
            <span className="min-w-0">{name}</span>
          </span>
        }
        meta={
          <>
            <Badge variant={u.role.key === 'SUPER_ADMIN' ? 'default' : 'secondary'} size="lg">
              {roleName(t, u.role)}
            </Badge>
            <StatusBadge kind="user" value={u.status} size="lg" />
            {isMe ? (
              <Badge variant="brand" size="lg">
                {t('users.you')}
              </Badge>
            ) : null}
          </>
        }
        actions={
          manageable ? (
            <>
              {can('users.update') ? (
                <>
                  <Button variant="outline" size="sm" leftIcon={<PencilIcon />} onClick={() => setEditing(true)}>
                    {t('common.edit')}
                  </Button>
                  <Button variant="outline" size="sm" leftIcon={<KeyRoundIcon />} onClick={() => setResetting(true)}>
                    {t('users.reset.action')}
                  </Button>
                </>
              ) : null}
              {u.status === 'blocked' && can('users.update') ? (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<ShieldCheckIcon />}
                  loading={activate.isPending}
                  onClick={async () => {
                    try {
                      await activate.mutateAsync(u.id);
                      toast.success(t('users.activated'));
                    } catch (error) {
                      toastError(t, error);
                    }
                  }}
                >
                  {t('users.activate')}
                </Button>
              ) : null}
              {u.status === 'active' && can('users.delete') && !isMe ? (
                <Button variant="outline" size="sm" className="text-danger hover:text-danger" leftIcon={<BanIcon />} onClick={() => setConfirmDeactivate(true)}>
                  {t('users.deactivate')}
                </Button>
              ) : null}
            </>
          ) : (
            <span className="text-xs text-muted-foreground">{t('users.superOnly')}</span>
          )
        }
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel title={t('users.detail.profile')}>
            <KeyValueList
              items={[
                { label: t('common.email'), value: u.email ? <a href={`mailto:${u.email}`} className="break-all hover:underline">{u.email}</a> : '—' },
                { label: t('common.phone'), value: <span className="tabular">{f.phone(u.phone)}</span> },
                { label: t('users.columns.lastLogin'), value: u.lastLoginAt ? f.datetime(u.lastLoginAt) : t('users.never') },
                { label: t('users.columns.created'), value: f.datetime(u.createdAt) },
              ]}
            />
          </Panel>
          <PermissionsPanel user={u} />
        </div>
        {can(['users.read', 'audit.read'], 'any') ? <ActivityPanel userId={u.id} /> : null}
      </div>
      <UserDialog user={u} open={editing} onOpenChange={setEditing} />
      <ResetPasswordDialog user={u} open={resetting} onOpenChange={setResetting} />
      <ConfirmDialog
        open={confirmDeactivate}
        onOpenChange={setConfirmDeactivate}
        title={t('users.deactivateTitle', { name })}
        description={t('users.deactivateText')}
        confirmLabel={t('users.deactivate')}
        onConfirm={async () => {
          try {
            await deactivate.mutateAsync(u.id);
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
