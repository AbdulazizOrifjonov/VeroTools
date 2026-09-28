import { useQueries, useQuery } from '@tanstack/react-query';
import { useApi, useSession } from '@vero/api-client';
import { useDebouncedValue } from '@vero/ui';
import { useMemo, useState, type ReactNode } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Combobox, MultiSelectField, type PickerOption } from '../../components/form/pickers';
import { useFormat } from '../../lib/format';

/** Remote product search for pickers (admin list, 20 best matches). */
function useProductOptions(query: string) {
  const api = useApi();
  const f = useFormat();
  const { can } = useSession();
  const q = useDebouncedValue(query.trim(), 250);
  const result = useQuery({
    queryKey: ['admin', 'products', 'picker', q],
    queryFn: () => api.admin.products.list({ q: q || undefined, limit: 20, sort: q ? undefined : '-updatedAt' }),
    enabled: can('products.read'),
    staleTime: 30_000,
  });
  const options = useMemo<PickerOption[]>(() => (result.data?.items ?? []).map((p) => ({ value: p.id, label: f.loc(p.name), hint: p.sku })), [result.data, f]);
  return { options, isFetching: result.isFetching };
}

/** Names of already selected products (ids stored on coupons / promotions / URL filters). */
function useProductLabels(ids: string[]): Record<string, string> {
  const api = useApi();
  const f = useFormat();
  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['admin', 'products', 'item', id],
      queryFn: () => api.admin.products.get(id),
      staleTime: 5 * 60_000,
      retry: false,
    })),
  });
  const out: Record<string, string> = {};
  results.forEach((r, i) => {
    if (r.data) out[ids[i]!] = `${f.loc(r.data.name)} · ${r.data.sku}`;
  });
  return out;
}

/** Single product filter (toolbar). */
export function ProductFilter({ value, onChange, placeholder, className }: { value: string; onChange: (id: string) => void; placeholder: string; className?: string }) {
  const [query, setQuery] = useState('');
  const { options } = useProductOptions(query);
  const labels = useProductLabels(value ? [value] : []);
  return (
    <Combobox
      value={value}
      onChange={onChange}
      options={options}
      onQueryChange={setQuery}
      selectedLabel={labels[value]}
      placeholder={placeholder}
      className={className}
    />
  );
}

/** Form field: several products picked by remote search (coupons, promotions). */
export function ProductsMultiField({ name, label, description, placeholder }: { name: string; label: ReactNode; description?: ReactNode; placeholder?: string }) {
  const { control } = useFormContext();
  const value = (useWatch({ control, name }) as string[] | undefined) ?? [];
  const [query, setQuery] = useState('');
  const { options } = useProductOptions(query);
  const labels = useProductLabels(value);
  return <MultiSelectField name={name} label={label} description={description} options={options} labels={labels} onQueryChange={setQuery} placeholder={placeholder} />;
}
