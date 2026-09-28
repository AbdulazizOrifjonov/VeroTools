import { cva, type VariantProps } from 'class-variance-authority';
import { ChevronDownIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '../lib/utils';
import { fieldBaseClasses } from './input';

const nativeSelectVariants = cva([fieldBaseClasses, 'cursor-pointer appearance-none truncate pe-9'], {
  variants: {
    selectSize: {
      sm: 'h-8 rounded-sm ps-2.5 md:text-[13px]',
      default: 'h-10 ps-3',
      lg: 'h-12 rounded-lg ps-4 md:text-[15px]',
    },
  },
  defaultVariants: { selectSize: 'default' },
});

export interface NativeSelectProps
  extends React.ComponentProps<'select'>, VariantProps<typeof nativeSelectVariants> {
  /** Class name for the wrapping element (width / layout). `className` goes to the <select>. */
  containerClassName?: string;
}

/** Styled native <select> — best choice for simple mobile pickers (sort order, region, quantity). */
function NativeSelect({ className, containerClassName, selectSize, ...props }: NativeSelectProps) {
  return (
    <div
      data-slot="native-select-wrapper"
      className={cn('group/native-select relative flex w-full min-w-0 items-center', containerClassName)}
    >
      <select
        data-slot="native-select"
        className={cn(nativeSelectVariants({ selectSize }), className)}
        {...props}
      />
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground group-has-[select:disabled]/native-select:opacity-50"
      />
    </div>
  );
}

function NativeSelectOption(props: React.ComponentProps<'option'>) {
  return <option data-slot="native-select-option" {...props} />;
}

function NativeSelectOptGroup(props: React.ComponentProps<'optgroup'>) {
  return <optgroup data-slot="native-select-optgroup" {...props} />;
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };
