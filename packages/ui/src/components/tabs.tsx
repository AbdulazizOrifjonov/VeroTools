import { Tabs as TabsPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '../lib/utils';

export type TabsVariant = 'underline' | 'pills';

const TabsVariantContext = React.createContext<TabsVariant>('underline');

export interface TabsProps extends React.ComponentProps<typeof TabsPrimitive.Root> {
  /** `underline` — brand indicator under the active tab (product page sections);
   *  `pills` — segmented control on a muted track (filters, period switches). */
  variant?: TabsVariant;
}

function Tabs({ className, variant = 'underline', ...props }: TabsProps) {
  return (
    <TabsVariantContext value={variant}>
      <TabsPrimitive.Root
        data-slot="tabs"
        data-variant={variant}
        className={cn('flex flex-col gap-4 data-[orientation=vertical]:flex-row', className)}
        {...props}
      />
    </TabsVariantContext>
  );
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  const variant = React.useContext(TabsVariantContext);
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(
        variant === 'underline'
          ? 'no-scrollbar flex w-full min-w-0 items-center gap-6 overflow-x-auto shadow-[inset_0_-1px_0_var(--border)] contain-inline-size sm:gap-8'
          : 'no-scrollbar inline-flex h-10 w-fit max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-muted p-1 dark:bg-secondary',
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const variant = React.useContext(TabsVariantContext);
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 text-sm font-semibold whitespace-nowrap text-muted-foreground select-none',
        'transition-[color,background-color,box-shadow] duration-150 ease-brand hover:text-foreground',
        'focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        variant === 'underline'
          ? [
              'relative h-11 px-0.5 focus-visible:-outline-offset-2 focus-visible:rounded-sm',
              'data-[state=active]:text-foreground',
              'after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand',
              'after:origin-center after:scale-x-0 after:transition-transform after:duration-200 after:ease-brand data-[state=active]:after:scale-x-100',
            ]
          : [
              'h-full flex-1 rounded-md px-3 focus-visible:outline-offset-0',
              'data-[state=active]:bg-surface-elevated data-[state=active]:text-foreground data-[state=active]:shadow-sm',
              'dark:data-[state=active]:bg-[color-mix(in_oklab,var(--secondary),var(--foreground)_10%)]',
            ],
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        'flex-1 rounded-md outline-hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring',
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
