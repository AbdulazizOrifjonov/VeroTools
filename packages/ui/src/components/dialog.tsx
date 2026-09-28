import { cva, type VariantProps } from 'class-variance-authority';
import { XIcon } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '../lib/utils';

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal(props: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

/** Shared overlay styling for dialog / alert-dialog / sheet. */
export const overlayClasses = cn(
  'fixed inset-0 z-50 bg-overlay',
  'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-200',
  'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-150',
);

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(overlayClasses, className)}
      {...props}
    />
  );
}

/** Icon-only close button used by dialogs and sheets (label comes from props). */
export function OverlayCloseButton({ label, className }: { label: string; className?: string }) {
  return (
    <DialogPrimitive.Close
      data-slot="dialog-close-button"
      aria-label={label}
      className={cn(
        'absolute end-3.5 top-3.5 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground',
        'transition-[background-color,color] duration-150 hover:bg-accent hover:text-foreground',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none',
        className,
      )}
    >
      <XIcon className="size-[18px]" aria-hidden="true" />
    </DialogPrimitive.Close>
  );
}

const dialogContentVariants = cva(
  [
    'fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-5',
    'rounded-2xl border border-border bg-popover p-5 text-popover-foreground shadow-xl outline-hidden sm:p-6',
    'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] data-[state=open]:duration-200 data-[state=open]:ease-brand',
    'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.97] data-[state=closed]:duration-150',
  ],
  {
    variants: {
      size: {
        sm: 'sm:max-w-sm',
        md: 'sm:max-w-lg',
        lg: 'sm:max-w-2xl',
        xl: 'sm:max-w-4xl',
        full: 'sm:max-w-[calc(100%-4rem)]',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/**
 * Close-button props: the built-in ✕ button needs a translated `closeLabel` (its aria-label);
 * opt out with `showCloseButton={false}`.
 */
export type CloseButtonProps =
  { showCloseButton?: boolean; closeLabel: string } | { showCloseButton: false; closeLabel?: string };

export type DialogContentProps = React.ComponentProps<typeof DialogPrimitive.Content> &
  VariantProps<typeof dialogContentVariants> &
  CloseButtonProps;

function DialogContent({
  className,
  children,
  size,
  showCloseButton = true,
  closeLabel,
  ...props
}: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(dialogContentVariants({ size }), className)}
        {...props}
      >
        {children}
        {showCloseButton && closeLabel ? <OverlayCloseButton label={closeLabel} /> : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-1.5 pe-8 text-start', className)}
      {...props}
    />
  );
}

/** Scrollable middle section for long dialog content. */
function DialogBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-body"
      className={cn('-mx-5 min-h-0 flex-1 overflow-y-auto px-5 sm:-mx-6 sm:px-6', className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-lg leading-snug font-bold tracking-[-0.015em] text-foreground', className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-sm leading-relaxed text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
