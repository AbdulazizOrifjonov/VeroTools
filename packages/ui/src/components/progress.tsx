import { cva, type VariantProps } from 'class-variance-authority';
import { Progress as ProgressPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '../lib/utils';

const progressVariants = cva(
  'relative w-full overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--input)_70%,transparent)]',
  {
    variants: {
      size: {
        sm: 'h-1.5',
        default: 'h-2',
        lg: 'h-3',
      },
    },
    defaultVariants: { size: 'default' },
  },
);

const indicatorTone = {
  brand: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  graphite: 'bg-foreground',
} as const;

export interface ProgressProps
  extends React.ComponentProps<typeof ProgressPrimitive.Root>, VariantProps<typeof progressVariants> {
  tone?: keyof typeof indicatorTone;
}

/** Pass a translated `aria-label` (or `aria-labelledby`) describing what is progressing. */
function Progress({ className, value, max = 100, size, tone = 'brand', ...props }: ProgressProps) {
  const percent = value == null ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      max={max}
      className={cn(progressVariants({ size }), className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          'h-full w-full flex-1 rounded-full transition-transform duration-500 ease-brand',
          indicatorTone[tone],
        )}
        style={{ transform: `translateX(-${100 - percent}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
