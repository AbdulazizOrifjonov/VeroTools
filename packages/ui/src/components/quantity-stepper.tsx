import { cva, type VariantProps } from 'class-variance-authority';
import { MinusIcon, PlusIcon } from 'lucide-react';
import * as React from 'react';

import { clamp, cn } from '../lib/utils';

const stepperVariants = cva(
  [
    'group/stepper inline-flex shrink-0 items-center rounded-md border border-input bg-surface-elevated p-[3px] text-foreground shadow-xs',
    'transition-[border-color,box-shadow] duration-150 ease-brand',
    'has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-[3px] has-[input:focus-visible]:ring-ring/20',
    'data-[disabled]:opacity-50',
  ],
  {
    variants: {
      size: {
        sm: 'h-8 rounded-sm p-0.5',
        default: 'h-10',
        lg: 'h-12 rounded-lg p-1',
      },
    },
    defaultVariants: { size: 'default' },
  },
);

const stepButtonClasses = [
  'inline-flex h-full aspect-square shrink-0 items-center justify-center rounded-[calc(var(--radius-md)-3px)] text-foreground',
  'transition-[background-color,color,scale] duration-150 ease-brand hover:bg-accent active:scale-90',
  'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring',
  'disabled:pointer-events-none disabled:text-muted-foreground/45',
].join(' ');

export interface QuantityStepperProps
  extends
    Omit<React.ComponentProps<'div'>, 'onChange' | 'defaultValue' | 'children' | 'ref' | 'onBlur'>,
    VariantProps<typeof stepperVariants> {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  /** aria-label of the "−" button, e.g. t('cart.decrease'). */
  decreaseLabel: string;
  /** aria-label of the "+" button, e.g. t('cart.increase'). */
  increaseLabel: string;
  /** aria-label of the numeric field, e.g. t('cart.quantity'). */
  inputLabel?: string;
  /** Submitted with native forms. */
  name?: string;
  /** Id of the numeric input (defaults to `id`, so <label htmlFor> / FormControl work). */
  inputId?: string;
  /** Forwarded to the numeric <input> (react-hook-form focuses it on validation errors). */
  ref?: React.Ref<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
}

function snap(value: number, min: number, max: number, step: number): number {
  const stepped = Math.round((value - min) / step) * step + min;
  return clamp(Number(stepped.toFixed(6)), min, max);
}

/** − [ 2 ] + control for cart lines and product pages. Buttons disable at min / max. */
function QuantityStepper({
  value,
  defaultValue,
  onChange,
  min = 1,
  max = 999,
  step = 1,
  size = 'default',
  disabled = false,
  decreaseLabel,
  increaseLabel,
  inputLabel,
  name,
  inputId,
  ref,
  onBlur,
  className,
  id,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
  ...props
}: QuantityStepperProps) {
  const isControlled = value !== undefined;
  const [inner, setInner] = React.useState(() => snap(defaultValue ?? min, min, max, step));
  const current = isControlled ? snap(value, min, max, step) : inner;
  const [draft, setDraft] = React.useState<string | null>(null);

  const update = (next: number) => {
    const safe = snap(next, min, max, step);
    if (!isControlled) setInner(safe);
    if (safe !== current) onChange?.(safe);
  };

  const commitDraft = () => {
    if (draft === null) return;
    const parsed = Number.parseInt(draft, 10);
    setDraft(null);
    update(Number.isNaN(parsed) ? current : parsed);
  };

  const iconSize = size === 'sm' ? 'size-3.5' : size === 'lg' ? 'size-[18px]' : 'size-4';

  return (
    <div
      role="group"
      data-slot="quantity-stepper"
      data-disabled={disabled || undefined}
      className={cn(stepperVariants({ size }), className)}
      {...props}
    >
      <button
        type="button"
        data-slot="quantity-stepper-decrease"
        aria-label={decreaseLabel}
        disabled={disabled || current <= min}
        onClick={() => update(current - step)}
        className={stepButtonClasses}
      >
        <MinusIcon className={iconSize} strokeWidth={2.25} aria-hidden="true" />
      </button>
      <input
        ref={ref}
        id={inputId ?? id}
        name={name}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        role="spinbutton"
        aria-label={inputLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={current}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        data-slot="quantity-stepper-input"
        value={draft ?? String(current)}
        onChange={(event) => setDraft(event.target.value.replace(/\D/g, '').slice(0, 6))}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={(event) => {
          commitDraft();
          onBlur?.(event);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            commitDraft();
          } else if (event.key === 'Escape') {
            setDraft(null);
          } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            setDraft(null);
            update(current + (event.key === 'ArrowUp' ? step : -step));
          }
        }}
        className={cn(
          'h-full min-w-0 bg-transparent text-center font-semibold tabular-nums outline-hidden disabled:cursor-not-allowed',
          // ≥16px on touch screens so iOS does not zoom on focus
          size === 'sm'
            ? 'w-8 text-base md:text-[13px]'
            : size === 'lg'
              ? 'w-12 text-base'
              : 'w-10 text-base md:text-sm',
        )}
      />
      <button
        type="button"
        data-slot="quantity-stepper-increase"
        aria-label={increaseLabel}
        disabled={disabled || current >= max}
        onClick={() => update(current + step)}
        className={stepButtonClasses}
      >
        <PlusIcon className={iconSize} strokeWidth={2.25} aria-hidden="true" />
      </button>
    </div>
  );
}

export { QuantityStepper };
