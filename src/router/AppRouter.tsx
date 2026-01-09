import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PrivateRoute from './PrivateRoute';
import { useI18n } from '../lib/i18n';

// Lazy load components for better performance
const LoginPage = lazy(() => import('../pages/LoginPage'));
// Registration page removed (registration disabled). If you need to re-enable, restore this import.
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const AdminPage = lazy(() => import('../pages/Admin/AdminPage'));
// AppContent should not be lazy loaded as it uses TechPackContext which needs to be available immediately
import AppContent from '../App';

const AppRouter: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useI18n();

  if (isLoading) {
    return <div>{t('common.loadingApp')}</div>;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">{t('common.loading')}</div>}>
        <Routes>
          <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />} />
          {/* Registration disabled: forward users to login page */}
          <Route path="/register" element={<Navigate to="/login" replace />} />

          <Route path="/*" element={<PrivateRoute />}>
            <Route path="" element={<AppContent />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="admin/*" element={<AdminPage />} />
            {/* Add other private routes here */}
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default AppRouter;

