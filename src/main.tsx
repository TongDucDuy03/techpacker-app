import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppRouter from './router/AppRouter';
import { AuthProvider } from './contexts/AuthContext';
import { TechPackProvider } from './contexts/TechPackContext';
import { I18nProvider } from './lib/i18n';
import { Toaster } from 'react-hot-toast';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <AuthProvider>
        <TechPackProvider>
          <Toaster position="top-right" reverseOrder={false} />
          <AppRouter />
        </TechPackProvider>
      </AuthProvider>
    </I18nProvider>
  </StrictMode>
);
