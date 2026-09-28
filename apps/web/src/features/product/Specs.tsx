import { SPEC_GROUPS, type ProductSpec, type SpecGroup } from '@vero/types';
import { useTranslation } from 'react-i18next';

/** Specifications grouped by spec group (main, power, performance, dimensions, equipment, general). */
export function Specs({ specs }: { specs: ProductSpec[] }) {
  const { t } = useTranslation();
  if (!specs.length) return <p className="text-sm text-muted-foreground">{t('shop:product.specsEmpty')}</p>;
  const groups = SPEC_GROUPS.map((g) => ({ group: g as SpecGroup, rows: specs.filter((s) => s.group === g) })).filter((g) => g.rows.length);
  const other = specs.filter((s) => !(SPEC_GROUPS as readonly string[]).includes(s.group));
  if (other.length) groups.push({ group: 'general', rows: other });

  return (
    <div className="grid gap-x-10 gap-y-6 lg:grid-cols-2">
      {groups.map(({ group, rows }) => (
        <div key={group} className="min-w-0">
          <h3 className="mb-2 text-sm font-bold tracking-wide text-muted-foreground uppercase">{t(`specGroup.${group}`)}</h3>
          <dl className="divide-y divide-border rounded-lg border border-border">
            {rows.map((s) => (
              <div key={s.key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 px-3.5 py-2.5 text-sm">
                <dt className="text-muted-foreground">{s.label}</dt>
                <dd className="font-semibold break-words tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
