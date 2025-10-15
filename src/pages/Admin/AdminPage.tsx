import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import UserListPage from './UserListPage';

const AdminPage: React.FC = () => {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex' }}>
      <nav style={{ width: '200px', borderRight: '1px solid #ccc', padding: '20px' }}>
        <h3>Admin Menu</h3>
        <ul>
          <li><Link to="/admin/users">User Management</Link></li>
          {/* Add more admin links here */}
        </ul>
      </nav>
      <main style={{ flex: 1, padding: '20px' }}>
        <Routes>
          <Route path="users" element={<UserListPage />} />
          {/* Define other admin routes here */}
        </Routes>
      </main>
    </div>
  );
};

export default AdminPage;

