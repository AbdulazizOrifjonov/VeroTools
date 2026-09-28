import { Input, InputGroup, InputGroupText, Slider } from '@vero/ui';
import { formatNumber } from '@vero/utils';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

function niceStep(min: number, max: number): number {
  const span = Math.abs(max - min);
  if (span <= 0) return 1;
  if (span <= 5) return 0.05;
  if (span <= 20) return 0.1;
  if (span <= 200) return 1;
  if (span <= 5000) return 10;
  if (span <= 200_000) return 100;
  return 1000;
}

const round = (v: number, step: number) => {
  const decimals = step < 1 ? String(step).split('.')[1]?.length ?? 2 : 0;
  return Number((Math.round(v / step) * step).toFixed(decimals));
};

const parse = (raw: string): number | undefined => {
  const v = Number(raw.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.'));
  return raw.trim() === '' || !Number.isFinite(v) ? undefined : v;
};

/**
 * Min–max filter: slider + two numeric fields. Commits on slider release, blur or Enter.
 * `value` undefined bounds mean "not filtered".
 */
export function RangeFilter({
  min,
  max,
  value,
  onCommit,
  unit,
  label,
  money = false,
}: {
  min: number;
  max: number;
  value: { min?: number; max?: number };
  onCommit: (next: { min?: number; max?: number }) => void;
  unit?: string;
  label: string;
  money?: boolean;
}) {
  const { t } = useTranslation();
  const id = useId();
  const step = money ? niceStep(min, max) : niceStep(min, max);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const current: [number, number] = [value.min ?? lo, value.max ?? hi];
  const [slide, setSlide] = useState<[number, number]>(current);
  const [fromText, setFromText] = useState(value.min !== undefined ? String(value.min) : '');
  const [toText, setToText] = useState(value.max !== undefined ? String(value.max) : '');

  useEffect(() => {
    setSlide([value.min ?? lo, value.max ?? hi]);
    setFromText(value.min !== undefined ? String(value.min) : '');
    setToText(value.max !== undefined ? String(value.max) : '');
  }, [value.min, value.max, lo, hi]);

  const commit = (a: number | undefined, b: number | undefined) => {
    let nextMin = a !== undefined ? Math.max(lo, Math.min(a, hi)) : undefined;
    let nextMax = b !== undefined ? Math.min(hi, Math.max(b, lo)) : undefined;
    if (nextMin !== undefined && nextMax !== undefined && nextMin > nextMax) [nextMin, nextMax] = [nextMax, nextMin];
    if (nextMin !== undefined && nextMin <= lo) nextMin = undefined;
    if (nextMax !== undefined && nextMax >= hi) nextMax = undefined;
    if (nextMin === value.min && nextMax === value.max) {
      setFromText(value.min !== undefined ? String(value.min) : '');
      setToText(value.max !== undefined ? String(value.max) : '');
      return;
    }
    onCommit({ min: nextMin, max: nextMax });
  };

  if (!(hi > lo)) return null;
  const fmt = (v: number) => (money ? formatNumber(v) : formatNumber(v, step < 1 ? (String(step).split('.')[1]?.length ?? 1) : 0));

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <InputGroup size="sm" trailing={unit ? <InputGroupText className="text-xs">{unit}</InputGroupText> : undefined}>
          <Input
            id={`${id}-from`}
            inputMode="decimal"
            aria-label={`${label}: ${t('shop:catalog.priceFrom')}`}
            placeholder={fmt(lo)}
            value={fromText}
            onChange={(e) => setFromText(e.target.value)}
            onBlur={() => commit(parse(fromText), value.max)}
            onKeyDown={(e) => e.key === 'Enter' && commit(parse(fromText), value.max)}
            className="tabular-nums"
          />
        </InputGroup>
        <InputGroup size="sm" trailing={unit ? <InputGroupText className="text-xs">{unit}</InputGroupText> : undefined}>
          <Input
            id={`${id}-to`}
            inputMode="decimal"
            aria-label={`${label}: ${t('shop:catalog.priceTo')}`}
            placeholder={fmt(hi)}
            value={toText}
            onChange={(e) => setToText(e.target.value)}
            onBlur={() => commit(value.min, parse(toText))}
            onKeyDown={(e) => e.key === 'Enter' && commit(value.min, parse(toText))}
            className="tabular-nums"
          />
        </InputGroup>
      </div>
      <Slider
        min={lo}
        max={hi}
        step={step}
        minStepsBetweenThumbs={0}
        value={slide}
        onValueChange={(v) => setSlide([round(v[0]!, step), round(v[1]!, step)])}
        onValueCommit={(v) => commit(round(v[0]!, step), round(v[1]!, step))}
        thumbLabels={[`${label}: ${t('shop:catalog.priceFrom')}`, `${label}: ${t('shop:catalog.priceTo')}`]}
        formatValueText={(v) => `${fmt(v)}${unit ? ` ${unit}` : ''}`}
        className="px-1"
      />
      <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
        <span>{fmt(slide[0])}</span>
        <span>{fmt(slide[1])}</span>
      </div>
    </div>
  );
}
