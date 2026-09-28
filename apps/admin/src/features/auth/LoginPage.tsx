import { zodResolver } from '@hookform/resolvers/zod';
import { isApiError, useApi, useSession } from '@vero/api-client';
import { Alert, AlertDescription, Button, Form, Logo, toast } from '@vero/ui';
import { loginSchema, type LoginInput } from '@vero/validation';
import { LockKeyholeIcon, LogInIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Navigate, useSearchParams } from 'react-router';
import { PasswordField, TextField } from '../../components/form/fields';
import { LanguageMenu, ThemeMenu } from '../../components/layout/menus';
import { errorMessage } from '../../lib/i18n';

/** Only same-app relative paths are accepted as ?next= (no open redirects). */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/login')) return '/';
  return value;
}

export default function LoginPage() {
  const { t } = useTranslation();
  const api = useApi();
  const session = useSession();
  const [search] = useSearchParams();
  const next = safeNext(search.get('next'));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = `${t('auth.submit')} · VERO TOOLS Admin`;
  }, [t]);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: '', password: '' },
  });

  if (session.isAuthenticated && session.isStaff) return <Navigate to={next} replace />;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const result = await api.auth.login(values);
      toast.success(t('auth.welcome', { name: result.user.firstName }));
    } catch (e) {
      form.setValue('password', '');
      if (isApiError(e) && e.code === 'FORBIDDEN') setError(t('auth.notStaff'));
      else setError(errorMessage(t, e));
    }
  });

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <div className="flex justify-end gap-1 p-3">
        <LanguageMenu />
        <ThemeMenu />
      </div>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-[25rem]">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <Logo size={64} />
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold tracking-[-0.02em] text-foreground">{t('auth.title')}</h1>
              <p className="text-sm text-muted-foreground">{t('auth.subtitle')}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <Form {...form}>
              <form onSubmit={(e) => void onSubmit(e)} noValidate className="flex flex-col gap-4">
                {error ? (
                  <Alert variant="danger">
                    <AlertDescription className="text-foreground">{error}</AlertDescription>
                  </Alert>
                ) : null}
                <TextField name="login" label={t('auth.login')} placeholder={t('auth.loginPlaceholder')} autoComplete="username" required autoFocus inputMode="email" />
                <PasswordField name="password" label={t('auth.password')} autoComplete="current-password" required />
                <Button type="submit" size="lg" loading={form.formState.isSubmitting} leftIcon={<LogInIcon />} className="mt-1 w-full">
                  {t('auth.submit')}
                </Button>
              </form>
            </Form>
          </div>
          <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <LockKeyholeIcon className="size-3.5" aria-hidden="true" />
            {t('auth.secure')}
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">{t('auth.footer', { year: new Date().getFullYear() })}</p>
        </div>
      </main>
    </div>
  );
}
