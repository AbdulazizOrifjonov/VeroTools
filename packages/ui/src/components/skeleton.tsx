import * as React from 'react';

import { cn } from '../lib/utils';

/** Loading placeholder with a soft shimmer. Size it with utilities: <Skeleton className="h-4 w-32" />. */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="skeleton" aria-hidden="true" className={cn('shimmer rounded-md', className)} {...props} />
  );
}

export { Skeleton };
