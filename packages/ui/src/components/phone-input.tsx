import * as React from 'react';

import { cn, useMergedRefs } from '../lib/utils';

/** Uzbekistan country code — the fixed prefix of every value emitted by <PhoneInput>. */
export const UZ_PHONE_PREFIX = '+998';
const COUNTRY_DIGITS = '998';
const NATIONAL_LENGTH = 9;

/**
 * Extracts the national digits from any stored / typed value:
 * "+998 90 123-45-67" → "901234567", "+99890" → "90", "998901234567" → "901234567", "90 123" → "90123".
 */
export function parseUzPhone(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  let digits = trimmed.replace(/\D/g, '');
  const international =
    trimmed.startsWith('+') || (digits.length > NATIONAL_LENGTH && digits.startsWith(COUNTRY_DIGITS));
  if (international && digits.startsWith(COUNTRY_DIGITS)) digits = digits.slice(3);
  return digits.slice(0, NATIONAL_LENGTH);
}

/** Formats national digits for display: "901234567" → "90 123 45 67" (partial input allowed). */
export function formatUzPhone(nationalDigits: string): string {
  const d = nationalDigits.replace(/\D/g, '').slice(0, NATIONAL_LENGTH);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
}

/** Normalised value: "901234567" → "+998901234567" ('' when empty). */
export function normalizeUzPhone(value: string | null | undefined): string {
  const digits = parseUzPhone(value);
  return digits ? `${UZ_PHONE_PREFIX}${digits}` : '';
}

/** True for a complete Uzbek number ("+998" + 9 digits). */
export function isCompleteUzPhone(value: string | null | undefined): boolean {
  return parseUzPhone(value).length === NATIONAL_LENGTH;
}

/** Caret index in the formatted string right after the `digitCount`-th digit. */
function caretAfterDigits(formatted: string, digitCount: number): number {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    if (formatted.charCodeAt(i) >= 48 && formatted.charCodeAt(i) <= 57) {
      seen += 1;
      if (seen === digitCount) return i + 1;
    }
  }
  return formatted.length;
}

export interface PhoneInputProps extends Omit<
  React.ComponentProps<'input'>,
  'value' | 'defaultValue' | 'onChange' | 'type' | 'prefix'
> {
  /** Normalised value ("+998901234567"), partial ("+99890") or ''. */
  value?: string | null;
  defaultValue?: string | null;
  /** Receives the normalised value: "+998901234567" (or '' when cleared). */
  onChange?: (value: string) => void;
  /** Class name for the input element (`className` styles the outer field). */
  inputClassName?: string;
}

/**
 * Uzbek phone number field with a fixed "+998" prefix.
 * Displays "90 123 45 67", emits "+998901234567". Drop-in for react-hook-form `<Controller>` / `<FormField>`
 * (`{...field}`: value, onChange, onBlur, name, ref, disabled). `name` is set on a hidden input that carries
 * the normalised value, so native form submission works too.
 */
function PhoneInput({
  value,
  defaultValue,
  onChange,
  onKeyDown,
  className,
  inputClassName,
  name,
  disabled,
  ref,
  autoComplete = 'tel',
  ...props
}: PhoneInputProps) {
  const isControlled = value !== undefined;
  const [innerDigits, setInnerDigits] = React.useState(() => parseUzPhone(defaultValue));
  const digits = isControlled ? parseUzPhone(value) : innerDigits;
  const formatted = formatUzPhone(digits);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const mergedRef = useMergedRefs(inputRef, ref);
  const pendingCaret = React.useRef<number | null>(null);

  React.useLayoutEffect(() => {
    const el = inputRef.current;
    if (pendingCaret.current == null || !el) return;
    if (el.ownerDocument.activeElement === el) {
      el.setSelectionRange(pendingCaret.current, pendingCaret.current);
    }
    pendingCaret.current = null;
  });

  const commit = (nextDigits: string, caretDigits: number) => {
    const caret = caretAfterDigits(formatUzPhone(nextDigits), caretDigits);
    if (nextDigits !== digits) {
      pendingCaret.current = caret;
      if (!isControlled) setInnerDigits(nextDigits);
      onChange?.(nextDigits ? `${UZ_PHONE_PREFIX}${nextDigits}` : '');
      return;
    }
    // Value unchanged (rejected keystroke / typed separator): React restores the DOM value — restore the caret too.
    const el = inputRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      if (el.ownerDocument.activeElement === el) el.setSelectionRange(caret, caret);
    });
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const el = event.target;
    let raw = el.value;
    let caret = el.selectionStart ?? raw.length;
    // pasted / autofilled "+998 …": drop the country code (and keep the caret on the same digit)
    const intl = /\+\s*9\s*9\s*8/.exec(raw);
    if (intl) {
      const start = intl.index;
      const end = start + intl[0].length;
      raw = raw.slice(0, start) + raw.slice(end);
      if (caret > start) caret = Math.max(start, caret - (Math.min(caret, end) - start));
    }
    let rawDigits = raw.replace(/\D/g, '');
    let digitsBeforeCaret = raw.slice(0, caret).replace(/\D/g, '').length;

    if (rawDigits.length > NATIONAL_LENGTH) {
      if (rawDigits.length >= NATIONAL_LENGTH + 3 && rawDigits.startsWith(COUNTRY_DIGITS)) {
        // pasted / autofilled full international number
        rawDigits = rawDigits.slice(3);
        digitsBeforeCaret = Math.max(0, digitsBeforeCaret - 3);
      } else if (digits.length >= NATIONAL_LENGTH) {
        // already complete — ignore the extra keystroke
        commit(digits, Math.max(0, digitsBeforeCaret - 1));
        return;
      }
    }

    const nextDigits = rawDigits.slice(0, NATIONAL_LENGTH);
    commit(nextDigits, Math.min(digitsBeforeCaret, nextDigits.length));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const el = event.currentTarget;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start !== end) return;

    // Deleting across a group separator removes the neighbouring digit instead of the space.
    if (event.key === 'Backspace' && start > 0 && formatted[start - 1] === ' ') {
      event.preventDefault();
      const digitIndex = formatted.slice(0, start - 1).replace(/\D/g, '').length; // digits before the space
      if (digitIndex === 0) return;
      commit(digits.slice(0, digitIndex - 1) + digits.slice(digitIndex), digitIndex - 1);
    } else if (event.key === 'Delete' && formatted[start] === ' ') {
      event.preventDefault();
      const digitIndex = formatted.slice(0, start).replace(/\D/g, '').length;
      commit(digits.slice(0, digitIndex) + digits.slice(digitIndex + 1), digitIndex);
    }
  };

  return (
    <div
      data-slot="phone-input"
      data-disabled={disabled || undefined}
      className={cn(
        'group/phone flex h-10 w-full min-w-0 items-center rounded-md border border-input bg-surface-elevated text-foreground shadow-xs',
        'transition-[border-color,box-shadow] duration-150 ease-brand',
        'hover:border-[color-mix(in_oklab,var(--input),var(--foreground)_14%)]',
        'has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-[3px] has-[input:focus-visible]:ring-ring/20',
        'has-[input[aria-invalid=true]]:border-danger',
        'data-[disabled]:cursor-not-allowed data-[disabled]:bg-muted data-[disabled]:opacity-60',
        className,
      )}
      onMouseDown={(event) => {
        if (event.target !== inputRef.current && !disabled) {
          event.preventDefault();
          inputRef.current?.focus();
        }
      }}
    >
      <span
        data-slot="phone-input-prefix"
        className="flex h-5 shrink-0 items-center border-e border-border ps-3 pe-2.5 text-base font-semibold tabular-nums select-none md:text-sm"
      >
        {UZ_PHONE_PREFIX}
      </span>
      <input
        ref={mergedRef}
        type="tel"
        inputMode="tel"
        autoComplete={autoComplete}
        data-slot="phone-input-field"
        value={formatted}
        disabled={disabled}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={cn(
          'h-full w-full min-w-0 flex-1 rounded-e-md bg-transparent ps-2.5 pe-3 text-base tracking-[0.01em] tabular-nums outline-hidden md:text-sm',
          'placeholder:text-muted-foreground/60 disabled:cursor-not-allowed',
          inputClassName,
        )}
        {...props}
      />
      {name ? (
        <input
          type="hidden"
          name={name}
          value={digits ? `${UZ_PHONE_PREFIX}${digits}` : ''}
          disabled={disabled}
        />
      ) : null}
    </div>
  );
}

export { PhoneInput };
