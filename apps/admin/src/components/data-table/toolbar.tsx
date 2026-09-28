import {
  cn,
  DateRangePicker,
  InputGroup,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  calendarLocales,
  useDebouncedValue,
  type DateRange,
} from '@vero/ui';
import { SearchIcon, XIcon } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { calendarDateToInput, inputToCalendarDate } from '../../lib/dates';

/** Search box with a debounced commit (URL update) — typing never waits for the network. */
export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
  delay = 350,
  autoFocus,
  'aria-label': ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  delay?: number;
  autoFocus?: boolean;
  'aria-label'?: string;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState(value);
  const debounced = useDebouncedValue(text, delay);
  const last = useRef(value);

  // external changes (reset filters, back navigation)
  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setText(value);
    }
  }, [value]);

  useEffect(() => {
    if (debounced !== last.current) {
      last.current = debounced;
      onChange(debounced);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <InputGroup
      size="sm"
      className={cn('w-full sm:w-64', className)}
      leading={<SearchIcon aria-hidden="true" />}
      trailing={
        text ? (
          <button
            type="button"
            onClick={() => {
              setText('');
              last.current = '';
              onChange('');
            }}
            className="inline-flex size-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            aria-label={t('common:actions.clear')}
          >
            <XIcon className="size-3.5" />
          </button>
        ) : undefined
      }
    >
      <Input
        type="search"
        value={text}
        autoFocus={autoFocus}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            last.current = text;
            onChange(text);
          }
        }}
        placeholder={placeholder ?? t('table.search')}
        aria-label={ariaLabel ?? placeholder ?? t('table.search')}
      />
    </InputGroup>
  );
}

const ALL = '__all';

export interface FilterOption {
  value: string;
  label: ReactNode;
}

/** Compact select for toolbar filters; the first option clears the filter. */
export function FilterSelect({
  value,
  onChange,
  options,
  label,
  allLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  /** accessible name (also shown as the placeholder prefix) */
  label: string;
  allLabel?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? '' : v)}>
      <SelectTrigger size="sm" className={cn('w-auto min-w-36 max-w-56', value && 'border-primary/40 dark:border-brand/40', className)} aria-label={label}>
        <span className="me-0.5 shrink-0 text-muted-foreground">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel ?? t('table.all')}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Date range filter bound to "YYYY-MM-DD" strings (Tashkent calendar days, `to` inclusive). */
export function DateRangeFilter({
  from,
  to,
  onChange,
  placeholder,
  className,
}: {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  placeholder?: string;
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const locale = calendarLocales[(i18n.language as 'uz' | 'ru' | 'en') ?? 'uz'] ?? calendarLocales.en;
  const value: DateRange | undefined = from ? { from: inputToCalendarDate(from), to: inputToCalendarDate(to || from) } : undefined;
  const today = new Date();
  const day = (offset: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
  return (
    <DateRangePicker
      className={cn('sm:w-auto', className)}
      triggerClassName="h-8 min-w-0 text-[13px] sm:min-w-56"
      value={value}
      locale={locale}
      onChange={(range) => onChange({ from: calendarDateToInput(range?.from), to: calendarDateToInput(range?.to ?? range?.from) })}
      placeholder={placeholder ?? t('table.period')}
      labels={{ clear: t('common:actions.clear'), apply: t('common:actions.done'), reset: t('common:actions.clear'), presets: t('table.period') }}
      presets={[
        { id: 'today', label: t('enums.datePreset.today'), range: () => ({ from: day(0), to: day(0) }) },
        { id: 'yesterday', label: t('enums.datePreset.yesterday'), range: () => ({ from: day(-1), to: day(-1) }) },
        { id: 'last7', label: t('enums.datePreset.last7'), range: () => ({ from: day(-6), to: day(0) }) },
        { id: 'last30', label: t('enums.datePreset.last30'), range: () => ({ from: day(-29), to: day(0) }) },
        {
          id: 'thisMonth',
          label: t('enums.datePreset.thisMonth'),
          range: () => ({ from: new Date(today.getFullYear(), today.getMonth(), 1), to: day(0) }),
        },
        {
          id: 'lastMonth',
          label: t('enums.datePreset.lastMonth'),
          range: () => ({ from: new Date(today.getFullYear(), today.getMonth() - 1, 1), to: new Date(today.getFullYear(), today.getMonth(), 0) }),
        },
      ]}
    />
  );
}
