import { useForgotPassword } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import { Alert, AlertDescription, Button, Form } from '@vero/ui';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@vero/validation';
import { isEmail, normalizeUzPhone } from '@vero/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftIcon, MailCheckIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { TextField } from '../../components/form/fields';
import { AuthShell, useNextParam } from '../../features/auth/AuthShell';
import { cooldownFromError } from '../../features/auth/hooks';
import { useDocumentMeta } from '../../hooks/use-document-meta';
import { LocaleLink, useLocaleNavigate } from '../../hooks/use-lang';
import { applyServerErrors } from '../../lib/errors';
import { errorMessage } from '../../lib/i18n';
import { withQuery } from '../../lib/paths';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const navigate = useLocaleNavigate();
  const next = useNextParam();
  const forgot = useForgotPassword();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { login: '' } });
  useDocumentMeta({ title: t('shop:auth.forgotTitle'), noindex: true });

  const toCodeStep = (phone: string, cooldown: number) =>
    navigate(withQuery(STORE_ROUTES.resetPassword, { phone, cooldown, next }), { state: { fromForgot: true } });

  const submit = form.handleSubmit(async ({ login }) => {
    setFormError(null);
    const value = login.trim();
    if (!isEmail(value) && !normalizeUzPhone(value)) {
      form.setError('login', { type: 'validate', message: value.includes('@') ? 'validation.email' : 'validation.phone' }, { shouldFocus: true });
      return;
    }
    try {
      const result = await forgot.mutateAsync({ login: value });
      if (result.channel === 'email') setSentTo(value);
      else toCodeStep(normalizeUzPhone(value) ?? value, result.cooldownSeconds ?? 60);
    } catch (error) {
      // a code was sent a moment ago — continue with it
      const wait = cooldownFromError(error);
      const phone = normalizeUzPhone(value);
      if (wait && phone) return toCodeStep(phone, wait);
      if (applyServerErrors(form, error)) return;
      setFormError(errorMessage(t, error));
    }
  });

  const backToLogin = (
    <LocaleLink to={withQuery(STORE_ROUTES.login, { next })} className="inline-flex items-center gap-1.5 font-semibold text-foreground underline-offset-2 hover:text-primary hover:underline dark:hover:text-brand">
      <ArrowLeftIcon className="size-4" aria-hidden="true" />
      {t('common:nav.login')}
    </LocaleLink>
  );

  if (sentTo) {
    return (
      <AuthShell title={t('shop:auth.forgotTitle')} aside={false} footer={backToLogin}>
        <div className="flex flex-col items-start gap-4" role="status">
          <span className="flex size-12 items-center justify-center rounded-full bg-success-soft text-success" aria-hidden="true">
            <MailCheckIcon className="size-6" />
          </span>
          <p className="text-sm leading-relaxed">{t('shop:auth.sentEmail')}</p>
          <p className="font-semibold break-all">{sentTo}</p>
          <p className="text-xs text-muted-foreground">{t('auth.checkSpam')}</p>
          <Button variant="outline" onClick={() => setSentTo(null)}>
            {t('auth.tryAnother')}
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('shop:auth.forgotTitle')} subtitle={t('shop:auth.forgotText')} aside={false} footer={backToLogin}>
      <Form {...form}>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          {formError ? (
            <Alert variant="danger">
              <AlertDescription className="text-foreground">{formError}</AlertDescription>
            </Alert>
          ) : null}
          <TextField
            control={form.control}
            name="login"
            label={t('shop:fields.login')}
            required
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="+998 90 123 45 67"
            maxLength={120}
          />
          <Button type="submit" size="lg" loading={forgot.isPending} className="w-full">
            {t('shop:auth.forgotSubmit')}
          </Button>
        </form>
      </Form>
    </AuthShell>
  );
}
