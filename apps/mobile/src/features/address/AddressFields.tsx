import { findRegion, UZ_REGIONS, type Language } from '@vero/config';
import type { AddressSnapshot } from '@vero/types';
import { useEffect, useMemo, useRef } from 'react';
import {
  Controller,
  useWatch,
  type Control,
  type FieldPath,
  type FieldValues,
  type UseFormSetValue,
} from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { usePrefs } from '../../lib/prefs';
import { FormTextField, SelectField, useFieldError } from '../../ui';

/** City / district label in the current language (addresses store the Uzbek name from UZ_REGIONS). */
export function cityLabel(regionCode: string, city: string, lang: Language): string {
  const region = findRegion(regionCode);
  const match = region?.cities.find(
    (c) => c.name.uz === city || c.name.ru === city || c.name.en === city || c.code === city,
  );
  return match ? match.name[lang] : city;
}

export function regionLabel(regionCode: string, lang: Language, fallback?: string): string {
  return findRegion(regionCode)?.name[lang] ?? fallback ?? regionCode;
}

/** "Toshkent shahri, Chilonzor tumani, Qatortol ko'chasi, 12, 34-xonadon" style one-liner. */
export function formatAddress(
  a: Pick<AddressSnapshot, 'region' | 'city' | 'street' | 'house' | 'apartment' | 'district'> & {
    regionName?: string;
  },
  lang: Language,
  t: (k: string, o?: Record<string, unknown>) => string,
): string {
  const parts = [
    regionLabel(a.region, lang, a.regionName),
    cityLabel(a.region, a.city, lang),
    a.district,
    [a.street, a.house].filter(Boolean).join(', '),
    a.apartment ? t('address.apartmentShort', { value: a.apartment }) : null,
  ].filter(Boolean);
  return parts.join(', ');
}

function RegionCitySelects<T extends FieldValues>({
  control,
  setValue,
}: {
  control: Control<T>;
  setValue: UseFormSetValue<T>;
}) {
  const { t } = useTranslation();
  const lang = usePrefs((s) => s.language);
  const region = useWatch({ control, name: 'region' as FieldPath<T> }) as string | undefined;
  const city = useWatch({ control, name: 'city' as FieldPath<T> }) as string | undefined;
  const previousRegion = useRef(region);

  useEffect(() => {
    if (previousRegion.current !== undefined && previousRegion.current !== region) {
      setValue('city' as FieldPath<T>, '' as never, { shouldValidate: false });
    }
    previousRegion.current = region;
  }, [region, setValue]);

  const regions = useMemo(() => UZ_REGIONS.map((r) => ({ value: r.code, label: r.name[lang] })), [lang]);
  const cities = useMemo(() => {
    const r = findRegion(region);
    const list = (r?.cities ?? []).map((c) => ({ value: c.name.uz, label: c.name[lang] }));
    if (city && !list.some((c) => c.value === city))
      list.unshift({ value: city, label: cityLabel(region ?? '', city, lang) });
    return list;
  }, [region, city, lang]);

  return (
    <>
      <Controller
        control={control}
        name={'region' as FieldPath<T>}
        render={({ field, fieldState }) => (
          <RegionField
            label={t('shop:fields.region')}
            placeholder={t('shop:fields.selectRegion')}
            value={field.value as string}
            options={regions}
            onSelect={field.onChange}
            message={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name={'city' as FieldPath<T>}
        render={({ field, fieldState }) => (
          <RegionField
            label={t('shop:fields.city')}
            placeholder={region ? t('shop:fields.selectCity') : t('address.regionFirst')}
            value={field.value as string}
            options={cities}
            onSelect={field.onChange}
            message={fieldState.error?.message}
            disabled={!region}
          />
        )}
      />
    </>
  );
}

function RegionField({
  label,
  placeholder,
  value,
  options,
  onSelect,
  message,
  disabled,
}: {
  label: string;
  placeholder: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onSelect: (v: string) => void;
  message?: string;
  disabled?: boolean;
}) {
  const error = useFieldError(message);
  return (
    <SelectField
      label={label}
      placeholder={placeholder}
      value={value}
      options={options}
      onSelect={onSelect}
      error={error}
      required
      disabled={disabled}
    />
  );
}

/** Region → city selects (UZ_REGIONS) + street, house, apartment, landmark and courier comment. */
export function AddressFields<T extends FieldValues>({
  control,
  setValue,
  withComment = true,
}: {
  control: Control<T>;
  setValue: UseFormSetValue<T>;
  withComment?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.root}>
      <RegionCitySelects control={control} setValue={setValue} />
      <FormTextField
        control={control}
        name={'street' as FieldPath<T>}
        label={t('shop:fields.street')}
        required
        autoComplete="street-address"
        maxLength={160}
      />
      <View style={styles.row}>
        <FormTextField
          control={control}
          name={'house' as FieldPath<T>}
          label={t('shop:fields.house')}
          required
          maxLength={30}
          containerStyle={styles.flex}
        />
        <FormTextField
          control={control}
          name={'apartment' as FieldPath<T>}
          label={t('shop:fields.apartment')}
          maxLength={20}
          containerStyle={styles.flex}
        />
      </View>
      <FormTextField
        control={control}
        name={'district' as FieldPath<T>}
        label={t('shop:fields.district')}
        maxLength={80}
      />
      {withComment ? (
        <FormTextField
          control={control}
          name={'comment' as FieldPath<T>}
          label={t('shop:fields.comment')}
          multiline
          maxLength={300}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 14 },
  row: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
});
