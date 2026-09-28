import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import * as React from 'react';

import { cn } from '../lib/utils';
import { Spinner } from './spinner';

const buttonVariants = cva(
  [
    'relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent',
    'text-sm leading-none font-semibold select-none',
    'transition-[color,background-color,border-color,box-shadow,scale,opacity] duration-150 ease-brand',
    'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    'aria-invalid:border-danger',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover',
        'brand-outline':
          'border-primary/45 bg-transparent text-primary hover:border-primary hover:bg-brand-soft dark:border-brand/45 dark:text-brand dark:hover:border-brand',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary-hover data-[state=open]:bg-secondary-hover',
        outline:
          'border-input bg-surface-elevated text-foreground shadow-xs hover:bg-accent data-[state=open]:bg-accent',
        ghost: 'text-foreground hover:bg-accent data-[state=open]:bg-accent',
        link: 'text-primary underline-offset-4 hover:underline active:scale-100 dark:text-brand',
        destructive: 'bg-danger-solid text-white shadow-xs hover:bg-danger-solid/90',
        success: 'bg-success-solid text-white shadow-xs hover:bg-success-solid/90',
        graphite:
          'bg-graphite text-graphite-foreground shadow-xs hover:bg-graphite/85 dark:border-border dark:hover:bg-secondary',
      },
      size: {
        xs: "h-7 gap-1 rounded-sm px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: 'h-8 gap-1.5 px-3 text-[13px]',
        default: 'h-10 px-4',
        lg: 'h-11 rounded-lg px-5 text-[15px]',
        xl: "h-12 rounded-lg px-6 text-base [&_svg:not([class*='size-'])]:size-5",
        icon: 'size-10',
        'icon-sm': 'size-8',
        'icon-lg': "size-11 rounded-lg [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

type ButtonVariantProps = VariantProps<typeof buttonVariants>;
export type ButtonVariant = NonNullable<ButtonVariantProps['variant']>;
export type ButtonSize = NonNullable<ButtonVariantProps['size']>;

export interface ButtonProps extends React.ComponentProps<'button'>, ButtonVariantProps {
  /** Render the single child element (e.g. a router <Link>) with button styles. */
  asChild?: boolean;
  /** Shows a centred spinner, disables the button and keeps its width. Ignored with `asChild`. */
  loading?: boolean;
  /** Icon rendered before the label. */
  leftIcon?: React.ReactNode;
  /** Icon rendered after the label. */
  rightIcon?: React.ReactNode;
}

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  children,
  ...props
}: ButtonProps) {
  if (asChild) {
    return (
      <Slot.Root
        data-slot="button"
        data-variant={variant}
        data-size={size}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {leftIcon}
        <Slot.Slottable>{children}</Slot.Slottable>
        {rightIcon}
      </Slot.Root>
    );
  }

  return (
    <button
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(
        buttonVariants({ variant, size }),
        loading && 'cursor-progress disabled:opacity-100',
        className,
      )}
      {...props}
    >
      {loading ? (
        <span data-slot="button-spinner" className="absolute inset-0 flex items-center justify-center">
          <Spinner size={size === 'xs' ? 'xs' : size === 'xl' || size === 'icon-lg' ? 'md' : 'sm'} />
        </span>
      ) : null}
      <span data-slot="button-content" className={cn('contents', loading && 'invisible')}>
        {leftIcon}
        {children}
        {rightIcon}
      </span>
    </button>
  );
}

export { Button, buttonVariants };
