import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAddresses, useMe, useSaveAddress } from '@vero/api-client';
import { addressSchema, type AddressInput } from '@vero/validation';
import { useEffect, useLayoutEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { AddressFields } from '../../features/address/AddressFields';
import { applyServerErrors } from '../../lib/errors';
import { errorMessage } from '../../lib/i18n';
import { toast } from '../../lib/toast';
import type { ProfileStackParamList } from '../../navigation/types';
import {
  Button,
  Card,
  Checkbox,
  FormPhoneField,
  FormTextField,
  LoadingView,
  ScreenScroll,
  Text,
} from '../../ui';

type Props = NativeStackScreenProps<ProfileStackParamList, 'AddressForm'>;

const EMPTY: AddressInput = {
  label: '',
  firstName: '',
  lastName: '',
  phone: '',
  region: '',
  city: '',
  district: '',
  street: '',
  house: '',
  apartment: '',
  comment: '',
  isDefault: false,
};

/** Add / edit an address: recipient, region → city (UZ_REGIONS), street, house … */
export function AddressFormScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const addresses = useAddresses();
  const me = useMe();
  const save = useSaveAddress();
  const id = route.params?.id;
  const existing = id ? addresses.data?.find((a) => a.id === id) : undefined;
  const form = useForm<AddressInput>({ resolver: zodResolver(addressSchema), defaultValues: EMPTY });

  useLayoutEffect(() => {
    navigation.setOptions({ title: id ? t('shop:addresses.edit') : t('shop:addresses.add') });
  }, [navigation, id, t]);

  useEffect(() => {
    if (existing) {
      form.reset({
        label: existing.label ?? '',
        firstName: existing.firstName,
        lastName: existing.lastName,
        phone: existing.phone,
        region: existing.region,
        city: existing.city,
        district: existing.district ?? '',
        street: existing.street,
        house: existing.house,
        apartment: existing.apartment ?? '',
        comment: existing.comment ?? '',
        isDefault: existing.isDefault,
      });
    } else if (!id && me.data) {
      form.reset({
        ...EMPTY,
        firstName: me.data.firstName,
        lastName: me.data.lastName,
        phone: me.data.phone,
        isDefault: !addresses.data?.length,
      });
    }
  }, [existing, id, me.data, addresses.data?.length, form]);

  if (id && addresses.isPending) return <LoadingView />;

  const onSubmit = form.handleSubmit((v) =>
    save.mutate(
      { id, input: v },
      {
        onSuccess: () => {
          toast.success(t('shop:addresses.saved'));
          navigation.goBack();
        },
        onError: (e) => {
          if (!applyServerErrors(form, e)) toast.error(errorMessage(t, e));
        },
      },
    ),
  );

  return (
    <ScreenScroll keyboard bottomInset contentContainerStyle={{ gap: 16 }}>
      <Card style={{ gap: 14 }}>
        <Text variant="headline">{t('shop:checkout.recipient')}</Text>
        <FormTextField
          control={form.control}
          name="label"
          label={t('shop:fields.label')}
          optionalLabel={t('common:labels.optional')}
          maxLength={40}
        />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <FormTextField
            control={form.control}
            name="firstName"
            label={t('shop:fields.firstName')}
            required
            containerStyle={{ flex: 1 }}
            autoComplete="given-name"
          />
          <FormTextField
            control={form.control}
            name="lastName"
            label={t('shop:fields.lastName')}
            required
            containerStyle={{ flex: 1 }}
            autoComplete="family-name"
          />
        </View>
        <FormPhoneField control={form.control} name="phone" label={t('shop:fields.phone')} required />
      </Card>
      <Card style={{ gap: 14 }}>
        <Text variant="headline">{t('shop:checkout.addressTitle')}</Text>
        <AddressFields control={form.control} setValue={form.setValue} />
        <Checkbox
          checked={!!form.watch('isDefault')}
          onChange={(v) => form.setValue('isDefault', v, { shouldDirty: true })}
          label={t('shop:addresses.makeDefault')}
        />
      </Card>
      <Button
        title={t('common:actions.save')}
        size="lg"
        onPress={() => void onSubmit()}
        loading={save.isPending}
      />
    </ScreenScroll>
  );
}
