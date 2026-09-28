import { LANGUAGES, LANGUAGE_LABELS, type Language } from '@vero/config';
import { cn, FormControl, FormField, FormItem, Input, Label, Textarea } from '@vero/ui';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useFormContext, useFormState, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { translateValidation } from '../../lib/i18n';
import { FieldMessage } from './fields';
import { MarkdownEditor } from './MarkdownEditor';

export type LocalizedRequired = 'all' | 'default' | 'none';

const isRequiredLang = (required: LocalizedRequired, lang: Language) => required === 'all' || (required === 'default' && lang === 'uz');

function readPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((node, key) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined), obj);
}

/**
 * Multilingual text (uz · ru · en) edited with language tabs. Each tab shows whether that language is
 * filled, required (per the zod schema: `localized({ required })`) or has an error.
 */
export function LocalizedField({
  name,
  label,
  description,
  required = 'none',
  multiline = false,
  markdown = false,
  rows,
  maxLength,
  placeholder,
  className,
}: {
  name: string;
  label: ReactNode;
  description?: ReactNode;
  required?: LocalizedRequired;
  multiline?: boolean;
  markdown?: boolean;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const { control, setValue } = useFormContext();
  const { errors, submitCount } = useFormState({ control, name });
  const values = useWatch({ control, name: LANGUAGES.map((l) => `${name}.${l}`) }) as Array<string | undefined>;
  const [active, setActive] = useState<Language>('uz');
  const baseId = useId();
  const lastSubmit = useRef(submitCount);

  const errorOf = (lang: Language) => {
    const e = readPath(errors, `${name}.${lang}`) as { message?: string } | undefined;
    return e?.message ? translateValidation(t, e.message) : undefined;
  };
  const langErrors = LANGUAGES.map((l) => errorOf(l));

  // after a failed submit, jump to the first language with an error
  useEffect(() => {
    if (submitCount === lastSubmit.current) return;
    lastSubmit.current = submitCount;
    const idx = langErrors.findIndex(Boolean);
    if (idx >= 0 && !langErrors[LANGUAGES.indexOf(active)]) setActive(LANGUAGES[idx]!);
  }, [submitCount, langErrors, active]);

  const anyRequired = required !== 'none';
  const activeIndex = LANGUAGES.indexOf(active);
  const fillFrom = LANGUAGES.find((l, i) => l !== active && (values[i] ?? '').trim());

  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={`${baseId}-${active}`} required={anyRequired && isRequiredLang(required, active)}>
          {label}
        </Label>
        <div role="tablist" aria-label={t('form.languages')} className="inline-flex items-center gap-0.5 rounded-md bg-muted p-0.5 dark:bg-secondary">
          {LANGUAGES.map((lang, i) => {
            const filled = !!(values[i] ?? '').trim();
            const hasError = !!langErrors[i];
            const req = isRequiredLang(required, lang);
            const state = hasError ? t('form.langError', { lang: LANGUAGE_LABELS[lang].short }) : filled ? t('form.langFilled', { lang: LANGUAGE_LABELS[lang].short }) : t('form.langEmpty', { lang: LANGUAGE_LABELS[lang].short });
            return (
              <button
                key={lang}
                type="button"
                role="tab"
                id={`${baseId}-tab-${lang}`}
                aria-selected={active === lang}
                aria-controls={`${baseId}-panel`}
                aria-label={`${state}${req ? ` (${t('form.langRequired')})` : ''}`}
                title={`${state}${req ? ` · ${t('form.langRequired')}` : ''}`}
                onClick={() => setActive(lang)}
                onKeyDown={(e) => {
                  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                  e.preventDefault();
                  const next = LANGUAGES[(i + (e.key === 'ArrowRight' ? 1 : LANGUAGES.length - 1)) % LANGUAGES.length]!;
                  setActive(next);
                  document.getElementById(`${baseId}-tab-${next}`)?.focus();
                }}
                tabIndex={active === lang ? 0 : -1}
                className={cn(
                  'inline-flex h-6 items-center gap-1.5 rounded-[5px] px-2 text-[11px] font-bold tracking-wide text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring',
                  active === lang && 'bg-surface-elevated text-foreground shadow-xs dark:bg-[color-mix(in_oklab,var(--secondary),var(--foreground)_10%)]',
                )}
              >
                {LANGUAGE_LABELS[lang].short}
                {req ? <span className="-ms-1 text-primary dark:text-brand" aria-hidden="true">*</span> : null}
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-1.5 rounded-full',
                    hasError ? 'bg-danger' : filled ? 'bg-success' : 'border border-muted-foreground/50 bg-transparent',
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${active}`}>
        <FormField
          key={active}
          control={control}
          name={`${name}.${active}`}
          render={({ field }) => (
            <FormItem className="gap-1.5">
              <FormControl>
                {markdown ? (
                  <MarkdownEditor
                    id={`${baseId}-${active}`}
                    value={(field.value as string | undefined) ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    rows={rows ?? 10}
                    maxLength={maxLength}
                    lang={active}
                    placeholder={placeholder}
                  />
                ) : multiline ? (
                  <Textarea
                    {...field}
                    id={`${baseId}-${active}`}
                    value={(field.value as string | undefined) ?? ''}
                    rows={rows ?? 3}
                    maxLength={maxLength}
                    lang={active}
                    placeholder={placeholder}
                    className="min-h-20"
                  />
                ) : (
                  <Input {...field} id={`${baseId}-${active}`} value={(field.value as string | undefined) ?? ''} maxLength={maxLength} lang={active} placeholder={placeholder} />
                )}
              </FormControl>
              <FieldMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="min-w-0 text-[13px] leading-snug text-muted-foreground">
          {langErrors.some((e, i) => e && i !== activeIndex) ? (
            <span className="font-medium text-danger">
              {LANGUAGES.map((l, i) => (langErrors[i] && i !== activeIndex ? `${LANGUAGE_LABELS[l].short}: ${langErrors[i]}` : null))
                .filter(Boolean)
                .join(' · ')}
            </span>
          ) : (
            description
          )}
        </div>
        <div className="flex items-center gap-3">
          {!(values[activeIndex] ?? '').trim() && fillFrom ? (
            <button
              type="button"
              className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              onClick={() => setValue(`${name}.${active}`, values[LANGUAGES.indexOf(fillFrom)] ?? '', { shouldDirty: true, shouldValidate: submitCount > 0 })}
            >
              {t('form.copyFrom', { lang: LANGUAGE_LABELS[fillFrom].short })}
            </button>
          ) : null}
          {maxLength ? (
            <span className="text-xs text-muted-foreground tabular" aria-hidden="true">
              {t('form.characters', { count: (values[activeIndex] ?? '').length, max: maxLength })}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
