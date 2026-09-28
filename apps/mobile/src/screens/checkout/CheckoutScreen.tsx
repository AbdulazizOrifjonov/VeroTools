import { usePreventRemove } from '@react-navigation/native';
import {
  isApiError,
  qk,
  useAddresses,
  useCart,
  useCheckoutQuote,
  useDeliveryOptions,
  useMe,
  usePaymentMethods,
  usePlaceOrder,
  useSession,
} from '@vero/api-client';
import { UZ_REGION_CODES } from '@vero/config';
import { checkoutSchema, type CheckoutQuoteInput } from '@vero/validation';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type ScrollView, StyleSheet, View } from 'react-native';
import { useFormat } from '../../lib/format';
import { haptic } from '../../lib/haptics';
import { errorMessage, translateValidation } from '../../lib/i18n';
import { suppressRealtimeToast } from '../../lib/realtime-toasts';
import { toast } from '../../lib/toast';
import type { RootScreenProps } from '../../navigation/types';
import { useTheme } from '../../theme/theme';
import { ContactStep, type StepHandle } from '../../features/checkout/ContactStep';
import { DeliveryStep } from '../../features/checkout/DeliveryStep';
import { PaymentStep } from '../../features/checkout/PaymentStep';
import { QuoteSummary, ReviewStep, type StockProblem } from '../../features/checkout/ReviewStep';
import {
  buildOrderInput,
  CHECKOUT_STEPS,
  INITIAL_DRAFT,
  stepOfPath,
  type CheckoutDraft,
  type DraftUpdate,
} from '../../features/checkout/state';
import {
  BottomBar,
  Button,
  EmptyState,
  ErrorState,
  InlineError,
  LoadingView,
  ScreenScroll,
  Text,
} from '../../ui';
import { Check, Lock, ShoppingCart } from '../../ui/icons';

function Steps({ step, onPress }: { step: number; onPress: (s: number) => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View
      style={[styles.steps, { borderBottomColor: colors.border }]}
      accessibilityRole="progressbar"
      accessibilityLabel={t('shop:checkout.stepOf', { current: step + 1, total: CHECKOUT_STEPS.length })}
    >
      {CHECKOUT_STEPS.map((id, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <View key={id} style={styles.step}>
            <View
              style={[
                styles.stepDot,
                {
                  backgroundColor: done ? colors.primary : current ? colors.brandSoft : colors.fill,
                  borderColor: done || current ? colors.primary : colors.border,
                },
              ]}
            >
              {done ? (
                <Check size={13} color={colors.primaryForeground} strokeWidth={3} />
              ) : (
                <Text variant="caption" weight="bold" color={current ? 'link' : 'mutedForeground'} tabular>
                  {i + 1}
                </Text>
              )}
            </View>
            <Text
              variant="caption"
              weight={current ? 'bold' : 'medium'}
              color={current ? 'foreground' : 'mutedForeground'}
              numberOfLines={1}
              onPress={done ? () => onPress(i) : undefined}
              accessibilityRole={done ? 'button' : undefined}
            >
              {t(`shop:checkout.steps.${id}`)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Checkout: contact → delivery (quote) → payment → review → place order. */
export function CheckoutScreen({ navigation }: RootScreenProps<'Checkout'>) {
  const { t } = useTranslation();
  const f = useFormat();
  const queryClient = useQueryClient();
  const { isAuthenticated, isReady } = useSession();
  const me = useMe();
  const cart = useCart();
  const addresses = useAddresses();
  const place = usePlaceOrder();
  const [draft, setDraft] = useState<CheckoutDraft>(INITIAL_DRAFT);
  const [step, setStep] = useState(0);
  const [notice, setNotice] = useState<{ step: number; text: string } | null>(null);
  const [stockProblems, setStockProblems] = useState<StockProblem[] | null>(null);
  const [serverFields, setServerFields] = useState<Record<string, string> | undefined>();
  const [accepted, setAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [placed, setPlaced] = useState(false);
  const stepRef = useRef<StepHandle>(null);
  const scrollRef = useRef<ScrollView>(null);

  const update = useCallback<DraftUpdate>(
    (patch) => setDraft((d) => ({ ...d, ...(typeof patch === 'function' ? patch(d) : patch) })),
    [],
  );

  // guests are sent to sign in (the cart merges into the account)
  useEffect(() => {
    if (isReady && !isAuthenticated) navigation.replace('Login', { next: 'Checkout' });
  }, [isReady, isAuthenticated, navigation]);

  const goTo = useCallback((s: number) => {
    setStep(s);
    setNotice(null);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  // hardware back / header back / swipe go to the previous step first
  usePreventRemove(step > 0 && !placed, () => goTo(step - 1));

  const d = draft.delivery;
  const saved = addresses.data ?? [];
  const usingNewAddress = d.method === 'courier' && (d.addressId === 'new' || !saved.length);
  const savedAddress = saved.find((a) => a.id === d.addressId);
  const typedRegion =
    d.address?.region && (UZ_REGION_CODES as string[]).includes(d.address.region)
      ? d.address.region
      : undefined;
  const courierRegion =
    d.method === 'courier' ? (usingNewAddress ? typedRegion : savedAddress?.region) : undefined;
  const subtotal = cart.data?.totals.total;
  const deliveryOptions = useDeliveryOptions(courierRegion, subtotal);
  const courierAvailable = !!deliveryOptions.data?.courier;
  const deliveryKnown = d.method === 'pickup' ? !!d.pickupPointId : !!courierRegion && courierAvailable;

  const quoteInput = useMemo<CheckoutQuoteInput>(() => {
    const delivery: CheckoutQuoteInput['delivery'] =
      d.method === 'pickup'
        ? { method: 'pickup', pickupPointId: d.pickupPointId ?? undefined }
        : {
            method: 'courier',
            ...(usingNewAddress ? { region: typedRegion } : { addressId: savedAddress?.id }),
          };
    return {
      delivery,
      payment: draft.payment.method
        ? {
            method: draft.payment.method,
            installmentMonths:
              draft.payment.method === 'installment'
                ? (draft.payment.installmentMonths ?? undefined)
                : undefined,
          }
        : undefined,
    };
  }, [
    d.method,
    d.pickupPointId,
    usingNewAddress,
    typedRegion,
    savedAddress?.id,
    draft.payment.method,
    draft.payment.installmentMonths,
  ]);

  const hasItems = !!cart.data?.items.some((i) => i.isAvailable);
  const quote = useCheckoutQuote(quoteInput, hasItems);
  const methods = usePaymentMethods(quote.data?.total);
  const paymentMethod = methods.data?.find((m) => m.code === draft.payment.method);

  const onPlace = () => {
    setNotice(null);
    setStockProblems(null);
    if (!accepted) {
      setTermsError(true);
      return;
    }
    const input = buildOrderInput(draft, usingNewAddress);
    const parsed = checkoutSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]!;
      const path = issue.path.join('.');
      const target = stepOfPath(path);
      goTo(target);
      if (target === 0) setServerFields({ [path]: issue.message });
      else
        setNotice({
          step: target,
          text: translateValidation(t, issue.message) ?? t('errors:VALIDATION_ERROR'),
        });
      return;
    }
    suppressRealtimeToast('type:ORDER_CREATED');
    place.mutate(input, {
      onSuccess: (result) => {
        haptic.success();
        setPlaced(true);
        queryClient.setQueryData(qk.order(result.order.id, f.lang), result.order);
        suppressRealtimeToast(`order:${result.order.id}:${result.order.status}`);
        // the success screen replaces checkout (back goes to the previous screen, not to the form)
        requestAnimationFrame(() => navigation.replace('CheckoutSuccess', { orderId: result.order.id }));
      },
      onError: (error) => {
        haptic.warning();
        if (!isApiError(error)) {
          toast.error(errorMessage(t, error));
          return;
        }
        switch (error.code) {
          case 'INSUFFICIENT_STOCK': {
            const details = (Array.isArray(error.details) ? error.details : []) as Array<{
              productId: string;
              sku?: string;
              available: number;
              requested: number;
            }>;
            const items = quote.data?.items ?? cart.data?.items ?? [];
            setStockProblems(
              details.map((p) => {
                const item =
                  items.find((i) => i.productId === p.productId && (!p.sku || i.sku === p.sku)) ??
                  items.find((i) => i.productId === p.productId);
                return {
                  name: item
                    ? `${item.name}${item.variantName ? ` (${item.variantName})` : ''}`
                    : (p.sku ?? ''),
                  available: p.available,
                  requested: p.requested,
                };
              }),
            );
            void cart.refetch();
            void quote.refetch();
            break;
          }
          case 'PAYMENT_METHOD_UNAVAILABLE':
            goTo(2);
            setNotice({ step: 2, text: errorMessage(t, error) });
            void methods.refetch();
            break;
          case 'DELIVERY_UNAVAILABLE':
          case 'PICKUP_POINT_UNAVAILABLE':
            goTo(1);
            setNotice({ step: 1, text: errorMessage(t, error) });
            break;
          case 'CART_EMPTY':
            toast.error(errorMessage(t, error));
            navigation.navigate('Tabs', { screen: 'CartTab' }, { pop: true });
            break;
          case 'VALIDATION_ERROR':
            if (error.fields && Object.keys(error.fields).length) {
              const [path, message] = Object.entries(error.fields)[0]!;
              const target = stepOfPath(path);
              goTo(target);
              if (target === 0) setServerFields(error.fields);
              else
                setNotice({ step: target, text: translateValidation(t, message) ?? errorMessage(t, error) });
              break;
            }
            setNotice({ step: 3, text: errorMessage(t, error) });
            break;
          default:
            setNotice({ step: 3, text: errorMessage(t, error) });
        }
      },
    });
  };

  if (!isReady || !isAuthenticated || cart.isPending) return <LoadingView />;
  if (cart.isError) return <ErrorState error={cart.error} onRetry={() => void cart.refetch()} />;
  if (!hasItems && !placed) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title={t('shop:checkout.emptyCart')}
        action={
          <Button
            title={t('common:actions.continueShopping')}
            onPress={() => navigation.navigate('Tabs', { screen: 'CatalogTab' }, { pop: true })}
          />
        }
      />
    );
  }

  const noticeFor = (s: number) => (notice?.step === s ? notice.text : null);
  const next = () => stepRef.current?.submit();

  return (
    <View style={styles.flex}>
      <Steps step={step} onPress={goTo} />
      <ScreenScroll ref={scrollRef} keyboard contentContainerStyle={styles.content}>
        {step === 0 ? (
          <ContactStep
            ref={stepRef}
            draft={draft}
            update={update}
            user={me.data ?? null}
            onNext={() => goTo(1)}
            serverFields={serverFields}
          />
        ) : null}
        {step === 1 ? (
          <DeliveryStep
            ref={stepRef}
            draft={draft}
            update={update}
            options={courierRegion ? deliveryOptions.data : undefined}
            optionsLoading={!!courierRegion && deliveryOptions.isFetching && !deliveryOptions.data}
            onNext={() => goTo(2)}
            notice={noticeFor(1)}
          />
        ) : null}
        {step === 2 ? (
          <PaymentStep
            ref={stepRef}
            draft={draft}
            update={update}
            total={quote.data?.total}
            onNext={() => goTo(3)}
            notice={noticeFor(2)}
          />
        ) : null}
        {step === 3 ? (
          <ReviewStep
            draft={draft}
            update={update}
            quote={quote.data}
            cart={cart.data}
            paymentMethod={paymentMethod}
            goTo={goTo}
            stockProblems={stockProblems}
            notice={noticeFor(3)}
            accepted={accepted}
            setAccepted={(v) => {
              setAccepted(v);
              if (v) setTermsError(false);
            }}
            termsError={termsError}
          />
        ) : null}
        {quote.isError ? (
          <InlineError error={quote.error} onRetry={() => void quote.refetch()} />
        ) : (
          <QuoteSummary quote={quote.data} deliveryKnown={deliveryKnown} />
        )}
        <Text variant="caption" color="mutedForeground" align="center">
          {t('shop:checkout.syncNote')}
        </Text>
      </ScreenScroll>
      <BottomBar>
        <View style={styles.flex}>
          <Text variant="footnote" color="mutedForeground">
            {t('shop:orders.total')}
          </Text>
          <Text variant="title3" tabular numberOfLines={1}>
            {quote.data ? f.price(quote.data.total) : '—'}
          </Text>
        </View>
        {step < 3 ? (
          <Button title={t('common:actions.continue')} size="lg" style={{ flex: 1.3 }} onPress={next} />
        ) : (
          <Button
            title={t('shop:checkout.placeOrder')}
            icon={Lock}
            size="lg"
            style={{ flex: 1.3 }}
            onPress={onPlace}
            loading={place.isPending}
            disabled={!quote.data || quote.isFetching}
          />
        )}
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: 18 },
  steps: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  step: { flex: 1, alignItems: 'center', gap: 6 },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
