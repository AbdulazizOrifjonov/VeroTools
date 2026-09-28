import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import * as React from 'react';

import { cn } from '../lib/utils';

const badgeVariants = cva(
  [
    'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-xs border border-transparent leading-none font-semibold whitespace-nowrap',
    'transition-[color,background-color,border-color] duration-150',
    "[&>svg]:pointer-events-none [&>svg:not([class*='size-'])]:size-3",
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
  ],
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        brand: 'bg-brand-soft text-brand-soft-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        outline: 'border-border bg-transparent text-foreground',
        success: 'bg-success-soft text-success',
        warning: 'bg-warning-soft text-warning',
        danger: 'bg-danger-soft text-danger',
        info: 'bg-info-soft text-info',
        /** Discount label ("−15%"): bold, brand-600 background, white text */
        sale: 'bg-brand-600 font-bold tracking-[-0.01em] text-white',
        /** "New" product label: graphite (inverted in dark mode) */
        new: 'bg-graphite text-graphite-foreground dark:bg-foreground dark:text-background',
        muted: 'bg-muted text-muted-foreground',
      },
      size: {
        sm: 'h-5 px-1.5 text-[11px]',
        default: 'h-6 px-2 text-xs',
        lg: 'h-7 rounded-sm px-2.5 text-[13px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

export interface BadgeProps extends React.ComponentProps<'span'>, VariantProps<typeof badgeVariants> {
  asChild?: boolean;
  /** Leading status dot in the current text colour (order / stock statuses). */
  dot?: boolean;
}

function Badge({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot.Root : 'span';
  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {dot ? (
        <span
          aria-hidden="true"
          data-slot="badge-dot"
          className="size-1.5 shrink-0 rounded-full bg-current"
        />
      ) : null}
      {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : children}
    </Comp>
  );
}

export { Badge, badgeVariants };
