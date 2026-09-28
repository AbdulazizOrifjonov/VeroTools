import * as React from 'react';

import { cn } from '../lib/utils';

export interface EmptyStateProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  /** Illustration / lucide icon (rendered inside a soft brand tile). */
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Primary / secondary buttons. */
  action?: React.ReactNode;
  size?: 'sm' | 'default';
  /** Dashed outline container (for empty sections inside pages / cards). */
  bordered?: boolean;
  /** Heading element for the title — match the page outline (default h3). */
  titleAs?: 'h1' | 'h2' | 'h3' | 'h4' | 'p';
}

/** Empty cart, no search results, no orders yet… */
function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'default',
  bordered = false,
  titleAs: Title = 'h3',
  className,
  children,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'flex w-full flex-col items-center justify-center text-center',
        size === 'sm' ? 'gap-3 px-4 py-8' : 'gap-4 px-6 py-12 sm:py-16',
        bordered && 'rounded-xl border border-dashed border-input',
        className,
      )}
      {...props}
    >
      {icon ? (
        <div
          data-slot="empty-state-icon"
          aria-hidden="true"
          className={cn(
            'flex items-center justify-center rounded-2xl bg-brand-soft text-primary ring-8 ring-brand-soft/40 dark:text-brand',
            size === 'sm'
              ? "mb-1 size-12 [&_svg:not([class*='size-'])]:size-6"
              : "mb-2 size-16 [&_svg:not([class*='size-'])]:size-8",
          )}
        >
          {icon}
        </div>
      ) : null}
      <div className="flex max-w-md flex-col gap-1.5">
        <Title
          data-slot="empty-state-title"
          className={cn(
            'font-bold tracking-[-0.015em] text-foreground',
            size === 'sm' ? 'text-base' : 'text-lg sm:text-xl',
          )}
        >
          {title}
        </Title>
        {description ? (
          <p
            data-slot="empty-state-description"
            className="text-sm leading-relaxed text-pretty text-muted-foreground"
          >
            {description}
          </p>
        ) : null}
      </div>
      {children}
      {action ? (
        <div data-slot="empty-state-action" className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {action}
        </div>
      ) : null}
    </div>
  );
}

export { EmptyState };
