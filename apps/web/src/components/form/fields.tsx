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
  NativeSelect,
  NativeSelectOption,
  PhoneInput,
  Textarea,
  useFormField,
  type InputProps,
} from '@vero/ui';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { translateValidation } from '../../lib/i18n';

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

interface BaseFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: ReactNode;
  description?: ReactNode;
  required?: boolean;
  className?: string;
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  className,
  ...inputProps
}: BaseFieldProps<T> & Omit<InputProps, 'name' | 'form'>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel required={required}>{label}</FormLabel>
          <FormControl>
            <Input {...inputProps} {...field} value={(field.value as string | undefined) ?? ''} aria-required={required || undefined} />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FieldMessage />
        </FormItem>
      )}
    />
  );
}

export function PasswordField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  className,
  autoComplete = 'current-password',
}: BaseFieldProps<T> & { autoComplete?: string }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel required={required}>{label}</FormLabel>
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
              {/* FormControl (a Slot) would override data-slot="input", which InputGroup uses to drop the inner border */}
              <Input
                {...field}
                data-slot="input"
                value={(field.value as string | undefined) ?? ''}
                type={visible ? 'text' : 'password'}
                autoComplete={autoComplete}
                aria-required={required || undefined}
              />
            </FormControl>
          </InputGroup>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FieldMessage />
        </FormItem>
      )}
    />
  );
}

export function PhoneField<T extends FieldValues>({ control, name, label, description, required, className }: BaseFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel required={required}>{label}</FormLabel>
          <FormControl>
            <PhoneInput
              name={field.name}
              value={(field.value as string | undefined) ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
              disabled={field.disabled}
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

export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  className,
  placeholder,
  rows = 4,
  maxLength,
}: BaseFieldProps<T> & { placeholder?: string; rows?: number; maxLength?: number }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel required={required}>{label}</FormLabel>
          <FormControl>
            <Textarea
              {...field}
              value={(field.value as string | undefined) ?? ''}
              placeholder={placeholder}
              rows={rows}
              maxLength={maxLength}
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

export interface SelectOption {
  value: string;
  label: string;
}

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  className,
  options,
  placeholder,
  onValueChange,
}: BaseFieldProps<T> & { options: SelectOption[]; placeholder?: string; onValueChange?: (value: string) => void }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel required={required}>{label}</FormLabel>
          <FormControl>
            <NativeSelect
              name={field.name}
              ref={field.ref}
              value={(field.value as string | undefined) ?? ''}
              onBlur={field.onBlur}
              onChange={(e) => {
                field.onChange(e.target.value);
                onValueChange?.(e.target.value);
              }}
              aria-required={required || undefined}
            >
              {placeholder ? (
                <NativeSelectOption value="" disabled>
                  {placeholder}
                </NativeSelectOption>
              ) : null}
              {options.map((o) => (
                <NativeSelectOption key={o.value} value={o.value}>
                  {o.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FieldMessage />
        </FormItem>
      )}
    />
  );
}

export function CheckboxField<T extends FieldValues>({
  control,
  name,
  label,
  className,
}: Omit<BaseFieldProps<T>, 'description' | 'required'>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn('gap-1.5', className)}>
          <div className="flex items-start gap-3">
            <FormControl>
              <Checkbox
                checked={field.value === true}
                onCheckedChange={(v) => field.onChange(v === true)}
                onBlur={field.onBlur}
                ref={field.ref}
                name={field.name}
                className="mt-0.5"
              />
            </FormControl>
            <FormLabel className="block text-sm leading-snug font-medium">
              <span>{label}</span>
            </FormLabel>
          </div>
          <FieldMessage />
        </FormItem>
      )}
    />
  );
}
