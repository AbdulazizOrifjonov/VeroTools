import * as React from 'react';

import { formatAmount, NBSP } from '../lib/format';
import { cn } from '../lib/utils';

const currentSizes = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
  xl: 'text-[1.75rem] sm:text-[2rem]',
} as const;

const oldSizes = {
  sm: 'text-xs',
  md: 'text-[13px]',
  lg: 'text-sm',
  xl: 'text-base',
} as const;

export type PriceSize = keyof typeof currentSizes;

export interface PriceProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  /** Integer amount in UZS (so'm). */
  amount: number;
  /** Previous price — shown struck through when greater than `amount`. */
  oldAmount?: number | null;
  size?: PriceSize;
  /** Translated currency label, e.g. t('currency.sum') → "so'm" / "сум" / "UZS". */
  currencyLabel?: string;
  /** Screen-reader prefix for the old price, e.g. t('price.old') → "Old price". */
  oldAmountLabel?: string;
  /** Screen-reader prefix for the current price when discounted, e.g. t('price.new'). */
  amountLabel?: string;
  /** Stack the old price under the current one (product cards in tight grids). */
  stacked?: boolean;
}

/** "1 250 000 so'm" with an optional struck-through old price. Group separators are thin no-break spaces. */
function Price({
  amount,
  oldAmount,
  size = 'md',
  currencyLabel,
  oldAmountLabel,
  amountLabel,
  stacked = false,
  className,
  ...props
}: PriceProps) {
  const hasOld = oldAmount != null && Number.isFinite(oldAmount) && oldAmount > amount;
  const currency = currencyLabel ? (
    <span data-slot="price-currency" className="text-[0.82em] font-semibold">
      {NBSP}
      {currencyLabel}
    </span>
  ) : null;

  return (
    <span
      data-slot="price"
      data-discounted={hasOld || undefined}
      className={cn(
        'inline-flex min-w-0 flex-wrap items-baseline',
        stacked ? 'flex-col-reverse items-start gap-0' : 'gap-x-2 gap-y-0.5',
        className,
      )}
      {...props}
    >
      <span
        data-slot="price-current"
        className={cn(
          'leading-tight font-bold tracking-[-0.02em] whitespace-nowrap text-foreground',
          currentSizes[size],
        )}
      >
        {hasOld && amountLabel ? <span className="sr-only">{amountLabel} </span> : null}
        {formatAmount(amount)}
        {currency}
      </span>
      {hasOld ? (
        <del
          data-slot="price-old"
          className={cn(
            'leading-tight font-medium whitespace-nowrap text-muted-foreground decoration-[1.5px] decoration-muted-foreground/70',
            oldSizes[size],
          )}
        >
          {oldAmountLabel ? <span className="sr-only">{oldAmountLabel} </span> : null}
          {formatAmount(oldAmount)}
          {currencyLabel ? `${NBSP}${currencyLabel}` : null}
        </del>
      ) : null}
    </span>
  );
}

export { Price };
