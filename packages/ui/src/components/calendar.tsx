import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import * as React from 'react';
import { DayPicker, getDefaultClassNames, type DayButton } from 'react-day-picker';
import { enUS, ru, uz, uzCyrl } from 'react-day-picker/locale';

import { cn } from '../lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * Locales with translated month / weekday names AND DayPicker aria labels ("Next month"…).
 * `<Calendar locale={calendarLocales[i18n.language]} />` — keys: 'uz', 'uz-Cyrl', 'ru', 'en'.
 */
export const calendarLocales = { uz, 'uz-Cyrl': uzCyrl, ru, en: enUS } as const;
export type CalendarLocaleKey = keyof typeof calendarLocales;

/**
 * Date picker grid (react-day-picker v9) styled with VERO tokens.
 * Pass a locale for translated month / weekday names and aria labels:
 * `import { uz, ru, enUS } from 'react-day-picker/locale'` (or plain date-fns locales), see `calendarLocales`.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  components,
  ...props
}: CalendarProps) {
  const defaults = getDefaultClassNames();

  const navButton = cn(
    'inline-flex size-(--cell-size) items-center justify-center rounded-md text-foreground select-none',
    'transition-[background-color,color] duration-150 hover:bg-accent',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    'aria-disabled:pointer-events-none aria-disabled:opacity-40',
  );

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      className={cn(
        'group/calendar p-3 [--cell-size:--spacing(9)] sm:[--cell-size:--spacing(9.5)]',
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      classNames={{
        root: cn('w-fit', defaults.root),
        months: cn('relative flex flex-col gap-5 md:flex-row md:gap-6', defaults.months),
        month: cn('flex w-full flex-col gap-3', defaults.month),
        nav: cn('absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1', defaults.nav),
        button_previous: cn(navButton, defaults.button_previous),
        button_next: cn(navButton, defaults.button_next),
        month_caption: cn(
          'flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)',
          defaults.month_caption,
        ),
        dropdowns: cn(
          'flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-semibold',
          defaults.dropdowns,
        ),
        dropdown_root: cn(
          'relative rounded-md border border-input shadow-xs has-focus-visible:border-ring has-focus-visible:ring-[3px] has-focus-visible:ring-ring/20',
          defaults.dropdown_root,
        ),
        dropdown: cn('absolute inset-0 cursor-pointer bg-popover opacity-0', defaults.dropdown),
        caption_label: cn(
          'font-bold tracking-[-0.01em] capitalize select-none',
          captionLayout === 'label'
            ? 'text-sm'
            : 'flex h-8 items-center gap-1 rounded-md ps-2.5 pe-1.5 text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground',
          defaults.caption_label,
        ),
        month_grid: cn('w-full border-collapse', defaults.month_grid),
        weekdays: cn('flex', defaults.weekdays),
        weekday: cn(
          'flex-1 text-[0.75rem] font-semibold text-muted-foreground capitalize select-none',
          defaults.weekday,
        ),
        week: cn('mt-1 flex w-full', defaults.week),
        week_number_header: cn('w-(--cell-size) select-none', defaults.week_number_header),
        week_number: cn('text-[0.75rem] text-muted-foreground select-none', defaults.week_number),
        day: cn(
          'group/day relative aspect-square h-full w-full p-0 text-center select-none',
          '[&:first-child[data-selected=true]_button]:rounded-s-md [&:last-child[data-selected=true]_button]:rounded-e-md',
          defaults.day,
        ),
        range_start: cn('rounded-s-md bg-brand-soft', defaults.range_start),
        range_middle: cn('rounded-none', defaults.range_middle),
        range_end: cn('rounded-e-md bg-brand-soft', defaults.range_end),
        today: cn(
          'after:pointer-events-none after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-brand',
          'data-[selected=true]:after:bg-primary-foreground',
          defaults.today,
        ),
        outside: cn('text-muted-foreground/60 aria-selected:text-muted-foreground', defaults.outside),
        disabled: cn('text-muted-foreground opacity-40', defaults.disabled),
        hidden: cn('invisible', defaults.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className: rootClassName, rootRef, ...rootProps }) => (
          <div data-slot="calendar" ref={rootRef} className={cn(rootClassName)} {...rootProps} />
        ),
        Chevron: ({
          className: chevronClassName,
          orientation,
          size: _size,
          disabled: _disabled,
          ...chevronProps
        }) => {
          const Icon =
            orientation === 'left'
              ? ChevronLeftIcon
              : orientation === 'right'
                ? ChevronRightIcon
                : ChevronDownIcon;
          return <Icon className={cn('size-4', chevronClassName)} aria-hidden="true" {...chevronProps} />;
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...weekProps }) => (
          <td {...weekProps}>
            <div className="flex size-(--cell-size) items-center justify-center text-center">{children}</div>
          </td>
        ),
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({ className, day, modifiers, ...props }: React.ComponentProps<typeof DayButton>) {
  const defaults = getDefaultClassNames();
  const ref = React.useRef<HTMLButtonElement>(null);

  // Modifiers is a string index signature — bracket access keeps strict app tsconfigs happy
  const focused = modifiers['focused'];
  const selected = modifiers['selected'];
  const today = modifiers['today'];
  const outside = modifiers['outside'];
  const rangeStart = modifiers['range_start'];
  const rangeEnd = modifiers['range_end'];
  const rangeMiddle = modifiers['range_middle'];

  React.useEffect(() => {
    if (focused) ref.current?.focus();
  }, [focused]);

  const selectedSingle = selected && !rangeStart && !rangeEnd && !rangeMiddle;

  return (
    <button
      ref={ref}
      type="button"
      data-slot="calendar-day"
      data-day={day.isoDate}
      data-today={(today && !selected) || undefined}
      data-outside={(outside && !selected) || undefined}
      data-selected-single={selectedSingle || undefined}
      data-range-start={rangeStart || undefined}
      data-range-end={rangeEnd || undefined}
      data-range-middle={rangeMiddle || undefined}
      className={cn(
        'relative flex aspect-square size-auto w-full min-w-(--cell-size) flex-col items-center justify-center gap-1 rounded-md text-sm leading-none font-medium tabular-nums text-foreground',
        'transition-[background-color,color] duration-150 hover:bg-accent',
        'data-[outside]:text-muted-foreground/65',
        'data-[today]:font-bold data-[today]:text-primary dark:data-[today]:text-brand',
        'data-[selected-single]:bg-primary data-[selected-single]:font-semibold data-[selected-single]:text-primary-foreground data-[selected-single]:hover:bg-primary-hover',
        'data-[range-middle]:rounded-none data-[range-middle]:bg-brand-soft data-[range-middle]:text-brand-soft-foreground data-[range-middle]:hover:bg-brand-soft',
        'data-[range-start]:bg-primary data-[range-start]:font-semibold data-[range-start]:text-primary-foreground data-[range-start]:hover:bg-primary-hover',
        'data-[range-end]:bg-primary data-[range-end]:font-semibold data-[range-end]:text-primary-foreground data-[range-end]:hover:bg-primary-hover',
        'group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
        'disabled:pointer-events-none',
        '[&>span]:text-xs [&>span]:opacity-70',
        defaults.day_button,
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
