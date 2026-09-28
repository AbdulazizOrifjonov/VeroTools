import * as React from 'react';

import { cn } from '../lib/utils';

export interface TableProps extends React.ComponentProps<'table'> {
  /** Class name of the horizontal-scroll wrapper (set a max height here for `stickyHeader`). */
  containerClassName?: string;
  /** Keep the header row visible while the wrapper scrolls vertically (give the wrapper a max height). */
  stickyHeader?: boolean;
}

/**
 * Data table. Always wrapped in a scroll container, so wide tables scroll horizontally
 * instead of breaking narrow (320px) layouts.
 */
function Table({ className, containerClassName, stickyHeader = false, ...props }: TableProps) {
  return (
    <div
      data-slot="table-container"
      data-sticky-header={stickyHeader || undefined}
      className={cn(
        // inline-size containment: a wide table can never widen its ancestors (it scrolls instead)
        'group/table relative w-full max-w-full min-w-0 overflow-x-auto overscroll-x-contain contain-inline-size',
        stickyHeader && 'overflow-y-auto',
        containerClassName,
      )}
    >
      <table
        data-slot="table"
        className={cn('w-full caption-bottom border-separate border-spacing-0 text-sm', className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead data-slot="table-header" className={cn('[&_tr]:hover:bg-transparent', className)} {...props} />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody data-slot="table-body" className={cn('[&>tr:last-child>td]:border-b-0', className)} {...props} />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('bg-surface font-semibold [&>tr>td]:border-t [&>tr>td]:border-b-0', className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'transition-colors duration-150 hover:bg-accent/60 data-[state=selected]:bg-brand-soft/60',
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'h-11 border-b border-border bg-surface px-4 text-start align-middle text-[13px] font-semibold whitespace-nowrap text-muted-foreground',
        '[&:has([role=checkbox])]:w-10 [&:has([role=checkbox])]:pe-0',
        'group-data-[sticky-header]/table:sticky group-data-[sticky-header]/table:top-0 group-data-[sticky-header]/table:z-10',
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'border-b border-border px-4 py-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pe-0',
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('mt-4 text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow };
