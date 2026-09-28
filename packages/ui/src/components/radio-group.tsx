import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '../lib/utils';

function RadioGroup({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root data-slot="radio-group" className={cn('grid gap-3', className)} {...props} />
  );
}

const radioControlClasses = [
  'relative inline-flex aspect-square size-[18px] shrink-0 items-center justify-center rounded-full border border-input bg-surface-elevated shadow-xs',
  'transition-[background-color,border-color,box-shadow] duration-150 ease-brand',
].join(' ');

function RadioGroupItem({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        'peer',
        radioControlClasses,
        'hover:border-[color-mix(in_oklab,var(--input),var(--foreground)_22%)]',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        'aria-invalid:border-danger aria-invalid:ring-[3px] aria-invalid:ring-danger/15',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'after:absolute after:-inset-2',
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex items-center justify-center"
      >
        <span className="size-2 rounded-full bg-primary-foreground animate-in zoom-in-50 duration-150" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export interface RadioCardProps extends React.ComponentProps<typeof RadioGroupPrimitive.Item> {
  /** Position of the radio dot inside the card. */
  indicator?: 'start' | 'end' | 'none';
}

/**
 * Selectable card for option lists (delivery method, payment type, pickup point).
 * Use inside <RadioGroup>; put any content (title, description, price) as children.
 */
function RadioCard({ className, children, indicator = 'start', ...props }: RadioCardProps) {
  const dot =
    indicator === 'none' ? null : (
      <span
        aria-hidden="true"
        className={cn(
          radioControlClasses,
          'mt-px group-data-[state=checked]/radio-card:border-primary group-data-[state=checked]/radio-card:bg-primary',
        )}
      >
        <span className="size-2 scale-0 rounded-full bg-primary-foreground transition-transform duration-150 ease-brand group-data-[state=checked]/radio-card:scale-100" />
      </span>
    );

  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-card"
      className={cn(
        'group/radio-card relative flex w-full items-start gap-3 rounded-lg border border-input bg-surface-elevated p-4 text-start text-sm text-foreground shadow-xs',
        'transition-[background-color,border-color,box-shadow] duration-150 ease-brand',
        'hover:border-[color-mix(in_oklab,var(--input),var(--foreground)_22%)]',
        'data-[state=checked]:border-primary data-[state=checked]:bg-brand-soft/50 data-[state=checked]:shadow-[inset_0_0_0_1px_var(--primary)]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        'aria-invalid:border-danger',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {indicator === 'start' ? dot : null}
      <span className="flex min-w-0 flex-1 flex-col gap-1">{children}</span>
      {indicator === 'end' ? dot : null}
    </RadioGroupPrimitive.Item>
  );
}

export { RadioCard, RadioGroup, RadioGroupItem };
