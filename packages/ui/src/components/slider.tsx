import { Slider as SliderPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '../lib/utils';

export interface SliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {
  /** aria-label per thumb, e.g. [t('filters.priceFrom'), t('filters.priceTo')]. */
  thumbLabels?: string[];
  /** Human readable value for assistive tech, e.g. (v) => formatPrice(v, t('currency')). */
  formatValueText?: (value: number) => string;
}

/**
 * Range slider. Pass two values (`defaultValue={[0, 5_000_000]}`) for a min/max price range.
 */
function Slider({
  className,
  min = 0,
  max = 100,
  onValueChange,
  thumbLabels,
  formatValueText,
  ...props
}: SliderProps) {
  const { value, defaultValue } = props;
  const [internal, setInternal] = React.useState<number[]>(() =>
    Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min],
  );
  const values = Array.isArray(value) ? value : internal;

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      min={min}
      max={max}
      onValueChange={(next) => {
        if (value === undefined) setInternal(next);
        onValueChange?.(next);
      }}
      className={cn(
        'relative flex w-full touch-none items-center py-2 select-none data-[disabled]:opacity-50',
        'data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col data-[orientation=vertical]:px-2 data-[orientation=vertical]:py-0',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative grow overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--input)_75%,transparent)] data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute rounded-full bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
        />
      </SliderPrimitive.Track>
      {values.map((thumbValue, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          aria-label={thumbLabels?.[index]}
          aria-valuetext={formatValueText ? formatValueText(thumbValue) : undefined}
          className={cn(
            'relative block size-5 shrink-0 cursor-grab rounded-full border-2 border-primary bg-white shadow-md',
            'transition-[box-shadow,scale] duration-150 ease-brand',
            'hover:ring-[6px] hover:ring-primary/12 active:scale-110 active:cursor-grabbing',
            'focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            'data-[disabled]:pointer-events-none',
            'after:absolute after:-inset-2.5',
          )}
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
