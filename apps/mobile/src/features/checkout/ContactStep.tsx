import { zodResolver } from '@hookform/resolvers/zod';
import type { UserDTO } from '@vero/types';
import { checkoutCustomerSchema, type CheckoutCustomerInput } from '@vero/validation';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View, type TextInput } from 'react-native';
import { FormPhoneField, FormTextField, Text } from '../../ui';
import type { CheckoutDraft, DraftUpdate } from './state';

export interface StepHandle {
  submit: () => void;
}

/** Recipient details (prefilled from the profile). Server field errors are shown on the matching inputs. */
export const ContactStep = forwardRef<
  StepHandle,
  {
    draft: CheckoutDraft;
    update: DraftUpdate;
    user: UserDTO | null;
    onNext: () => void;
    serverFields?: Record<string, string>;
  }
>(function ContactStep({ draft, update, user, onNext, serverFields }, ref) {
  const { t } = useTranslation();
  const lastRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const form = useForm<CheckoutCustomerInput>({
    resolver: zodResolver(checkoutCustomerSchema),
    defaultValues: draft.customer ?? {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      phone: user?.phone ?? '',
      email: user?.email ?? '',
    },
  });

  useEffect(() => {
    if (!serverFields) return;
    for (const [path, message] of Object.entries(serverFields)) {
      const field = path.replace(/^customer\./, '') as keyof CheckoutCustomerInput;
      if (['firstName', 'lastName', 'phone', 'email'].includes(field))
        form.setError(field, { type: 'server', message });
    }
  }, [serverFields, form]);

  useImperativeHandle(ref, () => ({
    submit: () =>
      void form.handleSubmit((v) => {
        update({
          customer: { firstName: v.firstName, lastName: v.lastName, phone: v.phone, email: v.email ?? '' },
        });
        onNext();
      })(),
  }));

  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 4 }}>
        <Text variant="title3">{t('shop:checkout.customerTitle')}</Text>
        <Text variant="footnote" color="mutedForeground">
          {t('shop:checkout.customerHint')}
        </Text>
      </View>
      <FormTextField
        control={form.control}
        name="firstName"
        label={t('shop:fields.firstName')}
        required
        autoComplete="given-name"
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
      />
    </View>
  );
});
