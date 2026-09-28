import { QueryClientProvider } from '@tanstack/react-query';
import { ApiProvider } from '@vero/api-client';
import type { Language } from '@vero/config';
import { ThemeProvider, Toaster, TooltipProvider } from '@vero/ui';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { RouterProvider } from 'react-router/dom';
import { api } from '../lib/api';
import { i18n } from '../lib/i18n';
import { queryClient } from '../lib/query-client';
import { router } from './router';

function AppToaster() {
  const { t } = useTranslation();
  // bottom-centre, lifted above the sticky save bar of the forms: a toast never covers the Save button that was
  // just pressed (bottom-right) nor the page-header actions (top-right)
  return (
    <Toaster
      containerAriaLabel={t('common:a11y.notifications')}
      closeButtonAriaLabel={t('common:actions.close')}
      position="bottom-center"
      offset={{ bottom: 88 }}
      mobileOffset={{ bottom: 84, left: 12, right: 12 }}
      duration={4500}
    />
  );
}

/** The API context follows the UI language (part of localised query keys, Accept-Language header). */
function ApiLanguageProvider({ children }: { children: React.ReactNode }) {
  const { i18n: instance } = useTranslation();
  return (
    <ApiProvider api={api} language={(instance.resolvedLanguage ?? instance.language) as Language}>
      {children}
    </ApiProvider>
  );
}

/** Providers: i18n → theme → query cache → API → router. */
export function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <ApiLanguageProvider>
            <TooltipProvider>
              <RouterProvider router={router} />
            </TooltipProvider>
            <AppToaster />
          </ApiLanguageProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
}
