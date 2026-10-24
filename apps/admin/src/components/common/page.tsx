import { cn } from '@vero/ui';
import { ArrowLeftIcon } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { create } from 'zustand';

/* ------------------------------------------------------------------ page title & breadcrumb detail */

interface PageMetaState {
  /** label of the current record (order number, product name …) shown as the last breadcrumb */
  detail: string | null;
  setDetail: (detail: string | null) => void;
}

export const usePageMetaStore = create<PageMetaState>((set) => ({
  detail: null,
  setDetail: (detail) => set({ detail }),
}));

/** Sets document.title ("Orders · OCKEAN TOOLS Admin") and the breadcrumb label of the current record. */
export function usePageMeta(title: string | undefined, detail?: string | null) {
  const { t } = useTranslation();
  const setDetail = usePageMetaStore((s) => s.setDetail);
  useEffect(() => {
    const parts = [detail, title, 'OCKEAN TOOLS Admin'].filter(Boolean);
    document.title = parts.join(' · ');
  }, [title, detail, t]);
  useEffect(() => {
    setDetail(detail ?? null);
    return () => setDetail(null);
  }, [detail, setDetail]);
}

/* ------------------------------------------------------------------ layout primitives */

export function Page({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('flex min-w-0 flex-col gap-5 sm:gap-6', className)}>{children}</div>;
}

export function PageHeader({
  title,
  description,
  actions,
  back,
  meta,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** link to the parent list */
  back?: { to: string; label: string };
  /** badges / small facts next to the title */
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="flex min-w-0 flex-col gap-1.5">
        {back ? (
          <Link
            to={back.to}
            className="inline-flex w-fit items-center gap-1.5 rounded-sm text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
            {back.label}
          </Link>
        ) : null}
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="min-w-0 text-xl leading-tight font-bold tracking-[-0.02em] text-balance text-foreground sm:text-2xl">{title}</h1>
          {meta ? <div className="flex flex-wrap items-center gap-2">{meta}</div> : null}
        </div>
        {description ? <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 sm:max-w-[65%] sm:shrink-0 sm:justify-end">{actions}</div> : null}
    </header>
  );
}

/** Neutral surface with a hairline border (cards without shadows — shadows are for overlays only). */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  headerClassName,
  as: Comp = 'section',
  id,
  flush = false,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  as?: 'section' | 'div' | 'article' | 'aside';
  id?: string;
  /** body without padding (tables, lists) */
  flush?: boolean;
}) {
  return (
    <Comp id={id} className={cn('flex min-w-0 flex-col rounded-xl border border-border bg-card text-card-foreground', className)}>
      {title || actions ? (
        <div className={cn('flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 pt-4 sm:px-5', flush ? 'pb-3' : 'pb-1', headerClassName)}>
          <div className="flex min-w-0 flex-col gap-0.5">
            {title ? <h2 className="text-[15px] leading-snug font-semibold tracking-[-0.01em] text-foreground">{title}</h2> : null}
            {description ? <p className="text-[13px] leading-snug text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn(flush ? 'min-w-0' : 'min-w-0 p-4 sm:px-5 sm:pb-5', title && !flush ? 'pt-3' : null, bodyClassName)}>{children}</div>
    </Comp>
  );
}

/** Label / value rows (order details, customer profile …). */
export function KeyValueList({ items, className }: { items: Array<{ label: ReactNode; value: ReactNode; hidden?: boolean }>; className?: string }) {
  // side columns can be narrow (e.g. 1024 px): below 20rem the label goes above its value
  return (
    <div className={cn('@container', className)}>
      <dl className="grid grid-cols-1 gap-x-4 text-sm @xs:grid-cols-[minmax(7rem,auto)_1fr] @xs:gap-y-2.5">
        {items
          .filter((i) => !i.hidden)
          .map((item, index) => (
            <div key={index} className="contents">
              <dt className="text-muted-foreground @max-xs:text-xs">{item.label}</dt>
              <dd className="min-w-0 font-medium break-words text-foreground @max-xs:mb-2.5 @max-xs:last:mb-0">{item.value ?? '—'}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
}

export function SectionHeading({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn('text-[13px] font-semibold tracking-wide text-muted-foreground uppercase', className)}>{children}</h3>;
}

/** Stat tile: label · value · optional delta and hint. */
export function StatTile({
  label,
  value,
  delta,
  hint,
  icon,
  to,
  tone = 'default',
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  delta?: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  to?: string;
  tone?: 'default' | 'warning' | 'danger' | 'success';
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        {icon ? (
          <span
            aria-hidden="true"
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-md [&_svg]:size-4',
              tone === 'warning' ? 'bg-warning-soft text-warning' : tone === 'danger' ? 'bg-danger-soft text-danger' : tone === 'success' ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground',
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-1.5 text-xl leading-tight font-bold tracking-[-0.02em] text-foreground sm:text-[1.375rem]">{value}</div>
      {delta || hint ? <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">{delta}{hint ? <span>{hint}</span> : null}</div> : null}
    </>
  );
  const classes = cn(
    'flex min-w-0 flex-col rounded-xl border border-border bg-card p-4 text-start',
    to && 'transition-colors duration-150 hover:border-[color-mix(in_oklab,var(--border),var(--foreground)_18%)] hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    className,
  );
  return to ? (
    <Link to={to} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
