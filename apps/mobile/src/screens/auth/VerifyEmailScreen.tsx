import { useRequestEmailVerification, useSession, useVerifyEmail } from '@vero/api-client';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';
import { AuthLayout } from '../../features/auth/AuthLayout';
import { errorMessage } from '../../lib/i18n';
import { toast } from '../../lib/toast';
import type { RootScreenProps } from '../../navigation/types';
import { useTheme } from '../../theme/theme';
import { Button, Notice, StateIcon, Text } from '../../ui';
import { CircleAlert, CircleCheck } from '../../ui/icons';

/** Confirms the e-mail address from the verification link (…/verify-email?token=…). */
export function VerifyEmailScreen({ navigation, route }: RootScreenProps<'VerifyEmail'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isAuthenticated } = useSession();
  const verify = useVerifyEmail();
  const resend = useRequestEmailVerification();
  const token = route.params?.token;
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    verify.mutate(token);
  }, [token, verify]);

  const done = verify.isSuccess;
  const failed = !token || verify.isError;

  return (
    <AuthLayout title={t('shop:account.verifyEmail')}>
      {verify.isPending ? (
        <View style={{ alignItems: 'center', gap: 12, paddingVertical: 24 }}>
          <ActivityIndicator color={colors.link} />
          <Text variant="callout" color="mutedForeground">
            {t('auth.verifying')}
          </Text>
        </View>
      ) : done ? (
        <View style={{ alignItems: 'center', gap: 12 }}>
          <StateIcon icon={CircleCheck} tone="success" />
          <Text variant="title3" align="center">
            {t('shop:account.emailVerifiedDone')}
          </Text>
          <Button
            title={t('common:actions.continue')}
            size="lg"
            onPress={() => navigation.goBack()}
            style={{ alignSelf: 'stretch' }}
          />
        </View>
      ) : failed ? (
        <View style={{ gap: 14 }}>
          <Notice tone="danger" icon={CircleAlert}>
            {token ? errorMessage(t, verify.error) : t('errors:TOKEN_INVALID')}
          </Notice>
          {isAuthenticated ? (
            <Button
              title={t('auth.sendNewLink')}
              size="lg"
              loading={resend.isPending}
              onPress={() =>
                resend.mutate(undefined, {
                  onSuccess: () => toast.success(t('shop:account.verificationSent')),
                  onError: (e) => toast.error(errorMessage(t, e)),
                })
              }
            />
          ) : (
            <>
              <Text variant="callout" color="mutedForeground" align="center">
                {t('auth.signInToResend')}
              </Text>
              <Button title={t('shop:auth.signIn')} size="lg" onPress={() => navigation.replace('Login')} />
            </>
          )}
        </View>
      ) : null}
    </AuthLayout>
  );
}
