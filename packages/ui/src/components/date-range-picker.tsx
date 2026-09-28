import { format, isSameDay, isSameYear, type Locale } from 'date-fns';
import { CalendarDaysIcon, XIcon } from 'lucide-react';
import * as React from 'react';
import type { DateRange } from 'react-day-picker';

import { useIsMobile } from '../hooks/use-is-mobile';
import { cn } from '../lib/utils';
import { Button } from './button';
import { Calendar, type CalendarProps } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export type { DateRange };

export interface DateRangePreset {
  /** Stable key (defaults to the label). */
  id?: string;
  label: string;
  /** Range to apply, or a factory evaluated on click (e.g. "last 7 days" relative to now). */
  range: DateRange | (() => DateRange);
}

export interface DateRangePickerLabels {
  /** Text of the "clear" button in the footer (footer button hidden when omitted). */
  clear?: string;
  /** Text of the "done" button that closes the popover (hidden when omitted). */
  apply?: string;
  /** aria-label of the icon button that clears the value inside the trigger (hidden when omitted). */
  reset?: string;
  /** aria-label of the presets list. */
  presets?: string;
}

export interface DateRangePickerProps {
  value?: DateRange;
  defaultValue?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  /** date-fns / react-day-picker locale for month names, weekdays and the trigger text (uz, ru, enUS…). */
  locale?: Locale;
  /** Trigger text when nothing is selected, e.g. t('filters.period'). */
  placeholder: string;
  labels?: DateRangePickerLabels;
  /**
   * Quick ranges shown next to the calendar: an array ("Today", "Last 7 days"…) rendered as buttons,
   * or any custom ReactNode for the presets slot (control the value yourself via `value` / `onChange`).
   */
  presets?: DateRangePreset[] | React.ReactNode;
  /** Months shown side by side (default: 2 on desktop, 1 on phones). */
  numberOfMonths?: number;
  /** date-fns pattern for each end of the range (default: 'd MMM yyyy', smart-shortened for the same year). */
  formatStr?: string;
  disabled?: boolean;
  align?: 'start' | 'center' | 'end';
  id?: string;
  name?: string;
  className?: string;
  triggerClassName?: string;
  /** Extra props for the calendar (disabled days, min / max, startMonth…). */
  calendarProps?: Omit<
    Extract<CalendarProps, { mode: 'range' }>,
    'mode' | 'selected' | 'onSelect' | 'locale'
  >;
  'aria-invalid'?: boolean | 'true' | 'false';
  'aria-describedby'?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function resolvePreset(preset: DateRangePreset): DateRange {
  return typeof preset.range === 'function' ? preset.range() : preset.range;
}

function sameRange(a: DateRange | undefined, b: DateRange | undefined): boolean {
  if (!a?.from || !b?.from) return false;
  const toA = a.to ?? a.from;
  const toB = b.to ?? b.from;
  return isSameDay(a.from, b.from) && isSameDay(toA, toB);
}

/** "12 – 18 Sep 2026", "28 Dec 2025 – 3 Jan 2026", "12 Sep 2026". */
export function formatDateRange(
  range: DateRange | undefined,
  locale?: Locale,
  formatStr = 'd MMM yyyy',
): string {
  if (!range?.from) return '';
  const options = locale ? { locale } : undefined;
  const { from, to } = range;
  if (!to || isSameDay(from, to)) return format(from, formatStr, options);
  if (formatStr === 'd MMM yyyy' && isSameYear(from, to)) {
    return `${format(from, 'd MMM', options)} – ${format(to, formatStr, options)}`;
  }
  return `${format(from, formatStr, options)} – ${format(to, formatStr, options)}`;
}

/** Popover + range calendar with optional presets. All texts come from props (translated by the app). */
function DateRangePicker({
  value,
  defaultValue,
  onChange,
  locale,
  placeholder,
  labels,
  presets,
  numberOfMonths,
  formatStr,
  disabled,
  align = 'start',
  id,
  name,
  className,
  triggerClassName,
  calendarProps,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ...aria
}: DateRangePickerProps) {
  const isMobile = useIsMobile();
  const isControlled = value !== undefined;
  const [inner, setInner] = React.useState<DateRange | undefined>(defaultValue);
  const range = isControlled ? value : inner;
  const [openState, setOpenState] = React.useState(defaultOpen);
  const open = openProp ?? openState;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOpenState(next);
    onOpenChange?.(next);
  };

  const commit = (next: DateRange | undefined) => {
    if (!isControlled) setInner(next);
    onChange?.(next);
  };

  const text = formatDateRange(range, locale, formatStr);
  const months = numberOfMonths ?? (isMobile ? 1 : 2);
  const hasFooter = Boolean(labels?.clear || labels?.apply);

  return (
    <div data-slot="date-range-picker" className={cn('relative w-full min-w-0 sm:w-auto', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={aria['aria-invalid']}
            aria-describedby={aria['aria-describedby']}
            data-empty={!text || undefined}
            className={cn(
              'w-full justify-start gap-2.5 px-3 font-medium sm:min-w-64',
              'data-[empty]:text-muted-foreground data-[state=open]:border-ring data-[state=open]:ring-[3px] data-[state=open]:ring-ring/20',
              labels?.reset && text ? 'pe-10' : null,
              triggerClassName,
            )}
          >
            <CalendarDaysIcon className="text-muted-foreground" aria-hidden="true" />
            <span className="truncate tabular-nums">{text || placeholder}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align={align} className="w-auto max-w-[calc(100vw-1.5rem)] overflow-hidden p-0">
          <div className="flex flex-col sm:flex-row">
            {Array.isArray(presets) && presets.length ? (
              <div
                role="group"
                aria-label={labels?.presets}
                data-slot="date-range-presets"
                className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-border p-2.5 sm:w-44 sm:flex-col sm:gap-0.5 sm:overflow-visible sm:border-e sm:border-b-0 sm:p-2"
              >
                {(presets as DateRangePreset[]).map((preset) => {
                  const presetRange = resolvePreset(preset);
                  const active = sameRange(range, presetRange);
                  return (
                    <button
                      key={preset.id ?? preset.label}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        commit(presetRange);
                        setOpen(false);
                      }}
                      className={cn(
                        'shrink-0 rounded-md px-3 py-2 text-start text-[13px] font-semibold whitespace-nowrap text-foreground transition-colors duration-150 hover:bg-accent',
                        'max-sm:border max-sm:border-border',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                        'aria-pressed:bg-brand-soft aria-pressed:text-brand-soft-foreground max-sm:aria-pressed:border-primary/30',
                      )}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            ) : presets && !Array.isArray(presets) ? (
              <div
                data-slot="date-range-presets"
                className="border-b border-border p-2.5 sm:w-44 sm:border-e sm:border-b-0 sm:p-2"
              >
                {presets}
              </div>
            ) : null}
            <div className="flex flex-col">
              <Calendar
                mode="range"
                resetOnSelect
                locale={locale}
                numberOfMonths={months}
                {...(range?.from ? { defaultMonth: range.from } : null)}
                selected={range}
                onSelect={(next) => commit(next)}
                {...calendarProps}
              />
              {hasFooter ? (
                <div className="flex items-center justify-end gap-2 border-t border-border px-3 py-2.5">
                  {labels?.clear ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={!range?.from}
                      onClick={() => commit(undefined)}
                    >
                      {labels.clear}
                    </Button>
                  ) : null}
                  {labels?.apply ? (
                    <Button type="button" size="sm" onClick={() => setOpen(false)}>
                      {labels.apply}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {labels?.reset && text && !disabled ? (
        <button
          type="button"
          aria-label={labels.reset}
          onClick={() => commit(undefined)}
          className="absolute end-1.5 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <XIcon className="size-4" aria-hidden="true" />
        </button>
      ) : null}
      {name ? (
        <>
          <input
            type="hidden"
            name={`${name}From`}
            value={range?.from ? format(range.from, 'yyyy-MM-dd') : ''}
          />
          <input type="hidden" name={`${name}To`} value={range?.to ? format(range.to, 'yyyy-MM-dd') : ''} />
        </>
      ) : null}
    </div>
  );
}

export { DateRangePicker };
