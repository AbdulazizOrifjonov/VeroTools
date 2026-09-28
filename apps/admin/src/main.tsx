import './styles.css';
// side effect: applies the stored UI language before anything renders
import './lib/language';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { i18nReady } from './lib/i18n';

// the admin texts of the stored language arrive as a small chunk; the session is restored in parallel
void i18nReady.finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
