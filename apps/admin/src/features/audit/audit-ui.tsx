import { useSession } from '@vero/api-client';
import type { AdminAuditLog, Permission } from '@vero/types';
import { cn } from '@vero/ui';
import type { TFunction } from 'i18next';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useFormat, type Formatters } from '../../lib/format';

/** Target types written by the API (`target.type`), in sidebar order. */
export const AUDIT_TARGET_TYPES = [
  'order',
  'product',
  'category',
  'brand',
  'spec',
  'customer',
  'payment',
  'coupon',
  'promotion',
  'inventory',
  'review',
  'question',
  'message',
  'delivery_zone',
  'pickup_point',
  'expense',
  'expense_category',
  'banner',
  'media',
  'page',
  'faq',
  'translation',
  'user',
  'role',
  'notification',
  'settings',
  'report',
] as const;

const crud = (entity: string) => [`${entity}.create`, `${entity}.update`, `${entity}.delete`];

/** Action codes per target type exactly as the API records them (users are `admin.*`, role edits `permission.change`). */
export const AUDIT_ACTIONS: Record<string, string[]> = {
  order: ['order.status_change', 'order.payment_update', 'order.delivery_update', 'order.installment_decision', 'order.note'],
  product: ['product.create', 'product.update', 'product.duplicate', 'product.publish', 'product.unpublish', 'product.archive', 'product.bulk_status', 'product.delete', 'product.bulk_delete'],
  category: ['category.create', 'category.update', 'category.reorder', 'category.delete'],
  brand: crud('brand'),
  spec: crud('spec'),
  customer: ['customer.update', 'customer.block', 'customer.unblock'],
  payment: ['payment.refund_update'],
  coupon: crud('coupon'),
  promotion: crud('promotion'),
  inventory: ['inventory.adjust', 'inventory.min_stock'],
  review: ['review.approved', 'review.rejected', 'review.pending', 'review.reply', 'review.delete'],
  question: ['question.answer', 'question.delete'],
  message: ['message.status'],
  delivery_zone: crud('delivery_zone'),
  pickup_point: crud('pickup_point'),
  expense: crud('expense'),
  expense_category: crud('expense_category'),
  banner: crud('banner'),
  media: ['media.upload', 'media.replace', 'media.delete'],
  page: ['page.update'],
  faq: crud('faq'),
  translation: ['translation.update', 'translation.reset'],
  user: ['admin.create', 'admin.update', 'admin.permissions_change', 'admin.reset_password', 'admin.deactivate'],
  role: ['role.create', 'permission.change', 'role.delete'],
  notification: ['notification.broadcast'],
  settings: ['settings.change'],
  report: ['report.export'],
};

const ENTITY_ALIASES: Record<string, string> = { admin: 'user', permission: 'role' };
const VERB_ALIASES: Record<string, string> = { 'permission.change': 'permissions_change' };

const DESTRUCTIVE = new Set(['delete', 'bulk_delete', 'deactivate', 'block', 'rejected', 'archive']);
const CREATIVE = new Set(['create', 'duplicate', 'publish', 'approved', 'upload', 'unblock', 'answer', 'reply']);

export function parseAction(action: string): { entity: string; verb: string } {
  const dot = action.indexOf('.');
  const rawEntity = dot > 0 ? action.slice(0, dot) : action;
  const rawVerb = dot > 0 ? action.slice(dot + 1) : '';
  return { entity: ENTITY_ALIASES[rawEntity] ?? rawEntity, verb: VERB_ALIASES[action] ?? rawVerb };
}

export function auditTargetName(t: TFunction, type: string): string {
  return t(`audit.targets.${type}`, { defaultValue: type });
}

/** "Order: status changed" — falls back to the raw code for actions this build does not know. */
export function auditActionText(t: TFunction, action: string): string {
  const { entity, verb } = parseAction(action);
  const known = t(`audit.verbs.${verb}`, { defaultValue: '' });
  if (!known) return action;
  return `${auditTargetName(t, entity)}: ${known}`;
}

export function AuditActionLabel({ action, className }: { action: string; className?: string }) {
  const { t } = useTranslation();
  const { entity, verb } = parseAction(action);
  const known = t(`audit.verbs.${verb}`, { defaultValue: '' });
  const tone = DESTRUCTIVE.has(verb) ? 'bg-danger' : CREATIVE.has(verb) ? 'bg-success' : 'bg-muted-foreground/50';
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)} title={action}>
      <span className={cn('size-1.5 shrink-0 rounded-full', tone)} aria-hidden="true" />
      {known ? (
        <span className="min-w-0">
          <span className="text-muted-foreground">{auditTargetName(t, entity)}: </span>
          <span className="font-medium text-foreground">{known}</span>
        </span>
      ) : (
        <span className="font-mono text-xs">{action}</span>
      )}
    </span>
  );
}

type Target = NonNullable<AdminAuditLog['target']>;

/** Where a target can be opened, and the permission that page needs. */
function targetDestination(target: Target): { to: string; permission: Permission } | null {
  const { type, id, label } = target;
  const q = (value: string | undefined) => (value ? `?q=${encodeURIComponent(value)}` : '');
  switch (type) {
    case 'order':
      return id ? { to: `/orders/${id}`, permission: 'orders.read' } : { to: '/orders', permission: 'orders.read' };
    case 'product':
      return id ? { to: `/products/${id}`, permission: 'products.read' } : { to: '/products', permission: 'products.read' };
    case 'customer':
      return id ? { to: `/customers/${id}`, permission: 'customers.read' } : null;
    case 'user':
      return id ? { to: `/users/${id}`, permission: 'users.read' } : null;
    case 'role':
      return { to: id ? `/roles?role=${id}` : '/roles', permission: 'roles.read' };
    case 'page':
      return label ? { to: `/pages/${label}`, permission: 'content.read' } : { to: '/pages', permission: 'content.read' };
    case 'inventory':
      return { to: `/inventory${q(label)}`, permission: 'inventory.read' };
    case 'payment':
      return { to: `/payments${q(label)}`, permission: 'payments.read' };
    case 'coupon':
      return { to: `/coupons${q(label)}`, permission: 'coupons.read' };
    case 'brand':
      return { to: `/brands${q(label)}`, permission: 'brands.read' };
    case 'spec':
      return { to: `/specs${q(label)}`, permission: 'products.read' };
    case 'media':
      return { to: `/media${q(label)}`, permission: 'media.read' };
    case 'translation': {
      const [ns, ...key] = (id ?? '').split(':');
      return { to: ns ? `/translations?ns=${encodeURIComponent(ns)}&q=${encodeURIComponent(key.join(':'))}` : '/translations', permission: 'translations.read' };
    }
    case 'report':
      return { to: id ? `/reports?type=${id}` : '/reports', permission: 'reports.read' };
    case 'category':
      return { to: '/categories', permission: 'categories.read' };
    case 'promotion':
      return { to: '/promotions', permission: 'promotions.read' };
    case 'banner':
      return { to: '/banners', permission: 'banners.read' };
    case 'delivery_zone':
      return { to: '/delivery', permission: 'delivery.read' };
    case 'pickup_point':
      return { to: '/delivery?tab=pickup', permission: 'delivery.read' };
    case 'expense':
      return { to: '/expenses', permission: 'expenses.read' };
    case 'expense_category':
      return { to: '/expense-categories', permission: 'expenses.read' };
    case 'review':
      return { to: '/reviews', permission: 'reviews.read' };
    case 'question':
      return { to: '/questions', permission: 'reviews.read' };
    case 'message':
      return { to: '/messages', permission: 'content.read' };
    case 'faq':
      return { to: '/faq', permission: 'content.read' };
    case 'notification':
      return { to: '/notifications', permission: 'notifications.read' };
    case 'settings':
      return { to: '/settings', permission: 'settings.read' };
    default:
      return null;
  }
}

/** The target link the audit entry points to (none after a deletion — the record is gone). */
export function useAuditTargetLink(entry: Pick<AdminAuditLog, 'action' | 'target'>): string | null {
  const { can } = useSession();
  if (!entry.target) return null;
  const { verb } = parseAction(entry.action);
  if (verb === 'delete' || verb === 'bulk_delete') return null;
  const dest = targetDestination(entry.target);
  return dest && can(dest.permission) ? dest.to : null;
}

function countFromMeta(meta: AdminAuditLog['meta']): number | undefined {
  if (!meta) return undefined;
  if (typeof meta.count === 'number') return meta.count;
  if (Array.isArray(meta.ids)) return meta.ids.length;
  return undefined;
}

/** Label of the target (its name, number, code…) linked to its page when there is one. */
export function AuditTargetLabel({ entry, className, fallback = <span className="text-muted-foreground">—</span> }: { entry: Pick<AdminAuditLog, 'action' | 'target' | 'meta'>; className?: string; fallback?: ReactNode }) {
  const { t } = useTranslation();
  const href = useAuditTargetLink(entry);
  const target = entry.target;
  if (!target) return <>{fallback}</>;
  const count = countFromMeta(entry.meta);
  let text: ReactNode;
  let mono = false;
  if (target.label) {
    text = target.label;
    mono = ['product', 'inventory', 'coupon', 'category', 'promotion', 'delivery_zone', 'pickup_point', 'expense_category', 'spec', 'role', 'page'].includes(target.type);
  } else if (target.id) {
    text = target.type === 'translation' ? target.id : `#${target.id.slice(-6)}`;
    mono = true;
  } else if (count !== undefined) {
    text = t('audit.itemsCount', { count });
  } else return <>{fallback}</>;

  const cls = cn('min-w-0 truncate', mono && 'font-mono text-xs', className);
  return href ? (
    <Link to={href} className={cn(cls, 'text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring')} onClick={(e) => e.stopPropagation()}>
      {text}
    </Link>
  ) : (
    <span className={cls}>{text}</span>
  );
}

/** Readable value for the changes / details tables. */
export function formatAuditValue(value: unknown, f: Formatters, t: TFunction): ReactNode {
  if (value === null || value === undefined || value === '') return <span className="text-muted-foreground italic">{t('audit.detail.empty')}</span>;
  if (typeof value === 'boolean') return value ? t('common.yes') : t('common.no');
  if (typeof value === 'number') return <span className="tabular">{f.number(value)}</span>;
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) && !Number.isNaN(Date.parse(value))) return <span className="tabular">{f.datetime(value)}</span>;
    return <span className="break-words whitespace-pre-wrap">{value}</span>;
  }
  if (Array.isArray(value) && value.every((v) => typeof v === 'string' || typeof v === 'number')) {
    if (value.length === 0) return <span className="text-muted-foreground italic">{t('audit.detail.empty')}</span>;
    return <span className="break-words">{value.join(', ')}</span>;
  }
  return <pre className="max-h-48 overflow-auto rounded-md bg-muted/60 p-2 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>;
}

/** The array diff of a permissions change reads better as added / removed keys. */
function arrayDelta(from: unknown, to: unknown): { added: string[]; removed: string[] } | null {
  if (!Array.isArray(from) || !Array.isArray(to)) return null;
  if (![...from, ...to].every((v) => typeof v === 'string')) return null;
  const a = new Set(from as string[]);
  const b = new Set(to as string[]);
  return { added: [...b].filter((v) => !a.has(v)), removed: [...a].filter((v) => !b.has(v)) };
}

export function AuditChanges({ changes }: { changes: NonNullable<AdminAuditLog['changes']> }) {
  const { t } = useTranslation();
  const f = useFormat();
  const rows = Object.entries(changes);
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full table-fixed text-[13px]">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="w-[28%] px-3 py-2 text-start font-medium">
              {t('audit.detail.field')}
            </th>
            <th scope="col" className="px-3 py-2 text-start font-medium">
              {t('audit.detail.from')}
            </th>
            <th scope="col" className="px-3 py-2 text-start font-medium">
              {t('audit.detail.to')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(([field, { from, to }]) => {
            const delta = arrayDelta(from, to);
            return (
              <tr key={field} className="align-top">
                <th scope="row" className="px-3 py-2 text-start font-mono text-xs font-normal break-all text-muted-foreground">
                  {field}
                </th>
                {delta && (delta.added.length || delta.removed.length) ? (
                  <td colSpan={2} className="px-3 py-2">
                    <div className="flex flex-col gap-1.5">
                      {delta.removed.length ? (
                        <p className="flex flex-wrap gap-1">
                          {delta.removed.map((v) => (
                            <span key={v} className="rounded bg-danger/10 px-1.5 py-0.5 font-mono text-[11px] text-danger line-through">
                              {v}
                            </span>
                          ))}
                        </p>
                      ) : null}
                      {delta.added.length ? (
                        <p className="flex flex-wrap gap-1">
                          {delta.added.map((v) => (
                            <span key={v} className="rounded bg-success/10 px-1.5 py-0.5 font-mono text-[11px] text-success">
                              {v}
                            </span>
                          ))}
                        </p>
                      ) : null}
                    </div>
                  </td>
                ) : (
                  <>
                    <td className="px-3 py-2 text-muted-foreground">{formatAuditValue(from, f, t)}</td>
                    <td className="px-3 py-2">{formatAuditValue(to, f, t)}</td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
