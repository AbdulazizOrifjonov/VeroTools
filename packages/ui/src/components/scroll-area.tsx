import { ScrollArea as ScrollAreaPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '../lib/utils';

export interface ScrollAreaProps extends React.ComponentProps<typeof ScrollAreaPrimitive.Root> {
  /** Also render a horizontal scrollbar. */
  horizontal?: boolean;
  viewportClassName?: string;
}

function ScrollArea({
  className,
  children,
  horizontal = false,
  viewportClassName,
  ...props
}: ScrollAreaProps) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn('relative overflow-hidden', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className={cn(
          'size-full rounded-[inherit] outline-hidden transition-[box-shadow] focus-visible:ring-[3px] focus-visible:ring-ring/30',
          viewportClassName,
        )}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      {horizontal ? <ScrollBar orientation="horizontal" /> : null}
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        'flex touch-none p-0.5 transition-colors select-none',
        orientation === 'vertical' && 'h-full w-2.5',
        orientation === 'horizontal' && 'h-2.5 flex-col',
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-(--scrollbar-thumb) transition-colors hover:bg-(--scrollbar-thumb-hover)"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}

export { ScrollArea, ScrollBar };
