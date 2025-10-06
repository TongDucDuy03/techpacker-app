import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ExampleTechPackApp from './components/TechPackForm/examples/ExampleApp.tsx';
import { I18nProvider } from './lib/i18n.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ExampleTechPackApp />
    </I18nProvider>
  </StrictMode>
);
