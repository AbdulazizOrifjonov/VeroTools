import { useQueryClient } from '@tanstack/react-query';
import { useApi, useSession, type VeroApi } from '@vero/api-client';
import { API_HEADERS, LANGUAGES, LANGUAGE_LABELS, LIMITS, type Language } from '@vero/config';
import { hasPermission, PERMISSION_GROUPS, type AuthResult, type Permission, type UserDTO } from '@vero/types';
import { Badge, Button, Form, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast, ToggleGroup, ToggleGroupItem, useTheme, type ThemePreference } from '@vero/ui';
import { changePasswordSchema, email as emailSchema, updateProfileSchema } from '@vero/validation';
import { CameraIcon, MailCheckIcon, MonitorIcon, MoonIcon, SunIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import type { z } from 'zod';
import { Page, PageHeader, Panel, usePageMeta } from '../../components/common/page';
import { PersonAvatar } from '../../components/common/PersonAvatar';
import { PasswordField, TextField } from '../../components/form/fields';
import { FieldGrid, UnsavedChangesGuard } from '../../components/form/form-kit';
import { useChangeLanguage } from '../../components/layout/menus';
import { handleFormError, toastError } from '../../lib/errors';
import { formResolver } from '../../lib/forms';
import { useFormat } from '../../lib/format';
import { imageRefThumb } from '../../lib/images';
import { getCurrentLanguage } from '../../lib/language';
import { roleName } from '../../lib/permissions';

// staff sign in with their email, so it cannot be cleared here
const profileSchema = updateProfileSchema.extend({ email: emailSchema });
type ProfileValues = z.input<typeof profileSchema>;
type ProfileOutput = z.output<typeof profileSchema>;
type PasswordValues = z.input<typeof changePasswordSchema>;
type PasswordOutput = z.output<typeof changePasswordSchema>;

const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Login right after a password change. Sent without the old (now revoked) bearer token: the API answers
 * 401 SESSION_EXPIRED to a login request that still carries one, so `api.auth.login` cannot be used here.
 */
async function signInAgain(api: VeroApi, login: string, password: string): Promise<void> {
  const res = await fetch(`${api.client.config.baseUrl}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', [API_HEADERS.client]: 'admin', [API_HEADERS.language]: getCurrentLanguage() },
    body: JSON.stringify({ login, password }),
  });
  if (!res.ok) throw new Error(`login ${res.status}`);
  const payload = (await res.json()) as { data: AuthResult };
  await api.client.applyAuth(payload.data);
}

function AvatarEditor({ user }: { user: UserDTO }) {
  const { t } = useTranslation();
  const api = useApi();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);
  const name = user.fullName || `${user.firstName} ${user.lastName}`.trim();

  const upload = async (file: File) => {
    if (!AVATAR_TYPES.includes(file.type)) return void toast.error(t('profile.avatarType'));
    if (file.size > LIMITS.avatarMaxBytes) return void toast.error(t('profile.avatarTooLarge'));
    setBusy('upload');
    try {
      await api.account.uploadAvatar(file);
      toast.success(t('profile.avatarSaved'));
    } catch (error) {
      toastError(t, error);
    } finally {
      setBusy(null);
    }
  };
  const remove = async () => {
    setBusy('remove');
    try {
      await api.account.removeAvatar();
      toast.success(t('profile.avatarRemoved'));
    } catch (error) {
      toastError(t, error);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <PersonAvatar name={name} src={imageRefThumb(user.avatar)} size="xl" />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" leftIcon={<CameraIcon />} loading={busy === 'upload'} disabled={!!busy} onClick={() => input.current?.click()}>
            {user.avatar ? t('profile.avatarChange') : t('profile.avatarUpload')}
          </Button>
          {user.avatar ? (
            <Button type="button" variant="ghost" size="sm" className="text-danger hover:text-danger" leftIcon={<Trash2Icon />} loading={busy === 'remove'} disabled={!!busy} onClick={() => void remove()}>
              {t('profile.avatarRemove')}
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">{t('profile.avatarHint')}</p>
      </div>
      <input
        ref={input}
        type="file"
        accept={AVATAR_TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-label={t('profile.avatar')}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void upload(file);
        }}
      />
    </div>
  );
}

function DetailsPanel({ user }: { user: UserDTO }) {
  const { t } = useTranslation();
  const api = useApi();
  const f = useFormat();
  const defaults = (u: UserDTO): ProfileValues => ({ firstName: u.firstName, lastName: u.lastName, email: u.email ?? '' });
  const form = useForm<ProfileValues, unknown, ProfileOutput>({ resolver: formResolver<ProfileValues, typeof profileSchema>(profileSchema), defaultValues: defaults(user) });
  const [sending, setSending] = useState(false);
  const dirty = form.formState.isDirty;

  const submit = form.handleSubmit(async (values) => {
    try {
      const saved = await api.account.updateProfile(values);
      form.reset(defaults(saved));
      toast.success(t('profile.saved'));
    } catch (error) {
      handleFormError(t, form, error);
    }
  });

  const sendVerification = async () => {
    setSending(true);
    try {
      await api.auth.requestEmailVerification();
      toast.success(t('profile.verificationSent', { email: user.email }));
    } catch (error) {
      toastError(t, error);
    } finally {
      setSending(false);
    }
  };

  return (
    <Panel title={t('profile.details')} description={t('profile.memberSince', { date: f.date(user.createdAt) })}>
      <div className="flex flex-col gap-6">
        <AvatarEditor user={user} />
        <Form {...form}>
          <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-4">
            <FieldGrid>
              <TextField name="firstName" label={t('users.form.firstName')} required maxLength={60} autoComplete="given-name" />
              <TextField name="lastName" label={t('users.form.lastName')} required maxLength={60} autoComplete="family-name" />
            </FieldGrid>
            <FieldGrid>
              <div className="flex flex-col gap-2">
                <TextField name="email" type="email" label={t('users.form.email')} required maxLength={120} autoComplete="email" description={t('profile.emailHint')} />
                {user.email && !dirty ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={user.isEmailVerified ? 'success' : 'warning'} size="sm">
                      {user.isEmailVerified ? t('profile.emailVerified') : t('profile.emailNotVerified')}
                    </Badge>
                    {!user.isEmailVerified ? (
                      <Button type="button" variant="link" size="xs" className="h-auto px-0" leftIcon={<MailCheckIcon />} loading={sending} onClick={() => void sendVerification()}>
                        {t('profile.sendVerification')}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="profile-phone">{t('common.phone')}</Label>
                <Input id="profile-phone" value={f.phone(user.phone)} readOnly aria-describedby="profile-phone-hint" className="bg-muted/40 tabular" />
                <p id="profile-phone-hint" className="text-xs text-muted-foreground">
                  {t('profile.phoneHint')}
                </p>
              </div>
            </FieldGrid>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
              {dirty ? (
                <Button type="button" variant="ghost" onClick={() => form.reset(defaults(user))} disabled={form.formState.isSubmitting}>
                  {t('form.discard')}
                </Button>
              ) : null}
              <Button type="submit" loading={form.formState.isSubmitting} disabled={!dirty}>
                {t('common.save')}
              </Button>
            </div>
          </form>
        </Form>
      </div>
      <UnsavedChangesGuard when={dirty} />
    </Panel>
  );
}

function PasswordPanel({ user }: { user: UserDTO }) {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const form = useForm<PasswordValues, unknown, PasswordOutput>({
    resolver: formResolver<PasswordValues, typeof changePasswordSchema>(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', newPasswordConfirm: '' },
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      await api.account.changePassword(values);
    } catch (error) {
      handleFormError(t, form, error);
      return;
    }
    form.reset();
    // the API signs out every session, this one included — sign straight back in with the new password
    try {
      await signInAgain(api, user.email ?? user.phone, values.newPassword);
      toast.success(t('profile.passwordChanged'));
    } catch {
      await api.auth.logout().catch(() => undefined);
      qc.clear();
      toast.success(t('profile.passwordRelogin'));
      void navigate('/login', { replace: true });
    }
  });
  return (
    <Panel title={t('profile.password')} description={t('profile.passwordHint')}>
      <Form {...form}>
        <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-4">
          {/* lets password managers pair the new password with the account */}
          <input type="text" name="username" autoComplete="username" value={user.email ?? user.phone} readOnly hidden />
          <PasswordField name="currentPassword" label={t('profile.currentPassword')} required autoComplete="current-password" />
          <FieldGrid>
            <PasswordField name="newPassword" label={t('profile.newPassword')} required description={t('profile.newPasswordHint')} />
            <PasswordField name="newPasswordConfirm" label={t('profile.confirmPassword')} required />
          </FieldGrid>
          <div className="flex justify-end border-t border-border pt-4">
            <Button type="submit" loading={form.formState.isSubmitting}>
              {t('profile.changePassword')}
            </Button>
          </div>
        </form>
      </Form>
    </Panel>
  );
}

function PreferencesPanel() {
  const { t, i18n } = useTranslation();
  const api = useApi();
  const changeLanguage = useChangeLanguage();
  const { preference, setPreference } = useTheme();
  const langId = useId();
  const themeId = useId();
  const current = (i18n.resolvedLanguage ?? i18n.language) as Language;

  const setLanguage = async (lang: Language) => {
    await changeLanguage(lang);
    try {
      // emails and notifications for this account follow the same language
      await api.account.updatePreferences({ language: lang });
      toast.success(t('profile.languageSaved'));
    } catch (error) {
      toastError(t, error);
    }
  };

  return (
    <Panel title={t('profile.preferences')}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label id={langId}>{t('profile.language')}</Label>
          <Select value={current} onValueChange={(v) => void setLanguage(v as Language)}>
            <SelectTrigger aria-labelledby={langId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang} value={lang} lang={lang}>
                  {LANGUAGE_LABELS[lang].native}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t('profile.languageHint')}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label id={themeId}>{t('profile.theme')}</Label>
          <ToggleGroup type="single" variant="outline" value={preference} onValueChange={(v) => v && setPreference(v as ThemePreference)} aria-labelledby={themeId} className="grid w-full grid-cols-3">
            <ToggleGroupItem value="light" className="h-auto min-w-0 flex-col gap-1 px-1 py-2 text-xs">
              <SunIcon aria-hidden="true" />
              {t('common:theme.light')}
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" className="h-auto min-w-0 flex-col gap-1 px-1 py-2 text-xs">
              <MoonIcon aria-hidden="true" />
              {t('common:theme.dark')}
            </ToggleGroupItem>
            <ToggleGroupItem value="system" className="h-auto min-w-0 flex-col gap-1 px-1 py-2 text-xs">
              <MonitorIcon aria-hidden="true" />
              {t('common:theme.system')}
            </ToggleGroupItem>
          </ToggleGroup>
          <p className="text-xs text-muted-foreground">{t('profile.themeHint')}</p>
        </div>
      </div>
    </Panel>
  );
}

function AccessPanel({ user }: { user: UserDTO }) {
  const { t } = useTranslation();
  const all = user.permissions.includes('*');
  const sections = Object.entries(PERMISSION_GROUPS).filter(([, keys]) => all || keys.some((k) => hasPermission(user.permissions, k as Permission)));
  return (
    <Panel title={t('profile.access')} description={t('profile.accessHint')}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={user.role === 'SUPER_ADMIN' ? 'default' : 'secondary'}>{roleName(t, user.role)}</Badge>
          <span className="text-[13px] text-muted-foreground">{all ? t('roles.allPermissions') : t('profile.permissionsCount', { count: user.permissions.length })}</span>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-muted-foreground">{t('profile.sections')}</h3>
          <ul className="flex flex-wrap gap-1.5">
            {sections.map(([group]) => (
              <li key={group}>
                <Badge variant="outline" size="sm">
                  {t(`enums.permissionGroup.${group}`)}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  );
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useSession();
  usePageMeta(t('profile.title'));
  const api = useApi();
  // fresh copy of the account (verification state, avatar) when the page opens
  useEffect(() => {
    void api.auth.me().catch(() => undefined);
  }, [api]);
  if (!user) return null;
  return (
    <Page>
      <PageHeader title={t('profile.title')} description={t('profile.description')} />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <DetailsPanel key={user.id} user={user} />
          <PasswordPanel user={user} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <PreferencesPanel />
          <AccessPanel user={user} />
        </div>
      </div>
    </Page>
  );
}
