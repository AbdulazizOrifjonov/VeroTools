import { DATE_PRESETS, GRANULARITIES, type DatePreset, type Granularity } from '@vero/types';
import { cn, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, ToggleGroup, ToggleGroupItem } from '@vero/ui';
import { CalendarRangeIcon } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { DateRangeFilter } from '../data-table/toolbar';

export interface PeriodState {
  preset: DatePreset;
  /** "YYYY-MM-DD", only for the custom preset (to is inclusive) */
  from: string;
  to: string;
  granularity: Granularity | '';
  /** query for analytics / reports / expense summary endpoints */
  query: { preset: DatePreset; from?: string; to?: string; granularity?: Granularity };
  set: (next: Partial<Pick<PeriodState, 'preset' | 'from' | 'to' | 'granularity'>>) => void;
}

/** Period (date preset or custom range) + granularity kept in the URL, shared by analytics, reports and expenses. */
export function usePeriodState(defaultPreset: DatePreset = 'last30'): PeriodState {
  const [search, setSearch] = useSearchParams();
  const presetRaw = search.get('preset') as DatePreset | null;
  const preset = presetRaw && (DATE_PRESETS as readonly string[]).includes(presetRaw) ? presetRaw : defaultPreset;
  const from = search.get('from') ?? '';
  const to = search.get('to') ?? '';
  const gRaw = search.get('granularity') as Granularity | null;
  const granularity = gRaw && (GRANULARITIES as readonly string[]).includes(gRaw) ? gRaw : '';

  const set = useCallback(
    (next: Partial<Pick<PeriodState, 'preset' | 'from' | 'to' | 'granularity'>>) =>
      setSearch(
        (prev) => {
          const sp = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(next)) {
            if (!v || (k === 'preset' && v === defaultPreset)) sp.delete(k);
            else sp.set(k, String(v));
          }
          if ((next.preset ?? preset) !== 'custom') {
            sp.delete('from');
            sp.delete('to');
          }
          sp.delete('page');
          return sp;
        },
        { replace: true },
      ),
    [setSearch, defaultPreset, preset],
  );

  const query = useMemo(() => {
    const q: PeriodState['query'] = { preset };
    if (preset === 'custom') {
      if (from) q.from = from;
      if (to) q.to = to;
    }
    if (granularity) q.granularity = granularity;
    return q;
  }, [preset, from, to, granularity]);

  return { preset, from, to, granularity, query, set };
}

export function PeriodPicker({ state, withGranularity = false, className }: { state: PeriodState; withGranularity?: boolean; className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Select value={state.preset} onValueChange={(v) => state.set({ preset: v as DatePreset })}>
        <SelectTrigger size="sm" className="w-auto min-w-40" aria-label={t('table.period')}>
          <CalendarRangeIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_PRESETS.map((p) => (
            <SelectItem key={p} value={p}>
              {t(`enums.datePreset.${p}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {state.preset === 'custom' ? <DateRangeFilter from={state.from} to={state.to} onChange={(r) => state.set({ from: r.from, to: r.to })} /> : null}
      {withGranularity ? (
        <ToggleGroup type="single" size="sm" variant="outline" value={state.granularity || 'auto'} onValueChange={(v) => v && state.set({ granularity: v === 'auto' ? '' : (v as Granularity) })} aria-label={t('analytics.granularity')}>
          <ToggleGroupItem value="auto" className="px-2.5 text-xs">
            {t('analytics.auto')}
          </ToggleGroupItem>
          {GRANULARITIES.map((g) => (
            <ToggleGroupItem key={g} value={g} className="px-2.5 text-xs">
              {t(`enums.granularity.${g}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      ) : null}
    </div>
  );
}
