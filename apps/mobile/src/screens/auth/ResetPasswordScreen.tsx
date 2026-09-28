import { zodResolver } from '@hookform/resolvers/zod';
import { useResetPassword } from '@vero/api-client';
import { resetPasswordSchema, type ResetPasswordInput } from '@vero/validation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '../../features/auth/AuthLayout';
import { applyServerErrors } from '../../lib/errors';
import { errorMessage } from '../../lib/i18n';
import { toast } from '../../lib/toast';
import type { RootScreenProps } from '../../navigation/types';
import { Button, FormPasswordField, Notice } from '../../ui';
import { CircleAlert } from '../../ui/icons';

/** New password from the e-mail reset link (…/reset-password?token=…). */
export function ResetPasswordScreen({ navigation, route }: RootScreenProps<'ResetPassword'>) {
  const { t } = useTranslation();
  const reset = useResetPassword();
  const token = route.params?.token;
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: '', passwordConfirm: '' },
  });

  const onSubmit = form.handleSubmit((v) => {
    setError(null);
    reset.mutate(
      { token, password: v.password, passwordConfirm: v.passwordConfirm },
      {
        onSuccess: () => {
          toast.success(t('shop:auth.resetSuccess'));
          navigation.replace('Login');
        },
        onError: (e) => {
          if (!applyServerErrors(form, e)) setError(errorMessage(t, e));
        },
      },
    );
  });

  if (!token) {
    return (
      <AuthLayout title={t('shop:auth.resetTitle')}>
        <Notice tone="danger" icon={CircleAlert}>
          {t('errors:TOKEN_INVALID')}
        </Notice>
        <Button
          title={t('auth.requestNewLink')}
          size="lg"
          onPress={() => navigation.replace('ForgotPassword')}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t('shop:auth.resetTitle')}>
      {error ? (
        <Notice tone="danger" icon={CircleAlert}>
          {error}
        </Notice>
      ) : null}
      <FormPasswordField
        control={form.control}
        name="password"
        label={t('shop:fields.newPassword')}
        hint={t('shop:auth.passwordHint')}
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <FormPasswordField
        control={form.control}
        name="passwordConfirm"
        label={t('shop:fields.passwordConfirm')}
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <Button
        title={t('shop:auth.resetSubmit')}
        size="lg"
        onPress={() => void onSubmit()}
        loading={reset.isPending}
      />
    </AuthLayout>
  );
}
