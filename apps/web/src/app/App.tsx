import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, Toaster, TooltipProvider } from '@vero/ui';
import { I18nextProvider, useTranslation } from 'react-i18next';
// the DOM build of RouterProvider supports `flushSync` navigations (instant filter state)
import { RouterProvider } from 'react-router/dom';
import { i18n } from '../lib/i18n';
import { queryClient } from '../lib/query-client';
import { router } from './router';

function AppToaster() {
  const { t } = useTranslation();
  return (
    <Toaster
      containerAriaLabel={t('common:a11y.notifications')}
      closeButtonAriaLabel={t('common:actions.close')}
      mobileOffset={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom))', left: 12, right: 12 }}
      duration={4500}
    />
  );
}

/** Providers: i18n → theme → query cache → router (API context lives in the root route, it needs the URL language). */
export function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <RouterProvider router={router} />
          </TooltipProvider>
          <AppToaster />
        </QueryClientProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
}
