import { type VariantProps } from 'class-variance-authority';
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '../lib/utils';
import { toggleVariants } from './toggle';

type ToggleGroupVariant = 'default' | 'outline' | 'segmented';
type ToggleGroupSize = NonNullable<VariantProps<typeof toggleVariants>['size']>;

const ToggleGroupContext = React.createContext<{ variant: ToggleGroupVariant; size: ToggleGroupSize }>({
  variant: 'default',
  size: 'default',
});

export type ToggleGroupProps = React.ComponentProps<typeof ToggleGroupPrimitive.Root> & {
  /**
   * `default` / `outline` — separate chips (filters, tags);
   * `segmented` — joined control on a muted track (grid / list view, period switch).
   */
  variant?: ToggleGroupVariant;
  size?: ToggleGroupSize;
};

function ToggleGroup({
  className,
  variant = 'default',
  size = 'default',
  children,
  ...props
}: ToggleGroupProps) {
  const context = React.useMemo(() => ({ variant, size }), [variant, size]);
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      className={cn(
        'group/toggle-group flex w-fit max-w-full items-center',
        variant === 'segmented' ? 'gap-0.5 rounded-lg bg-muted p-1 dark:bg-secondary' : 'flex-wrap gap-2',
        className,
      )}
      {...props}
    >
      <ToggleGroupContext value={context}>{children}</ToggleGroupContext>
    </ToggleGroupPrimitive.Root>
  );
}

export type ToggleGroupItemProps = React.ComponentProps<typeof ToggleGroupPrimitive.Item> & {
  variant?: ToggleGroupVariant;
  size?: ToggleGroupSize;
};

function ToggleGroupItem({ className, children, variant, size, ...props }: ToggleGroupItemProps) {
  const context = React.useContext(ToggleGroupContext);
  const itemVariant = variant ?? context.variant;
  const itemSize = size ?? context.size;

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={itemVariant}
      data-size={itemSize}
      className={cn(
        itemVariant === 'segmented'
          ? cn(
              toggleVariants({ variant: 'default', size: itemSize }),
              'h-8 min-w-8 flex-1 rounded-md text-muted-foreground hover:bg-transparent hover:text-foreground',
              'data-[state=on]:bg-surface-elevated data-[state=on]:text-foreground data-[state=on]:shadow-sm data-[state=on]:hover:bg-surface-elevated',
              'dark:data-[state=on]:bg-[color-mix(in_oklab,var(--secondary),var(--foreground)_10%)]',
              itemSize === 'sm' && 'h-7 min-w-7',
              itemSize === 'lg' && 'h-9 min-w-9',
            )
          : toggleVariants({ variant: itemVariant, size: itemSize }),
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export { ToggleGroup, ToggleGroupItem };
