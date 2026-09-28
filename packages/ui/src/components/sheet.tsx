import { cva, type VariantProps } from 'class-variance-authority';
import { Dialog as SheetPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '../lib/utils';
import { type CloseButtonProps, OverlayCloseButton, overlayClasses } from './dialog';

function Sheet(props: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger(props: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose(props: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal(props: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay data-slot="sheet-overlay" className={cn(overlayClasses, className)} {...props} />
  );
}

const sheetVariants = cva(
  [
    'group/sheet fixed z-50 flex flex-col bg-popover text-popover-foreground shadow-xl outline-hidden',
    'data-[state=open]:animate-in data-[state=open]:duration-300 data-[state=open]:ease-brand',
    'data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=closed]:ease-in',
  ],
  {
    variants: {
      side: {
        right:
          'inset-y-0 right-0 h-full w-[88%] max-w-md border-l border-border data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
        left: 'inset-y-0 left-0 h-full w-[88%] max-w-md border-r border-border data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
        top: 'inset-x-0 top-0 max-h-[85dvh] rounded-b-2xl border-b border-border data-[state=open]:slide-in-from-top data-[state=closed]:slide-out-to-top',
        bottom:
          'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-2xl border-t border-border pb-[env(safe-area-inset-bottom)] data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
      },
    },
    defaultVariants: { side: 'right' },
  },
);

export type SheetSide = NonNullable<VariantProps<typeof sheetVariants>['side']>;

export type SheetContentProps = React.ComponentProps<typeof SheetPrimitive.Content> &
  VariantProps<typeof sheetVariants> &
  CloseButtonProps & {
    /** Drag-handle bar at the top (defaults to true for `side="bottom"`). Decorative only. */
    showHandle?: boolean;
  };

function SheetContent({
  className,
  children,
  side = 'right',
  showCloseButton = true,
  closeLabel,
  showHandle,
  ...props
}: SheetContentProps) {
  const handle = showHandle ?? side === 'bottom';
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        {handle ? (
          <div
            aria-hidden="true"
            data-slot="sheet-handle"
            className="mx-auto mt-2.5 h-1.5 w-11 shrink-0 rounded-full bg-muted-foreground/25"
          />
        ) : null}
        {children}
        {showCloseButton && closeLabel ? (
          <OverlayCloseButton label={closeLabel} className={cn(handle ? 'top-4' : 'top-3.5')} />
        ) : null}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn(
        'flex shrink-0 flex-col gap-1 px-5 pt-5 pb-3 pe-14 group-data-[side=bottom]/sheet:pt-3 sm:px-6 sm:pe-14',
        className,
      )}
      {...props}
    />
  );
}

/** Scrollable content area — header and footer stay in place. */
function SheetBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-body"
      className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-2 sm:px-6', className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        'mt-auto flex shrink-0 flex-col gap-2 border-t border-border bg-popover px-5 py-4 sm:px-6',
        className,
      )}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('text-lg leading-snug font-bold tracking-[-0.015em] text-foreground', className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-sm leading-relaxed text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
