import { isApiError, useApplyCoupon, useRemoveCoupon } from '@vero/api-client';
import type { CartDTO } from '@vero/types';
import { applyCouponSchema } from '@vero/validation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFormat } from '../../lib/format';
import { errorMessage, translateValidation } from '../../lib/i18n';
import { toast } from '../../lib/toast';
import { useTheme } from '../../theme/theme';
import { Button, IconButton, Text, TextField } from '../../ui';
import { ChevronDown, ChevronUp, TicketPercent, X } from '../../ui/icons';

/** Promo code: apply / remove, API errors (COUPON_*) shown under the field. */
export function CouponBox({ cart }: { cart: CartDTO }) {
  const { t } = useTranslation();
  const f = useFormat();
  const { colors } = useTheme();
  const apply = useApplyCoupon();
  const remove = useRemoveCoupon();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();

  const submit = () => {
    const parsed = applyCouponSchema.safeParse({ code });
    if (!parsed.success) {
      setError(translateValidation(t, parsed.error.issues[0]?.message));
      return;
    }
    setError(undefined);
    apply.mutate(parsed.data.code, {
      onSuccess: (next) => {
        setCode('');
        if (next.coupon) toast.success(t('shop:cart.couponApplied', { code: next.coupon.code }));
      },
      onError: (e) => {
        const details = isApiError(e)
          ? (e.details as { minOrder?: number; amount?: number } | undefined)
          : undefined;
        setError(errorMessage(t, e, { amount: f.price(details?.minOrder ?? details?.amount ?? 0) }));
      },
    });
  };

  if (cart.coupon) {
    return (
      <View style={[styles.applied, { backgroundColor: colors.successSoft }]}>
        <TicketPercent size={20} color={colors.success} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="subhead" weight="bold" color="success">
            {t('shop:cart.couponApplied', { code: cart.coupon.code })}
          </Text>
          <Text variant="footnote" color="mutedForeground" tabular>
            −{f.price(cart.coupon.discount)}
            {cart.coupon.description ? ` · ${cart.coupon.description}` : ''}
          </Text>
        </View>
        <IconButton
          icon={X}
          label={t('shop:cart.couponRemove')}
          size={36}
          loading={remove.isPending}
          onPress={() => remove.mutate(undefined, { onError: (e) => toast.error(errorMessage(t, e)) })}
        />
      </View>
    );
  }

  const Icon = open ? ChevronUp : ChevronDown;
  return (
    <View style={{ gap: 10 }}>
      {cart.couponError ? (
        <Text variant="footnote" color="danger">
          {t(`errors:${cart.couponError}`, { defaultValue: t('errors:COUPON_INVALID') })}
        </Text>
      ) : null}
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.toggle}
      >
        <TicketPercent size={19} color={colors.link} />
        <Text variant="subhead" weight="bold" color="link" style={{ flex: 1 }}>
          {t('shop:cart.couponHave')}
        </Text>
        <Icon size={18} color={colors.link} />
      </Pressable>
      {open ? (
        <View style={styles.row}>
          <TextField
            containerStyle={{ flex: 1 }}
            value={code}
            onChangeText={(v) => {
              setCode(v.toUpperCase());
              setError(undefined);
            }}
            placeholder={t('shop:cart.couponPlaceholder')}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={submit}
            error={error}
            accessibilityLabel={t('shop:cart.couponPlaceholder')}
          />
          <Button
            title={t('shop:cart.couponApply')}
            variant="graphite"
            onPress={submit}
            loading={apply.isPending}
            disabled={!code.trim()}
            style={{ height: 48 }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  applied: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
});
