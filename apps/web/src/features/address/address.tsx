import { findRegion, UZ_REGIONS, type Language } from '@vero/config';
import type { AddressSnapshot } from '@vero/types';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useWatch, type Control, type FieldPath, type FieldValues, type UseFormSetValue } from 'react-hook-form';
import { SelectField, TextareaField, TextField } from '../../components/form/fields';
import { useLang } from '../../hooks/use-lang';

/** City / district label in the current language (addresses store the Uzbek name from UZ_REGIONS). */
export function cityLabel(regionCode: string, city: string, lang: Language): string {
  const region = findRegion(regionCode);
  const match = region?.cities.find((c) => c.name.uz === city || c.name.ru === city || c.name.en === city || c.code === city);
  return match ? match.name[lang] : city;
}

export function regionLabel(regionCode: string, lang: Language, fallback?: string): string {
  return findRegion(regionCode)?.name[lang] ?? fallback ?? regionCode;
}

/** "Chilonzor tumani, Qatortol ko'chasi 12, 34-xonadon" style one-liner. */
export function formatAddress(
  a: Pick<AddressSnapshot, 'region' | 'city' | 'street' | 'house' | 'apartment' | 'district'> & { regionName?: string },
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

interface AddressFieldsProps<T extends FieldValues> {
  control: Control<T>;
  setValue: UseFormSetValue<T>;
  /** show the courier comment field */
  withComment?: boolean;
}

/** Region → city / district selects (UZ_REGIONS) + street, house, apartment, landmark, courier comment. */
export function AddressFields<T extends FieldValues>({ control, setValue, withComment = true }: AddressFieldsProps<T>) {
  const { t } = useTranslation();
  const lang = useLang();
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
    // keep a stored city that is not in the reference list (older addresses)
    if (city && !list.some((c) => c.value === city)) list.unshift({ value: city, label: cityLabel(region ?? '', city, lang) });
    return list;
  }, [region, city, lang]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SelectField
        control={control}
        name={'region' as FieldPath<T>}
        label={t('shop:fields.region')}
        placeholder={t('shop:fields.selectRegion')}
        options={regions}
        required
      />
      <SelectField
        control={control}
        name={'city' as FieldPath<T>}
        label={t('shop:fields.city')}
        placeholder={region ? t('shop:fields.selectCity') : t('address.regionFirst')}
        options={cities}
        required
      />
      <TextField control={control} name={'street' as FieldPath<T>} label={t('shop:fields.street')} required autoComplete="address-line1" className="sm:col-span-2" maxLength={160} />
      <TextField control={control} name={'house' as FieldPath<T>} label={t('shop:fields.house')} required maxLength={30} />
      <TextField control={control} name={'apartment' as FieldPath<T>} label={t('shop:fields.apartment')} maxLength={20} />
      <TextField control={control} name={'district' as FieldPath<T>} label={t('shop:fields.district')} className="sm:col-span-2" maxLength={80} />
      {withComment ? (
        <TextareaField control={control} name={'comment' as FieldPath<T>} label={t('shop:fields.comment')} rows={2} maxLength={300} className="sm:col-span-2" />
      ) : null}
    </div>
  );
}
