import { Button, EmptyState, Logo } from '@vero/ui';
import { HouseIcon, RotateCwIcon, TriangleAlertIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import NotFoundPage from '../pages/NotFoundPage';

function isChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i.test(message);
}

function ErrorContent({ error }: { error: unknown }) {
  const { t } = useTranslation();
  const chunk = isChunkError(error);
  return (
    <EmptyState
      icon={<TriangleAlertIcon />}
      title={chunk ? t('errorPage.updatedTitle') : t('errorPage.title')}
      description={chunk ? t('errorPage.updatedText') : t('errorPage.text')}
      action={
        <>
          <Button onClick={() => window.location.reload()} leftIcon={<RotateCwIcon />}>
            {t('errorPage.reload')}
          </Button>
          <Button variant="outline" asChild leftIcon={<HouseIcon />}>
            <a href="/">{t('common:actions.goHome')}</a>
          </Button>
        </>
      }
    />
  );
}

/** Errors inside a page — header and footer stay usable. */
export function PageError() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;
  if (import.meta.env.DEV) console.error(error);
  return (
    <div className="container-page py-10">
      <ErrorContent error={error} />
    </div>
  );
}

/** Last-resort boundary (the layout itself failed). No API context here. */
export function RootError() {
  const error = useRouteError();
  if (import.meta.env.DEV) console.error(error);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
      <Logo size={56} />
      <ErrorContent error={error} />
    </div>
  );
}
