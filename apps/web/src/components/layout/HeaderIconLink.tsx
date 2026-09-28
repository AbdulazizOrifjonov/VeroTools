import { cn } from '@vero/ui';
import { useRef, type ReactNode } from 'react';
import { LocaleLink } from '../../hooks/use-lang';

/** Header action (compare / wishlist / cart / sign in) with an optional live count badge. */
export function HeaderIconLink({
  to,
  icon,
  label,
  count,
  countLabel,
  showLabel = false,
  className,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  count?: number;
  /** Accessible text including the count ("3 items in cart"). */
  countLabel?: string;
  showLabel?: boolean;
  className?: string;
}) {
  // the badge only bounces when the count changes after the first render (feedback, not decoration)
  const initial = useRef<number | undefined>(undefined);
  if (initial.current === undefined && count !== undefined) initial.current = count;
  const changed = count !== initial.current;
  return (
    <LocaleLink
      to={to}
      aria-label={countLabel ?? label}
      className={cn(
        'relative flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1.5 text-foreground transition-colors duration-150',
        'hover:text-primary focus-visible:outline-2 focus-visible:outline-ring dark:hover:text-brand',
        showLabel ? 'h-14 min-w-16' : 'size-11',
        className,
      )}
    >
      <span className="relative [&_svg]:size-[22px]">
        {icon}
        {count ? (
          <span
            key={count}
            aria-hidden="true"
            className={cn(
              'absolute -end-2 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] leading-none font-bold text-primary-foreground ring-2 ring-background tabular-nums',
              changed && 'animate-cart-bounce',
            )}
          >
            {count > 99 ? '99+' : count}
          </span>
        ) : null}
      </span>
      {showLabel ? (
        <span aria-hidden="true" className="text-[11px] leading-tight font-semibold">
          {label}
        </span>
      ) : null}
    </LocaleLink>
  );
}
