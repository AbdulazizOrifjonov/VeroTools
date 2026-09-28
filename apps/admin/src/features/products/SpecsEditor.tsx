import { SPEC_GROUPS, type AdminSpecDefinition } from '@vero/types';
import { Badge, Button, cn, FormControl, FormField, FormItem, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@vero/ui';
import { SlidersHorizontalIcon, XIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { FieldMessage } from '../../components/form/fields';
import { NumberInput } from '../../components/form/inputs';
import { Combobox } from '../../components/form/pickers';
import { useFormat } from '../../lib/format';
import type { FlatCategory } from '../catalog/catalog-data';
import { emptySpecValue, specIsEmpty, type ProductFormValues, type SpecFormValue } from './product-form-model';

const UNSET = '__unset';


function SpecRow({ def, source, removable, onRemove }: { def: AdminSpecDefinition; source?: string; removable?: boolean; onRemove?: () => void }) {
  const { t } = useTranslation();
  const f = useFormat();
  const { control } = useFormContext<ProductFormValues>();
  const label = f.loc(def.label);
  return (
    <div className="grid grid-cols-1 items-start gap-2 border-b border-border py-3 last:border-b-0 sm:grid-cols-[minmax(10rem,14rem)_1fr_auto] sm:gap-4">
      <div className="flex min-w-0 flex-col gap-0.5 pt-2">
        <span className="text-[13px] font-medium text-foreground">{label}</span>
        <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <code className="font-mono">{def.key}</code>
          {def.filterable ? (
            <Badge variant="secondary" size="sm">
              {t('products.form.specs.filterable')}
            </Badge>
          ) : null}
          {source ? <span>{source}</span> : null}
        </span>
      </div>
      <div className="min-w-0">
        {def.type === 'number' ? (
          <FormField
            control={control}
            name={`specs.${def.key}` as `specs.${string}`}
            render={({ field }) => (
              <FormItem className="gap-1">
                <FormControl>
                  <NumberInput
                    name={field.name}
                    ref={field.ref}
                    value={(field.value as number | '' | undefined) ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    decimal
                    allowNegative
                    suffix={def.unit || undefined}
                    aria-label={label}
                    className="max-w-60"
                  />
                </FormControl>
                <FieldMessage />
              </FormItem>
            )}
          />
        ) : def.type === 'boolean' ? (
          <FormField
            control={control}
            name={`specs.${def.key}` as `specs.${string}`}
            render={({ field }) => (
              <FormItem className="gap-1">
                <Select value={field.value === true ? 'yes' : field.value === false ? 'no' : UNSET} onValueChange={(v) => field.onChange(v === 'yes' ? true : v === 'no' ? false : null)}>
                  <FormControl>
                    <SelectTrigger className="max-w-60" aria-label={label}>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={UNSET}>{t('products.form.specs.notSet')}</SelectItem>
                    <SelectItem value="yes">{t('products.form.specs.yes')}</SelectItem>
                    <SelectItem value="no">{t('products.form.specs.no')}</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {(['uz', 'ru', 'en'] as const).map((lang) => (
              <FormField
                key={lang}
                control={control}
                name={`specs.${def.key}.${lang}` as `specs.${string}`}
                render={({ field }) => (
                  <FormItem className="gap-1">
                    <div className="relative">
                      <span className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">{lang.toUpperCase()}</span>
                      <FormControl>
                        <Input {...field} value={(field.value as unknown as string | undefined) ?? ''} lang={lang} maxLength={300} className="ps-9" aria-label={`${label} (${lang.toUpperCase()})`} />
                      </FormControl>
                    </div>
                    <FieldMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
        )}
      </div>
      {removable ? (
        <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} aria-label={`${t('products.form.specs.remove')}: ${label}`} className="mt-1 justify-self-end">
          <XIcon />
        </Button>
      ) : (
        <span className="hidden sm:block sm:w-8" />
      )}
    </div>
  );
}

/**
 * Specification values driven by the selected category: its own spec keys plus the ones inherited from
 * parent categories, grouped like on the storefront. Other definitions can be added explicitly.
 */
export function SpecsEditor({ definitions, category }: { definitions: AdminSpecDefinition[]; category: FlatCategory | undefined }) {
  const { t } = useTranslation();
  const f = useFormat();
  const { control, setValue, getValues } = useFormContext<ProductFormValues>();
  const specs = (useWatch({ control, name: 'specs' }) ?? {}) as Record<string, SpecFormValue>;
  const [adding, setAdding] = useState('');
  // keys added by hand stay visible while empty; other off-category keys only when they hold a value
  const [added, setAdded] = useState<string[]>(() => Object.entries(getValues('specs') ?? {}).filter(([, v]) => !specIsEmpty(v)).map(([k]) => k));
  const defs = useMemo(() => new Map(definitions.map((d) => [d.key, d])), [definitions]);

  // category spec keys: ancestors first, then the category itself
  const categoryKeys = useMemo(() => {
    if (!category) return [] as Array<{ key: string; source?: string }>;
    const out: Array<{ key: string; source?: string }> = [];
    const seen = new Set<string>();
    for (const node of [...category.path, category.node]) {
      for (const key of node.specKeys) {
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ key, source: node.id === category.node.id ? undefined : t('products.form.specs.inherited', { category: f.loc(node.name) }) });
      }
    }
    return out;
  }, [category, t, f]);
  const categoryKeySet = new Set(categoryKeys.map((k) => k.key));
  const extraKeys = Object.keys(specs).filter((k) => !categoryKeySet.has(k) && (added.includes(k) || !specIsEmpty(specs[k])));

  const rows = [...categoryKeys.map((k) => ({ ...k, removable: false })), ...extraKeys.map((key) => ({ key, source: t('products.form.specs.extra'), removable: true }))]
    .map((r) => ({ ...r, def: defs.get(r.key) }))
    .filter((r): r is typeof r & { def: AdminSpecDefinition } => !!r.def);

  const groups = SPEC_GROUPS.map((g) => ({ group: g, rows: rows.filter((r) => r.def.group === g).sort((a, b) => a.def.order - b.def.order) })).filter((g) => g.rows.length);

  const addable = definitions
    .filter((d) => !categoryKeySet.has(d.key) && !extraKeys.includes(d.key))
    .map((d) => ({ value: d.key, label: f.loc(d.label), hint: [d.key, d.unit].filter(Boolean).join(' · ') }));

  const add = (key: string) => {
    const def = defs.get(key);
    if (!def) return;
    const current = getValues('specs') ?? {};
    setValue('specs', { ...current, [key]: current[key] ?? emptySpecValue(def) }, { shouldDirty: true });
    setAdded((list) => [...list, key]);
    setAdding('');
  };
  const remove = (key: string) => {
    const next = { ...getValues('specs') };
    delete next[key];
    setValue('specs', next, { shouldDirty: true });
    setAdded((list) => list.filter((k) => k !== key));
  };

  return (
    <div className="flex flex-col gap-4">
      {!category ? (
        <p className="rounded-lg border border-dashed border-input px-4 py-6 text-center text-sm text-muted-foreground">{t('products.form.specs.chooseCategory')}</p>
      ) : groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-input px-4 py-6 text-center text-sm text-muted-foreground">{t('products.form.specs.none')}</p>
      ) : (
        groups.map((g) => (
          <div key={g.group} className="flex flex-col">
            <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t(`enums.specGroup.${g.group}`)}</h3>
            <div className={cn('rounded-lg border border-border px-3 sm:px-4')}>
              {g.rows.map((r) => (
                <SpecRow key={r.key} def={r.def} source={r.source} removable={r.removable} onRemove={() => remove(r.key)} />
              ))}
            </div>
          </div>
        ))
      )}
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full max-w-sm">
          <Combobox value={adding} onChange={(v) => (v ? add(v) : setAdding(''))} options={addable} placeholder={t('products.form.specs.add')} allowClear={false} />
        </div>
        <Button type="button" variant="ghost" size="sm" asChild leftIcon={<SlidersHorizontalIcon />}>
          <Link to="/specs">{t('products.form.specs.manage')}</Link>
        </Button>
      </div>
    </div>
  );
}
