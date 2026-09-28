import { isApiError, useMe, useRemoveAvatar, useSession, useUpdateProfile, useUploadAvatar } from '@vero/api-client';
import { LIMITS, STORE_ROUTES } from '@vero/config';
import type { UserDTO } from '@vero/types';
import { Avatar, AvatarFallback, AvatarImage, Badge, Button, Form, Input, Label, toast } from '@vero/ui';
import { updateProfileSchema, type UpdateProfileInput } from '@vero/validation';
import { getInitials } from '@vero/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { BadgeCheckIcon, CameraIcon, MailIcon, PhoneIcon, ShieldAlertIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { TextField } from '../../components/form/fields';
import { AccountCard, AccountHeading } from '../../features/account/AccountSection';
import { cooldownFromError, useCooldown, useRequestEmailVerification, useSendPhoneOtp, useVerifyPhoneOtp } from '../../features/auth/hooks';
import { useDocumentMeta } from '../../hooks/use-document-meta';
import { useFormat } from '../../hooks/use-format';
import { LocaleLink } from '../../hooks/use-lang';
import { handleFormError } from '../../lib/errors';
import { errorMessage } from '../../lib/i18n';
import { assetUrl } from '../../lib/images';

const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

function VerifiedBadge({ verified }: { verified: boolean }) {
  const { t } = useTranslation();
  return verified ? (
    <Badge variant="success" size="sm">
      <BadgeCheckIcon aria-hidden="true" />
      {t('shop:account.verified')}
    </Badge>
  ) : (
    <Badge variant="warning" size="sm">
      <ShieldAlertIcon aria-hidden="true" />
      {t('shop:account.notVerified')}
    </Badge>
  );
}

function AvatarCard({ user }: { user: UserDTO }) {
  const { t } = useTranslation();
  const upload = useUploadAvatar();
  const remove = useRemoveAvatar();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) return void toast.error(t('errors:FILE_TYPE_NOT_ALLOWED'));
    if (file.size > LIMITS.avatarMaxBytes) return void toast.error(t('errors:FILE_TOO_LARGE'));
    try {
      await upload.mutateAsync(file);
      toast.success(t('common:status.saved'));
    } catch (error) {
      toast.error(errorMessage(t, error));
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onRemove = async () => {
    try {
      await remove.mutateAsync();
      toast.success(t('common:status.deleted'));
    } catch (error) {
      toast.error(errorMessage(t, error));
    }
  };

  return (
    <AccountCard title={t('shop:account.avatar')} id="avatar">
      <div className="flex flex-wrap items-center gap-5">
        <Avatar size="xl" className="size-20 text-xl">
          {user.avatar ? <AvatarImage src={assetUrl(user.avatar.medium ?? user.avatar.url)} alt={user.fullName} /> : null}
          <AvatarFallback>{getInitials(user.fullName || user.firstName)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept={AVATAR_TYPES.join(',')}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
            <Button variant="outline" onClick={() => inputRef.current?.click()} loading={upload.isPending} leftIcon={<CameraIcon aria-hidden="true" />}>
              {user.avatar ? t('shop:account.changeAvatar') : t('common:actions.upload')}
            </Button>
            {user.avatar ? (
              <Button variant="ghost" onClick={() => void onRemove()} loading={remove.isPending} leftIcon={<Trash2Icon aria-hidden="true" />}>
                {t('shop:account.removeAvatar')}
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">{t('profile.avatarHint')}</p>
        </div>
      </div>
    </AccountCard>
  );
}

function PersonalInfoCard({ user }: { user: UserDTO }) {
  const { t } = useTranslation();
  const update = useUpdateProfile();
  const requestLink = useRequestEmailVerification();
  const [linkSent, setLinkSent] = useState(false);
  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { firstName: user.firstName, lastName: user.lastName, email: user.email ?? '' },
  });

  // follow changes made on another device / tab (realtime profile sync)
  useEffect(() => {
    if (!form.formState.isDirty) form.reset({ firstName: user.firstName, lastName: user.lastName, email: user.email ?? '' });
  }, [user.firstName, user.lastName, user.email, form]);

  const submit = form.handleSubmit(async (values) => {
    try {
      const saved = await update.mutateAsync({ ...values, email: values.email || undefined });
      form.reset({ firstName: saved.firstName, lastName: saved.lastName, email: saved.email ?? '' });
      toast.success(t('shop:account.profileSaved'));
    } catch (error) {
      handleFormError(t, form, error);
    }
  });

  const sendLink = async () => {
    try {
      await requestLink.mutateAsync();
      setLinkSent(true);
      toast.success(t('shop:account.verificationSent'));
    } catch (error) {
      toast.error(errorMessage(t, error));
    }
  };

  const emailValue = form.watch('email');
  const emailUnchanged = (emailValue ?? '').trim().toLowerCase() === (user.email ?? '');

  return (
    <AccountCard title={t('shop:account.personalInfo')} id="personal">
      <Form {...form}>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField control={form.control} name="firstName" label={t('shop:fields.firstName')} required autoComplete="given-name" maxLength={60} />
            <TextField control={form.control} name="lastName" label={t('shop:fields.lastName')} required autoComplete="family-name" maxLength={60} />
          </div>
          <div className="flex flex-col gap-2">
            <TextField control={form.control} name="email" type="email" label={t('shop:fields.emailOptional')} autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={120} />
            {user.email && emailUnchanged ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <MailIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                <VerifiedBadge verified={user.isEmailVerified} />
                {!user.isEmailVerified ? (
                  <Button type="button" variant="link" size="sm" className="h-auto px-0" onClick={() => void sendLink()} loading={requestLink.isPending} disabled={linkSent}>
                    {linkSent ? t('shop:account.verificationSent') : t('shop:account.verifyEmail')}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={update.isPending} disabled={!form.formState.isDirty}>
              {t('common:actions.saveChanges')}
            </Button>
          </div>
        </form>
      </Form>
    </AccountCard>
  );
}

function PhoneCard({ user }: { user: UserDTO }) {
  const { t } = useTranslation();
  const f = useFormat();
  const send = useSendPhoneOtp();
  const verify = useVerifyPhoneOtp();
  const cooldown = useCooldown();
  const [step, setStep] = useState<'idle' | 'code'>('idle');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const codeId = useId();

  const sendCode = async () => {
    setError(null);
    try {
      const result = await send.mutateAsync(user.phone);
      cooldown.start(result.cooldownSeconds);
      setStep('code');
      toast.success(t('shop:account.codeSent', { phone: f.phone(user.phone) }));
    } catch (e) {
      const wait = cooldownFromError(e);
      if (wait) {
        cooldown.start(wait);
        setStep('code');
      } else setError(errorMessage(t, e));
    }
  };

  const confirm = async () => {
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) return setError(t('validation:code'));
    try {
      await verify.mutateAsync({ phone: user.phone, code: code.trim() });
      toast.success(t('shop:account.phoneVerifiedDone'));
      setStep('idle');
      setCode('');
    } catch (e) {
      setError(errorMessage(t, e));
      if (isApiError(e) && (e.code === 'OTP_EXPIRED' || e.code === 'OTP_TOO_MANY_ATTEMPTS')) setCode('');
    }
  };

  return (
    <AccountCard title={t('shop:fields.phone')} description={t('profile.phoneHint')} id="phone">
      <div className="flex flex-wrap items-center gap-3">
        <PhoneIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="font-semibold tabular-nums">{f.phone(user.phone)}</span>
        <VerifiedBadge verified={user.isPhoneVerified} />
        {!user.isPhoneVerified && step === 'idle' ? (
          <Button variant="outline" size="sm" onClick={() => void sendCode()} loading={send.isPending}>
            {t('shop:account.verifyPhone')}
          </Button>
        ) : null}
      </div>
      {!user.isPhoneVerified && step === 'code' ? (
        <form
          className="flex flex-col gap-3 rounded-lg bg-surface p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void confirm();
          }}
          noValidate
        >
          <p className="text-sm text-muted-foreground">{t('shop:account.codeSent', { phone: f.phone(user.phone) })}</p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={codeId}>{t('shop:fields.code')}</Label>
              <Input
                id={codeId}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="••••••"
                className="w-40 tracking-[0.3em] tabular-nums"
                aria-invalid={!!error || undefined}
                aria-describedby={error ? `${codeId}-error` : undefined}
              />
            </div>
            <Button type="submit" loading={verify.isPending}>
              {t('common:actions.confirm')}
            </Button>
            <Button type="button" variant="ghost" disabled={cooldown.left > 0 || send.isPending} onClick={() => void sendCode()}>
              {cooldown.left > 0 ? t('shop:auth.resendIn', { seconds: cooldown.left }) : t('shop:auth.resend')}
            </Button>
          </div>
          {error ? (
            <p id={`${codeId}-error`} role="alert" className="text-[13px] font-medium text-danger">
              {error}
            </p>
          ) : null}
        </form>
      ) : error ? (
        <p role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}
    </AccountCard>
  );
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const f = useFormat();
  const session = useSession();
  const me = useMe();
  const user = me.data ?? session.user;
  useDocumentMeta({ title: t('shop:account.title'), noindex: true });
  if (!user) return null;

  return (
    <div className="flex flex-col gap-5">
      <AccountHeading
        title={t('shop:account.hello', { name: user.firstName })}
        description={t('shop:account.memberSince', { date: f.date(user.createdAt, 'monthYear') })}
        actions={
          <LocaleLink
            to={STORE_ROUTES.orders}
            className="flex items-baseline gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span className="text-muted-foreground">{t('shop:account.ordersCount')}</span>
            <span className="text-lg font-bold tabular-nums">{user.stats.ordersCount}</span>
          </LocaleLink>
        }
      />
      <PersonalInfoCard user={user} />
      <PhoneCard user={user} />
      <AvatarCard user={user} />
    </div>
  );
}
