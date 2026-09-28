import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMe, useSendOtp, useVerifyOtp } from '@vero/api-client';
import { maskUzPhone } from '@vero/utils';
import { verifyOtpSchema } from '@vero/validation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { haptic } from '../../lib/haptics';
import { errorMessage, translateValidation } from '../../lib/i18n';
import { toast } from '../../lib/toast';
import type { ProfileStackParamList } from '../../navigation/types';
import { Button, Card, LoadingView, Notice, ScreenScroll, StateIcon, Text, TextField } from '../../ui';
import { CircleAlert, Smartphone } from '../../ui/icons';

type Props = NativeStackScreenProps<ProfileStackParamList, 'VerifyPhone'>;

/** Phone verification: send an SMS code (with resend cooldown) and confirm it. */
export function VerifyPhoneScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const me = useMe();
  const send = useSendOtp();
  const verify = useVerifyOtp();
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const phone = me.data?.phone;

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  if (me.isPending || !phone) return <LoadingView />;

  const request = () => {
    setError(null);
    send.mutate(
      { phone, purpose: 'verify_phone' },
      {
        onSuccess: (res) => {
          setSent(true);
          setCooldown(res.cooldownSeconds ?? 60);
        },
        onError: (e) => setError(errorMessage(t, e)),
      },
    );
  };

  const confirm = () => {
    const parsed = verifyOtpSchema.safeParse({ phone, code });
    if (!parsed.success) {
      setError(
        translateValidation(
          t,
          parsed.error.issues.find((i) => i.path[0] === 'code')?.message ?? parsed.error.issues[0]?.message,
        ) ?? null,
      );
      return;
    }
    setError(null);
    verify.mutate(
      { phone, code: parsed.data.code },
      {
        onSuccess: () => {
          haptic.success();
          toast.success(t('shop:account.phoneVerifiedDone'));
          navigation.goBack();
        },
        onError: (e) => setError(errorMessage(t, e)),
      },
    );
  };

  return (
    <ScreenScroll keyboard bottomInset contentContainerStyle={{ gap: 16 }}>
      <Card style={{ gap: 14, alignItems: 'stretch' }}>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <StateIcon icon={Smartphone} tone="brand" />
          <Text variant="callout" color="mutedForeground" align="center">
            {sent
              ? t('shop:account.codeSent', { phone: maskUzPhone(phone) })
              : t('profile.verifyPhoneText', { phone: maskUzPhone(phone) })}
          </Text>
        </View>
        {error ? (
          <Notice tone="danger" icon={CircleAlert}>
            {error}
          </Notice>
        ) : null}
        {sent ? (
          <>
            <TextField
              label={t('shop:fields.code')}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              maxLength={6}
              placeholder="••••••"
              inputStyle={{ letterSpacing: 6, fontVariant: ['tabular-nums'] }}
              returnKeyType="done"
              onSubmitEditing={confirm}
            />
            <Button
              title={t('common:actions.confirm')}
              size="lg"
              onPress={confirm}
              loading={verify.isPending}
              disabled={code.length !== 6}
            />
            <Pressable
              onPress={request}
              disabled={cooldown > 0 || send.isPending}
              accessibilityRole="button"
              style={{ alignSelf: 'center', paddingVertical: 8 }}
            >
              <Text variant="subhead" weight="bold" color={cooldown > 0 ? 'mutedForeground' : 'link'} tabular>
                {cooldown > 0 ? t('shop:auth.resendIn', { seconds: cooldown }) : t('shop:auth.resend')}
              </Text>
            </Pressable>
          </>
        ) : (
          <Button title={t('profile.sendCode')} size="lg" onPress={request} loading={send.isPending} />
        )}
      </Card>
    </ScreenScroll>
  );
}
