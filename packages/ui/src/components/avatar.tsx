import { cva, type VariantProps } from 'class-variance-authority';
import { Avatar as AvatarPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '../lib/utils';

const avatarVariants = cva('relative flex shrink-0 overflow-hidden rounded-full select-none', {
  variants: {
    size: {
      xs: 'size-6 text-[10px]',
      sm: 'size-8 text-xs',
      default: 'size-10 text-sm',
      lg: 'size-12 text-base',
      xl: 'size-16 text-lg',
    },
  },
  defaultVariants: { size: 'default' },
});

export interface AvatarProps
  extends React.ComponentProps<typeof AvatarPrimitive.Root>, VariantProps<typeof avatarVariants> {}

function Avatar({ className, size, ...props }: AvatarProps) {
  return (
    <AvatarPrimitive.Root data-slot="avatar" className={cn(avatarVariants({ size }), className)} {...props} />
  );
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn('aspect-square size-full object-cover', className)}
      {...props}
    />
  );
}

/** Initials shown while the image loads or when it is missing. */
function AvatarFallback({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        'flex size-full items-center justify-center rounded-full bg-brand-soft font-bold tracking-tight text-brand-soft-foreground uppercase',
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarFallback, AvatarImage };
