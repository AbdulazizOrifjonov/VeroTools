import { ChevronRightIcon, EllipsisIcon } from 'lucide-react';
import { Slot } from 'radix-ui';
import * as React from 'react';

import { cn } from '../lib/utils';

/** Pass a translated `aria-label` (e.g. t('breadcrumb.label')). */
function Breadcrumb(props: React.ComponentProps<'nav'>) {
  return <nav data-slot="breadcrumb" {...props} />;
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<'ol'>) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        'flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] break-words text-muted-foreground sm:gap-x-2',
        className,
      )}
      {...props}
    />
  );
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn('inline-flex min-w-0 items-center gap-1.5', className)}
      {...props}
    />
  );
}

function BreadcrumbLink({
  asChild,
  className,
  ...props
}: React.ComponentProps<'a'> & {
  /** Render the child (e.g. a router <Link>) with link styles. */
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot.Root : 'a';
  return (
    <Comp
      data-slot="breadcrumb-link"
      className={cn(
        'rounded-sm font-medium transition-colors duration-150 hover:text-foreground',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
      )}
      {...props}
    />
  );
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="breadcrumb-page"
      aria-current="page"
      className={cn('truncate font-semibold text-foreground', className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn('text-muted-foreground/60 [&>svg]:size-3.5 rtl:[&>svg]:rotate-180', className)}
      {...props}
    >
      {children ?? <ChevronRightIcon />}
    </li>
  );
}

function BreadcrumbEllipsis({
  className,
  label,
  ...props
}: React.ComponentProps<'span'> & { label?: string | undefined }) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role={label ? undefined : 'presentation'}
      aria-hidden={label ? undefined : true}
      className={cn('flex size-6 items-center justify-center', className)}
      {...props}
    >
      <EllipsisIcon className="size-4" aria-hidden="true" />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
