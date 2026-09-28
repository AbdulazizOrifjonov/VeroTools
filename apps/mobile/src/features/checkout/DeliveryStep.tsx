import { zodResolver } from '@hookform/resolvers/zod';
import { useAddresses, usePickupPoints } from '@vero/api-client';
import type { DeliveryOptionsDTO } from '@vero/types';
import { formatUzPhone } from '@vero/utils';
import { checkoutAddressSchema, type CheckoutAddressInput } from '@vero/validation';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useFormat } from '../../lib/format';
import { useTheme } from '../../theme/theme';
import { Badge, Checkbox, ErrorState, Notice, RadioCard, Skeleton, Text } from '../../ui';
import { CircleAlert, Clock, MapPin, Phone, Plus, Store, Truck } from '../../ui/icons';
import { AddressFields, formatAddress } from '../address/AddressFields';
import type { StepHandle } from './ContactStep';
import { EMPTY_ADDRESS, type CheckoutDraft, type DraftUpdate } from './state';

export const DeliveryStep = forwardRef<
  StepHandle,
  {
    draft: CheckoutDraft;
    update: DraftUpdate;
    options: DeliveryOptionsDTO | undefined;
    optionsLoading: boolean;
    onNext: () => void;
    notice?: string | null;
  }
>(function DeliveryStep({ draft, update, options, optionsLoading, onNext, notice }, ref) {
  const { t } = useTranslation();
  const f = useFormat();
  const { colors } = useTheme();
  const addresses = useAddresses();
  const pickupPoints = usePickupPoints();
  const [error, setError] = useState<string | null>(null);
  const d = draft.delivery;
  const saved = addresses.data ?? [];
  const addressId = d.addressId ?? saved.find((a) => a.isDefault)?.id ?? saved[0]?.id ?? 'new';
  const usingNew = addressId === 'new' || !saved.length;

  const form = useForm<CheckoutAddressInput>({
    resolver: zodResolver(checkoutAddressSchema),
    defaultValues: { ...EMPTY_ADDRESS, ...(d.address ?? {}) },
  });

  // default saved address once the list is loaded
  useEffect(() => {
    if (!d.addressId && saved.length) update((x) => ({ delivery: { ...x.delivery, addressId } }));
  }, [d.addressId, saved.length, addressId, update]);

  // mirror the typed address into the draft (the quote / delivery options follow the region)
  useEffect(() => {
    const sub = form.watch((v) =>
      update((x) => ({
        delivery: {
          ...x.delivery,
          address: {
            region: v.region ?? '',
            city: v.city ?? '',
            district: v.district ?? '',
            street: v.street ?? '',
            house: v.house ?? '',
            apartment: v.apartment ?? '',
            comment: v.comment ?? '',
          },
        },
      })),
    );
    return () => sub.unsubscribe();
  }, [form, update]);

  const setDelivery = (patch: Partial<CheckoutDraft['delivery']>) => {
    setError(null);
    update((x) => ({ delivery: { ...x.delivery, ...patch } }));
  };

  const courier = options?.courier ?? null;

  useImperativeHandle(ref, () => ({
    submit: () => {
      setError(null);
      if (d.method === 'pickup') {
        if (!d.pickupPointId) return setError(t('validation:pickupRequired'));
        return onNext();
      }
      if (usingNew) {
        void form.handleSubmit(() => {
          if (!courier && !optionsLoading) return setError(t('shop:checkout.deliveryUnavailable'));
          if (d.addressId !== 'new') setDelivery({ addressId: 'new' });
          onNext();
        })();
        return;
      }
      if (!courier && !optionsLoading) return setError(t('shop:checkout.deliveryUnavailable'));
      onNext();
    },
  }));

  return (
    <View style={{ gap: 16 }}>
      <Text variant="title3">{t('shop:checkout.deliveryTitle')}</Text>
      {notice ? (
        <Notice tone="danger" icon={CircleAlert}>
          {notice}
        </Notice>
      ) : null}
      <View
        style={{ gap: 10 }}
        accessibilityRole="radiogroup"
        accessibilityLabel={t('shop:checkout.deliveryTitle')}
      >
        <RadioCard
          selected={d.method === 'courier'}
          onPress={() => setDelivery({ method: 'courier' })}
          icon={<Truck size={18} color={colors.mutedForeground} />}
          title={t('shop:checkout.courierTitle')}
          description={t('checkout.courierHint')}
        />
        <RadioCard
          selected={d.method === 'pickup'}
          onPress={() => setDelivery({ method: 'pickup' })}
          icon={<Store size={18} color={colors.mutedForeground} />}
          title={t('shop:checkout.pickupTitle')}
          description={t('shop:checkout.pickupDesc')}
        />
      </View>

      {d.method === 'courier' ? (
        <View style={{ gap: 12 }}>
          <Text variant="headline">{t('shop:checkout.addressTitle')}</Text>
          {addresses.isPending ? (
            <Skeleton height={84} radius={12} />
          ) : addresses.isError ? (
            <ErrorState compact error={addresses.error} onRetry={() => void addresses.refetch()} />
          ) : saved.length ? (
            <View
              style={{ gap: 10 }}
              accessibilityRole="radiogroup"
              accessibilityLabel={t('shop:checkout.savedAddresses')}
            >
              {saved.map((a) => (
                <RadioCard
                  key={a.id}
                  selected={!usingNew && addressId === a.id}
                  onPress={() => setDelivery({ addressId: a.id })}
                  title={
                    <View style={styles.titleRow}>
                      <Text variant="headline" numberOfLines={1} style={{ flexShrink: 1 }}>
                        {a.label || `${a.firstName} ${a.lastName}`}
                      </Text>
                      {a.isDefault ? <Badge label={t('shop:addresses.default')} size="sm" /> : null}
                    </View>
                  }
                  description={formatAddress(a, f.lang, t)}
                >
                  <Text variant="caption" color="mutedForeground" tabular>
                    {a.firstName} {a.lastName} · {formatUzPhone(a.phone)}
                  </Text>
                </RadioCard>
              ))}
              <RadioCard
                selected={usingNew}
                onPress={() => setDelivery({ addressId: 'new' })}
                icon={<Plus size={18} color={colors.foreground} />}
                title={t('shop:checkout.newAddress')}
              />
            </View>
          ) : null}
          {usingNew ? (
            <View style={[styles.newBox, { borderColor: colors.border }]}>
              <AddressFields control={form.control} setValue={form.setValue} />
              <Checkbox
                checked={d.saveAddress}
                onChange={(v) => setDelivery({ saveAddress: v })}
                label={t('shop:checkout.saveAddress')}
              />
            </View>
          ) : null}
          <View style={[styles.quote, { backgroundColor: colors.surface }]} accessibilityLiveRegion="polite">
            {optionsLoading ? (
              <Skeleton height={16} width="70%" />
            ) : courier ? (
              <View style={{ gap: 4 }}>
                <View style={styles.titleRow}>
                  <Text variant="subhead" weight="bold" style={{ flex: 1 }}>
                    {t('shop:checkout.courierDesc', {
                      zone: courier.zoneName,
                      min: courier.minDays,
                      max: courier.maxDays,
                    })}
                  </Text>
                  <Text
                    variant="subhead"
                    weight="bold"
                    tabular
                    color={courier.isFree ? 'success' : 'foreground'}
                  >
                    {courier.isFree ? t('shop:checkout.freeDelivery') : f.price(courier.price)}
                  </Text>
                </View>
                <Text variant="footnote" color="mutedForeground">
                  {t('shop:checkout.courierEstimate', {
                    from: f.date(courier.estimatedFrom, 'dayMonth'),
                    to: f.date(courier.estimatedTo, 'dayMonth'),
                  })}
                </Text>
                {!courier.isFree && courier.freeThreshold > 0 ? (
                  <Text variant="footnote" color="mutedForeground">
                    {t('product.freeFrom', { amount: f.price(courier.freeThreshold) })}
                  </Text>
                ) : null}
              </View>
            ) : options ? (
              <Text variant="subhead" weight="semibold" color="danger">
                {t('shop:checkout.deliveryUnavailable')}
              </Text>
            ) : (
              <Text variant="footnote" color="mutedForeground">
                {t('shop:checkout.selectRegionFirst')}
              </Text>
            )}
          </View>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <Text variant="headline">{t('shop:checkout.choosePickup')}</Text>
          {pickupPoints.isPending ? (
            <Skeleton height={120} radius={12} />
          ) : pickupPoints.isError ? (
            <ErrorState compact error={pickupPoints.error} onRetry={() => void pickupPoints.refetch()} />
          ) : (
            <View
              style={{ gap: 10 }}
              accessibilityRole="radiogroup"
              accessibilityLabel={t('shop:checkout.choosePickup')}
            >
              {pickupPoints.data.map((p) => (
                <RadioCard
                  key={p.id}
                  selected={d.pickupPointId === p.id}
                  onPress={() => setDelivery({ pickupPointId: p.id })}
                  title={p.name}
                >
                  <View style={styles.metaRow}>
                    <MapPin size={13} color={colors.mutedForeground} />
                    <Text variant="footnote" color="mutedForeground" style={{ flex: 1 }}>
                      {p.address}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Clock size={13} color={colors.mutedForeground} />
                    <Text variant="footnote" color="mutedForeground" style={{ flex: 1 }}>
                      {p.workingHours}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Phone size={13} color={colors.mutedForeground} />
                    <Text variant="footnote" color="mutedForeground" tabular>
                      {formatUzPhone(p.phone)}
                    </Text>
                  </View>
                </RadioCard>
              ))}
            </View>
          )}
          <Text variant="footnote" color="mutedForeground">
            {t('shop:checkout.pickupNoAddress')}
          </Text>
        </View>
      )}

      {error ? (
        <Text variant="subhead" weight="semibold" color="danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  newBox: { gap: 14, padding: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth * 2 },
  quote: { borderRadius: 12, padding: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
});
