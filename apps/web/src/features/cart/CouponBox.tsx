import { useApplyCoupon, useRemoveCoupon } from '@vero/api-client';
import type { CartDTO } from '@vero/types';
import { Button, Input, toast } from '@vero/ui';
import { applyCouponSchema } from '@vero/validation';
import { TicketPercentIcon, XIcon } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormat } from '../../hooks/use-format';
import { errorMessage, translateValidation } from '../../lib/i18n';

/** Promo code field (applies to the cart; the checkout quote picks it up). */
export function CouponBox({ cart }: { cart: CartDTO }) {
  const { t } = useTranslation();
  const f = useFormat();
  const apply = useApplyCoupon();
  const remove = useRemoveCoupon();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = applyCouponSchema.safeParse({ code });
    if (!parsed.success) {
      setError(translateValidation(t, parsed.error.issues[0]?.message) ?? t('validation:code'));
      return;
    }
    setError(null);
    apply.mutate(parsed.data.code, {
      onSuccess: (c) => {
        setCode('');
        toast.success(t('shop:cart.couponApplied', { code: c.coupon?.code ?? parsed.data.code }));
      },
      onError: (err) => {
        const details = (err as { details?: { minOrderAmount?: number } }).details;
        const min = details?.minOrderAmount;
        setError(errorMessage(t, err, min ? { amount: f.price(min) } : undefined));
      },
    });
  };

  if (cart.coupon) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-success/25 bg-success-soft/50 px-3 py-2.5 dark:bg-success-soft">
        <TicketPercentIcon className="size-5 shrink-0 text-success" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-bold tracking-wide">{cart.coupon.code}</span>
          <span className="text-xs text-muted-foreground">{cart.coupon.description ?? `−${f.price(cart.coupon.discount)}`}</span>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => remove.mutate(undefined, { onError: (e) => toast.error(errorMessage(t, e)) })} loading={remove.isPending} aria-label={t('shop:cart.couponRemove')}>
          <XIcon aria-hidden="true" />
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {t('shop:cart.couponHave')}
      </label>
      <div className="flex gap-2">
        <Input
          id={id}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            if (error) setError(null);
          }}
          placeholder={t('shop:cart.couponPlaceholder')}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={40}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="uppercase placeholder:normal-case"
        />
        <Button type="submit" variant="outline" loading={apply.isPending} disabled={!code.trim()}>
          {t('shop:cart.couponApply')}
        </Button>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}
