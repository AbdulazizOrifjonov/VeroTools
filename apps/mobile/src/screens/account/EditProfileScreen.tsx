import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMe, useRequestEmailVerification, useUpdateProfile } from '@vero/api-client';
import { updateProfileSchema, type UpdateProfileInput } from '@vero/validation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { applyServerErrors } from '../../lib/errors';
import { useFormat } from '../../lib/format';
import { errorMessage } from '../../lib/i18n';
import { toast } from '../../lib/toast';
import type { ProfileStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/theme';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  FormTextField,
  ListRow,
  LoadingView,
  ScreenScroll,
  Text,
} from '../../ui';
import { BadgeCheck, KeyRound, Phone } from '../../ui/icons';

type Props = NativeStackScreenProps<ProfileStackParamList, 'EditProfile'>;

/** Personal information (name, e-mail) + phone / e-mail verification and password change. */
export function EditProfileScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const f = useFormat();
  const { colors } = useTheme();
  const me = useMe();
  const update = useUpdateProfile();
  const requestEmail = useRequestEmailVerification();
  const user = me.data;
  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { firstName: '', lastName: '', email: '' },
  });

  useEffect(() => {
    if (user) form.reset({ firstName: user.firstName, lastName: user.lastName, email: user.email ?? '' });
  }, [user, form]);

  if (me.isPending) return <LoadingView />;
  if (me.isError || !user) return <ErrorState error={me.error} onRetry={() => void me.refetch()} />;

  const onSave = form.handleSubmit((v) =>
    update.mutate(
      { ...v, email: v.email || undefined },
      {
        onSuccess: () => toast.success(t('shop:account.profileSaved')),
        onError: (e) => {
          if (!applyServerErrors(form, e)) toast.error(errorMessage(t, e));
        },
      },
    ),
  );

  return (
    <ScreenScroll keyboard bottomInset contentContainerStyle={{ gap: 16 }}>
      <Card style={{ gap: 14 }}>
        <Text variant="headline">{t('shop:account.personalInfo')}</Text>
        <FormTextField
          control={form.control}
          name="firstName"
          label={t('shop:fields.firstName')}
          required
          autoComplete="given-name"
        />
        <FormTextField
          control={form.control}
          name="lastName"
          label={t('shop:fields.lastName')}
          required
          autoComplete="family-name"
        />
        <FormTextField
          control={form.control}
          name="email"
          label={t('shop:fields.email')}
          optionalLabel={t('common:labels.optional')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
        />
        <Button
          title={t('common:actions.saveChanges')}
          onPress={() => void onSave()}
          loading={update.isPending}
          disabled={!form.formState.isDirty}
        />
      </Card>

      <Card style={{ gap: 12 }}>
        <Text variant="headline">{t('shop:account.security')}</Text>
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Phone size={17} color={colors.mutedForeground} />
            <Text variant="callout" weight="semibold" tabular style={{ flex: 1 }}>
              {f.phone(user.phone)}
            </Text>
            <Badge
              label={user.isPhoneVerified ? t('shop:account.verified') : t('shop:account.notVerified')}
              tone={user.isPhoneVerified ? 'success' : 'warning'}
              icon={user.isPhoneVerified ? BadgeCheck : undefined}
              size="sm"
            />
          </View>
          <Text variant="footnote" color="mutedForeground">
            {t('profile.phoneHint')}
          </Text>
          {!user.isPhoneVerified ? (
            <Button
              title={t('shop:account.verifyPhone')}
              variant="outline"
              onPress={() => navigation.navigate('VerifyPhone')}
            />
          ) : null}
        </View>
        {user.email ? (
          <View style={{ gap: 6, paddingTop: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text variant="callout" weight="semibold" style={{ flex: 1 }} numberOfLines={1}>
                {user.email}
              </Text>
              <Badge
                label={user.isEmailVerified ? t('shop:account.verified') : t('shop:account.notVerified')}
                tone={user.isEmailVerified ? 'success' : 'warning'}
                icon={user.isEmailVerified ? BadgeCheck : undefined}
                size="sm"
              />
            </View>
            {!user.isEmailVerified ? (
              <Button
                title={t('shop:account.verifyEmail')}
                variant="outline"
                loading={requestEmail.isPending}
                onPress={() =>
                  requestEmail.mutate(undefined, {
                    onSuccess: () =>
                      toast.success(t('shop:account.verificationSent'), { message: t('auth.checkSpam') }),
                    onError: (e) => toast.error(errorMessage(t, e)),
                  })
                }
              />
            ) : null}
          </View>
        ) : (
          <Text variant="footnote" color="mutedForeground">
            {t('settings.noEmail')}
          </Text>
        )}
      </Card>

      <Card padded={false}>
        <ListRow
          icon={KeyRound}
          title={t('shop:account.changePassword')}
          onPress={() => navigation.navigate('ChangePassword')}
        />
      </Card>
      <Text variant="caption" color="mutedForeground" align="center">
        {t('shop:settings.deleteAccountHint')}
      </Text>
    </ScreenScroll>
  );
}
