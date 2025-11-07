import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PrivateRoute from './PrivateRoute';

// Lazy load components for better performance
const LoginPage = lazy(() => import('../pages/LoginPage'));
// Registration page removed (registration disabled). If you need to re-enable, restore this import.
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const AdminPage = lazy(() => import('../pages/Admin/AdminPage'));
const AppContent = lazy(() => import('../App'));

const AppRouter: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading application...</div>;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
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

