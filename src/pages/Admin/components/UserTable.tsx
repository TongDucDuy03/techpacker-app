import React from 'react';

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
  const renderSortArrow = (field: string) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa' }}>
            <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', cursor: 'pointer' }} onClick={() => onSort('firstName')}>First Name{renderSortArrow('firstName')}</th>
            <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', cursor: 'pointer' }} onClick={() => onSort('lastName')}>Last Name{renderSortArrow('lastName')}</th>
            <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', cursor: 'pointer' }} onClick={() => onSort('email')}>Email{renderSortArrow('email')}</th>
            <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', cursor: 'pointer' }} onClick={() => onSort('role')}>Role{renderSortArrow('role')}</th>
            <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', cursor: 'pointer' }} onClick={() => onSort('createdAt')}>Registered{renderSortArrow('createdAt')}</th>
            <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', cursor: 'pointer' }} onClick={() => onSort('lastLogin')}>Last Login{renderSortArrow('lastLogin')}</th>
            <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading && users.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>Loading...</td>
            </tr>
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>No users found.</td>
            </tr>
          ) : (
            users.map(user => (
              <tr key={user._id} style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{user.firstName}</td>
                <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{user.lastName}</td>
                <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{user.email}</td>
                <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{user.role}</td>
                <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</td>
                <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                  <button onClick={() => onView(user)} style={{ marginRight: '5px' }}>View</button>
                  <button onClick={() => onEdit(user)} style={{ marginRight: '5px' }}>Edit</button>
                  <button onClick={() => onDelete(user._id)}>Delete</button>
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
