import { CircleCheckIcon, CircleXIcon, InfoIcon, TriangleAlertIcon } from 'lucide-react';
import * as React from 'react';
import { Toaster as Sonner, toast, type ToasterProps as SonnerProps } from 'sonner';

import { cn } from '../lib/utils';
import { ThemeContext } from '../theme/theme-provider';
import { Spinner } from './spinner';

export interface ToasterProps extends Omit<SonnerProps, 'containerAriaLabel'> {
  /** Name of the notifications region (sonner defaults to English "Notifications"), e.g. t('common.notifications'). */
  containerAriaLabel: string;
  /** aria-label of each toast's close button (when `closeButton` is on), e.g. t('common.close'). */
  closeButtonAriaLabel?: string;
}

/**
 * Themed sonner <Toaster>. Mount once near the app root; call `toast.success(t('cart.added'))` anywhere.
 * Pass translated `containerAriaLabel` (region name) and `closeButtonAriaLabel`.
 */
function Toaster({
  className,
  toastOptions,
  style,
  containerAriaLabel,
  closeButtonAriaLabel,
  position = 'bottom-right',
  offset = 24,
  mobileOffset = 12,
  gap = 10,
  ...props
}: ToasterProps) {
  const theme = React.useContext(ThemeContext)?.resolvedTheme ?? 'light';
  const classNames = toastOptions?.classNames;
  const closeLabel = closeButtonAriaLabel ?? toastOptions?.closeButtonAriaLabel;

  return (
    <Sonner
      theme={theme}
      position={position}
      offset={offset}
      mobileOffset={mobileOffset}
      gap={gap}
      containerAriaLabel={containerAriaLabel}
      className={cn('toaster group', className)}
      icons={{
        success: <CircleCheckIcon className="size-[18px] text-success" />,
        info: <InfoIcon className="size-[18px] text-info" />,
        warning: <TriangleAlertIcon className="size-[18px] text-warning" />,
        error: <CircleXIcon className="size-[18px] text-danger" />,
        loading: <Spinner size="sm" className="text-muted-foreground" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius-xl)',
          '--width': '380px',
          fontFamily: 'var(--font-sans)',
          ...style,
        } as React.CSSProperties
      }
      toastOptions={{
        ...toastOptions,
        ...(closeLabel ? { closeButtonAriaLabel: closeLabel } : null),
        classNames: {
          ...classNames,
          toast: cn(
            'group/toast gap-3! px-4! py-3.5! shadow-lg! font-sans items-start! border-border!',
            classNames?.toast,
          ),
          title: cn('text-sm! leading-5! font-semibold! text-foreground', classNames?.title),
          description: cn('text-[13px]! leading-snug! text-muted-foreground!', classNames?.description),
          icon: cn('mt-px! size-5! [&>svg]:m-0!', classNames?.icon),
          content: cn('gap-0.5!', classNames?.content),
          actionButton: cn(
            'h-8! rounded-sm! bg-primary! px-3! text-[13px]! font-semibold! text-primary-foreground! transition-colors hover:bg-primary-hover! self-center!',
            classNames?.actionButton,
          ),
          cancelButton: cn(
            'h-8! rounded-sm! bg-secondary! px-3! text-[13px]! font-semibold! text-secondary-foreground! self-center!',
            classNames?.cancelButton,
          ),
          closeButton: cn(
            'border-border! bg-popover! text-muted-foreground! hover:bg-accent! hover:text-foreground!',
            classNames?.closeButton,
          ),
        },
      }}
      {...props}
    />
  );
}

export { toast, Toaster };
