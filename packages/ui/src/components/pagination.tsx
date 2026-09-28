import { ChevronLeftIcon, ChevronRightIcon, EllipsisIcon } from 'lucide-react';
import { Slot } from 'radix-ui';
import * as React from 'react';

import { cn } from '../lib/utils';

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav data-slot="pagination" className={cn('mx-auto flex w-full justify-center', className)} {...props} />
  );
}

function PaginationContent({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('flex flex-row items-center gap-1', className)}
      {...props}
    />
  );
}

function PaginationItem(props: React.ComponentProps<'li'>) {
  return <li data-slot="pagination-item" {...props} />;
}

const paginationItemClasses = cn(
  'inline-flex h-9 min-w-9 shrink-0 items-center justify-center gap-1 rounded-md border border-transparent px-2 text-sm font-semibold tabular-nums text-foreground select-none',
  'transition-[background-color,border-color,color,scale] duration-150 ease-brand hover:bg-accent active:scale-95',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
  'aria-[current=page]:border-primary/30 aria-[current=page]:bg-brand-soft aria-[current=page]:text-brand-soft-foreground aria-[current=page]:hover:bg-brand-soft',
  'aria-disabled:pointer-events-none aria-disabled:opacity-40 disabled:pointer-events-none disabled:opacity-40',
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
);

export type PaginationLinkProps = React.ComponentProps<'a'> & {
  isActive?: boolean;
  /** Render the child (e.g. a router <Link>) with pagination styles. */
  asChild?: boolean;
};

function PaginationLink({ className, isActive, asChild = false, ...props }: PaginationLinkProps) {
  const Comp = asChild ? Slot.Root : 'a';
  return (
    <Comp
      data-slot="pagination-link"
      data-active={isActive || undefined}
      aria-current={isActive ? 'page' : undefined}
      className={cn(paginationItemClasses, className)}
      {...props}
    />
  );
}

export type PaginationButtonProps = React.ComponentProps<'button'> & { isActive?: boolean };

/** Button flavour of PaginationLink for client-side paging (onClick instead of href). */
function PaginationButton({ className, isActive, type = 'button', ...props }: PaginationButtonProps) {
  return (
    <button
      type={type}
      data-slot="pagination-link"
      data-active={isActive || undefined}
      aria-current={isActive ? 'page' : undefined}
      className={cn(paginationItemClasses, className)}
      {...props}
    />
  );
}

type PrevNextProps = PaginationLinkProps & {
  /** Visible text on ≥640px and accessible name, e.g. t('pagination.previous'). */
  label: string;
};

function PaginationPrevious({ className, label, children, ...props }: PrevNextProps) {
  return (
    <PaginationLink aria-label={label} className={cn('px-2 sm:ps-2 sm:pe-3', className)} {...props}>
      {children ?? (
        <>
          <ChevronLeftIcon aria-hidden="true" className="rtl:rotate-180" />
          <span className="hidden sm:inline">{label}</span>
        </>
      )}
    </PaginationLink>
  );
}

function PaginationNext({ className, label, children, ...props }: PrevNextProps) {
  return (
    <PaginationLink aria-label={label} className={cn('px-2 sm:ps-3 sm:pe-2', className)} {...props}>
      {children ?? (
        <>
          <span className="hidden sm:inline">{label}</span>
          <ChevronRightIcon aria-hidden="true" className="rtl:rotate-180" />
        </>
      )}
    </PaginationLink>
  );
}

function PaginationEllipsis({
  className,
  label,
  ...props
}: React.ComponentProps<'span'> & { label?: string | undefined }) {
  return (
    <span
      data-slot="pagination-ellipsis"
      aria-hidden={label ? undefined : true}
      className={cn('flex size-9 items-center justify-center text-muted-foreground', className)}
      {...props}
    >
      <EllipsisIcon className="size-4" aria-hidden="true" />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* PaginationBar — ready-made pager with ellipses that adapts to small screens                     */
/* ---------------------------------------------------------------------------------------------- */

type PageToken = number | 'ellipsis-start' | 'ellipsis-end';

/** Page list with ellipses, e.g. (7, 20, 1) → [1, '…', 6, 7, 8, '…', 20]. Always the same length for stable layout. */
export function getPaginationRange(page: number, pages: number, siblings = 1, boundaries = 1): PageToken[] {
  const range = (start: number, end: number) =>
    Array.from({ length: Math.max(end - start + 1, 0) }, (_, i) => start + i);

  const totalSlots = boundaries * 2 + siblings * 2 + 3;
  if (pages <= totalSlots) return range(1, pages);

  const current = Math.min(Math.max(page, 1), pages);
  const startPages = range(1, boundaries);
  const endPages = range(pages - boundaries + 1, pages);

  const siblingsStart = Math.max(
    Math.min(current - siblings, pages - boundaries - siblings * 2 - 1),
    boundaries + 2,
  );
  const siblingsEnd = Math.min(
    Math.max(current + siblings, boundaries + siblings * 2 + 2),
    pages - boundaries - 1,
  );

  const tokens: PageToken[] = [...startPages];
  if (siblingsStart > boundaries + 2) tokens.push('ellipsis-start');
  else if (boundaries + 1 < pages - boundaries) tokens.push(boundaries + 1);
  tokens.push(...range(siblingsStart, siblingsEnd));
  if (siblingsEnd < pages - boundaries - 1) tokens.push('ellipsis-end');
  else if (pages - boundaries > boundaries) tokens.push(pages - boundaries);
  tokens.push(...endPages);
  return tokens;
}

export interface PaginationBarProps extends Omit<React.ComponentProps<'nav'>, 'onChange'> {
  /** Current page (1-based). */
  page: number;
  /** Total number of pages. */
  pages: number;
  onPageChange: (page: number) => void;
  labels: {
    previous: string;
    next: string;
    /** aria-label for page buttons, e.g. (n) => t('pagination.page', { n }). */
    page?: (page: number) => string;
    /** Screen-reader text for "…" */
    morePages?: string;
  };
  /** Pages shown on each side of the current one on ≥640px (mobile always shows 0). */
  siblings?: number;
}

function PaginationBar({
  page,
  pages,
  onPageChange,
  labels,
  siblings = 1,
  className,
  ...props
}: PaginationBarProps) {
  if (pages <= 1) return null;
  const current = Math.min(Math.max(page, 1), pages);

  const renderTokens = (tokens: PageToken[]) =>
    tokens.map((token) =>
      typeof token === 'number' ? (
        <PaginationItem key={token}>
          <PaginationButton
            isActive={token === current}
            aria-label={labels.page?.(token)}
            onClick={() => token !== current && onPageChange(token)}
          >
            {token}
          </PaginationButton>
        </PaginationItem>
      ) : (
        <PaginationItem key={token}>
          <PaginationEllipsis label={labels.morePages} />
        </PaginationItem>
      ),
    );

  return (
    <Pagination className={className} {...props}>
      <PaginationContent>
        <PaginationItem>
          <PaginationButton
            aria-label={labels.previous}
            disabled={current <= 1}
            onClick={() => onPageChange(current - 1)}
            className="px-2 sm:ps-2 sm:pe-3"
          >
            <ChevronLeftIcon aria-hidden="true" className="rtl:rotate-180" />
            <span className="hidden sm:inline">{labels.previous}</span>
          </PaginationButton>
        </PaginationItem>
      </PaginationContent>
      {/* compact list for phones: 1 … 7 … 20 */}
      <PaginationContent className="mx-1 gap-0.5 sm:hidden">
        {renderTokens(getPaginationRange(current, pages, 0, 1))}
      </PaginationContent>
      <PaginationContent className="mx-2 hidden sm:flex">
        {renderTokens(getPaginationRange(current, pages, siblings, 1))}
      </PaginationContent>
      <PaginationContent>
        <PaginationItem>
          <PaginationButton
            aria-label={labels.next}
            disabled={current >= pages}
            onClick={() => onPageChange(current + 1)}
            className="px-2 sm:ps-3 sm:pe-2"
          >
            <span className="hidden sm:inline">{labels.next}</span>
            <ChevronRightIcon aria-hidden="true" className="rtl:rotate-180" />
          </PaginationButton>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export {
  Pagination,
  PaginationBar,
  PaginationButton,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
