import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { resetSessionQueries, useApi, useChangePassword } from '@vero/api-client';
import { changePasswordSchema, type ChangePasswordInput } from '@vero/validation';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { applyServerErrors } from '../../lib/errors';
import { errorMessage } from '../../lib/i18n';
import { unregisterPush } from '../../lib/push';
import { toast } from '../../lib/toast';
import { useRootNavigation } from '../../navigation/hooks';
import type { ProfileStackParamList } from '../../navigation/types';
import { Button, Card, FormPasswordField, Notice, ScreenScroll } from '../../ui';
import { Info } from '../../ui/icons';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ChangePassword'>;

/** Password change. The API signs the account out on all devices afterwards — the app asks to sign in again. */
export function ChangePasswordScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const root = useRootNavigation();
  const change = useChangePassword();
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', newPasswordConfirm: '' },
  });

  const onSubmit = form.handleSubmit((v) =>
    change.mutate(v, {
      onSuccess: async () => {
        toast.success(t('settings.passwordChangedRelogin'));
        await unregisterPush();
        await api.client.clearAuth();
        await resetSessionQueries(qc);
        navigation.popToTop();
        root.navigate('Login');
      },
      onError: (e) => {
        if (!applyServerErrors(form, e, { map: { password: 'currentPassword' } })) {
          if (
            typeof e === 'object' &&
            e &&
            'code' in e &&
            (e as { code: string }).code === 'INVALID_PASSWORD'
          ) {
            form.setError('currentPassword', { type: 'server', message: 'errors.INVALID_PASSWORD' });
          } else toast.error(errorMessage(t, e));
        }
      },
    }),
  );

  return (
    <ScreenScroll keyboard bottomInset contentContainerStyle={{ gap: 16 }}>
      <Notice tone="info" icon={Info}>
        {t('settings.passwordSignOutNote')}
      </Notice>
      <Card style={{ gap: 14 }}>
        <FormPasswordField
          control={form.control}
          name="currentPassword"
          label={t('shop:fields.currentPassword')}
          autoComplete="current-password"
        />
        <FormPasswordField
          control={form.control}
          name="newPassword"
          label={t('shop:fields.newPassword')}
          hint={t('shop:auth.passwordHint')}
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <FormPasswordField
          control={form.control}
          name="newPasswordConfirm"
          label={t('shop:fields.passwordConfirm')}
          autoComplete="new-password"
          textContentType="newPassword"
        />
      </Card>
      <Button
        title={t('shop:account.changePassword')}
        size="lg"
        onPress={() => void onSubmit()}
        loading={change.isPending}
      />
    </ScreenScroll>
  );
}
