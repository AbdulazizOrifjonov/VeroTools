import { Button, cn, EmptyState, Skeleton, Spinner } from '@vero/ui';
import { CloudOffIcon, RotateCwIcon, TriangleAlertIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { isApiError } from '@vero/api-client';
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
  return (
    <EmptyState
      size={compact ? 'sm' : 'default'}
      bordered={compact}
      className={className}
      icon={network ? <CloudOffIcon /> : <TriangleAlertIcon />}
      title={title ?? (network ? t('common:status.offline') : t('common:status.error'))}
      description={network ? t('common:status.networkError') : error ? errorMessage(t, error) : t('common:status.errorHint')}
      action={
        onRetry ? (
          <Button variant="outline" onClick={onRetry} leftIcon={<RotateCwIcon />}>
            {t('common:actions.retry')}
          </Button>
        ) : undefined
      }
    />
  );
}

/** Centered spinner with an accessible label. */
export function LoadingBlock({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={cn('flex items-center justify-center py-16 text-muted-foreground', className)}>
      <Spinner size="lg" label={t('common:a11y.loading')} />
    </div>
  );
}

/** Generic page skeleton (route chunk loading / session bootstrap). */
export function PageSkeleton() {
  const { t } = useTranslation();
  return (
    <div className="container-page py-6 sm:py-8" aria-busy="true" aria-label={t('common:a11y.loading')}>
      <Skeleton className="mb-3 h-4 w-48" />
      <Skeleton className="mb-8 h-8 w-72 max-w-full" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
