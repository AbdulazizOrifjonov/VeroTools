import {
  Badge,
  Button,
  Checkbox,
  cn,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@vero/ui';
import { CheckIcon, ChevronsUpDownIcon, SearchIcon, XIcon } from 'lucide-react';
import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FieldMessage } from './fields';

export interface PickerOption {
  value: string;
  label: string;
  /** secondary text (SKU, path, code) */
  hint?: string;
  /** indentation level (category trees) */
  depth?: number;
  disabled?: boolean;
  icon?: ReactNode;
}

const normalize = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/['‘’ʻʼ`]/g, '');

function filterOptions(options: PickerOption[], query: string): PickerOption[] {
  const q = normalize(query.trim());
  if (!q) return options;
  return options.filter((o) => normalize(`${o.label} ${o.hint ?? ''} ${o.value}`).includes(q));
}

/** Listbox with a search box, used by Combobox and MultiSelect. Arrow keys move, Enter / Space pick. */
function OptionList({
  options,
  selected,
  onToggle,
  multiple,
  emptyText,
  searchPlaceholder,
  onQueryChange,
  footer,
}: {
  options: PickerOption[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  multiple?: boolean;
  emptyText?: string;
  searchPlaceholder?: string;
  /** remote search (the list is filtered by the caller) */
  onQueryChange?: (q: string) => void;
  footer?: ReactNode;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const shown = onQueryChange ? options : filterOptions(options, query);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.max(0, Math.min(shown.length - 1, cursor + (e.key === 'ArrowDown' ? 1 : -1)));
      setCursor(next);
      listRef.current?.querySelector<HTMLElement>(`[data-index="${next}"]`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = shown[cursor];
      if (opt && !opt.disabled) onToggle(opt.value);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3">
        <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCursor(0);
            onQueryChange?.(e.target.value);
          }}
          onKeyDown={onKey}
          placeholder={searchPlaceholder ?? t('form.searchPlaceholder')}
          className="h-10 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground/75"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={shown[cursor] ? `${listId}-${cursor}` : undefined}
          aria-autocomplete="list"
        />
      </div>
      <div ref={listRef} id={listId} role="listbox" aria-multiselectable={multiple || undefined} className="max-h-72 overflow-y-auto p-1">
        {shown.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText ?? t('form.nothingFound')}</p>
        ) : (
          shown.map((o, i) => {
            const isSelected = selected.has(o.value);
            return (
              <div
                key={o.value}
                id={`${listId}-${i}`}
                data-index={i}
                role="option"
                aria-selected={isSelected}
                aria-disabled={o.disabled || undefined}
                onMouseMove={() => setCursor(i)}
                onClick={() => !o.disabled && onToggle(o.value)}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 rounded-md py-1.5 pe-2 text-sm select-none',
                  i === cursor && 'bg-accent',
                  o.disabled && 'pointer-events-none opacity-50',
                )}
                style={{ paddingInlineStart: `${0.5 + (o.depth ?? 0) * 1}rem` }}
              >
                {multiple ? (
                  <Checkbox checked={isSelected} tabIndex={-1} aria-hidden="true" className="pointer-events-none" />
                ) : (
                  <CheckIcon className={cn('size-4 shrink-0 text-primary dark:text-brand', !isSelected && 'invisible')} aria-hidden="true" />
                )}
                {o.icon}
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {o.hint ? <span className="shrink-0 truncate text-xs text-muted-foreground">{o.hint}</span> : null}
              </div>
            );
          })
        )}
      </div>
      {footer ? <div className="border-t border-border p-2">{footer}</div> : null}
    </div>
  );
}

/** Single select with search (brand, category tree, spec). */
export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  allowClear = true,
  disabled,
  className,
  id,
  invalid,
  onBlur,
  'aria-describedby': describedBy,
  onQueryChange,
  selectedLabel,
}: {
  value: string | undefined | null;
  onChange: (value: string) => void;
  options: PickerOption[];
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  invalid?: boolean;
  onBlur?: () => void;
  'aria-describedby'?: string;
  onQueryChange?: (q: string) => void;
  /** label to show when the selected option is not in `options` (remote search) */
  selectedLabel?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  const text = current?.label ?? (value ? selectedLabel : undefined);
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) onBlur?.();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          aria-haspopup="listbox"
          className={cn('h-10 w-full justify-between gap-2 px-3 font-normal', !text && 'text-muted-foreground', className)}
        >
          <span className="min-w-0 truncate text-start">{text ?? placeholder ?? t('form.selectPlaceholder')}</span>
          <span className="flex shrink-0 items-center gap-1">
            {allowClear && value ? (
              <span
                role="button"
                tabIndex={-1}
                aria-label={t('common:actions.clear')}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange('');
                }}
                className="inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <XIcon className="size-3.5" />
              </span>
            ) : null}
            <ChevronsUpDownIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-72 p-0">
        <OptionList
          options={options}
          selected={new Set(value ? [value] : [])}
          onQueryChange={onQueryChange}
          onToggle={(v) => {
            onChange(v);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Multi select with search; selected values shown as removable chips. */
export function MultiSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  className,
  id,
  invalid,
  onQueryChange,
  labels,
  maxChips = 12,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  options: PickerOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  invalid?: boolean;
  onQueryChange?: (q: string) => void;
  /** labels for selected values that may not be in `options` (remote search) */
  labels?: Record<string, string>;
  maxChips?: number;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => new Set(value), [value]);
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? labels?.[v] ?? v;
  const toggle = (v: string) => onChange(selected.has(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="outline" disabled={disabled} aria-invalid={invalid || undefined} aria-haspopup="listbox" className="h-10 w-full justify-between gap-2 px-3 font-normal">
            <span className={cn('min-w-0 truncate', !value.length && 'text-muted-foreground')}>
              {value.length ? t('form.selectedCount', { count: value.length }) : (placeholder ?? t('form.selectPlaceholder'))}
            </span>
            <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-72 p-0">
          <OptionList
            options={options}
            selected={selected}
            multiple
            onToggle={toggle}
            onQueryChange={onQueryChange}
            footer={
              value.length ? (
                <Button type="button" variant="ghost" size="xs" onClick={() => onChange([])}>
                  {t('form.clearSelection')}
                </Button>
              ) : undefined
            }
          />
        </PopoverContent>
      </Popover>
      {value.length ? (
        <ul className="flex flex-wrap gap-1.5" aria-label={t('form.selectedCount', { count: value.length })}>
          {value.slice(0, maxChips).map((v) => (
            <li key={v}>
              <Badge variant="secondary" size="lg" className="max-w-64 gap-1 pe-1 font-medium">
                <span className="truncate">{labelOf(v)}</span>
                <button
                  type="button"
                  onClick={() => toggle(v)}
                  disabled={disabled}
                  aria-label={t('form.removeTag', { tag: labelOf(v) })}
                  className="inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
          {value.length > maxChips ? (
            <li>
              <Badge variant="outline" size="lg">
                +{value.length - maxChips}
              </Badge>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

/** Free-form tags (lower-case, deduplicated): type + Enter / comma. */
export function TagsInput({ value, onChange, id, placeholder, maxLength = 40, disabled }: { value: string[]; onChange: (v: string[]) => void; id?: string; placeholder?: string; maxLength?: number; disabled?: boolean }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const commit = (raw: string) => {
    const parts = raw
      .split(',')
      .map((s) => s.trim().toLowerCase().slice(0, maxLength))
      .filter(Boolean);
    if (!parts.length) return;
    onChange(Array.from(new Set([...value, ...parts])));
    setDraft('');
  };
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input bg-surface-elevated px-2 py-1.5 shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20">
      {value.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 pe-1 font-medium">
          {tag}
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(value.filter((x) => x !== tag))}
            aria-label={t('form.removeTag', { tag })}
            className="inline-flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <XIcon className="size-3" />
          </button>
        </Badge>
      ))}
      <Input
        id={id}
        value={draft}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value;
          if (v.includes(',')) commit(v);
          else setDraft(v);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit(draft);
          } else if (e.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => commit(draft)}
        placeholder={placeholder ?? t('form.tagsPlaceholder')}
        className="h-7 min-w-32 flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ form-bound versions */

export function ComboboxField({
  name,
  label,
  description,
  required,
  options,
  placeholder,
  className,
  allowClear = !required,
  disabled,
  onValueChange,
}: {
  name: string;
  label: ReactNode;
  description?: ReactNode;
  required?: boolean;
  options: PickerOption[];
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
}) {
  const { control } = useFormContext();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className={className}>
          <FormLabel required={required}>{label}</FormLabel>
          <FormControl>
            <Combobox
              value={field.value as string | undefined}
              onChange={(v) => {
                field.onChange(v);
                onValueChange?.(v);
              }}
              onBlur={field.onBlur}
              options={options}
              placeholder={placeholder}
              allowClear={allowClear}
              disabled={disabled}
              invalid={!!fieldState.error}
            />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FieldMessage />
        </FormItem>
      )}
    />
  );
}

export function MultiSelectField({
  name,
  label,
  description,
  required,
  options,
  placeholder,
  className,
  labels,
  onQueryChange,
}: {
  name: string;
  label: ReactNode;
  description?: ReactNode;
  required?: boolean;
  options: PickerOption[];
  placeholder?: string;
  className?: string;
  labels?: Record<string, string>;
  onQueryChange?: (q: string) => void;
}) {
  const { control } = useFormContext();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className={className}>
          <FormLabel required={required}>{label}</FormLabel>
          <FormControl>
            <MultiSelect value={(field.value as string[] | undefined) ?? []} onChange={field.onChange} options={options} placeholder={placeholder} invalid={!!fieldState.error} labels={labels} onQueryChange={onQueryChange} />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FieldMessage />
        </FormItem>
      )}
    />
  );
}

export function TagsField({ name, label, description, className }: { name: string; label: ReactNode; description?: ReactNode; className?: string }) {
  const { control } = useFormContext();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <TagsInput value={(field.value as string[] | undefined) ?? []} onChange={field.onChange} />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FieldMessage />
        </FormItem>
      )}
    />
  );
}
