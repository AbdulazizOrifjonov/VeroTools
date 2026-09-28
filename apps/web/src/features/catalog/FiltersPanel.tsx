import { useCategories } from '@vero/api-client';
import type { CategoryNode, FacetOption, ProductFacets, ProductListParams, SpecFacet, SpecFilterValue } from '@vero/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Checkbox, cn, Input, InputGroup, RatingStars, Skeleton, Switch } from '@vero/ui';
import { SearchIcon } from 'lucide-react';
import { useId, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { RangeFilter } from './RangeFilter';

export interface FiltersPanelProps {
  value: ProductListParams;
  facets: ProductFacets | undefined;
  loading?: boolean;
  onChange: (next: ProductListParams) => void;
  /** hide the brand facet (brand page) */
  hideBrand?: boolean;
  /** category facet (search / brand / promotion pages) */
  showCategory?: boolean;
  className?: string;
}

function Count({ n }: { n: number }) {
  return <span className="ms-auto shrink-0 text-xs text-muted-foreground tabular-nums">{n}</span>;
}

function CheckRow({ checked, onChange, label, count, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; count?: number; disabled?: boolean }) {
  const id = useId();
  return (
    <div className={cn('flex min-h-9 items-center gap-2.5', disabled && !checked && 'opacity-50')}>
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} disabled={disabled && !checked} />
      <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm leading-snug">
        <span className="min-w-0 flex-1">{label}</span>
        {count !== undefined ? <Count n={count} /> : null}
      </label>
    </div>
  );
}

function SwitchRow({ checked, onChange, label, count }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; count?: number }) {
  const id = useId();
  return (
    <div className="flex min-h-10 items-center gap-3">
      <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm">
        <span className="min-w-0 flex-1">{label}</span>
        {count !== undefined ? <Count n={count} /> : null}
      </label>
      <Switch id={id} size="sm" checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function OptionsList({
  options,
  selected,
  onToggle,
  searchable,
  searchLabel,
}: {
  options: FacetOption[];
  selected: string[];
  onToggle: (value: string, on: boolean) => void;
  searchable?: boolean;
  searchLabel?: string;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 6;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);
  // selected options stay visible even when collapsed
  const visible = expanded || query ? filtered : filtered.filter((o, i) => i < LIMIT || selected.includes(o.value));
  const hidden = filtered.length - visible.length;

  return (
    <div className="flex flex-col gap-1">
      {searchable && options.length > LIMIT ? (
        <InputGroup size="sm" leading={<SearchIcon aria-hidden="true" />} className="mb-1.5">
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchLabel} aria-label={searchLabel} />
        </InputGroup>
      ) : null}
      {visible.map((o) => (
        <CheckRow
          key={o.value}
          checked={selected.includes(o.value)}
          onChange={(on) => onToggle(o.value, on)}
          label={o.label}
          count={o.count}
          disabled={o.count === 0}
        />
      ))}
      {!visible.length ? <p className="py-2 text-sm text-muted-foreground">{t('common:status.noResults')}</p> : null}
      {hidden > 0 || (expanded && filtered.length > LIMIT && !query) ? (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 w-fit rounded-sm text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring dark:text-brand"
        >
          {expanded ? t('common:actions.showLess') : t('shop:catalog.more', { count: hidden })}
        </button>
      ) : null}
    </div>
  );
}

function specValueOf(value: ProductListParams, key: string) {
  return value.specs?.[key];
}

/** All facet filters. Controlled: desktop sidebar writes to the URL, the mobile sheet to a draft. */
function findCategory(nodes: CategoryNode[] | undefined, slug: string): CategoryNode | undefined {
  for (const n of nodes ?? []) {
    if (n.slug === slug) return n;
    const inner = findCategory(n.children, slug);
    if (inner) return inner;
  }
  return undefined;
}

export function FiltersPanel({ value, facets, loading, onChange, hideBrand, showCategory, className }: FiltersPanelProps) {
  const { t } = useTranslation();
  const tree = useCategories();

  if (!facets) {
    return (
      <div className={cn('flex flex-col gap-6', className)} aria-busy={loading}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-4/5" />
          </div>
        ))}
      </div>
    );
  }

  const set = (patch: Partial<ProductListParams>) => onChange({ ...value, ...patch, page: undefined });
  const setSpec = (key: string, v: SpecFilterValue | undefined) => {
    const specs = { ...(value.specs ?? {}) };
    if (v === undefined) delete specs[key];
    else specs[key] = v;
    set({ specs: Object.keys(specs).length ? specs : undefined });
  };

  const sections: Array<{ id: string; title: string; content: ReactNode; active: boolean }> = [];

  const selectedCategory = value.category ? findCategory(tree.data, value.category) : undefined;
  if (showCategory && (facets.categories.length || value.category)) {
    const options: FacetOption[] = [...facets.categories];
    if (value.category && !options.some((o) => o.value === value.category)) {
      options.unshift({ value: value.category, label: selectedCategory?.name ?? value.category, count: facets.total });
    }
    sections.push({
      id: 'category',
      title: t('common:product.category'),
      active: !!value.category,
      content: (
        <div className="flex flex-col gap-0.5" role="radiogroup" aria-label={t('common:product.category')}>
          {[{ value: '', label: t('common:labels.all'), count: facets.total }, ...options].map((c) => {
            const active = (value.category ?? '') === c.value;
            return (
              <button
                key={c.value || 'all'}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => set({ category: c.value || undefined })}
                className={cn(
                  'flex min-h-9 items-center gap-2 rounded-md px-2 text-start text-sm transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring',
                  active && 'bg-brand-soft font-semibold text-brand-soft-foreground hover:bg-brand-soft',
                )}
              >
                <span className="min-w-0 flex-1">{c.label}</span>
                {c.value ? <Count n={c.count} /> : null}
              </button>
            );
          })}
        </div>
      ),
    });
  }

  if (facets.price.max > facets.price.min) {
    sections.push({
      id: 'price',
      title: t('shop:catalog.price'),
      active: value.minPrice !== undefined || value.maxPrice !== undefined,
      content: (
        <RangeFilter
          money
          label={t('common:product.price')}
          min={facets.price.min}
          max={facets.price.max}
          value={{ min: value.minPrice, max: value.maxPrice }}
          onCommit={(r) => set({ minPrice: r.min, maxPrice: r.max })}
        />
      ),
    });
  }

  if (!hideBrand && facets.brands.length) {
    sections.push({
      id: 'brand',
      title: t('shop:catalog.brands'),
      active: !!value.brand?.length,
      content: (
        <OptionsList
          options={facets.brands}
          selected={value.brand ?? []}
          searchable
          searchLabel={t('shop:catalog.searchBrand')}
          onToggle={(v, on) => {
            const current = value.brand ?? [];
            set({ brand: on ? [...current, v] : current.filter((b) => b !== v) });
          }}
        />
      ),
    });
  }

  const ratingOptions = facets.ratings.filter((r) => r.value >= 1 && r.value <= 4 && r.count > 0);
  if (ratingOptions.length) {
    sections.push({
      id: 'rating',
      title: t('shop:catalog.rating'),
      active: !!value.rating,
      content: (
        <div className="flex flex-col gap-0.5" role="radiogroup" aria-label={t('shop:catalog.rating')}>
          {ratingOptions
            .sort((a, b) => b.value - a.value)
            .map((r) => {
              const active = value.rating === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => set({ rating: active ? undefined : r.value })}
                  className={cn(
                    'flex min-h-9 items-center gap-2 rounded-md px-2 text-sm transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring',
                    active && 'bg-brand-soft font-semibold text-brand-soft-foreground hover:bg-brand-soft',
                  )}
                >
                  <RatingStars value={r.value} size="sm" />
                  <span>{t('shop:catalog.ratingAtLeast', { value: r.value })}</span>
                  <Count n={r.count} />
                </button>
              );
            })}
        </div>
      ),
    });
  }

  sections.push({
    id: 'availability',
    title: t('shop:catalog.availability'),
    active: !!(value.inStock || value.discounted),
    content: (
      <div className="flex flex-col">
        <SwitchRow checked={!!value.inStock} onChange={(v) => set({ inStock: v || undefined })} label={t('shop:catalog.onlyInStock')} count={facets.inStock} />
        <SwitchRow checked={!!value.discounted} onChange={(v) => set({ discounted: v || undefined })} label={t('shop:catalog.onlyDiscounted')} count={facets.discounted} />
      </div>
    ),
  });

  sections.push({
    id: 'flags',
    title: t('shop:catalog.flags'),
    active: !!(value.isNew || value.bestseller || value.featured),
    content: (
      <div className="flex flex-col gap-0.5">
        <CheckRow checked={!!value.isNew} onChange={(v) => set({ isNew: v || undefined })} label={t('common:product.new')} />
        <CheckRow checked={!!value.bestseller} onChange={(v) => set({ bestseller: v || undefined })} label={t('common:product.bestseller')} />
        <CheckRow checked={!!value.featured} onChange={(v) => set({ featured: v || undefined })} label={t('common:product.featured')} />
      </div>
    ),
  });

  for (const spec of facets.specs) {
    const current = specValueOf(value, spec.key);
    const node = renderSpec(spec, current, (v) => setSpec(spec.key, v));
    if (node) sections.push({ id: `spec-${spec.key}`, title: spec.label, active: current !== undefined, content: node });
  }

  const defaultOpen = sections.filter((s, i) => i < 5 || s.active).map((s) => s.id);

  return (
    <div className={cn('flex flex-col', className)} aria-busy={loading || undefined}>
      <Accordion type="multiple" defaultValue={defaultOpen}>
        {sections.map((s) => (
          <AccordionItem key={s.id} value={s.id}>
            <AccordionTrigger className="py-3.5 text-sm">
              <span className="flex items-center gap-2">
                {s.title}
                {s.active ? <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" /> : null}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pe-0 pb-4">{s.content}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

function renderSpec(spec: SpecFacet, current: unknown, onValue: (v: SpecFilterValue | undefined) => void): ReactNode {
  if (spec.type === 'range') {
    if (!(spec.max > spec.min)) return null;
    const range = (current && typeof current === 'object' && !Array.isArray(current) ? current : {}) as { min?: number; max?: number };
    return (
      <RangeFilter
        label={spec.label}
        unit={spec.unit}
        min={spec.min}
        max={spec.max}
        value={range}
        onCommit={(r) => onValue(r.min === undefined && r.max === undefined ? undefined : r)}
      />
    );
  }
  if (spec.type === 'options') {
    if (!spec.options.length) return null;
    const selected = Array.isArray(current) ? (current as string[]) : [];
    return (
      <OptionsList
        options={spec.options}
        selected={selected}
        onToggle={(v, on) => {
          const next = on ? [...selected, v] : selected.filter((x) => x !== v);
          onValue(next.length ? next : undefined);
        }}
      />
    );
  }
  if (!spec.count) return null;
  return <SwitchRow checked={current === true} onChange={(v) => onValue(v ? true : undefined)} label={spec.label} count={spec.count} />;
}
