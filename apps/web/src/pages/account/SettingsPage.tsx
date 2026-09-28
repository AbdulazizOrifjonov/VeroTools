import { useChangePassword, useLogout, useMe, useSession, useUpdatePreferences } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import type { NotificationPreferences } from '@vero/types';
import { Button, Form, Label, Switch, toast } from '@vero/ui';
import { changePasswordSchema, type ChangePasswordInput } from '@vero/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { PasswordField } from '../../components/form/fields';
import { LanguageButtons } from '../../components/layout/LanguageSwitcher';
import { ThemeButtons } from '../../components/layout/ThemeToggle';
import { AccountCard, AccountHeading } from '../../features/account/AccountSection';
import { useDocumentMeta } from '../../hooks/use-document-meta';
import { LocaleLink, useLocaleNavigate } from '../../hooks/use-lang';
import { handleFormError } from '../../lib/errors';
import { errorMessage } from '../../lib/i18n';
import { withQuery } from '../../lib/paths';

type PrefKey = keyof NotificationPreferences;

function PreferenceSwitch({ id, label, hint, checked, onChange, disabled }: { id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <Label htmlFor={id} className="font-medium">
          {label}
        </Label>
        {hint ? (
          <span id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} aria-describedby={hint ? `${id}-hint` : undefined} />
    </div>
  );
}

function NotificationSettings() {
  const { t } = useTranslation();
  const session = useSession();
  const me = useMe();
  const update = useUpdatePreferences();
  const baseId = useId();
  const server = (me.data ?? session.user)?.preferences.notifications;
  const [local, setLocal] = useState<NotificationPreferences | undefined>(server);

  // follow server changes (another device, realtime sync)
  useEffect(() => {
    if (server) setLocal(server);
  }, [server]);

  if (!local) return null;

  const set = (key: PrefKey, value: boolean) => {
    const previous = local;
    setLocal({ ...local, [key]: value });
    update.mutate(
      { notifications: { [key]: value } },
      {
        onSuccess: () => toast.success(t('shop:settings.saved'), { id: 'settings-saved' }),
        onError: (error) => {
          setLocal(previous);
          toast.error(errorMessage(t, error));
        },
      },
    );
  };

  const channels: Array<{ key: PrefKey; label: string; hint?: string }> = [
    { key: 'email', label: t('shop:settings.channelEmail'), hint: session.user?.email ? session.user.email : t('settings.noEmail') },
    { key: 'sms', label: t('shop:settings.channelSms') },
    { key: 'push', label: t('shop:settings.channelPush'), hint: t('settings.pushHint') },
  ];
  const topics: Array<{ key: PrefKey; label: string }> = [
    { key: 'promotions', label: t('shop:settings.promotions') },
    { key: 'priceDrops', label: t('shop:settings.priceDrops') },
    { key: 'backInStock', label: t('shop:settings.backInStock') },
  ];

  return (
    <AccountCard title={t('shop:settings.notificationChannels')} description={t('settings.notificationsHint')} id="notifications">
      <div className="grid gap-6 md:grid-cols-2">
        <fieldset className="flex flex-col divide-y divide-border">
          <legend className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t('settings.channels')}</legend>
          {channels.map((c) => (
            <PreferenceSwitch key={c.key} id={`${baseId}-${c.key}`} label={c.label} hint={c.hint} checked={local[c.key]} onChange={(v) => set(c.key, v)} />
          ))}
        </fieldset>
        <fieldset className="flex flex-col divide-y divide-border">
          <legend className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t('settings.topics')}</legend>
          {topics.map((c) => (
            <PreferenceSwitch key={c.key} id={`${baseId}-${c.key}`} label={c.label} checked={local[c.key]} onChange={(v) => set(c.key, v)} />
          ))}
        </fieldset>
      </div>
    </AccountCard>
  );
}

function ChangePasswordCard() {
  const { t } = useTranslation();
  const change = useChangePassword();
  const logout = useLogout();
  const navigate = useLocaleNavigate();
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', newPasswordConfirm: '' },
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      await change.mutateAsync(values);
    } catch (error) {
      handleFormError(t, form, error);
      return;
    }
    // the API signs every session out after a password change — sign in again with the new password
    toast.success(t('settings.passwordChangedRelogin'));
    try {
      await logout.mutateAsync();
    } catch {
      /* the session is already revoked */
    }
    navigate(withQuery(STORE_ROUTES.login, { next: STORE_ROUTES.settings }), { replace: true });
  });

  return (
    <AccountCard title={t('shop:account.changePassword')} description={t('shop:auth.passwordHint')} id="password">
      <Form {...form}>
        <form onSubmit={submit} noValidate className="flex max-w-xl flex-col gap-4">
          <PasswordField control={form.control} name="currentPassword" label={t('shop:fields.currentPassword')} required autoComplete="current-password" />
          <div className="grid gap-4 sm:grid-cols-2">
            <PasswordField control={form.control} name="newPassword" label={t('shop:fields.newPassword')} required autoComplete="new-password" />
            <PasswordField control={form.control} name="newPasswordConfirm" label={t('shop:fields.passwordConfirm')} required autoComplete="new-password" />
          </div>
          <p className="text-xs text-muted-foreground">{t('settings.passwordSignOutNote')}</p>
          <div>
            <Button type="submit" loading={change.isPending || logout.isPending}>
              {t('shop:account.changePassword')}
            </Button>
          </div>
        </form>
      </Form>
    </AccountCard>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  useDocumentMeta({ title: t('shop:settings.title'), noindex: true });
  return (
    <div className="flex flex-col gap-5">
      <AccountHeading title={t('shop:settings.title')} />
      <div className="grid gap-5 md:grid-cols-2">
        <AccountCard title={t('shop:settings.appearance')} id="appearance">
          <ThemeButtons />
        </AccountCard>
        <AccountCard title={t('shop:settings.language')} id="language">
          <LanguageButtons />
        </AccountCard>
      </div>
      <NotificationSettings />
      <ChangePasswordCard />
      <p className="text-sm text-muted-foreground">
        {t('shop:settings.deleteAccountHint')}{' '}
        <LocaleLink to={STORE_ROUTES.contacts} className="font-semibold text-foreground underline-offset-2 hover:underline">
          {t('common:nav.contact')}
        </LocaleLink>
      </p>
    </div>
  );
}
