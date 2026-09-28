import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '../lib/utils';

export type CheckboxProps = React.ComponentProps<typeof CheckboxPrimitive.Root>;

function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer group/checkbox relative inline-flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border border-input bg-surface-elevated text-primary-foreground shadow-xs',
        'transition-[background-color,border-color,box-shadow] duration-150 ease-brand',
        'hover:border-[color-mix(in_oklab,var(--input),var(--foreground)_22%)]',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        'aria-invalid:border-danger aria-invalid:ring-[3px] aria-invalid:ring-danger/15',
        'disabled:cursor-not-allowed disabled:opacity-50',
        // larger invisible hit area for touch
        'after:absolute after:-inset-2 after:content-[""]',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="pointer-events-none flex items-center justify-center text-current"
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className="size-3.5 group-data-[state=indeterminate]/checkbox:hidden"
        >
          <path
            d="M3.5 8.4 6.6 11.5 12.5 4.8"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            className="animate-check-draw [stroke-dasharray:1]"
          />
        </svg>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className="hidden size-3.5 group-data-[state=indeterminate]/checkbox:block"
        >
          <path d="M4 8h8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
