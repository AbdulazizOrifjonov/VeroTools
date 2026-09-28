import { zodResolver } from '@hookform/resolvers/zod';
import { isApiError, useLogin } from '@vero/api-client';
import { loginSchema, type LoginInput } from '@vero/validation';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type TextInput } from 'react-native';
import { AuthLayout } from '../../features/auth/AuthLayout';
import { applyServerErrors } from '../../lib/errors';
import { haptic } from '../../lib/haptics';
import { errorMessage } from '../../lib/i18n';
import { toast } from '../../lib/toast';
import type { RootScreenProps } from '../../navigation/types';
import { useTheme } from '../../theme/theme';
import { Button, FormPasswordField, FormTextField, Notice, Text } from '../../ui';
import { BadgeCheck, CircleAlert } from '../../ui/icons';

/** Sign in with a phone number or e-mail + password. The guest cart / wishlist / compare merge automatically. */
export function LoginScreen({ navigation, route }: RootScreenProps<'Login'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const login = useLogin();
  const next = route.params?.next ?? 'back';
  const passwordRef = useRef<TextInput>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: '', password: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    login.mutate(values, {
      onSuccess: (res) => {
        haptic.success();
        toast.success(t('shop:auth.welcomeBack', { name: res.user.firstName }));
        if (next === 'Checkout') navigation.replace('Checkout');
        else navigation.goBack();
      },
      onError: (error) => {
        if (applyServerErrors(form, error)) return;
        setFormError(
          isApiError(error) && error.code === 'VALIDATION_ERROR'
            ? t('errors:INVALID_CREDENTIALS')
            : errorMessage(t, error),
        );
      },
    });
  });

  return (
    <AuthLayout
      title={t('shop:auth.loginTitle')}
      subtitle={t('shop:auth.loginSubtitle')}
      footer={
        <View style={styles.switchRow}>
          <Text variant="callout" color="mutedForeground">
            {t('shop:auth.noAccount')}
          </Text>
          <Pressable
            onPress={() => navigation.replace('Register', { next })}
            accessibilityRole="link"
            hitSlop={10}
          >
            <Text variant="callout" weight="bold" color="link">
              {t('shop:auth.createAccount')}
            </Text>
          </Pressable>
        </View>
      }
    >
      {formError ? (
        <Notice tone="danger" icon={CircleAlert}>
          {formError}
        </Notice>
      ) : null}
      <FormTextField
        control={form.control}
        name="login"
        label={t('shop:fields.login')}
        placeholder="+998 90 123 45 67"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        keyboardType="email-address"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        submitBehavior="submit"
      />
      <FormPasswordField
        ref={passwordRef}
        control={form.control}
        name="password"
        label={t('shop:fields.password')}
        autoComplete="current-password"
        returnKeyType="go"
        onSubmitEditing={() => void onSubmit()}
      />
      <Pressable
        onPress={() => navigation.navigate('ForgotPassword')}
        accessibilityRole="link"
        hitSlop={10}
        style={{ alignSelf: 'flex-end' }}
      >
        <Text variant="subhead" weight="bold" color="link">
          {t('shop:auth.forgot')}
        </Text>
      </Pressable>
      <Button
        title={t('shop:auth.loginSubmit')}
        size="lg"
        onPress={() => void onSubmit()}
        loading={login.isPending}
      />
      <View style={[styles.benefits, { backgroundColor: colors.surface }]}>
        {[t('auth.benefitOrders'), t('auth.benefitLists'), t('auth.benefitCheckout')].map((b) => (
          <View key={b} style={styles.benefit}>
            <BadgeCheck size={17} color={colors.success} />
            <Text variant="footnote" style={{ flex: 1 }}>
              {b}
            </Text>
          </View>
        ))}
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  benefits: { borderRadius: 12, padding: 14, gap: 10 },
  benefit: { flexDirection: 'row', gap: 10, alignItems: 'center' },
});
