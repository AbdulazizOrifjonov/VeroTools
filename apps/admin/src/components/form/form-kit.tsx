import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  Button,
  cn,
} from '@vero/ui';
import { TriangleAlertIcon } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlocker } from 'react-router';

let bypassUntil = 0;

/** Call right before navigating away after a successful save (the form may still report dirty this tick). */
export function bypassUnsavedGuard() {
  bypassUntil = Date.now() + 1500;
}

/**
 * Warns before leaving a page with unsaved changes: in-app navigation (router blocker + dialog) and
 * tab close / reload (beforeunload).
 */
export function UnsavedChangesGuard({ when }: { when: boolean }) {
  const { t } = useTranslation();
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => when && Date.now() > bypassUntil && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!when) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [when]);

  return (
    <AlertDialog open={blocker.state === 'blocked'} onOpenChange={(open) => !open && blocker.state === 'blocked' && blocker.reset()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia tone="warning">
            <TriangleAlertIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>{t('form.unsavedTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('form.unsavedText')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => blocker.state === 'blocked' && blocker.reset()}>{t('form.stay')}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => blocker.state === 'blocked' && blocker.proceed()}>
            {t('form.leave')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Ctrl/Cmd + S submits the form. */
export function useSaveShortcut(onSave: () => void, enabled = true) {
  const ref = useRef(onSave);
  ref.current = onSave;
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        ref.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}

/** Sticky action bar at the bottom of long forms (product, settings, pages). */
export function FormActionBar({
  dirty,
  submitting,
  onDiscard,
  children,
  className,
}: {
  dirty: boolean;
  submitting: boolean;
  onDiscard?: () => void;
  children: ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className={cn('sticky bottom-0 z-20 -mx-4 mt-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-[2px] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={cn('flex items-center gap-2 text-[13px] text-muted-foreground', !dirty && 'invisible max-sm:hidden')} aria-live="polite">
          <span className="size-2 rounded-full bg-warning" aria-hidden="true" />
          {t('form.dirty')}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {onDiscard && dirty ? (
            <Button type="button" variant="ghost" onClick={onDiscard} disabled={submitting}>
              {t('form.discard')}
            </Button>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}

/** Form section: title + description, fields in a responsive grid. */
export function FormSection({
  title,
  description,
  children,
  className,
  actions,
  id,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className={cn('rounded-xl border border-border bg-card', className)} aria-labelledby={id ? `${id}-title` : undefined}>
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id={id ? `${id}-title` : undefined} className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
            {title}
          </h2>
          {description ? <p className="text-[13px] leading-snug text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      <div className="flex flex-col gap-4 p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function FieldGrid({ children, cols = 2, className }: { children: ReactNode; cols?: 2 | 3 | 4; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 gap-4', cols === 2 && 'sm:grid-cols-2', cols === 3 && 'sm:grid-cols-2 lg:grid-cols-3', cols === 4 && 'sm:grid-cols-2 lg:grid-cols-4', className)}>
      {children}
    </div>
  );
}
