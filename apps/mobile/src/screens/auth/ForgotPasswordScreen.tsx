import { zodResolver } from '@hookform/resolvers/zod';
import { useForgotPassword, useResetPassword } from '@vero/api-client';
import { normalizeUzPhone, maskUzPhone } from '@vero/utils';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from '@vero/validation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { AuthLayout } from '../../features/auth/AuthLayout';
import { applyServerErrors } from '../../lib/errors';
import { errorMessage } from '../../lib/i18n';
import { toast } from '../../lib/toast';
import type { RootScreenProps } from '../../navigation/types';
import { Button, FormPasswordField, FormTextField, Notice, StateIcon, Text } from '../../ui';
import { CircleAlert, Mail } from '../../ui/icons';

function useCooldown(initial = 0) {
  const [left, setLeft] = useState(initial);
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  return [left, setLeft] as const;
}

/** Password recovery: phone → SMS code → new password, or e-mail → "check your inbox". */
export function ForgotPasswordScreen({ navigation }: RootScreenProps<'ForgotPassword'>) {
  const { t } = useTranslation();
  const forgot = useForgotPassword();
  const reset = useResetPassword();
  const [stage, setStage] = useState<'request' | 'sms' | 'email'>('request');
  const [phone, setPhone] = useState<string | null>(null);
  const [cooldown, setCooldown] = useCooldown();
  const [error, setError] = useState<string | null>(null);

  const requestForm = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { login: '' },
  });
  const resetForm = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { phone: '', code: '', password: '', passwordConfirm: '' },
  });

  const send = (login: string) => {
    setError(null);
    forgot.mutate(
      { login },
      {
        onSuccess: (res) => {
          setCooldown(res.cooldownSeconds ?? 60);
          if (res.channel === 'sms') {
            const p = normalizeUzPhone(login) ?? login;
            setPhone(p);
            resetForm.setValue('phone', p);
            setStage('sms');
          } else setStage('email');
        },
        onError: (e) => {
          if (!applyServerErrors(requestForm, e)) setError(errorMessage(t, e));
        },
      },
    );
  };

  const onRequest = requestForm.handleSubmit((v) => send(v.login));
  const onReset = resetForm.handleSubmit((v) => {
    setError(null);
    reset.mutate(
      { phone: phone ?? v.phone, code: v.code, password: v.password, passwordConfirm: v.passwordConfirm },
      {
        onSuccess: () => {
          toast.success(t('shop:auth.resetSuccess'));
          navigation.replace('Login');
        },
        onError: (e) => {
          if (!applyServerErrors(resetForm, e)) setError(errorMessage(t, e));
        },
      },
    );
  });

  if (stage === 'email') {
    return (
      <AuthLayout title={t('shop:auth.forgotTitle')}>
        <View style={{ alignItems: 'center', gap: 12 }}>
          <StateIcon icon={Mail} tone="brand" />
          <Text variant="body" align="center">
            {t('shop:auth.sentEmail')}
          </Text>
          <Text variant="footnote" color="mutedForeground" align="center">
            {t('auth.checkSpam')}
          </Text>
        </View>
        <Button title={t('shop:auth.signIn')} size="lg" onPress={() => navigation.replace('Login')} />
        <Button title={t('auth.tryAnother')} variant="ghost" onPress={() => setStage('request')} />
      </AuthLayout>
    );
  }

  if (stage === 'sms') {
    return (
      <AuthLayout
        title={t('shop:auth.resetTitle')}
        subtitle={phone ? t('shop:account.codeSent', { phone: maskUzPhone(phone) }) : t('shop:auth.sentSms')}
      >
        {error ? (
          <Notice tone="danger" icon={CircleAlert}>
            {error}
          </Notice>
        ) : null}
        <FormTextField
          control={resetForm.control}
          name="code"
          label={t('shop:fields.code')}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={6}
          placeholder="••••••"
          inputStyle={{ letterSpacing: 6, fontVariant: ['tabular-nums'] }}
        />
        <FormPasswordField
          control={resetForm.control}
          name="password"
          label={t('shop:fields.newPassword')}
          hint={t('shop:auth.passwordHint')}
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <FormPasswordField
          control={resetForm.control}
          name="passwordConfirm"
          label={t('shop:fields.passwordConfirm')}
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <Button
          title={t('shop:auth.resetSubmit')}
          size="lg"
          onPress={() => void onReset()}
          loading={reset.isPending}
        />
        <Pressable
          disabled={cooldown > 0 || forgot.isPending}
          onPress={() => phone && send(phone)}
          accessibilityRole="button"
          accessibilityState={{ disabled: cooldown > 0 }}
          style={{ alignSelf: 'center', paddingVertical: 8 }}
        >
          <Text variant="subhead" weight="bold" color={cooldown > 0 ? 'mutedForeground' : 'link'} tabular>
            {cooldown > 0 ? t('shop:auth.resendIn', { seconds: cooldown }) : t('shop:auth.resend')}
          </Text>
        </Pressable>
        <Button title={t('auth.changeNumber')} variant="ghost" onPress={() => setStage('request')} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t('shop:auth.forgotTitle')} subtitle={t('shop:auth.forgotText')}>
      {error ? (
        <Notice tone="danger" icon={CircleAlert}>
          {error}
        </Notice>
      ) : null}
      <FormTextField
        control={requestForm.control}
        name="login"
        label={t('shop:fields.login')}
        placeholder="+998 90 123 45 67"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        returnKeyType="send"
        onSubmitEditing={() => void onRequest()}
      />
      <Button
        title={t('shop:auth.forgotSubmit')}
        size="lg"
        onPress={() => void onRequest()}
        loading={forgot.isPending}
        disabled={cooldown > 0}
      />
      {cooldown > 0 ? (
        <Text variant="footnote" color="mutedForeground" align="center" tabular>
          {t('shop:auth.resendIn', { seconds: cooldown })}
        </Text>
      ) : null}
    </AuthLayout>
  );
}
