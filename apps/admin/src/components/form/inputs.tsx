import { cn, Input, InputGroup, InputGroupText, useMergedRefs, type InputProps } from '@vero/ui';
import { useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

const GROUP = ' ';

function groupDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP);
}

function caretAfterDigits(formatted: string, digitCount: number): number {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    const c = formatted.charCodeAt(i);
    if (c >= 48 && c <= 57) {
      seen += 1;
      if (seen === digitCount) return i + 1;
    }
  }
  return formatted.length;
}

export interface MoneyInputProps extends Omit<InputProps, 'value' | 'onChange' | 'type'> {
  value: number | string | null | undefined;
  onChange: (value: number | '') => void;
  /** currency label shown as a suffix (defaults to the UI currency) */
  suffix?: ReactNode;
  allowEmpty?: boolean;
}

/**
 * Integer amount input with digit grouping ("1 250 000") and a currency suffix. The caret keeps its place
 * while the grouping changes. Emits a number ('' when empty).
 */
export function MoneyInput({ value, onChange, suffix, className, allowEmpty = true, onBlur, ref: externalRef, ...props }: MoneyInputProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLInputElement>(null);
  const mergedRef = useMergedRefs(ref, externalRef);
  const caret = useRef<number | null>(null);
  const digits = value === '' || value === null || value === undefined ? '' : String(Math.max(0, Math.round(Number(value) || 0)));
  const display = digits ? groupDigits(digits) : '';

  useLayoutEffect(() => {
    if (caret.current !== null && ref.current && document.activeElement === ref.current) {
      ref.current.setSelectionRange(caret.current, caret.current);
      caret.current = null;
    }
  });

  return (
    <InputGroup className={className} trailing={<InputGroupText>{suffix ?? t('common:currency')}</InputGroupText>}>
      <Input
        {...props}
        ref={mergedRef}
        data-slot="input"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onBlur={onBlur}
        onChange={(e) => {
          const raw = e.target.value;
          const pos = e.target.selectionStart ?? raw.length;
          const digitsBefore = raw.slice(0, pos).replace(/\D/g, '').replace(/^0+(?=\d)/, '').length;
          const nextDigits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 13);
          caret.current = caretAfterDigits(groupDigits(nextDigits), digitsBefore);
          onChange(nextDigits ? Number(nextDigits) : allowEmpty ? '' : 0);
        }}
        className="tabular"
      />
    </InputGroup>
  );
}

export interface NumberInputProps extends Omit<InputProps, 'value' | 'onChange' | 'type' | 'prefix'> {
  value: number | string | null | undefined;
  onChange: (value: number | '') => void;
  suffix?: ReactNode;
  prefix?: ReactNode;
  /** allow decimals (weight, exchange rate, coordinates) */
  decimal?: boolean;
  allowNegative?: boolean;
}

/** Plain number input (no spinner) that emits numbers; keeps partially typed values like "3." or "-". */
export function NumberInput({ value, onChange, suffix, prefix, decimal = false, allowNegative = false, className, ...props }: NumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const external = value === '' || value === null || value === undefined ? '' : String(value);
  const shown = draft ?? external;
  const pattern = decimal ? (allowNegative ? /^-?\d*([.,]\d*)?$/ : /^\d*([.,]\d*)?$/) : allowNegative ? /^-?\d*$/ : /^\d*$/;
  const input = (
    <Input
      {...props}
      data-slot="input"
      inputMode={decimal ? 'decimal' : 'numeric'}
      autoComplete="off"
      value={shown}
      className={cn('tabular', !suffix && !prefix && className)}
      onChange={(e) => {
        const raw = e.target.value.replace(/\s/g, '');
        if (!pattern.test(raw)) return;
        setDraft(raw);
        const normalized = raw.replace(',', '.');
        if (normalized === '' || normalized === '-' || normalized === '.' || normalized === '-.') {
          onChange('');
          return;
        }
        const n = Number(normalized);
        if (Number.isFinite(n)) onChange(n);
      }}
      onBlur={(e) => {
        setDraft(null);
        props.onBlur?.(e);
      }}
    />
  );
  if (!suffix && !prefix) return input;
  return (
    <InputGroup
      className={className}
      leading={prefix ? <InputGroupText>{prefix}</InputGroupText> : undefined}
      trailing={suffix ? <InputGroupText>{suffix}</InputGroupText> : undefined}
    >
      {input}
    </InputGroup>
  );
}

/** Colour input: native swatch picker + hex text. */
export function ColorInput({ value, onChange, className, ...props }: Omit<ComponentProps<'input'>, 'value' | 'onChange'> & { value: string; onChange: (value: string) => void }) {
  const safe = /^#[0-9a-f]{6}$/i.test(value) ? value : '#75757f';
  return (
    <InputGroup
      className={className}
      leading={
        <input
          type="color"
          value={safe}
          onChange={(e) => onChange(e.target.value)}
          className="size-6 cursor-pointer rounded-sm border border-border bg-transparent p-0 [&::-webkit-color-swatch]:rounded-[3px] [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
          aria-hidden="true"
          tabIndex={-1}
        />
      }
    >
      <Input {...props} data-slot="input" value={value} onChange={(e) => onChange(e.target.value)} maxLength={7} className="font-mono uppercase" />
    </InputGroup>
  );
}
