import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../lib/utils';

/** Shared field chrome for text-like controls (input, textarea, select trigger, native select). */
export const fieldBaseClasses = [
  'w-full min-w-0 rounded-md border border-input bg-surface-elevated text-foreground shadow-xs',
  'text-base md:text-sm',
  'transition-[color,background-color,border-color,box-shadow] duration-150 ease-brand outline-hidden',
  'placeholder:text-muted-foreground/75',
  'hover:border-[color-mix(in_oklab,var(--input),var(--foreground)_14%)]',
  'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20',
  'aria-invalid:border-danger aria-invalid:ring-danger/15 aria-invalid:focus-visible:ring-[3px]',
  'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60',
].join(' ');

const inputVariants = cva(
  [
    fieldBaseClasses,
    'px-3 py-2',
    'file:me-3 file:inline-flex file:h-7 file:rounded-sm file:border-0 file:bg-secondary file:px-2.5 file:text-sm file:font-semibold file:text-secondary-foreground',
    '[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [&[type=number]]:[appearance:textfield]',
    '[&::-webkit-search-cancel-button]:appearance-none',
  ],
  {
    variants: {
      inputSize: {
        sm: 'h-8 rounded-sm px-2.5 py-1 md:text-[13px]',
        default: 'h-10',
        lg: 'h-12 rounded-lg px-4 md:text-[15px]',
      },
    },
    defaultVariants: { inputSize: 'default' },
  },
);

export interface InputProps extends React.ComponentProps<'input'>, VariantProps<typeof inputVariants> {}

function Input({ className, type = 'text', inputSize, ...props }: InputProps) {
  return (
    <input type={type} data-slot="input" className={cn(inputVariants({ inputSize }), className)} {...props} />
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* InputGroup — an input with leading / trailing addons (icons, text, buttons)                     */
/* ---------------------------------------------------------------------------------------------- */

const inputGroupVariants = cva(
  [
    'group/input-group relative flex w-full min-w-0 items-center rounded-md border border-input bg-surface-elevated text-foreground shadow-xs',
    'transition-[border-color,box-shadow] duration-150 ease-brand',
    'hover:border-[color-mix(in_oklab,var(--input),var(--foreground)_14%)]',
    'has-[[data-slot=input]:focus-visible]:border-ring has-[[data-slot=input]:focus-visible]:ring-[3px] has-[[data-slot=input]:focus-visible]:ring-ring/20',
    'has-[[data-slot=input][aria-invalid=true]]:border-danger',
    'has-[[data-slot=input]:disabled]:cursor-not-allowed has-[[data-slot=input]:disabled]:bg-muted has-[[data-slot=input]:disabled]:opacity-60',
    // the inner input loses its own chrome
    '[&_[data-slot=input]]:h-full [&_[data-slot=input]]:flex-1 [&_[data-slot=input]]:rounded-none [&_[data-slot=input]]:border-0 [&_[data-slot=input]]:bg-transparent [&_[data-slot=input]]:shadow-none [&_[data-slot=input]]:ring-0 [&_[data-slot=input]]:focus-visible:ring-0 [&_[data-slot=input]]:disabled:bg-transparent [&_[data-slot=input]]:disabled:opacity-100',
    // tighter text padding next to an addon
    'has-[>[data-align=start]]:[&_[data-slot=input]]:ps-2 has-[>[data-align=end]]:[&_[data-slot=input]]:pe-2',
  ],
  {
    variants: {
      size: {
        sm: 'h-8 rounded-sm [&_[data-slot=input]]:px-2.5 [&_[data-slot=input]]:md:text-[13px]',
        default: 'h-10 [&_[data-slot=input]]:px-3',
        lg: 'h-12 rounded-lg [&_[data-slot=input]]:px-4 [&_[data-slot=input]]:md:text-[15px]',
      },
    },
    defaultVariants: { size: 'default' },
  },
);

export interface InputGroupProps
  extends React.ComponentProps<'div'>, VariantProps<typeof inputGroupVariants> {
  /** Shortcut for `<InputGroupAddon align="start">` (icon, text, button). */
  leading?: React.ReactNode;
  /** Shortcut for `<InputGroupAddon align="end">` (icon, text, button). */
  trailing?: React.ReactNode;
}

function InputGroup({ className, size, leading, trailing, children, ...props }: InputGroupProps) {
  return (
    <div
      role="group"
      data-slot="input-group"
      className={cn(inputGroupVariants({ size }), className)}
      {...props}
    >
      {leading != null ? <InputGroupAddon align="start">{leading}</InputGroupAddon> : null}
      {children}
      {trailing != null ? <InputGroupAddon align="end">{trailing}</InputGroupAddon> : null}
    </div>
  );
}

const inputGroupAddonVariants = cva(
  [
    'flex h-full shrink-0 items-center gap-1.5 text-sm text-muted-foreground select-none',
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      align: {
        // compact padding when the addon holds a button
        start: 'order-first ps-3 has-[button]:ps-1',
        end: 'order-last pe-3 has-[button]:pe-1',
      },
    },
    defaultVariants: { align: 'start' },
  },
);

export interface InputGroupAddonProps
  extends React.ComponentProps<'div'>, VariantProps<typeof inputGroupAddonVariants> {}

function InputGroupAddon({ className, align = 'start', onMouseDown, ...props }: InputGroupAddonProps) {
  return (
    <div
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onMouseDown={(event) => {
        onMouseDown?.(event);
        // clicking a decorative addon focuses the input (buttons keep their own behaviour)
        if (event.defaultPrevented || (event.target as HTMLElement).closest('button, a, input')) return;
        const input = event.currentTarget.parentElement?.querySelector<HTMLInputElement>('[data-slot=input]');
        if (input) {
          event.preventDefault();
          input.focus();
        }
      }}
      {...props}
    />
  );
}

/** Plain text inside an addon, e.g. a unit ("so'm", "kg") or a domain prefix. */
function InputGroupText({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="input-group-text"
      className={cn('text-sm font-medium whitespace-nowrap text-muted-foreground', className)}
      {...props}
    />
  );
}

export { Input, InputGroup, InputGroupAddon, InputGroupText, inputVariants };
