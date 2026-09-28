import { Label as LabelPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '../lib/utils';

export interface LabelProps extends React.ComponentProps<typeof LabelPrimitive.Root> {
  /** Adds a brand-coloured asterisk (decorative; mark the field itself `required` / `aria-required`). */
  required?: boolean;
}

function Label({ className, required, children, ...props }: LabelProps) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'flex items-center gap-1.5 text-sm leading-snug font-semibold text-foreground select-none',
        'group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      {required ? (
        <span aria-hidden="true" className="-ms-0.5 text-primary dark:text-brand">
          *
        </span>
      ) : null}
    </LabelPrimitive.Root>
  );
}

export { Label };
