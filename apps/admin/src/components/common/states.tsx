import { isApiError } from '@vero/api-client';
import { Button, cn, EmptyState, Skeleton, Spinner } from '@vero/ui';
import { CloudOffIcon, RotateCwIcon, ShieldAlertIcon, TriangleAlertIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '../../lib/i18n';

/** Error block with a retry button — used by every data view. */
export function ErrorState({
  error,
  onRetry,
  className,
  compact = false,
  title,
}: {
  error?: unknown;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
  title?: ReactNode;
}) {
  const { t } = useTranslation();
  const network = isApiError(error) && error.isNetwork;
  const forbidden = isApiError(error) && error.status === 403;
  return (
    <EmptyState
      size={compact ? 'sm' : 'default'}
      bordered={compact}
      titleAs="h2"
      className={className}
      icon={network ? <CloudOffIcon /> : forbidden ? <ShieldAlertIcon /> : <TriangleAlertIcon />}
      title={title ?? (network ? t('common:status.offline') : forbidden ? t('errorPage.forbiddenTitle') : t('common:status.error'))}
      description={network ? t('common:status.networkError') : error ? errorMessage(t, error) : t('common:status.errorHint')}
      action={
        onRetry && !forbidden ? (
          <Button variant="outline" onClick={onRetry} leftIcon={<RotateCwIcon />}>
            {t('common:actions.retry')}
          </Button>
        ) : undefined
      }
    />
  );
}

/** Centered spinner with an accessible label. */
export function LoadingBlock({ className, label }: { className?: string; label?: string }) {
  const { t } = useTranslation();
  return (
    <div className={cn('flex items-center justify-center py-16 text-muted-foreground', className)}>
      <Spinner size="lg" label={label ?? t('common:a11y.loading')} />
    </div>
  );
}

/** Generic page skeleton (route chunk loading). */
export function PageSkeleton() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label={t('shell.loadingPage')}>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}

/** Small inline error line for secondary widgets. */
export function InlineError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg border border-danger/20 bg-danger-soft/40 px-3 py-2 text-sm dark:bg-danger-soft">
      <TriangleAlertIcon className="size-4 shrink-0 text-danger" aria-hidden="true" />
      <span className="min-w-0 flex-1">{errorMessage(t, error)}</span>
      {onRetry ? (
        <Button size="xs" variant="outline" onClick={onRetry} leftIcon={<RotateCwIcon />}>
          {t('common:actions.retry')}
        </Button>
      ) : null}
    </div>
  );
}
