import { Button, cn, FormControl, FormDescription, FormField, FormItem, FormLabel, Input, Popover, PopoverContent, PopoverTrigger } from '@vero/ui';
import { SearchIcon, XIcon } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { DynamicIcon, ICON_NAMES, isKnownIcon } from '../common/DynamicIcon';
import { FieldMessage } from './fields';

/** Grid of the icons the storefront can render (lucide names), with search. */
export function IconPicker({ value, onChange, id, invalid, allowClear = true }: { value: string; onChange: (name: string) => void; id?: string; invalid?: boolean; allowClear?: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    return query ? ICON_NAMES.filter((n) => n.toLowerCase().includes(query)) : ICON_NAMES;
  }, [q]);
  const known = isKnownIcon(value);
  return (
    <div className="flex items-center gap-2">
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setQ('');
        }}
      >
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="outline" aria-invalid={invalid || undefined} aria-haspopup="dialog" className="h-10 min-w-0 flex-1 justify-start gap-2.5 px-3 font-normal">
            <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-md', value ? 'bg-brand-soft text-primary dark:text-brand' : 'bg-muted text-muted-foreground')}>
              {value ? <DynamicIcon name={value} className="size-4" /> : null}
            </span>
            <span className={cn('min-w-0 truncate font-mono text-[13px]', !value && 'font-sans text-muted-foreground')}>{value || t('form.iconPlaceholder')}</span>
            {value && !known ? <span className="ms-auto shrink-0 text-xs text-warning">{t('form.iconUnknown')}</span> : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <div className="flex items-center gap-2 border-b border-border px-3">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('form.iconSearch')} aria-label={t('form.iconSearch')} className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/75" />
          </div>
          <div role="listbox" aria-label={t('form.icons')} className="grid max-h-72 grid-cols-7 gap-1 overflow-y-auto p-2">
            {shown.map((name) => (
              <button
                key={name}
                type="button"
                role="option"
                aria-selected={name === value}
                title={name}
                aria-label={name}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                }}
                className={cn(
                  'flex aspect-square items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring',
                  name === value && 'bg-brand-soft text-primary ring-1 ring-primary/40 dark:text-brand',
                )}
              >
                <DynamicIcon name={name} className="size-[18px]" />
              </button>
            ))}
            {shown.length === 0 ? <p className="col-span-7 py-6 text-center text-sm text-muted-foreground">{t('form.nothingFound')}</p> : null}
          </div>
          <div className="border-t border-border p-2">
            <Input value={value} onChange={(e) => onChange(e.target.value.trim())} placeholder="Wrench" aria-label={t('form.iconName')} className="h-8 font-mono text-[13px]" maxLength={60} />
          </div>
        </PopoverContent>
      </Popover>
      {allowClear && value ? (
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange('')} aria-label={t('common.remove')}>
          <XIcon />
        </Button>
      ) : null}
    </div>
  );
}

export function IconField({ name, label, description, className }: { name: string; label: ReactNode; description?: ReactNode; className?: string }) {
  const { control } = useFormContext();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <IconPicker value={(field.value as string | undefined) ?? ''} onChange={field.onChange} invalid={!!fieldState.error} />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FieldMessage />
        </FormItem>
      )}
    />
  );
}
