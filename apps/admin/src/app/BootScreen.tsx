import { Logo, Spinner } from '@vero/ui';
import { useTranslation } from 'react-i18next';

/** Branded full-screen loader shown while the session is restored on start. */
export function BootScreen({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background px-4" role="status" aria-live="polite">
      <Logo size={64} />
      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="text-[15px] font-bold tracking-[-0.01em] text-foreground">{t('app.name')}</p>
        <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Spinner size="sm" />
          {label ?? t('app.restoring')}
        </p>
      </div>
    </div>
  );
}
