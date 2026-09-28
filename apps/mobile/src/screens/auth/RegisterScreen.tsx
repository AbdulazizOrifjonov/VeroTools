import { zodResolver } from '@hookform/resolvers/zod';
import { useRegister } from '@vero/api-client';
import { registerSchema, type RegisterInput } from '@vero/validation';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type TextInput } from 'react-native';
import { AuthLayout } from '../../features/auth/AuthLayout';
import { applyServerErrors } from '../../lib/errors';
import { haptic } from '../../lib/haptics';
import { errorMessage, translateValidation } from '../../lib/i18n';
import type { RootScreenProps } from '../../navigation/types';
import { toast } from '../../lib/toast';
import { Button, Checkbox, FormPasswordField, FormPhoneField, FormTextField, Notice, Text } from '../../ui';
import { CircleAlert } from '../../ui/icons';

/** Account for the website and the app: name, +998 phone, optional e-mail, password, terms. */
export function RegisterScreen({ navigation, route }: RootScreenProps<'Register'>) {
  const { t } = useTranslation();
  const register = useRegister();
  const next = route.params?.next ?? 'back';
  const [formError, setFormError] = useState<string | null>(null);
  const lastRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      password: '',
      acceptTerms: false as unknown as true,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    register.mutate(
      { ...values, email: values.email || undefined },
      {
        onSuccess: (res) => {
          haptic.success();
          toast.success(t('shop:auth.welcome', { name: res.user.firstName }));
          if (next === 'Checkout') navigation.replace('Checkout');
          else navigation.goBack();
        },
        onError: (error) => {
          if (!applyServerErrors(form, error)) setFormError(errorMessage(t, error));
        },
      },
    );
  });

  return (
    <AuthLayout
      title={t('shop:auth.registerTitle')}
      subtitle={t('shop:auth.registerSubtitle')}
      footer={
        <View style={styles.switchRow}>
          <Text variant="callout" color="mutedForeground">
            {t('shop:auth.haveAccount')}
          </Text>
          <Pressable
            onPress={() => navigation.replace('Login', { next })}
            accessibilityRole="link"
            hitSlop={10}
          >
            <Text variant="callout" weight="bold" color="link">
              {t('shop:auth.signIn')}
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
        name="firstName"
        label={t('shop:fields.firstName')}
        required
        autoComplete="given-name"
        textContentType="givenName"
        returnKeyType="next"
        onSubmitEditing={() => lastRef.current?.focus()}
        submitBehavior="submit"
      />
      <FormTextField
        ref={lastRef}
        control={form.control}
        name="lastName"
        label={t('shop:fields.lastName')}
        required
        autoComplete="family-name"
        textContentType="familyName"
        returnKeyType="next"
        onSubmitEditing={() => phoneRef.current?.focus()}
        submitBehavior="submit"
      />
      <FormPhoneField
        ref={phoneRef}
        control={form.control}
        name="phone"
        label={t('shop:fields.phone')}
        required
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <FormTextField
        ref={emailRef}
        control={form.control}
        name="email"
        label={t('shop:fields.email')}
        optionalLabel={t('common:labels.optional')}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        submitBehavior="submit"
      />
      <FormPasswordField
        ref={passwordRef}
        control={form.control}
        name="password"
        label={t('shop:fields.password')}
        required
        hint={t('shop:auth.passwordHint')}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
      />
      <Controller
        control={form.control}
        name="acceptTerms"
        render={({ field, fieldState }) => (
          <View style={{ gap: 6 }}>
            <Checkbox
              checked={field.value === true}
              onChange={(v) => field.onChange(v)}
              error={!!fieldState.error}
              accessibilityLabel={t('shop:auth.acceptTerms')}
              label={
                <Text variant="callout">
                  {t('auth.acceptPrefix')}{' '}
                  <Text
                    variant="callout"
                    weight="bold"
                    color="link"
                    onPress={() => navigation.navigate('Page', { slug: 'terms' })}
                    accessibilityRole="link"
                  >
                    {t('auth.termsLink')}
                  </Text>{' '}
                  {t('auth.and')}{' '}
                  <Text
                    variant="callout"
                    weight="bold"
                    color="link"
                    onPress={() => navigation.navigate('Page', { slug: 'privacy' })}
                    accessibilityRole="link"
                  >
                    {t('auth.privacyLink')}
                  </Text>
                  {t('auth.acceptSuffix')}
                </Text>
              }
            />
            {fieldState.error ? (
              <Text variant="footnote" color="danger" weight="medium" accessibilityRole="alert">
                {translateValidation(t, fieldState.error.message)}
              </Text>
            ) : null}
          </View>
        )}
      />
      <Button
        title={t('shop:auth.registerSubmit')}
        size="lg"
        onPress={() => void onSubmit()}
        loading={register.isPending}
      />
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
});
