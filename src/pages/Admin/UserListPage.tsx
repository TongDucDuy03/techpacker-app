import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import UserTable from './components/UserTable';
import UserModal from './components/UserModal';
import SearchAndFilters from './components/SearchAndFilters';
import UserStats from './components/UserStats';
import ConfirmationDialog from '../../components/ConfirmationDialog';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  createdAt: string;
  lastLogin?: string;
}

interface UserStats {
  totalUsers: number;
  roleDistribution: Record<string, number>;
  recentUsers: User[];
}

const UserListPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });
  
  // Pagination and filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.getAllUsers({
        page: currentPage,
        limit: 10,
        search: searchTerm,
        role: roleFilter,
        sortBy,
        sortOrder
      });
      
      setUsers(response.users);
      setTotalPages(response.pagination.totalPages);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await api.getUserStats();
      setStats(statsData);
    } catch (err: any) {
      console.error('Failed to fetch user stats:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm, roleFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleCreateUser = () => {
    setSelectedUser(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    const user = users.find(u => u._id === userId);
    if (!user) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Delete User',
      message: `Are you sure you want to delete ${user.firstName} ${user.lastName} (${user.email})? This action cannot be undone and will permanently remove all user data.`,
      onConfirm: async () => {
        try {
          await api.deleteUser(userId);
          await fetchUsers();
          await fetchStats();
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          alert(err.message || 'Failed to delete user');
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleUserSaved = async () => {
    setIsModalOpen(false);
    await fetchUsers();
    await fetchStats();
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const handleRoleFilter = (role: string) => {
    setRoleFilter(role);
    setCurrentPage(1);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  if (loading && users.length === 0) {
    return <div style={{ padding: '20px' }}>Loading users...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>User Management</h1>
        <button 
          onClick={handleCreateUser}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Add New User
        </button>
      </div>

      {stats && <UserStats stats={stats} />}

      <SearchAndFilters
        searchTerm={searchTerm}
        roleFilter={roleFilter}
        onSearch={handleSearch}
        onRoleFilter={handleRoleFilter}
      />

      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      <UserTable
        users={users}
        loading={loading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        onEdit={handleEditUser}
        onView={handleViewUser}
        onDelete={handleDeleteUser}
      />

      {/* Pagination */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginTop: '20px',
        gap: '10px'
      }}>
        <button 
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          style={{
            padding: '8px 12px',
            border: '1px solid #ccc',
            backgroundColor: currentPage === 1 ? '#f8f9fa' : 'white',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
          }}
        >
          Previous
        </button>
        <span>Page {currentPage} of {totalPages}</span>
        <button 
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
          style={{
            padding: '8px 12px',
            border: '1px solid #ccc',
            backgroundColor: currentPage === totalPages ? '#f8f9fa' : 'white',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
          }}
        >
          Next
        </button>
      </div>

      {isModalOpen && (
        <UserModal
          user={selectedUser}
          mode={modalMode}
          onClose={() => setIsModalOpen(false)}
          onSave={handleUserSaved}
        />
      )}

      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default UserListPage;
