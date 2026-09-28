import { cn } from '@vero/ui';
import type { ReactNode } from 'react';

/** Page heading inside the account area (h1 + optional description and actions). */
export function AccountHeading({ title, description, actions, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-2xl leading-tight font-bold tracking-tight sm:text-[1.75rem]">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Bordered card section with a title row. */
export function AccountCard({
  title,
  description,
  actions,
  children,
  className,
  id,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={cn('flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-6', className)}>
      {title || actions ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            {title ? (
              <h2 id={headingId} className="text-base font-bold tracking-tight sm:text-lg">
                {title}
              </h2>
            ) : null}
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
