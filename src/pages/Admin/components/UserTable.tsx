import React from 'react';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { useI18n } from '../../../lib/i18n';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  createdAt: string;
  lastLogin?: string;
}

interface Props {
  users: User[];
  loading: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
  onEdit: (user: User) => void;
  onView: (user: User) => void;
  onDelete: (userId: string) => void;
}

const UserTable: React.FC<Props> = ({ users, loading, sortBy, sortOrder, onSort, onEdit, onView, onDelete }) => {
  const { t } = useI18n();
  
  const renderSortArrow = (field: string) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? ' ▲' : ' ▼';
  };

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'admin': return t('admin.role.admin');
      case 'designer': return t('admin.role.designer');
      case 'merchandiser': return t('admin.role.merchandiser');
      case 'viewer': return t('admin.role.viewer');
      default: return role;
    }
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa' }}>
            <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', cursor: 'pointer' }} onClick={() => onSort('firstName')}>{t('admin.user.firstName')}{renderSortArrow('firstName')}</th>
            <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', cursor: 'pointer' }} onClick={() => onSort('lastName')}>{t('admin.user.lastName')}{renderSortArrow('lastName')}</th>
            <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', cursor: 'pointer' }} onClick={() => onSort('email')}>{t('admin.user.email')}{renderSortArrow('email')}</th>
            <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', cursor: 'pointer' }} onClick={() => onSort('role')}>{t('admin.user.role')}{renderSortArrow('role')}</th>
            <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', cursor: 'pointer' }} onClick={() => onSort('createdAt')}>{t('admin.user.registered')}{renderSortArrow('createdAt')}</th>
            <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', cursor: 'pointer' }} onClick={() => onSort('lastLogin')}>{t('admin.user.lastLogin')}{renderSortArrow('lastLogin')}</th>
            <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>{t('admin.user.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {loading && users.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>{t('admin.user.loading')}</td>
            </tr>
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>{t('admin.user.noUsers')}</td>
            </tr>
          ) : (
            users.map(user => (
              <tr key={user._id} style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{user.firstName}</td>
                <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{user.lastName}</td>
                <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{user.email}</td>
                <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                  {getRoleLabel(user.role)}
                </td>
                <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : t('admin.user.never')}</td>
                <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => onView(user)}
                      title={t('admin.user.view')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px',
                        border: '1px solid #6c757d',
                        backgroundColor: 'white',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: '#6c757d',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#6c757d';
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.color = '#6c757d';
                      }}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => onEdit(user)}
                      title={t('admin.user.edit')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px',
                        border: '1px solid #007bff',
                        backgroundColor: 'white',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: '#007bff',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#007bff';
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.color = '#007bff';
                      }}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(user._id)}
                      title={t('admin.user.delete')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px',
                        border: '1px solid #dc3545',
                        backgroundColor: 'white',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: '#dc3545',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#dc3545';
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.color = '#dc3545';
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default UserTable;
