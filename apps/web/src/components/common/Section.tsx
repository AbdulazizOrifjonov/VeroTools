import { cn } from '@vero/ui';
import { ArrowRightIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { LocaleLink } from '../../hooks/use-lang';

/** Home / product page section with a heading and an optional "See all" link. */
export function Section({
  title,
  href,
  linkLabel,
  actions,
  children,
  className,
  id,
  headingLevel = 2,
}: {
  title: ReactNode;
  href?: string;
  linkLabel?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={cn('py-6 sm:py-8', className)}>
      <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
        <Heading id={headingId} className="text-xl leading-tight font-bold tracking-tight text-foreground sm:text-2xl">
          {title}
        </Heading>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {href && linkLabel ? (
            <LocaleLink
              to={href}
              className="group inline-flex items-center gap-1 rounded-sm text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-brand"
            >
              {linkLabel}
              <ArrowRightIcon className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
            </LocaleLink>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function PageTitle({ children, className, count }: { children: ReactNode; className?: string; count?: ReactNode }) {
  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-3 gap-y-1', className)}>
      <h1 className="text-2xl leading-tight font-bold tracking-tight text-foreground sm:text-3xl">{children}</h1>
      {count != null ? <span className="text-sm font-medium text-muted-foreground tabular-nums">{count}</span> : null}
    </div>
  );
}
