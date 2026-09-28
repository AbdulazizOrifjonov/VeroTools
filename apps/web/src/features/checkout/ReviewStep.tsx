import { useAddresses, usePickupPoints } from '@vero/api-client';
import type { CartDTO, CheckoutQuote, PaymentMethodDTO } from '@vero/types';
import { Alert, AlertDescription, AlertTitle, Button, Checkbox, Label, Textarea } from '@vero/ui';
import { formatUzPhone } from '@vero/utils';
import { ArrowLeftIcon, LockIcon, PencilIcon } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { SmartImage } from '../../components/common/SmartImage';
import { useFormat } from '../../hooks/use-format';
import { LocaleLink, useLang } from '../../hooks/use-lang';
import { formatAddress } from '../address/address';
import { CouponBox } from '../cart/CouponBox';
import type { CheckoutDraft } from './state';

function Block({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-1.5 rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold">{title}</h3>
        <Button variant="ghost" size="xs" onClick={onEdit} leftIcon={<PencilIcon aria-hidden="true" />} aria-label={`${t('shop:checkout.edit')}: ${title}`}>
          {t('shop:checkout.edit')}
        </Button>
      </div>
      <div className="text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

export interface StockProblem {
  name: string;
  available: number;
  requested: number;
}

export function ReviewStep({
  draft,
  update,
  quote,
  cart,
  paymentMethod,
  goTo,
  onPlace,
  placing,
  stockProblems,
  notice,
}: {
  draft: CheckoutDraft;
  update: (patch: Partial<CheckoutDraft> | ((d: CheckoutDraft) => Partial<CheckoutDraft>)) => void;
  quote: CheckoutQuote | undefined;
  cart: CartDTO | undefined;
  paymentMethod: PaymentMethodDTO | undefined;
  goTo: (step: number) => void;
  onPlace: () => void;
  placing: boolean;
  stockProblems: StockProblem[] | null;
  notice?: string | null;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const lang = useLang();
  const termsId = useId();
  const commentId = useId();
  const addresses = useAddresses();
  const pickupPoints = usePickupPoints();
  const [accepted, setAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const c = draft.customer;
  const d = draft.delivery;
  const saved = addresses.data?.find((a) => a.id === d.addressId);
  const point = pickupPoints.data?.find((p) => p.id === d.pickupPointId);
  const items = (quote?.items ?? []).filter((i) => i.isAvailable);

  const place = () => {
    if (!accepted) {
      setTermsError(true);
      return;
    }
    onPlace();
  };

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-bold tracking-tight">{t('shop:checkout.reviewTitle')}</h2>
      {stockProblems?.length ? (
        <Alert variant="danger">
          <AlertTitle>{t('shop:checkout.stockError')}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc ps-4">
              {stockProblems.map((p, i) => (
                <li key={i}>
                  {p.name} — {p.available > 0 ? t('checkout.stockAvailable', { available: p.available, requested: p.requested }) : t('common:product.outOfStock')}
                </li>
              ))}
            </ul>
            <Button asChild size="sm" variant="outline" className="mt-2">
              <LocaleLink to="/cart">{t('common:actions.goToCart')}</LocaleLink>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      {notice ? (
        <Alert variant="danger">
          <AlertDescription className="text-foreground">{notice}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <Block title={t('shop:checkout.recipient')} onEdit={() => goTo(0)}>
          {c ? (
            <>
              <p className="font-semibold text-foreground">
                {c.firstName} {c.lastName}
              </p>
              <p className="tabular-nums">{formatUzPhone(c.phone)}</p>
              {c.email ? <p className="break-all">{c.email}</p> : null}
            </>
          ) : null}
        </Block>
        <Block title={t(`common:deliveryMethod.${d.method}`)} onEdit={() => goTo(1)}>
          {d.method === 'pickup' ? (
            point ? (
              <>
                <p className="font-semibold text-foreground">{point.name}</p>
                <p>{point.address}</p>
                <p>{point.workingHours}</p>
              </>
            ) : null
          ) : saved ? (
            <>
              <p className="font-semibold text-foreground">{saved.label || `${saved.firstName} ${saved.lastName}`}</p>
              <p>{formatAddress(saved, lang, t)}</p>
            </>
          ) : d.address ? (
            <p>{formatAddress(d.address, lang, t)}</p>
          ) : null}
          {quote?.delivery && quote.delivery.maxDays ? (
            <p className="mt-1 text-xs">{t('shop:cart.estimatedDelivery', { min: quote.delivery.minDays, max: quote.delivery.maxDays })}</p>
          ) : null}
        </Block>
        <Block title={t('shop:checkout.paymentTitle')} onEdit={() => goTo(2)}>
          <p className="font-semibold text-foreground">{paymentMethod?.name ?? (draft.payment.method ? t(`common:paymentMethod.${draft.payment.method}`) : '—')}</p>
          {quote?.installment ? (
            <p>
              {t('shop:checkout.installmentPlan', { months: quote.installment.months, amount: f.price(quote.installment.monthlyPayment) })}
            </p>
          ) : null}
          {paymentMethod?.online ? <p className="text-xs">{t('shop:checkout.redirectNote')}</p> : null}
        </Block>
      </div>

      <section aria-labelledby="review-items" className="flex flex-col gap-3">
        <h3 id="review-items" className="text-sm font-bold">
          {t('shop:cart.items', { count: items.reduce((s, i) => s + i.quantity, 0) })}
        </h3>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 p-3">
              <span className="img-well size-14 shrink-0 overflow-hidden rounded-md bg-well">
                <SmartImage image={i.image} prefer="thumb" sizes="56px" className="size-full object-contain" alt="" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="line-clamp-2 text-sm font-medium">{i.name}</span>
                {i.variantName ? <span className="text-xs text-muted-foreground">{i.variantName}</span> : null}
                <span className="text-xs text-muted-foreground tabular-nums">{t('shop:orders.qty', { count: i.quantity, price: f.price(i.price) })}</span>
              </span>
              <span className="shrink-0 text-sm font-bold tabular-nums">{f.price(i.lineTotal)}</span>
            </li>
          ))}
        </ul>
      </section>

      {cart ? (
        <div className="rounded-xl border border-border p-4">
          <CouponBox cart={cart} />
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={commentId}>{t('shop:checkout.comment')}</Label>
        <Textarea
          id={commentId}
          value={draft.comment}
          maxLength={500}
          rows={3}
          placeholder={t('shop:checkout.commentPlaceholder')}
          onChange={(e) => update({ comment: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-start gap-3">
          <Checkbox
            id={termsId}
            checked={accepted}
            onCheckedChange={(v) => {
              setAccepted(v === true);
              if (v === true) setTermsError(false);
            }}
            aria-invalid={termsError || undefined}
            aria-describedby={termsError ? `${termsId}-error` : undefined}
            className="mt-0.5"
          />
          <Label htmlFor={termsId} className="leading-snug font-medium">
            <span>
              <Trans
                i18nKey="legal.acceptTerms"
                components={{
                  terms: <LocaleLink to="/terms" target="_blank" className="font-semibold underline underline-offset-2 hover:text-primary dark:hover:text-brand" />,
                  privacy: <LocaleLink to="/privacy" target="_blank" className="font-semibold underline underline-offset-2 hover:text-primary dark:hover:text-brand" />,
                }}
              />
            </span>
          </Label>
        </div>
        {termsError ? (
          <p id={`${termsId}-error`} role="alert" className="text-[13px] font-medium text-danger">
            {t('validation:acceptTerms')}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={() => goTo(2)} leftIcon={<ArrowLeftIcon aria-hidden="true" />}>
          {t('common:actions.back')}
        </Button>
        <Button size="xl" onClick={place} loading={placing} disabled={!quote || !items.length} leftIcon={<LockIcon aria-hidden="true" />} className="sm:min-w-64">
          {t('shop:checkout.placeOrder')}
          {quote ? <span className="tabular-nums"> · {f.price(quote.total)}</span> : null}
        </Button>
      </div>
    </div>
  );
}
