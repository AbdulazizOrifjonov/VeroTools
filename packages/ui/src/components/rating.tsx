import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import * as React from 'react';

import { clamp, cn } from '../lib/utils';

const STAR_PATH =
  'M12 2.95 14.47 9.55 21.51 9.86 16 14.25 17.88 21.04 12 17.15 6.12 21.04 8 14.25 2.49 9.86 9.53 9.55Z';

function StarShape({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <path
        d={STAR_PATH}
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}

const starSizes = {
  xs: 'size-3',
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-5',
} as const;

export type RatingSize = keyof typeof starSizes;

export interface RatingStarsProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  /** 0…max, fractions allowed (4.6 → the fifth star is 60% filled). */
  value: number;
  max?: number;
  size?: RatingSize;
  /** Accessible text, e.g. t('rating.label', { value: 4.6, max: 5 }). Without it the stars are decorative. */
  label?: string;
}

/** Read-only star rating with partial fill. */
function RatingStars({ value, max = 5, size = 'md', label, className, ...props }: RatingStarsProps) {
  const safe = clamp(Number.isFinite(value) ? value : 0, 0, max);
  return (
    <span
      data-slot="rating-stars"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('inline-flex shrink-0 items-center', size === 'lg' ? 'gap-0.5' : 'gap-px', className)}
      {...props}
    >
      {Array.from({ length: max }, (_, index) => {
        const fill = clamp(safe - index, 0, 1);
        return (
          <span key={index} className={cn('relative shrink-0', starSizes[size])}>
            <StarShape className="absolute inset-0 size-full text-muted-foreground/25" />
            {fill > 0 ? (
              <span
                className="absolute inset-y-0 start-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <StarShape className={cn('max-w-none text-rating', starSizes[size])} />
              </span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}

const inputStarSizes = {
  md: 'size-6',
  lg: 'size-8',
  xl: 'size-10',
} as const;

export interface RatingInputProps extends Omit<
  React.ComponentProps<typeof RadioGroupPrimitive.Root>,
  'value' | 'defaultValue' | 'onValueChange' | 'onChange' | 'orientation' | 'dir' | 'children'
> {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: keyof typeof inputStarSizes;
  labels: {
    /** Accessible name of the group, e.g. t('review.ratingLabel'). */
    group: string;
    /** Per-star names, e.g. ['Terrible', 'Bad', 'OK', 'Good', 'Excellent'] or (n) => t('review.stars', { count: n }). */
    options: string[] | ((value: number) => string);
  };
  /** Show the hovered / selected option name next to the stars. */
  showLabel?: boolean;
}

/** Keyboard-accessible 1…5 star selector (radio group: arrows move, Space / click selects). */
function RatingInput({
  value,
  defaultValue,
  onChange,
  max = 5,
  size = 'lg',
  labels,
  showLabel = false,
  className,
  disabled,
  ...props
}: RatingInputProps) {
  const isControlled = value !== undefined;
  const [inner, setInner] = React.useState(defaultValue ?? 0);
  const current = isControlled ? value : inner;
  const [hovered, setHovered] = React.useState<number | null>(null);
  const display = hovered ?? current;

  const optionLabel = (n: number) =>
    typeof labels.options === 'function' ? labels.options(n) : (labels.options[n - 1] ?? String(n));

  return (
    <div
      data-slot="rating-input"
      className={cn('inline-flex max-w-full flex-wrap items-center gap-x-3 gap-y-1', className)}
    >
      <RadioGroupPrimitive.Root
        aria-label={labels.group}
        value={current > 0 ? String(current) : ''}
        onValueChange={(next) => {
          const n = Number(next);
          if (!isControlled) setInner(n);
          onChange?.(n);
        }}
        orientation="horizontal"
        disabled={disabled}
        onPointerLeave={() => setHovered(null)}
        className="inline-flex items-center gap-0.5 aria-invalid:[&_svg]:text-danger/30"
        {...props}
      >
        {Array.from({ length: max }, (_, index) => {
          const n = index + 1;
          const active = n <= display;
          return (
            <RadioGroupPrimitive.Item
              key={n}
              value={String(n)}
              aria-label={optionLabel(n)}
              onPointerEnter={() => !disabled && setHovered(n)}
              className={cn(
                'group/star relative inline-flex items-center justify-center rounded-sm p-0.5',
                'transition-transform duration-150 ease-brand hover:scale-110 active:scale-95',
                'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
                'disabled:pointer-events-none disabled:opacity-50',
              )}
            >
              <StarShape
                className={cn(
                  inputStarSizes[size],
                  'transition-colors duration-150',
                  active ? 'text-rating' : 'text-muted-foreground/25',
                )}
              />
            </RadioGroupPrimitive.Item>
          );
        })}
      </RadioGroupPrimitive.Root>
      {showLabel ? (
        <span aria-hidden="true" className="min-w-16 text-sm font-semibold text-foreground">
          {display > 0 ? optionLabel(display) : ''}
        </span>
      ) : null}
    </div>
  );
}

export { RatingInput, RatingStars };
