import { cva, type VariantProps } from 'class-variance-authority';
import { Switch as SwitchPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '../lib/utils';

const switchVariants = cva(
  [
    'peer group/switch relative inline-flex shrink-0 items-center rounded-full p-0.5 shadow-inner',
    'transition-colors duration-200 ease-brand',
    'data-[state=unchecked]:bg-input data-[state=checked]:bg-primary',
    'hover:data-[state=unchecked]:bg-[color-mix(in_oklab,var(--input),var(--foreground)_12%)]',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'after:absolute after:-inset-1.5',
  ],
  {
    variants: {
      size: {
        sm: 'h-5 w-8',
        default: 'h-6 w-10',
      },
    },
    defaultVariants: { size: 'default' },
  },
);

export interface SwitchProps
  extends React.ComponentProps<typeof SwitchPrimitive.Root>, VariantProps<typeof switchVariants> {}

function Switch({ className, size = 'default', ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(switchVariants({ size }), className)}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.18),0_1px_1px_rgb(0_0_0/0.08)]',
          'transition-transform duration-200 ease-brand data-[state=unchecked]:translate-x-0',
          size === 'sm'
            ? 'size-4 data-[state=checked]:translate-x-3 rtl:data-[state=checked]:-translate-x-3'
            : 'size-5 data-[state=checked]:translate-x-4 rtl:data-[state=checked]:-translate-x-4',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
