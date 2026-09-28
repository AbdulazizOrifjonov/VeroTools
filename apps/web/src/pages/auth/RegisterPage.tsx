import { useRegister } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import { Alert, AlertDescription, Button, Form } from '@vero/ui';
import { registerSchema, V, z } from '@vero/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlusIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';
import { CheckboxField, PasswordField, PhoneField, TextField } from '../../components/form/fields';
import { AuthShell, RedirectIfAuthenticated, useAuthSuccess, useNextParam } from '../../features/auth/AuthShell';
import { useDocumentMeta } from '../../hooks/use-document-meta';
import { LocaleLink } from '../../hooks/use-lang';
import { applyServerErrors } from '../../lib/errors';
import { errorMessage } from '../../lib/i18n';
import { withQuery } from '../../lib/paths';

/** API schema + password confirmation (client only) and a boolean checkbox. */
const formSchema = registerSchema
  .extend({
    acceptTerms: z.boolean().refine((v) => v, { error: V.acceptTerms }),
    passwordConfirm: z.string(V.required).min(1, V.required),
  })
  .refine((v) => v.password === v.passwordConfirm, { error: V.passwordMismatch, path: ['passwordConfirm'] });
type RegisterFormValues = z.input<typeof formSchema>;

const linkClass = 'font-semibold text-foreground underline underline-offset-2 hover:text-primary dark:hover:text-brand';

function RegisterForm() {
  const { t } = useTranslation();
  const register = useRegister();
  const next = useNextParam();
  const { captureGuestState, done } = useAuthSuccess();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { firstName: '', lastName: '', phone: '', email: '', password: '', passwordConfirm: '', acceptTerms: false },
  });

  const submit = form.handleSubmit(async (values) => {
    setFormError(null);
    captureGuestState();
    try {
      const result = await register.mutateAsync({
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        email: values.email || undefined,
        password: values.password,
        acceptTerms: true,
      });
      done(result.user.firstName, 'register');
    } catch (error) {
      if (applyServerErrors(form, error)) return;
      setFormError(errorMessage(t, error));
    }
  });

  return (
    <AuthShell
      title={t('shop:auth.registerTitle')}
      subtitle={t('shop:auth.registerSubtitle')}
      footer={
        <p>
          {t('shop:auth.haveAccount')}{' '}
          <LocaleLink to={withQuery(STORE_ROUTES.login, { next })} className="font-semibold text-foreground underline-offset-2 hover:text-primary hover:underline dark:hover:text-brand">
            {t('shop:auth.signIn')}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField control={form.control} name="firstName" label={t('shop:fields.firstName')} required autoComplete="given-name" maxLength={60} />
            <TextField control={form.control} name="lastName" label={t('shop:fields.lastName')} required autoComplete="family-name" maxLength={60} />
          </div>
          <PhoneField control={form.control} name="phone" label={t('shop:fields.phone')} required />
          <TextField control={form.control} name="email" type="email" label={t('shop:fields.emailOptional')} autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={120} />
          <div className="grid gap-4 sm:grid-cols-2">
            <PasswordField control={form.control} name="password" label={t('shop:fields.password')} required autoComplete="new-password" />
            <PasswordField control={form.control} name="passwordConfirm" label={t('shop:fields.passwordConfirm')} required autoComplete="new-password" />
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">{t('shop:auth.passwordHint')}</p>
          <CheckboxField
            control={form.control}
            name="acceptTerms"
            label={
              <Trans
                i18nKey="legal.acceptTerms"
                components={{
                  terms: <LocaleLink to="/terms" target="_blank" className={linkClass} />,
                  privacy: <LocaleLink to="/privacy" target="_blank" className={linkClass} />,
                }}
              />
            }
          />
          <Button type="submit" size="lg" loading={register.isPending} leftIcon={<UserPlusIcon aria-hidden="true" />} className="mt-1 w-full">
            {t('shop:auth.registerSubmit')}
          </Button>
        </form>
      </Form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  const { t } = useTranslation();
  useDocumentMeta({ title: t('shop:auth.registerTitle'), noindex: true });
  return (
    <RedirectIfAuthenticated>
      <RegisterForm />
    </RedirectIfAuthenticated>
  );
}
