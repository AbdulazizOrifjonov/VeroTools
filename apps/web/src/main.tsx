import './styles.css';
// side effect: applies the stored language to unprefixed URLs before the router is created
import './lib/language';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './lib/api';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
