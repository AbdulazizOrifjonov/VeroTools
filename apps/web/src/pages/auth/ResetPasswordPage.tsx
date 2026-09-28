import { isApiError, useForgotPassword, useResetPassword } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import { Alert, AlertDescription, Button, Form, toast } from '@vero/ui';
import { passwordSchema, V, z } from '@vero/validation';
import { normalizeUzPhone } from '@vero/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftIcon, KeyRoundIcon, LinkIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { PasswordField, TextField } from '../../components/form/fields';
import { AuthShell, useNextParam } from '../../features/auth/AuthShell';
import { cooldownFromError, useCooldown } from '../../features/auth/hooks';
import { useDocumentMeta } from '../../hooks/use-document-meta';
import { useFormat } from '../../hooks/use-format';
import { LocaleLink, useLocaleNavigate } from '../../hooks/use-lang';
import { applyServerErrors } from '../../lib/errors';
import { errorMessage } from '../../lib/i18n';
import { withQuery } from '../../lib/paths';

const passwords = {
  password: passwordSchema,
  passwordConfirm: z.string(V.required).min(1, V.required),
};
const match = (v: { password: string; passwordConfirm: string }) => v.password === v.passwordConfirm;
const tokenSchema = z.object(passwords).refine(match, { error: V.passwordMismatch, path: ['passwordConfirm'] });
const codeSchema = z
  .object({ code: z.string(V.required).trim().regex(/^\d{6}$/, V.code), ...passwords })
  .refine(match, { error: V.passwordMismatch, path: ['passwordConfirm'] });
type ResetValues = { code?: string; password: string; passwordConfirm: string };

const linkClass = 'inline-flex items-center gap-1.5 font-semibold text-foreground underline-offset-2 hover:text-primary hover:underline dark:hover:text-brand';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const navigate = useLocaleNavigate();
  const next = useNextParam();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() || null;
  const phone = normalizeUzPhone(searchParams.get('phone')) || null;
  const mode: 'token' | 'code' | null = token ? 'token' : phone ? 'code' : null;
  const reset = useResetPassword();
  const resend = useForgotPassword();
  const cooldown = useCooldown(Number(searchParams.get('cooldown')) || 0);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  useDocumentMeta({ title: t('shop:auth.resetTitle'), noindex: true });

  const schema = useMemo(() => (mode === 'code' ? codeSchema : tokenSchema), [mode]);
  const form = useForm<ResetValues>({
    resolver: zodResolver(schema as z.ZodType<ResetValues, ResetValues>),
    defaultValues: { code: '', password: '', passwordConfirm: '' },
  });

  const forgotLink = withQuery(STORE_ROUTES.forgotPassword, { next });
  const footer = (
    <LocaleLink to={withQuery(STORE_ROUTES.login, { next })} className={linkClass}>
      <ArrowLeftIcon className="size-4" aria-hidden="true" />
      {t('common:nav.login')}
    </LocaleLink>
  );

  if (!mode || linkError) {
    return (
      <AuthShell title={t('shop:auth.resetTitle')} aside={false} footer={footer}>
        <Alert variant="danger" icon={<LinkIcon />}>
          <AlertDescription className="text-foreground">{linkError ?? t('errors:TOKEN_INVALID')}</AlertDescription>
        </Alert>
        <Button asChild size="lg">
          <LocaleLink to={forgotLink}>{t('auth.requestNewLink')}</LocaleLink>
        </Button>
      </AuthShell>
    );
  }

  const submit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await reset.mutateAsync(
        mode === 'token'
          ? { token: token!, password: values.password, passwordConfirm: values.passwordConfirm }
          : { phone: phone!, code: values.code?.trim(), password: values.password, passwordConfirm: values.passwordConfirm },
      );
      toast.success(t('shop:auth.resetSuccess'));
      navigate(withQuery(STORE_ROUTES.login, { next }), { replace: true });
    } catch (error) {
      if (isApiError(error)) {
        if (error.code === 'TOKEN_INVALID' || error.code === 'TOKEN_EXPIRED') {
          setLinkError(errorMessage(t, error));
          return;
        }
        if (error.code === 'OTP_INVALID') {
          form.setError('code', { type: 'server', message: 'errors.OTP_INVALID' }, { shouldFocus: true });
          return;
        }
      }
      if (applyServerErrors(form, error)) return;
      setFormError(errorMessage(t, error));
    }
  });

  const resendCode = async () => {
    if (!phone) return;
    setFormError(null);
    try {
      const result = await resend.mutateAsync({ login: phone });
      cooldown.start(result.cooldownSeconds ?? 60);
      toast.success(t('shop:auth.sentSms'));
    } catch (error) {
      const wait = cooldownFromError(error);
      if (wait) cooldown.start(wait);
      else setFormError(errorMessage(t, error));
    }
  };

  return (
    <AuthShell
      title={t('shop:auth.resetTitle')}
      subtitle={mode === 'code' ? t('shop:auth.sentSms') : t('shop:auth.passwordHint')}
      aside={false}
      footer={footer}
    >
      {mode === 'code' ? (
        <div className="-mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-semibold tabular-nums">{f.phone(phone)}</span>
          <LocaleLink to={forgotLink} className="font-semibold text-primary underline-offset-2 hover:underline dark:text-brand">
            {t('auth.changeNumber')}
          </LocaleLink>
        </div>
      ) : null}
      <Form {...form}>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          {formError ? (
            <Alert variant="danger">
              <AlertDescription className="text-foreground">{formError}</AlertDescription>
            </Alert>
          ) : null}
          {mode === 'code' ? (
            <div className="flex flex-col gap-2">
              <TextField
                control={form.control}
                name="code"
                label={t('shop:fields.code')}
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                placeholder="••••••"
                className="max-w-56"
              />
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto w-fit px-0"
                disabled={cooldown.left > 0 || resend.isPending}
                onClick={() => void resendCode()}
              >
                {cooldown.left > 0 ? t('shop:auth.resendIn', { seconds: cooldown.left }) : t('shop:auth.resend')}
              </Button>
            </div>
          ) : null}
          <PasswordField control={form.control} name="password" label={t('shop:fields.newPassword')} required autoComplete="new-password" />
          <PasswordField control={form.control} name="passwordConfirm" label={t('shop:fields.passwordConfirm')} required autoComplete="new-password" />
          {mode === 'code' ? <p className="-mt-2 text-xs text-muted-foreground">{t('shop:auth.passwordHint')}</p> : null}
          <Button type="submit" size="lg" loading={reset.isPending} leftIcon={<KeyRoundIcon aria-hidden="true" />} className="mt-1 w-full">
            {t('shop:auth.resetSubmit')}
          </Button>
        </form>
      </Form>
    </AuthShell>
  );
}
