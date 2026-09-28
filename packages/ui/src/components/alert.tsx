import { cva, type VariantProps } from 'class-variance-authority';
import { CircleAlertIcon, CircleCheckIcon, InfoIcon, TriangleAlertIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '../lib/utils';

const alertVariants = cva(
  [
    'relative grid w-full grid-cols-[0_1fr] items-start gap-y-1 rounded-lg border px-4 py-3.5 text-sm',
    'has-[>[data-slot=alert-icon]]:grid-cols-[auto_1fr] has-[>[data-slot=alert-icon]]:gap-x-3',
  ],
  {
    variants: {
      variant: {
        default:
          'border-border bg-surface-elevated text-foreground [&>[data-slot=alert-icon]]:text-muted-foreground',
        info: 'border-info/15 bg-info-soft/45 text-foreground dark:bg-info-soft [&>[data-slot=alert-icon]]:text-info',
        success:
          'border-success/15 bg-success-soft/45 text-foreground dark:bg-success-soft [&>[data-slot=alert-icon]]:text-success',
        warning:
          'border-warning/20 bg-warning-soft/50 text-foreground dark:bg-warning-soft [&>[data-slot=alert-icon]]:text-warning',
        danger:
          'border-danger/15 bg-danger-soft/45 text-foreground dark:bg-danger-soft [&>[data-slot=alert-icon]]:text-danger',
        brand:
          'border-primary/15 bg-brand-soft/70 text-foreground dark:bg-brand-soft [&>[data-slot=alert-icon]]:text-primary dark:[&>[data-slot=alert-icon]]:text-brand',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

type AlertVariant = NonNullable<VariantProps<typeof alertVariants>['variant']>;

const defaultIcons: Record<AlertVariant, React.ComponentType<{ className?: string }>> = {
  default: InfoIcon,
  info: InfoIcon,
  success: CircleCheckIcon,
  warning: TriangleAlertIcon,
  danger: CircleAlertIcon,
  brand: InfoIcon,
};

export interface AlertProps extends React.ComponentProps<'div'>, VariantProps<typeof alertVariants> {
  /** Custom icon; `false` hides it. Defaults to a status icon matching the variant. */
  icon?: React.ReactNode | false;
}

function Alert({ className, variant = 'default', icon, children, role, ...props }: AlertProps) {
  const variantKey: AlertVariant = variant ?? 'default';
  const DefaultIcon = defaultIcons[variantKey];
  const iconNode = icon === false || icon === null ? null : (icon ?? <DefaultIcon />);

  return (
    <div
      data-slot="alert"
      data-variant={variantKey}
      role={role ?? (variantKey === 'danger' || variantKey === 'warning' ? 'alert' : 'status')}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {iconNode ? (
        <span
          data-slot="alert-icon"
          aria-hidden="true"
          className="mt-px flex [&>svg]:size-[18px] [&>svg]:shrink-0"
        >
          {iconNode}
        </span>
      ) : null}
      {children}
    </div>
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-title"
      className={cn('col-start-2 min-h-5 leading-5 font-semibold tracking-[-0.005em]', className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        'col-start-2 grid justify-items-start gap-1 leading-relaxed text-muted-foreground [&_p]:leading-relaxed',
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertDescription, AlertTitle, alertVariants };
