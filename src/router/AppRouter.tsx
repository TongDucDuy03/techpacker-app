import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PrivateRoute from './PrivateRoute';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ProfilePage from '../pages/ProfilePage';
import AdminPage from '../pages/Admin/AdminPage';
import AppContent from '../App'; // Assuming App.tsx exports a component that can be renamed

const AppRouter: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading application...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/" />} />
        
        <Route path="/*" element={<PrivateRoute />}>
          <Route path="" element={<AppContent />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="admin/*" element={<AdminPage />} />
          {/* Add other private routes here */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;

