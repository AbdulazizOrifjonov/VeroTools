import { cn } from '@vero/ui';
import type { ReactNode } from 'react';

/** Keyboard shortcut hint. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cn('inline-flex h-5 items-center rounded-[5px] border border-border bg-muted px-1.5 font-sans text-[11px] font-semibold text-muted-foreground', className)}>
      {children}
    </kbd>
  );
}
