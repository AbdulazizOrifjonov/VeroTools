import { useAddresses, useDeliveryOptions, useSession } from '@vero/api-client';
import { UZ_REGIONS } from '@vero/config';
import { memo, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useFormat } from '../../lib/format';
import { kv } from '../../lib/storage';
import { useTheme } from '../../theme/theme';
import { SelectField, Skeleton, Text } from '../../ui';
import { Store, Truck } from '../../ui/icons';

const REGION_KEY = 'ot.deliveryRegion';
let rememberedRegion: string | null = null;

/** Delivery price / timing to a region (courier zone, free threshold) and the number of pickup points. */
export const DeliveryEstimate = memo(function DeliveryEstimate({ subtotal }: { subtotal: number }) {
  const { t } = useTranslation();
  const f = useFormat();
  const { colors } = useTheme();
  const { isAuthenticated } = useSession();
  const addresses = useAddresses();
  const [region, setRegion] = useState<string | null>(rememberedRegion);

  useEffect(() => {
    if (region) return;
    let cancelled = false;
    void kv.get(REGION_KEY).then((stored) => {
      if (cancelled || region) return;
      const fromAddress = isAuthenticated
        ? (addresses.data?.find((a) => a.isDefault) ?? addresses.data?.[0])?.region
        : undefined;
      const next = stored ?? fromAddress ?? 'tashkent-city';
      rememberedRegion = next;
      setRegion(next);
    });
    return () => {
      cancelled = true;
    };
  }, [region, isAuthenticated, addresses.data]);

  const options = useDeliveryOptions(region ?? undefined, subtotal);
  const regionOptions = useMemo(
    () => UZ_REGIONS.map((r) => ({ value: r.code, label: r.name[f.lang] })),
    [f.lang],
  );
  const courier = options.data?.courier;
  const points = options.data?.pickupPoints.length ?? 0;

  return (
    <View style={styles.root}>
      <SelectField
        label={t('product.deliveryTo')}
        value={region}
        options={regionOptions}
        onSelect={(v) => {
          rememberedRegion = v;
          setRegion(v);
          void kv.set(REGION_KEY, v);
        }}
        placeholder={t('shop:fields.selectRegion')}
      />
      {!region || options.isPending ? (
        <View style={{ gap: 8 }}>
          <Skeleton height={16} width="70%" />
          <Skeleton height={16} width="50%" />
        </View>
      ) : options.isError ? (
        <Text variant="footnote" color="danger">
          {t('common:status.error')}
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          <View style={styles.line}>
            <Truck size={20} color={colors.mutedForeground} strokeWidth={1.8} />
            {courier ? (
              <View style={styles.flex}>
                <View style={styles.lineHead}>
                  <Text variant="subhead" weight="semibold" style={styles.flex}>
                    {t('shop:checkout.courierTitle')}
                  </Text>
                  <Text
                    variant="subhead"
                    weight="bold"
                    tabular
                    color={courier.isFree ? 'success' : 'foreground'}
                  >
                    {courier.isFree ? t('common:labels.free') : f.price(courier.price)}
                  </Text>
                </View>
                <Text variant="footnote" color="mutedForeground">
                  {t('product.deliveryWindow', {
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
            ) : (
              <Text variant="footnote" color="mutedForeground" style={styles.flex}>
                {t('shop:checkout.deliveryUnavailable')}
              </Text>
            )}
          </View>
          {points > 0 ? (
            <View style={styles.line}>
              <Store size={20} color={colors.mutedForeground} strokeWidth={1.8} />
              <View style={styles.flex}>
                <View style={styles.lineHead}>
                  <Text variant="subhead" weight="semibold" style={styles.flex}>
                    {t('shop:checkout.pickupTitle')}
                  </Text>
                  <Text variant="subhead" weight="bold" color="success">
                    {t('common:labels.free')}
                  </Text>
                </View>
                <Text variant="footnote" color="mutedForeground">
                  {t('product.pickupPoints', { count: points })}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { gap: 14 },
  flex: { flex: 1 },
  line: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  lineHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
