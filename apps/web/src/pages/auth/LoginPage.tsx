import { isApiError, useLogin } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import { Alert, AlertDescription, Button, Form } from '@vero/ui';
import { loginSchema, type LoginInput } from '@vero/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogInIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { PasswordField, TextField } from '../../components/form/fields';
import { AuthShell, RedirectIfAuthenticated, useAuthSuccess, useNextParam } from '../../features/auth/AuthShell';
import { useDocumentMeta } from '../../hooks/use-document-meta';
import { LocaleLink } from '../../hooks/use-lang';
import { applyServerErrors } from '../../lib/errors';
import { errorMessage } from '../../lib/i18n';
import { withQuery } from '../../lib/paths';

function LoginForm() {
  const { t } = useTranslation();
  const login = useLogin();
  const next = useNextParam();
  const { captureGuestState, done } = useAuthSuccess();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { login: '', password: '' } });

  const submit = form.handleSubmit(async (values) => {
    setFormError(null);
    captureGuestState();
    try {
      const result = await login.mutateAsync(values);
      done(result.user.firstName, 'login');
    } catch (error) {
      if (applyServerErrors(form, error)) return;
      setFormError(errorMessage(t, error));
      if (isApiError(error) && error.code === 'INVALID_CREDENTIALS') {
        form.setValue('password', '');
        form.setFocus('password');
      }
    }
  });

  return (
    <AuthShell
      title={t('shop:auth.loginTitle')}
      subtitle={t('shop:auth.loginSubtitle')}
      footer={
        <p>
          {t('shop:auth.noAccount')}{' '}
          <LocaleLink to={withQuery(STORE_ROUTES.register, { next })} className="font-semibold text-foreground underline-offset-2 hover:text-primary hover:underline dark:hover:text-brand">
            {t('shop:auth.createAccount')}
          </LocaleLink>
        </p>
      }
    >
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
          <div className="flex flex-col gap-2">
            <PasswordField control={form.control} name="password" label={t('shop:fields.password')} required autoComplete="current-password" />
            <LocaleLink
              to={withQuery(STORE_ROUTES.forgotPassword, { next })}
              className="w-fit text-sm font-semibold text-primary underline-offset-2 hover:underline dark:text-brand"
            >
              {t('shop:auth.forgot')}
            </LocaleLink>
          </div>
          <Button type="submit" size="lg" loading={login.isPending} leftIcon={<LogInIcon aria-hidden="true" />} className="mt-1 w-full">
            {t('shop:auth.loginSubmit')}
          </Button>
        </form>
      </Form>
    </AuthShell>
  );
}

export default function LoginPage() {
  const { t } = useTranslation();
  useDocumentMeta({ title: t('shop:auth.loginTitle'), noindex: true });
  return (
    <RedirectIfAuthenticated>
      <LoginForm />
    </RedirectIfAuthenticated>
  );
}
