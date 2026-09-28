import type { AdminInventoryMovement, InventoryMovementType } from '@vero/types';
import { Badge, cn, type BadgeVariant } from '@vero/ui';
import { ArrowRightIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useFormat } from '../../lib/format';

const TYPE_VARIANT: Record<InventoryMovementType, BadgeVariant> = {
  IN: 'success',
  OUT: 'secondary',
  RESERVE: 'info',
  RELEASE: 'muted',
  ADJUSTMENT: 'warning',
  RETURN: 'brand',
  INCOMING: 'outline',
};

export function MovementTypeBadge({ type, size = 'sm' }: { type: InventoryMovementType; size?: 'sm' | 'default' }) {
  const { t } = useTranslation();
  return (
    <Badge variant={TYPE_VARIANT[type] ?? 'secondary'} size={size}>
      {t(`enums.movement.${type}`)}
    </Badge>
  );
}

/** Signed quantity (+5 / −3); the sign carries the direction, colour only reinforces it. */
export function SignedQuantity({ value, className }: { value: number; className?: string }) {
  const f = useFormat();
  return (
    <span className={cn('font-semibold tabular', value > 0 ? 'text-success' : value < 0 ? 'text-danger' : 'text-muted-foreground', className)}>
      {value > 0 ? '+' : value < 0 ? '−' : ''}
      {f.number(Math.abs(value))}
    </span>
  );
}

export function BeforeAfter({ before, after }: { before: number; after: number }) {
  const f = useFormat();
  return (
    <span className="inline-flex items-center gap-1.5 tabular">
      <span className="text-muted-foreground">{f.number(before)}</span>
      <ArrowRightIcon className="size-3 text-muted-foreground" aria-hidden="true" />
      <span className={cn('font-medium', after !== before ? 'text-foreground' : 'text-muted-foreground')}>{f.number(after)}</span>
    </span>
  );
}

/** Which counter a movement changes: stock on hand, reservations or expected incoming stock. */
export function movementAffects(type: InventoryMovementType): 'onHand' | 'reserved' | 'incoming' {
  if (type === 'RESERVE' || type === 'RELEASE') return 'reserved';
  if (type === 'INCOMING') return 'incoming';
  return 'onHand';
}

export function MovementReference({ movement }: { movement: AdminInventoryMovement }) {
  const { t } = useTranslation();
  const ref = movement.reference;
  if (!ref) return <span className="text-muted-foreground">—</span>;
  if (ref.type === 'order' && ref.id) {
    return (
      <Link to={`/orders/${ref.id}`} className="font-medium text-foreground tabular underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
        {t('enums.reference.order')} {ref.label ?? ''}
      </Link>
    );
  }
  return (
    <span>
      {t(`enums.reference.${ref.type}`)}
      {ref.label ? <span className="text-muted-foreground"> · {ref.label}</span> : null}
    </span>
  );
}
