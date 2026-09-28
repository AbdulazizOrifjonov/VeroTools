import {
  Checkbox,
  cn,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  Input,
  InputGroup,
  PhoneInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  useFormField,
  type InputProps,
} from '@vero/ui';
import { EyeIcon, EyeOffIcon, WandSparklesIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { isoToDateInput, isoToLocalInput, dateInputToIso, localInputToIso } from '../../lib/dates';
import { translateValidation } from '../../lib/i18n';
import { ColorInput, MoneyInput, NumberInput } from './inputs';

/** Like <FormMessage /> but translates i18n keys coming from zod schemas and server field errors. */
export function FieldMessage({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { error, formMessageId } = useFormField();
  const text = error?.message ? translateValidation(t, String(error.message)) : undefined;
  if (!text) return null;
  return (
    <p id={formMessageId} role="alert" className={cn('animate-slide-down text-[13px] leading-snug font-medium text-danger', className)}>
      {text}
    </p>
  );
}

export interface BaseFieldProps {
  name: string;
  label: ReactNode;
  description?: ReactNode;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

function OptionalMark() {
  const { t } = useTranslation();
  return <span className="text-xs font-normal text-muted-foreground">({t('form.optional')})</span>;
}

function FieldLabel({ label, required, optional }: { label: ReactNode; required?: boolean; optional?: boolean }) {
  return (
    <FormLabel required={required}>
      {label}
      {optional ? (
        <>
          {' '}
          <OptionalMark />
        </>
      ) : null}
    </FormLabel>
  );
}

export function TextField({
  name,
  label,
  description,
  required,
  className,
  disabled,
  optional,
  ...inputProps
}: BaseFieldProps & { optional?: boolean } & Omit<InputProps, 'name' | 'form'>) {
  const { control } = useFormContext();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FieldLabel label={label} required={required} optional={optional} />
          <FormControl>
            <Input {...inputProps} {...field} disabled={disabled || field.disabled} value={(field.value as string | undefined) ?? ''} aria-required={required || undefined} />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FieldMessage />
        </FormItem>
      )}
    />
  );
}

export function TextareaField({
  name,
  label,
  description,
  required,
  className,
  disabled,
  rows = 3,
  maxLength,
  placeholder,
  optional,
}: BaseFieldProps & { rows?: number; maxLength?: number; placeholder?: string; optional?: boolean }) {
  const { control } = useFormContext();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FieldLabel label={label} required={required} optional={optional} />
          <FormControl>
            <Textarea {...field} value={(field.value as string | undefined) ?? ''} rows={rows} maxLength={maxLength} placeholder={placeholder} disabled={disabled} className="min-h-20" />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FieldMessage />
        </FormItem>
      )}
    />
  );
}

export function NumberField({
  name,
  label,
  description,
  required,
  className,
  disabled,
  suffix,
  prefix,
  decimal,
  allowNegative,
  placeholder,
  optional,
}: BaseFieldProps & { suffix?: ReactNode; prefix?: ReactNode; decimal?: boolean; allowNegative?: boolean; placeholder?: string; optional?: boolean }) {
  const { control } = useFormContext();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FieldLabel label={label} required={required} optional={optional} />
          <FormControl>
            <NumberInput
              name={field.name}
              ref={field.ref}
              value={field.value as number | ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              suffix={suffix}
              prefix={prefix}
              decimal={decimal}
              allowNegative={allowNegative}
              disabled={disabled}
              placeholder={placeholder}
            />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FieldMessage />
        </FormItem>
      )}
    />
  );
}

export function MoneyField({
  name,
  label,
  description,
  required,
  className,
  disabled,
  placeholder,
  optional,
  suffix,
}: BaseFieldProps & { placeholder?: string; optional?: boolean; suffix?: ReactNode }) {
  const { control } = useFormContext();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FieldLabel label={label} required={required} optional={optional} />
          <FormControl>
            <MoneyInput name={field.name} ref={field.ref} value={field.value as number | ''} onChange={field.onChange} onBlur={field.onBlur} disabled={disabled} placeholder={placeholder} suffix={suffix} />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FieldMessage />
        </FormItem>
      )}
    />
  );
}

const NONE = '__none';

export interface SelectOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

export function SelectField({
  name,
  label,
  description,
  required,
  className,
  disabled,
  options,
  placeholder,
  allowEmpty = false,
  emptyLabel,
  optional,
  onValueChange,
}: BaseFieldProps & {
  options: SelectOption[];
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  optional?: boolean;
  onValueChange?: (value: string) => void;
}) {
  const { t } = useTranslation();
  const { control } = useFormContext();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FieldLabel label={label} required={required} optional={optional} />
          <Select
            value={field.value ? String(field.value) : allowEmpty ? NONE : ''}
            onValueChange={(v) => {
              const next = v === NONE ? '' : v;
              field.onChange(next);
              onValueChange?.(next);
            }}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger ref={field.ref} onBlur={field.onBlur} aria-required={required || undefined}>
                <SelectValue placeholder={placeholder ?? t('form.selectPlaceholder')} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {allowEmpty ? <SelectItem value={NONE}>{emptyLabel ?? t('form.none')}</SelectItem> : null}
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FieldMessage />
        </FormItem>
      )}
    />
  );
}

/** Setting row: label + description on the left, switch on the right. */
export function SwitchField({ name, label, description, className, disabled }: Omit<BaseFieldProps, 'required'>) {
  const { control } = useFormContext();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn('flex flex-row items-start justify-between gap-4 rounded-lg border border-border px-3.5 py-3', className)}>
          <div className="flex min-w-0 flex-col gap-0.5">
            <FormLabel className="cursor-pointer text-sm">{label}</FormLabel>
            {description ? <FormDescription className="text-xs">{description}</FormDescription> : null}
          </div>
          <FormControl>
            <Switch checked={!!field.value} onCheckedChange={field.onChange} onBlur={field.onBlur} ref={field.ref} disabled={disabled} className="mt-0.5" />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

export function CheckboxField({ name, label, description, className, disabled }: Omit<BaseFieldProps, 'required'>) {
  const { control } = useFormContext();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn('flex flex-row items-start gap-2.5', className)}>
          <FormControl>
            <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(!!v)} onBlur={field.onBlur} ref={field.ref} disabled={disabled} className="mt-0.5" />
          </FormControl>
          <div className="flex min-w-0 flex-col gap-0.5">
            <FormLabel className="cursor-pointer font-medium">{label}</FormLabel>
            {description ? <FormDescription className="text-xs">{description}</FormDescription> : null}
          </div>
        </FormItem>
      )}
    />
  );
}

/** Date + time in Tashkent; the form value is an ISO string ('' when empty). */
export function DateTimeField({ name, label, description, required, className, disabled, optional, dateOnly = false }: BaseFieldProps & { optional?: boolean; dateOnly?: boolean }) {
  const { t } = useTranslation();
  const { control } = useFormContext();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const iso = field.value instanceof Date ? field.value.toISOString() : ((field.value as string | undefined) ?? '');
        return (
          <FormItem className={className}>
            <FieldLabel label={label} required={required} optional={optional} />
            <FormControl>
              <Input
                type={dateOnly ? 'date' : 'datetime-local'}
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                disabled={disabled}
                value={dateOnly ? isoToDateInput(iso) : isoToLocalInput(iso)}
                onChange={(e) => field.onChange(dateOnly ? dateInputToIso(e.target.value) : localInputToIso(e.target.value))}
                className="tabular"
              />
            </FormControl>
            <FormDescription>{description ?? (dateOnly ? null : t('form.timezoneHint'))}</FormDescription>
            <FieldMessage />
          </FormItem>
        );
      }}
    />
  );
}

export function PhoneField({ name, label, description, required, className, disabled, optional }: BaseFieldProps & { optional?: boolean }) {
  const { control } = useFormContext();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FieldLabel label={label} required={required} optional={optional} />
          <FormControl>
            <PhoneInput
              name={field.name}
              value={(field.value as string | undefined) ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
              disabled={disabled}
              placeholder="90 123 45 67"
              aria-required={required || undefined}
            />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FieldMessage />
        </FormItem>
      )}
    />
  );
}

export function PasswordField({ name, label, description, required, className, autoComplete = 'new-password' }: BaseFieldProps & { autoComplete?: string }) {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const [visible, setVisible] = useState(false);
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FieldLabel label={label} required={required} />
          <InputGroup
            trailing={
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? t('common:a11y.hidePassword') : t('common:a11y.showPassword')}
                aria-pressed={visible}
                className="inline-flex size-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                {visible ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            }
          >
            <FormControl>
              <Input {...field} value={(field.value as string | undefined) ?? ''} type={visible ? 'text' : 'password'} autoComplete={autoComplete} aria-required={required || undefined} />
            </FormControl>
          </InputGroup>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FieldMessage />
        </FormItem>
      )}
    />
  );
}

export function ColorField({ name, label, description, required, className }: BaseFieldProps) {
  const { t } = useTranslation();
  const { control } = useFormContext();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FieldLabel label={label} required={required} />
          <FormControl>
            <ColorInput name={field.name} ref={field.ref} onBlur={field.onBlur} value={(field.value as string | undefined) ?? ''} onChange={field.onChange} placeholder={t('form.colorPlaceholder')} />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FieldMessage />
        </FormItem>
      )}
    />
  );
}

/** Slug input with a "generate from name" button. */
export function SlugField({ name, label, description, className, onGenerate }: Omit<BaseFieldProps, 'required'> & { onGenerate?: () => string }) {
  const { t } = useTranslation();
  const { control, setValue } = useFormContext();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FieldLabel label={label} optional />
          <InputGroup
            trailing={
              onGenerate ? (
                <button
                  type="button"
                  onClick={() => setValue(name, onGenerate(), { shouldDirty: true, shouldValidate: true })}
                  className="inline-flex h-7 items-center gap-1 rounded-sm px-2 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                  title={t('form.slugGenerate')}
                >
                  <WandSparklesIcon className="size-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">{t('form.slugGenerate')}</span>
                </button>
              ) : undefined
            }
          >
            <FormControl>
              <Input {...field} value={(field.value as string | undefined) ?? ''} spellCheck={false} autoCapitalize="off" className="font-mono text-[13px]" />
            </FormControl>
          </InputGroup>
          <FormDescription>{description ?? t('form.slugAuto')}</FormDescription>
          <FieldMessage />
        </FormItem>
      )}
    />
  );
}
