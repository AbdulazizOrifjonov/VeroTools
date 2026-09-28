import { useAdminMutation, useAdminQuery, useApi, useSession } from '@vero/api-client';
import { DEFAULT_ROLE_PERMISSIONS, PERMISSION_GROUPS, type AdminPermission, type AdminRole } from '@vero/types';
import { Badge, Button, Checkbox, cn, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Form, Skeleton, toast } from '@vero/ui';
import { roleInputSchema } from '@vero/validation';
import { LockIcon, PencilIcon, PlusIcon, RotateCcwIcon, ShieldIcon, Trash2Icon, UsersIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { z } from 'zod';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Page, PageHeader, Panel, usePageMeta } from '../../components/common/page';
import { ErrorState } from '../../components/common/states';
import { SelectField, TextareaField, TextField } from '../../components/form/fields';
import { FieldGrid, FormActionBar, UnsavedChangesGuard, useSaveShortcut } from '../../components/form/form-kit';
import { apiErrorCode, handleFormError, toastError } from '../../lib/errors';
import { formResolver } from '../../lib/forms';
import { useFormat } from '../../lib/format';
import { roleName } from '../../lib/permissions';
import { useSearchParamState } from '../../lib/url-state';

/** Matrix columns: every action that exists in some permission group, common ones first. */
const ACTIONS = ['read', 'create', 'update', 'delete', 'moderate', 'upload', 'send', 'export', 'manage'] as const;
const GROUPS = Object.entries(PERMISSION_GROUPS) as Array<[string, readonly string[]]>;
const EDITABLE_SYSTEM = new Set(['ADMIN', 'MANAGER']);
/** staff roles by seniority, custom roles after them, customers last */
const ROLE_ORDER: Record<string, number> = { SUPER_ADMIN: 0, ADMIN: 1, MANAGER: 2, CUSTOMER: 9 };

function roleDescription(t: ReturnType<typeof useTranslation>['t'], role: AdminRole): string | undefined {
  if (role.isSystem) return t(`roles.descriptions.${role.key}`, { defaultValue: role.description ?? '' }) || undefined;
  return role.description || undefined;
}

function permissionCount(role: AdminRole): number | 'all' {
  return role.permissions.includes('*') ? 'all' : role.permissions.length;
}

/* ----------------------------------------------------------------------------------------------- */

function RoleList({ roles, selectedId, onSelect }: { roles: AdminRole[]; selectedId: string; onSelect: (id: string) => void }) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('roles.list')} className="flex flex-col gap-1.5">
      {roles.map((r) => {
        const count = permissionCount(r);
        const active = r.id === selectedId;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelect(r.id)}
            aria-current={active ? 'true' : undefined}
            className={cn(
              'flex w-full flex-col gap-1 rounded-lg border px-3.5 py-3 text-start transition-colors focus-visible:outline-2 focus-visible:outline-ring',
              active ? 'border-foreground/25 bg-card shadow-xs dark:border-foreground/30' : 'border-transparent hover:bg-accent/60',
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-semibold text-foreground">{roleName(t, r)}</span>
              {r.key === 'SUPER_ADMIN' || r.key === 'CUSTOMER' ? <LockIcon className="size-3.5 shrink-0 text-muted-foreground" aria-label={t('roles.locked')} /> : null}
            </span>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              <span className="font-mono">{r.key}</span>
              <span aria-hidden="true">·</span>
              <span>{t('roles.users', { count: r.usersCount })}</span>
              <span aria-hidden="true">·</span>
              <span>{count === 'all' ? t('roles.allPermissions') : t('roles.permissionsCount', { count })}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

/* ----------------------------------------------------------------------------------------------- */

function PermissionMatrix({
  value,
  baseline,
  onChange,
  disabled,
  descriptions,
}: {
  value: Set<string>;
  baseline: Set<string>;
  onChange: (next: Set<string>) => void;
  disabled: boolean;
  descriptions: Map<string, string>;
}) {
  const { t } = useTranslation();
  const toggle = (key: string, on: boolean) => {
    const [group, action] = key.split('.');
    const next = new Set(value);
    if (on) {
      next.add(key);
      if (action !== 'read') next.add(`${group}.read`);
    } else {
      next.delete(key);
      // nothing else in a section works without viewing it
      if (action === 'read') for (const k of PERMISSION_GROUPS[group as keyof typeof PERMISSION_GROUPS] ?? []) next.delete(k);
    }
    onChange(next);
  };
  const toggleGroup = (keys: readonly string[], on: boolean) => {
    const next = new Set(value);
    for (const k of keys) {
      if (on) next.add(k);
      else next.delete(k);
    }
    onChange(next);
  };
  const all = GROUPS.flatMap(([, keys]) => keys);
  const allChecked = all.every((k) => value.has(k)) ? true : all.some((k) => value.has(k)) ? 'indeterminate' : false;
  const label = (key: string) => descriptions.get(key) ?? key;
  const box = 'data-[state=checked]:border-foreground data-[state=checked]:bg-foreground data-[state=checked]:text-background data-[state=indeterminate]:border-foreground data-[state=indeterminate]:bg-foreground data-[state=indeterminate]:text-background';

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-separate border-spacing-0 text-[13px]">
        <caption className="sr-only">{t('roles.matrix')}</caption>
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th scope="col" className="sticky start-0 z-10 border-b border-border bg-card px-4 py-2.5 text-start font-medium sm:px-5">
              {t('roles.group')}
            </th>
            <th scope="col" className="border-b border-border px-2 py-2.5 text-center font-medium">
              <span className="flex flex-col items-center gap-1.5">
                {t('roles.selectAll')}
                <Checkbox checked={allChecked} disabled={disabled} className={box} aria-label={t('roles.allPermissions')} onCheckedChange={(c) => onChange(c === true ? new Set(all) : new Set())} />
              </span>
            </th>
            {ACTIONS.map((a) => (
              <th key={a} scope="col" className="border-b border-border px-2 py-2.5 text-center font-medium whitespace-nowrap">
                {t(`enums.permissionAction.${a}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {GROUPS.map(([group, keys]) => {
            const checked = keys.every((k) => value.has(k)) ? true : keys.some((k) => value.has(k)) ? 'indeterminate' : false;
            const groupName = t(`enums.permissionGroup.${group}`);
            return (
              <tr key={group} className="group/row">
                <th scope="row" className="sticky start-0 z-10 border-b border-border bg-card px-4 py-2 text-start font-medium text-foreground group-hover/row:bg-muted sm:px-5">
                  {groupName}
                </th>
                <td className="border-b border-border px-2 py-2 text-center group-hover/row:bg-muted">
                  <Checkbox checked={checked} disabled={disabled} className={box} aria-label={t('roles.selectGroup', { group: groupName })} onCheckedChange={(c) => toggleGroup(keys, c === true)} />
                </td>
                {ACTIONS.map((a) => {
                  const key = `${group}.${a}`;
                  if (!keys.includes(key)) {
                    return (
                      <td key={a} className="border-b border-border px-2 py-2 text-center text-muted-foreground/50 group-hover/row:bg-muted">
                        <span aria-hidden="true">·</span>
                        <span className="sr-only">{t('roles.notApplicable')}</span>
                      </td>
                    );
                  }
                  const changed = value.has(key) !== baseline.has(key);
                  return (
                    <td key={a} className={cn('border-b border-border px-2 py-2 text-center group-hover/row:bg-muted', changed && 'bg-warning/12 group-hover/row:bg-warning/18')}>
                      <Checkbox checked={value.has(key)} disabled={disabled} className={box} aria-label={label(key)} title={label(key)} onCheckedChange={(c) => toggle(key, c === true)} />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ----------------------------------------------------------------------------------------------- */

const roleFormSchema = roleInputSchema.omit({ permissions: true }).extend({ copyFrom: z.string().optional() });
type RoleFormValues = z.input<typeof roleFormSchema>;
type RoleFormOutput = z.output<typeof roleFormSchema>;

function RoleDialog({ role, roles, open, onOpenChange, onSaved }: { role: AdminRole | null; roles: AdminRole[]; open: boolean; onOpenChange: (open: boolean) => void; onSaved: (role: AdminRole) => void }) {
  const { t } = useTranslation();
  const isNew = !role;
  const form = useForm<RoleFormValues, unknown, RoleFormOutput>({
    resolver: formResolver<RoleFormValues, typeof roleFormSchema>(roleFormSchema),
    defaultValues: { key: '', name: '', description: '', copyFrom: '' },
  });
  useEffect(() => {
    if (open) form.reset({ key: role?.key ?? '', name: role?.name ?? '', description: role?.description ?? '', copyFrom: '' });
  }, [open, role, form]);
  const copyOptions = roles.filter((r) => r.key !== 'SUPER_ADMIN' && r.key !== 'CUSTOMER').map((r) => ({ value: r.id, label: `${roleName(t, r)} · ${t('roles.permissionsCount', { count: r.permissions.length })}` }));
  const create = useAdminMutation((api, input: Parameters<typeof api.admin.roles.create>[0]) => api.admin.roles.create(input), { invalidate: ['roles'] });
  const update = useAdminMutation((api, input: Parameters<typeof api.admin.roles.update>[1]) => api.admin.roles.update(role!.id, input), { invalidate: ['roles', 'users'] });
  const pending = create.isPending || update.isPending;

  const submit = form.handleSubmit(async ({ copyFrom, ...values }) => {
    try {
      const saved = isNew
        ? await create.mutateAsync({ ...values, description: values.description || undefined, permissions: roles.find((r) => r.id === copyFrom)?.permissions ?? [] })
        : await update.mutateAsync({ ...(role.isSystem ? {} : { key: values.key }), name: values.name, description: values.description ?? '' });
      toast.success(isNew ? t('roles.created') : t('roles.saved'));
      onSaved(saved);
      onOpenChange(false);
    } catch (error) {
      if (apiErrorCode(error) === 'CONFLICT') form.setError('key', { type: 'server', message: 'validation.duplicate' }, { shouldFocus: true });
      else handleFormError(t, form, error);
    }
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent size="md" closeLabel={t('common.close')}>
        <DialogHeader>
          <DialogTitle>{isNew ? t('roles.form.createTitle') : t('roles.form.editTitle')}</DialogTitle>
          {!isNew ? <DialogDescription>{t('roles.sessionsNote')}</DialogDescription> : null}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void submit(e)} noValidate className="flex min-h-0 flex-1 flex-col gap-5">
            <DialogBody className="flex flex-col gap-4">
              <FieldGrid>
                <TextField name="name" label={t('roles.form.name')} required maxLength={60} autoComplete="off" />
                <TextField
                  name="key"
                  label={t('roles.form.key')}
                  required
                  maxLength={41}
                  autoComplete="off"
                  spellCheck={false}
                  description={t('roles.form.keyHint')}
                  disabled={!!role?.isSystem}
                />
              </FieldGrid>
              <TextareaField name="description" label={t('roles.form.description')} rows={3} maxLength={300} optional />
              {isNew ? <SelectField name="copyFrom" label={t('roles.form.copyFrom')} options={copyOptions} allowEmpty emptyLabel={t('roles.form.none')} /> : null}
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" loading={pending}>
                {isNew ? t('common.create') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------------------------------------------------------------------------- */

export default function RolesPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const api = useApi();
  const { can, user: me } = useSession();
  usePageMeta(t('roles.title'));
  const canManage = can('roles.manage');
  const rolesQuery = useAdminQuery(['roles'], (a) => a.admin.roles.list(), { staleTime: 30_000 });
  const catalogue = useAdminQuery(['roles', 'permissions'], (a) => a.admin.roles.permissions(), { staleTime: 5 * 60_000 });
  const roles = useMemo(() => [...(rolesQuery.data ?? [])].sort((a, b) => (ROLE_ORDER[a.key] ?? 3) - (ROLE_ORDER[b.key] ?? 3)), [rolesQuery.data]);
  const [roleParam, setRoleParam] = useSearchParamState('role');
  const selected = roles.find((r) => r.id === roleParam) ?? roles.find((r) => r.key === 'MANAGER') ?? roles[0];

  const baselineKey = selected ? `${selected.id}:${[...selected.permissions].sort().join(',')}` : '';
  // eslint-disable-next-line react-hooks/exhaustive-deps -- recomputed only when the saved set changes, not on every refetch
  const baseline = useMemo(() => new Set(selected?.permissions.includes('*') ? GROUPS.flatMap(([, k]) => k) : (selected?.permissions ?? [])), [baselineKey]);
  // local edits belong to one role; without edits (or for another role) the matrix shows the saved set
  const [edit, setEdit] = useState<{ roleId: string; value: Set<string> } | null>(null);
  const draft = edit && edit.roleId === selected?.id ? edit.value : baseline;
  const setDraft = (value: Set<string>) => selected && setEdit({ roleId: selected.id, value });
  const changes = useMemo(() => [...new Set([...draft, ...baseline])].filter((k) => draft.has(k) !== baseline.has(k)).length, [draft, baseline]);
  const dirty = changes > 0;

  const descriptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of (catalogue.data ?? []) as AdminPermission[]) m.set(p.key, f.loc(p.description));
    return m;
  }, [catalogue.data, f]);

  const [dialog, setDialog] = useState<{ open: boolean; role: AdminRole | null }>({ open: false, role: null });
  const [pendingSwitch, setPendingSwitch] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const save = useAdminMutation((a, input: { id: string; permissions: string[] }) => a.admin.roles.update(input.id, { permissions: input.permissions }), { invalidate: ['roles', 'users'] });
  const remove = useAdminMutation((a, id: string) => a.admin.roles.remove(id), { invalidate: ['roles', 'users'] });

  const locked = !selected || selected.key === 'SUPER_ADMIN' || selected.key === 'CUSTOMER';
  const editable = canManage && !locked;

  const doSave = async () => {
    if (!selected || !editable || !dirty || save.isPending) return;
    try {
      await save.mutateAsync({ id: selected.id, permissions: [...draft].sort() });
      setEdit(null);
      toast.success(t('roles.saved'));
      // the signed-in user's own role changed — reload their permissions
      if (me?.role === selected.key) await api.auth.me().catch(() => undefined);
    } catch (error) {
      toastError(t, error);
    }
  };
  useSaveShortcut(() => void doSave(), editable && dirty);

  const select = (id: string) => {
    if (id === selected?.id) return;
    if (dirty) setPendingSwitch(id);
    else {
      setEdit(null);
      setRoleParam(id);
    }
  };

  if (rolesQuery.isError && !rolesQuery.data) return <ErrorState error={rolesQuery.error} onRetry={() => void rolesQuery.refetch()} />;

  const description = selected ? roleDescription(t, selected) : undefined;

  return (
    <Page>
      <PageHeader
        title={t('roles.title')}
        description={t('roles.description')}
        actions={
          canManage ? (
            <Button leftIcon={<PlusIcon />} onClick={() => setDialog({ open: true, role: null })}>
              {t('roles.add')}
            </Button>
          ) : undefined
        }
      />
      {!rolesQuery.data ? (
        <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-[32rem] rounded-xl" />
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <RoleList roles={roles} selectedId={selected?.id ?? ''} onSelect={select} />
          {selected ? (
            <div className="flex min-w-0 flex-col gap-4">
              <Panel
                flush
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    {roleName(t, selected)}
                    <Badge variant={selected.isSystem ? 'secondary' : 'outline'} size="sm">
                      {selected.isSystem ? t('roles.system') : t('roles.custom')}
                    </Badge>
                  </span>
                }
                description={description}
                actions={
                  <>
                    {can('users.read') && selected.key !== 'CUSTOMER' ? (
                      <Button asChild variant="ghost" size="sm" leftIcon={<UsersIcon />}>
                        <Link to={`/users?role=${selected.key}`}>{t('roles.users', { count: selected.usersCount })}</Link>
                      </Button>
                    ) : null}
                    {editable && EDITABLE_SYSTEM.has(selected.key) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<RotateCcwIcon />}
                        title={t('roles.resetDefaultsHint')}
                        onClick={() => setDraft(new Set(DEFAULT_ROLE_PERMISSIONS[selected.key as 'ADMIN' | 'MANAGER']))}
                      >
                        {t('roles.resetDefaults')}
                      </Button>
                    ) : null}
                    {canManage && !selected.isSystem ? (
                      <>
                        <Button variant="outline" size="sm" leftIcon={<PencilIcon />} onClick={() => setDialog({ open: true, role: selected })}>
                          {t('roles.editDetails')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-danger hover:text-danger"
                          leftIcon={<Trash2Icon />}
                          disabled={selected.usersCount > 0}
                          title={selected.usersCount > 0 ? t('roles.deleteInUse') : undefined}
                          onClick={() => setConfirmDelete(true)}
                        >
                          {t('common.delete')}
                        </Button>
                      </>
                    ) : null}
                  </>
                }
              >
                <div className="border-t border-border">
                  {locked || !canManage ? (
                    <p className="flex items-start gap-2 border-b border-border bg-muted/40 px-4 py-2.5 text-[13px] text-muted-foreground sm:px-5">
                      {locked ? <LockIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> : <ShieldIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />}
                      {selected.key === 'SUPER_ADMIN' ? t('roles.superLocked') : selected.key === 'CUSTOMER' ? t('roles.customerLocked') : t('roles.readOnly')}
                    </p>
                  ) : null}
                  {catalogue.isLoading ? (
                    <div className="flex flex-col gap-2 p-4">
                      {Array.from({ length: 8 }, (_, i) => (
                        <Skeleton key={i} className="h-8 rounded-md" />
                      ))}
                    </div>
                  ) : (
                    <PermissionMatrix value={draft} baseline={baseline} onChange={setDraft} disabled={!editable} descriptions={descriptions} />
                  )}
                  {editable ? <p className="px-4 py-3 text-xs text-muted-foreground sm:px-5">{t('roles.readHint')}</p> : null}
                </div>
              </Panel>
            </div>
          ) : null}
        </div>
      )}
      {editable && dirty ? (
        <FormActionBar dirty={dirty} submitting={save.isPending} onDiscard={() => setEdit(null)}>
          <span className="text-[13px] text-muted-foreground tabular">{t('roles.changes', { count: changes })}</span>
          <Button onClick={() => void doSave()} loading={save.isPending}>
            {t('common.save')}
          </Button>
        </FormActionBar>
      ) : null}

      <UnsavedChangesGuard when={editable && dirty} />
      <RoleDialog role={dialog.role} roles={roles} open={dialog.open} onOpenChange={(open) => setDialog((d) => ({ ...d, open }))} onSaved={(r) => setRoleParam(r.id)} />
      <ConfirmDialog
        open={pendingSwitch !== null}
        onOpenChange={(o) => !o && setPendingSwitch(null)}
        title={t('form.unsavedTitle')}
        description={t('form.unsavedText')}
        confirmLabel={t('form.leave')}
        tone="danger"
        onConfirm={() => {
          setEdit(null);
          if (pendingSwitch) setRoleParam(pendingSwitch);
          setPendingSwitch(null);
        }}
      />
      {selected ? (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={t('roles.deleteTitle', { name: roleName(t, selected) })}
          description={t('roles.deleteText')}
          onConfirm={async () => {
            try {
              await remove.mutateAsync(selected.id);
              toast.success(t('roles.deleted'));
              setRoleParam(null);
            } catch (error) {
              toastError(t, error);
              throw error;
            }
          }}
        />
      ) : null}
    </Page>
  );
}
