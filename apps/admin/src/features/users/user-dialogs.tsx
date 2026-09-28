import { zodResolver } from '@hookform/resolvers/zod';
import { useAdminMutation, useAdminQuery, useSession } from '@vero/api-client';
import { ALL_PERMISSIONS, USER_STATUSES, type AdminUser } from '@vero/types';
import { Button, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Form, toast } from '@vero/ui';
import { adminResetPasswordSchema, adminUserCreateSchema, adminUserUpdateSchema } from '@vero/validation';
import { KeyRoundIcon, ShuffleIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo } from 'react';
import { useForm, type FieldValues, type UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { PasswordField, PhoneField, SelectField, TextField } from '../../components/form/fields';
import { FieldGrid } from '../../components/form/form-kit';
import { MultiSelectField } from '../../components/form/pickers';
import { apiErrorCode, handleFormError } from '../../lib/errors';
import { formResolver } from '../../lib/forms';
import { permissionLabel, roleName } from '../../lib/permissions';

/** 14 chars from an unambiguous alphabet, always with letters and digits (the API password rule). */
export function generatePassword(): string {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const all = letters + digits;
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  const chars = Array.from(bytes, (b) => all[b % all.length]!);
  chars[0] = letters[bytes[0]! % letters.length]!;
  chars[1] = digits[bytes[1]! % digits.length]!;
  return chars.join('');
}

/** Whether the signed-in user may manage this account (the API reserves super admins for super admins). */
export function useCanManageUser() {
  const { user } = useSession();
  const superAdmin = user?.role === 'SUPER_ADMIN';
  return useCallback((u: AdminUser) => u.role.key !== 'SUPER_ADMIN' || superAdmin, [superAdmin]);
}

/** Staff roles the current user may assign (only a super admin can grant super admin). */
export function useAssignableRoles() {
  const { t } = useTranslation();
  const { user, can } = useSession();
  const roles = useAdminQuery(['roles'], (api) => api.admin.roles.list(), { enabled: can(['users.read', 'roles.read'], 'any'), staleTime: 60_000 });
  const options = useMemo(
    () => (roles.data ?? []).filter((r) => r.key !== 'CUSTOMER' && (r.key !== 'SUPER_ADMIN' || user?.role === 'SUPER_ADMIN')).map((r) => ({ value: r.id, label: roleName(t, r) })),
    [roles.data, user?.role, t],
  );
  return { roles: roles.data ?? [], options, isLoading: roles.isLoading };
}

function PasswordWithGenerate<T extends FieldValues>({ form, name, label, description }: { form: UseFormReturn<T>; name: string; label: string; description: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-2">
      <PasswordField name={name} label={label} required description={description} className="flex-1" />
      <Button
        type="button"
        variant="outline"
        className="mt-6"
        leftIcon={<ShuffleIcon />}
        onClick={() => form.setValue(name as never, generatePassword() as never, { shouldDirty: true, shouldValidate: form.formState.isSubmitted })}
      >
        {t('users.form.generate')}
      </Button>
    </div>
  );
}

type CreateValues = z.input<typeof adminUserCreateSchema>;
type CreateOutput = z.output<typeof adminUserCreateSchema>;
type UpdateOutput = z.output<typeof adminUserUpdateSchema>;

export function UserDialog({ user, open, onOpenChange, onSaved }: { user: AdminUser | null; open: boolean; onOpenChange: (open: boolean) => void; onSaved?: (u: AdminUser) => void }) {
  const { t } = useTranslation();
  const isNew = !user;
  const { roles, options } = useAssignableRoles();
  const permissionOptions = useMemo(() => ALL_PERMISSIONS.map((p) => ({ value: p, label: permissionLabel(t, p), hint: p })), [t]);
  const defaults = (): CreateValues => ({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    password: '',
    role: user?.role.id ?? roles.find((r) => r.key === 'MANAGER')?.id ?? options[0]?.value ?? '',
    permissions: user?.permissions ?? [],
    status: user?.status ?? 'active',
  });
  // editing never sends a password (reset has its own dialog); creating requires one
  const resolver = isNew
    ? formResolver<CreateValues, typeof adminUserCreateSchema>(adminUserCreateSchema)
    : (formResolver<CreateValues, typeof adminUserUpdateSchema>(adminUserUpdateSchema, (v) => ({ ...v, password: undefined })) as unknown as ReturnType<typeof formResolver<CreateValues, typeof adminUserCreateSchema>>);
  const form = useForm<CreateValues, unknown, CreateOutput>({ resolver, defaultValues: defaults() });
  useEffect(() => {
    if (open) form.reset(defaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when the dialog opens for a record
  }, [open, user?.id, options.length]);

  const create = useAdminMutation((api, v: CreateOutput) => api.admin.users.create(v), { invalidate: ['users', 'roles'] });
  const update = useAdminMutation((api, v: UpdateOutput) => api.admin.users.update(user!.id, v), { invalidate: ['users', 'roles'] });
  const pending = create.isPending || update.isPending;
  const submit = form.handleSubmit(async (values) => {
    try {
      let saved: AdminUser;
      if (isNew) saved = await create.mutateAsync(values);
      else {
        const { password: _pw, ...rest } = values as UpdateOutput & { password?: string };
        void _pw;
        saved = await update.mutateAsync(rest);
      }
      toast.success(isNew ? t('users.form.created') : t('users.form.saved'));
      onSaved?.(saved);
      onOpenChange(false);
    } catch (error) {
      const code = apiErrorCode(error);
      if (code === 'EMAIL_TAKEN') form.setError('email', { type: 'server', message: 'errors:EMAIL_TAKEN' }, { shouldFocus: true });
      else if (code === 'PHONE_TAKEN') form.setError('phone', { type: 'server', message: 'errors:PHONE_TAKEN' }, { shouldFocus: true });
      else handleFormError(t, form, error);
    }
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent size="lg" closeLabel={t('common.close')}>
        <DialogHeader>
          <DialogTitle>{isNew ? t('users.form.createTitle') : t('users.form.editTitle')}</DialogTitle>
          {!isNew ? <DialogDescription>{t('users.form.sessionsNote')}</DialogDescription> : null}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void submit(e)} noValidate className="flex min-h-0 flex-1 flex-col gap-5">
            <DialogBody className="flex flex-col gap-5">
              <FieldGrid>
                <TextField name="firstName" label={t('users.form.firstName')} required maxLength={60} autoComplete="off" />
                <TextField name="lastName" label={t('users.form.lastName')} required maxLength={60} autoComplete="off" />
              </FieldGrid>
              <FieldGrid>
                <TextField name="email" label={t('users.form.email')} type="email" required maxLength={120} autoComplete="off" />
                <PhoneField name="phone" label={t('users.form.phone')} required />
              </FieldGrid>
              {isNew ? <PasswordWithGenerate form={form} name="password" label={t('users.form.password')} description={t('users.form.passwordHint')} /> : null}
              <FieldGrid>
                <SelectField name="role" label={t('users.form.role')} required options={options} description={t('users.form.roleHint')} />
                <SelectField name="status" label={t('users.form.status')} options={USER_STATUSES.map((s) => ({ value: s, label: t(`status.user.${s}`) }))} />
              </FieldGrid>
              <MultiSelectField name="permissions" label={t('users.form.extra')} description={t('users.form.extraHint')} options={permissionOptions} />
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

type ResetValues = z.input<typeof adminResetPasswordSchema>;
type ResetOutput = z.output<typeof adminResetPasswordSchema>;

export function ResetPasswordDialog({ user, open, onOpenChange }: { user: AdminUser | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const form = useForm<ResetValues, unknown, ResetOutput>({ resolver: zodResolver(adminResetPasswordSchema), defaultValues: { password: '' } });
  useEffect(() => {
    if (open) form.reset({ password: '' });
  }, [open, form]);
  const reset = useAdminMutation((api, v: ResetOutput) => api.admin.users.resetPassword(user!.id, v.password), { invalidate: ['users'] });
  if (!user) return null;
  const submit = form.handleSubmit(async (values) => {
    try {
      await reset.mutateAsync(values);
      toast.success(t('users.reset.done'));
      onOpenChange(false);
    } catch (error) {
      handleFormError(t, form, error);
    }
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !reset.isPending && onOpenChange(o)}>
      <DialogContent size="md" closeLabel={t('common.close')}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRoundIcon className="size-5 text-muted-foreground" aria-hidden="true" />
            {t('users.reset.title')}
          </DialogTitle>
          <DialogDescription>{t('users.reset.text', { name: `${user.firstName} ${user.lastName}` })}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void submit(e)} noValidate className="flex min-h-0 flex-1 flex-col gap-5">
            <DialogBody>
              <PasswordWithGenerate form={form} name="password" label={t('users.form.password')} description={t('users.form.passwordHint')} />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={reset.isPending}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" loading={reset.isPending}>
                {t('users.reset.action')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
