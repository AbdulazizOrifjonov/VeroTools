import { cn } from '@vero/ui';
import { percentChange } from '@vero/utils';
import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from 'lucide-react';
import { useFormat } from '../../lib/format';

/**
 * Change against the comparable period. Colour = direction × whether "up" is good (expenses: up is bad);
 * the arrow and the signed number carry the meaning too, never the colour alone.
 */
export function Delta({ current, previous, invert = false, label, className }: { current: number; previous: number; invert?: boolean; label?: string; className?: string }) {
  const f = useFormat();
  const change = percentChange(current, previous);
  if (change === null) {
    return <span className={cn('inline-flex items-center gap-1 text-xs text-muted-foreground', className)}>{label ? `— ${label}` : '—'}</span>;
  }
  const good = invert ? change < 0 : change > 0;
  const Icon = change > 0 ? TrendingUpIcon : change < 0 ? TrendingDownIcon : MinusIcon;
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-x-1 text-xs', className)}>
      <span className={cn('inline-flex items-center gap-0.5 font-semibold tabular', change === 0 ? 'text-muted-foreground' : good ? 'text-success' : 'text-danger')}>
        <Icon className="size-3.5" aria-hidden="true" />
        {f.delta(change)}
      </span>
      {label ? <span className="text-muted-foreground">{label}</span> : null}
    </span>
  );
}
