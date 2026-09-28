import { cva, type VariantProps } from 'class-variance-authority';
import { Toggle as TogglePrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '../lib/utils';

const toggleVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent text-sm font-semibold whitespace-nowrap select-none',
    'transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-brand active:scale-[0.97]',
    'hover:bg-accent hover:text-foreground',
    'data-[state=on]:bg-brand-soft data-[state=on]:text-brand-soft-foreground data-[state=on]:hover:bg-brand-soft',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    'disabled:pointer-events-none disabled:opacity-50',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default: 'bg-transparent text-muted-foreground',
        outline:
          'border-input bg-surface-elevated text-foreground shadow-xs data-[state=on]:border-primary/50 dark:data-[state=on]:border-brand/50',
      },
      size: {
        sm: 'h-8 min-w-8 px-2.5 text-[13px]',
        default: 'h-9 min-w-9 px-3',
        lg: 'h-10 min-w-10 px-3.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ToggleProps
  extends React.ComponentProps<typeof TogglePrimitive.Root>, VariantProps<typeof toggleVariants> {}

function Toggle({ className, variant, size, ...props }: ToggleProps) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
