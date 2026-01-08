import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';

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
  user: User | null;
  mode: 'create' | 'edit' | 'view';
  onClose: () => void;
  onSave: () => void;
}

const UserModal: React.FC<Props> = ({ user, mode, onClose, onSave }) => {
  const { user: currentUser, refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'designer',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user && (mode === 'edit' || mode === 'view')) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: '',
        role: user.role,
      });
    }
  }, [user, mode]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // First name validation
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length < 2) {
      errors.lastName = 'Last name must be at least 2 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation (only for create mode or when password is provided in edit mode)
    if (mode === 'create' || formData.password) {
      if (!formData.password) {
        errors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters long';
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear validation error for this field when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (mode === 'create') {
        await api.createUser(formData);
      } else if (mode === 'edit' && user) {
        const { password, ...updateData } = formData;
        const finalData: any = updateData;
        const roleChanged = updateData.role && updateData.role !== user.role;
        
        // Only include password if it's been changed
        if (password) {
          await api.resetUserPassword(user._id, password);
        }
        await api.updateUser(user._id, finalData);
        
        // If role changed and this is the current user, refresh their data
        if (roleChanged && currentUser && user._id === currentUser._id) {
          console.log('[UserModal] Role changed for current user, refreshing user data...');
          await refreshUser();
        }
      }
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'view' && user) {
    return (
      <div style={modalStyles.overlay}>
        <div style={modalStyles.content}>
          <h2>User Details</h2>
          <p><strong>First Name:</strong> {user.firstName}</p>
          <p><strong>Last Name:</strong> {user.lastName}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> {user.role}</p>
          <p><strong>Registered:</strong> {new Date(user.createdAt).toLocaleString()}</p>
          <p><strong>Last Login:</strong> {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</p>
          <button onClick={onClose} style={{ marginTop: '20px' }}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.content}>
        <h2>{mode === 'create' ? 'Create New User' : 'Edit User'}</h2>
        <form onSubmit={handleSubmit}>
          <div style={formGroupStyles}>
            <label>First Name</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              style={{
                ...inputStyles,
                borderColor: validationErrors.firstName ? '#dc3545' : '#ced4da'
              }}
            />
            {validationErrors.firstName && (
              <div style={errorTextStyles}>{validationErrors.firstName}</div>
            )}
          </div>
          <div style={formGroupStyles}>
            <label>Last Name</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              style={{
                ...inputStyles,
                borderColor: validationErrors.lastName ? '#dc3545' : '#ced4da'
              }}
            />
            {validationErrors.lastName && (
              <div style={errorTextStyles}>{validationErrors.lastName}</div>
            )}
          </div>
          <div style={formGroupStyles}>
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={{
                ...inputStyles,
                borderColor: validationErrors.email ? '#dc3545' : '#ced4da'
              }}
            />
            {validationErrors.email && (
              <div style={errorTextStyles}>{validationErrors.email}</div>
            )}
          </div>
          <div style={formGroupStyles}>
            <label>Password {mode === 'edit' && '(leave blank to keep current)'}</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required={mode === 'create'}
              style={{
                ...inputStyles,
                borderColor: validationErrors.password ? '#dc3545' : '#ced4da'
              }}
            />
            {validationErrors.password && (
              <div style={errorTextStyles}>{validationErrors.password}</div>
            )}
          </div>
          <div style={formGroupStyles}>
            <label>Role</label>
            <select name="role" value={formData.role} onChange={handleChange} style={inputStyles}>
              <option value="admin">Admin (Quản trị viên)</option>
              <option value="designer">Designer/Developer (Nhà thiết kế)</option>
              <option value="merchandiser">Merchandiser (Chủ thương hiệu)</option>
              <option value="viewer">Viewer/Supplier (Chỉ xem)</option>
            </select>
          </div>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const modalStyles = {
  overlay: {
    position: 'fixed' as 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  content: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto' as 'auto',
  },
};

const formGroupStyles = {
  marginBottom: '15px',
};

const inputStyles = {
  width: '100%',
  padding: '8px',
  boxSizing: 'border-box' as 'border-box',
  marginTop: '5px',
  border: '1px solid #ced4da',
  borderRadius: '4px',
};

const errorTextStyles = {
  color: '#dc3545',
  fontSize: '12px',
  marginTop: '4px',
};

export default UserModal;
