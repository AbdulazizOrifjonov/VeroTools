import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../lib/utils';

const spinnerVariants = cva('shrink-0 animate-spin [animation-duration:750ms]', {
  variants: {
    size: {
      xs: 'size-3',
      sm: 'size-4',
      md: 'size-5',
      lg: 'size-6',
      xl: 'size-8',
    },
  },
  defaultVariants: { size: 'sm' },
});

export interface SpinnerProps
  extends Omit<React.ComponentProps<'svg'>, 'children'>, VariantProps<typeof spinnerVariants> {
  /** Accessible text (e.g. t('common.loading')). When omitted the spinner is decorative. */
  label?: string;
}

function Spinner({ className, size, label, ...props }: SpinnerProps) {
  const svg = (
    <svg
      data-slot="spinner"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn(spinnerVariants({ size }), className)}
      {...props}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.22" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );

  if (!label) return svg;

  return (
    <span role="status" data-slot="spinner-status" className="inline-flex items-center">
      {svg}
      <span className="sr-only">{label}</span>
    </span>
  );
}

export { Spinner, spinnerVariants };
