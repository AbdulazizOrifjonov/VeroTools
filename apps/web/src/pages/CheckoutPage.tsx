import { isApiError, qk, useAddresses, useCart, useCheckoutQuote, useDeliveryOptions, usePaymentMethods, usePlaceOrder } from '@vero/api-client';
import { STORE_ROUTES, UZ_REGION_CODES } from '@vero/config';
import type { CheckoutQuote } from '@vero/types';
import { Button, EmptyState, Skeleton, Steps, toast } from '@vero/ui';
import { checkoutSchema, type CheckoutInput, type CheckoutQuoteInput } from '@vero/validation';
import { ShoppingCartIcon } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Crumbs } from '../components/common/Crumbs';
import { PageTitle } from '../components/common/Section';
import { ErrorState } from '../components/common/states';
import { CheckoutSummary } from '../features/checkout/CheckoutSummary';
import { ContactStep } from '../features/checkout/ContactStep';
import { DeliveryStep } from '../features/checkout/DeliveryStep';
import { PaymentStep } from '../features/checkout/PaymentStep';
import { ReviewStep, type StockProblem } from '../features/checkout/ReviewStep';
import { useCheckoutDraft, useCheckoutStepLabels, type CheckoutDraft } from '../features/checkout/state';
import { useDocumentMeta } from '../hooks/use-document-meta';
import { LocaleLink, useLang, useLocaleNavigate } from '../hooks/use-lang';
import { errorMessage, translateValidation } from '../lib/i18n';
import { suppressRealtimeToast } from '../lib/realtime-toasts';

function buildOrderInput(draft: CheckoutDraft, usingNewAddress: boolean): CheckoutInput {
  const d = draft.delivery;
  const delivery: CheckoutInput['delivery'] =
    d.method === 'pickup'
      ? { method: 'pickup', pickupPointId: d.pickupPointId ?? undefined }
      : usingNewAddress
        ? { method: 'courier', address: { ...(d.address ?? { region: '', city: '', street: '', house: '' }) }, saveAddress: d.saveAddress }
        : { method: 'courier', addressId: d.addressId ?? undefined };
  return {
    customer: { ...(draft.customer ?? { firstName: '', lastName: '', phone: '' }) },
    delivery,
    payment: {
      method: draft.payment.method ?? 'cash',
      installmentMonths: draft.payment.method === 'installment' ? (draft.payment.installmentMonths ?? undefined) : undefined,
    },
    comment: draft.comment || undefined,
  };
}

/** Maps an API / schema field path to the checkout step that owns it. */
function stepOfPath(path: string): number {
  if (path.startsWith('customer')) return 0;
  if (path.startsWith('delivery')) return 1;
  if (path.startsWith('payment')) return 2;
  return 3;
}

export default function CheckoutPage() {
  const { t } = useTranslation();
  const navigate = useLocaleNavigate();
  const lang = useLang();
  const queryClient = useQueryClient();
  const cart = useCart();
  const addresses = useAddresses();
  const { draft, update, reset } = useCheckoutDraft();
  const place = usePlaceOrder();
  const [notice, setNotice] = useState<{ step: number; text: string } | null>(null);
  const [stockProblems, setStockProblems] = useState<StockProblem[] | null>(null);
  const [serverFields, setServerFields] = useState<Record<string, string> | undefined>();
  const topRef = useRef<HTMLDivElement>(null);
  const steps = useCheckoutStepLabels();
  useDocumentMeta({ title: t('shop:checkout.title'), noindex: true });

  const d = draft.delivery;
  const saved = addresses.data ?? [];
  const usingNewAddress = d.method === 'courier' && (d.addressId === 'new' || !saved.length);
  const savedAddress = saved.find((a) => a.id === d.addressId);
  const typedRegion = d.address?.region && (UZ_REGION_CODES as string[]).includes(d.address.region) ? d.address.region : undefined;
  const courierRegion = d.method === 'courier' ? (usingNewAddress ? typedRegion : savedAddress?.region) : undefined;
  const subtotal = cart.data?.totals.total;
  const deliveryOptions = useDeliveryOptions(courierRegion, subtotal);
  const courierAvailable = !!deliveryOptions.data?.courier;
  const deliveryKnown = d.method === 'pickup' ? !!d.pickupPointId : !!courierRegion && courierAvailable;

  const quoteInput = useMemo<CheckoutQuoteInput>(() => {
    const delivery: CheckoutQuoteInput['delivery'] =
      d.method === 'pickup'
        ? { method: 'pickup', pickupPointId: d.pickupPointId ?? undefined }
        : { method: 'courier', ...(usingNewAddress ? { region: typedRegion } : { addressId: savedAddress?.id }) };
    return {
      delivery,
      payment: draft.payment.method
        ? { method: draft.payment.method, installmentMonths: draft.payment.method === 'installment' ? (draft.payment.installmentMonths ?? undefined) : undefined }
        : undefined,
    };
  }, [d.method, d.pickupPointId, usingNewAddress, typedRegion, savedAddress?.id, draft.payment.method, draft.payment.installmentMonths]);

  const hasItems = !!cart.data?.items.some((i) => i.isAvailable);
  const quote = useCheckoutQuote(quoteInput, hasItems);
  const methods = usePaymentMethods(quote.data?.total);
  const paymentMethod = methods.data?.find((m) => m.code === draft.payment.method);

  const step = Math.min(Math.max(draft.step, 0), 3);
  const goTo = useCallback(
    (s: number) => {
      update({ step: s });
      setNotice(null);
      requestAnimationFrame(() => {
        const top = topRef.current;
        if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: 'start' });
      });
    },
    [update],
  );

  const onPlace = () => {
    setNotice(null);
    setStockProblems(null);
    const input = buildOrderInput(draft, usingNewAddress);
    const parsed = checkoutSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]!;
      const path = issue.path.join('.');
      const target = stepOfPath(path);
      goTo(target);
      if (target === 0) setServerFields({ [path]: issue.message });
      else setNotice({ step: target, text: translateValidation(t, issue.message) ?? t('errors:VALIDATION_ERROR') });
      return;
    }
    suppressRealtimeToast('type:ORDER_CREATED');
    place.mutate(input, {
      onSuccess: (result) => {
        // the success page renders instantly from the created order (then refetches it)
        queryClient.setQueryData(qk.order(result.order.id, lang), result.order);
        reset();
        navigate(STORE_ROUTES.checkoutSuccess(result.order.id), { replace: true });
      },
      onError: (error) => {
        if (!isApiError(error)) {
          toast.error(errorMessage(t, error));
          return;
        }
        switch (error.code) {
          case 'INSUFFICIENT_STOCK': {
            const details = (Array.isArray(error.details) ? error.details : []) as Array<{ productId: string; sku?: string; available: number; requested: number }>;
            const items = quote.data?.items ?? cart.data?.items ?? [];
            setStockProblems(
              details.map((p) => {
                const item = items.find((i) => i.productId === p.productId && (!p.sku || i.sku === p.sku)) ?? items.find((i) => i.productId === p.productId);
                return { name: item ? `${item.name}${item.variantName ? ` (${item.variantName})` : ''}` : (p.sku ?? ''), available: p.available, requested: p.requested };
              }),
            );
            void cart.refetch();
            break;
          }
          case 'PAYMENT_METHOD_UNAVAILABLE':
            goTo(2);
            setNotice({ step: 2, text: errorMessage(t, error) });
            break;
          case 'DELIVERY_UNAVAILABLE':
          case 'PICKUP_POINT_UNAVAILABLE':
            goTo(1);
            setNotice({ step: 1, text: errorMessage(t, error) });
            break;
          case 'CART_EMPTY':
            toast.error(errorMessage(t, error));
            navigate(STORE_ROUTES.cart);
            break;
          case 'VALIDATION_ERROR':
            if (error.fields && Object.keys(error.fields).length) {
              const [path, message] = Object.entries(error.fields)[0]!;
              const target = stepOfPath(path);
              goTo(target);
              if (target === 0) setServerFields(error.fields);
              else setNotice({ step: target, text: translateValidation(t, message) ?? errorMessage(t, error) });
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

  const header = (
    <div ref={topRef} className="flex scroll-mt-[calc(var(--header-offset)+1rem)] flex-col gap-4">
      <Crumbs items={[{ label: t('shop:cart.title'), to: STORE_ROUTES.cart }, { label: t('shop:checkout.title') }]} />
      <PageTitle>{t('shop:checkout.title')}</PageTitle>
    </div>
  );

  if (cart.isPending) {
    return (
      <div className="container-page flex flex-col gap-5 py-5 sm:py-6">
        {header}
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }
  if (cart.isError) {
    return (
      <div className="container-page flex flex-col gap-5 py-5 sm:py-6">
        {header}
        <ErrorState error={cart.error} onRetry={() => void cart.refetch()} />
      </div>
    );
  }
  if (!hasItems) {
    return (
      <div className="container-page flex flex-col gap-5 py-5 sm:py-6">
        {header}
        <EmptyState
          icon={<ShoppingCartIcon />}
          title={t('shop:checkout.emptyCart')}
          action={
            <Button asChild size="lg">
              <LocaleLink to={STORE_ROUTES.catalog}>{t('common:actions.continueShopping')}</LocaleLink>
            </Button>
          }
        />
      </div>
    );
  }

  const noticeFor = (s: number) => (notice?.step === s ? notice.text : null);
  const summaryQuote: CheckoutQuote | undefined = quote.data;

  return (
    <div className="container-page flex flex-col gap-5 py-5 sm:py-6">
      {header}
      <Steps
        steps={steps}
        current={step}
        completedLabel={t('checkout.stepCompleted')}
        onStepClick={(i) => i < step && goTo(i)}
        aria-label={t('shop:checkout.stepOf', { current: step + 1, total: steps.length })}
        className="rounded-xl border border-border bg-card p-4 sm:px-6"
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
        <div className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-6">
          {step === 0 ? <ContactStep draft={draft} update={update} onNext={() => goTo(1)} serverFields={serverFields} /> : null}
          {step === 1 ? (
            <DeliveryStep
              draft={draft}
              update={update}
              options={courierRegion ? deliveryOptions.data : undefined}
              optionsLoading={!!courierRegion && deliveryOptions.isFetching && !deliveryOptions.data}
              onBack={() => goTo(0)}
              onNext={() => goTo(2)}
              notice={noticeFor(1)}
            />
          ) : null}
          {step === 2 ? (
            <PaymentStep draft={draft} update={update} total={quote.data?.total} onBack={() => goTo(1)} onNext={() => goTo(3)} notice={noticeFor(2)} />
          ) : null}
          {step === 3 ? (
            <ReviewStep
              draft={draft}
              update={update}
              quote={quote.data}
              cart={cart.data}
              paymentMethod={paymentMethod}
              goTo={goTo}
              onPlace={onPlace}
              placing={place.isPending}
              stockProblems={stockProblems}
              notice={noticeFor(3)}
            />
          ) : null}
        </div>
        <aside className="flex flex-col gap-3 lg:sticky lg:top-[calc(var(--header-offset)+1rem)]" aria-label={t('shop:cart.summary')}>
          {quote.isError ? (
            <ErrorState compact error={quote.error} onRetry={() => void quote.refetch()} />
          ) : (
            <CheckoutSummary quote={summaryQuote} loading={quote.isFetching} deliveryKnown={deliveryKnown} />
          )}
          <p className="px-1 text-xs text-muted-foreground">{t('shop:checkout.syncNote')}</p>
        </aside>
      </div>
    </div>
  );
}
