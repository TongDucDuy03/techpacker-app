import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppRouter from './router/AppRouter';
import { AuthProvider } from './contexts/AuthContext';
import { TechPackProvider } from './contexts/TechPackContext';
import { Toaster } from 'react-hot-toast';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <TechPackProvider>
        <Toaster position="top-right" reverseOrder={false} />
        <AppRouter />
      </TechPackProvider>
    </AuthProvider>
  </StrictMode>
);
