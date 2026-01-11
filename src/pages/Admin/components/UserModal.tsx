import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
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
  user: User | null;
  mode: 'create' | 'edit' | 'view';
  onClose: () => void;
  onSave: () => void;
}

const UserModal: React.FC<Props> = ({ user, mode, onClose, onSave }) => {
  const { user: currentUser, refreshUser } = useAuth();
  const { t } = useI18n();
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
      errors.firstName = t('admin.user.validation.firstName.required');
    } else if (formData.firstName.trim().length < 2) {
      errors.firstName = t('admin.user.validation.firstName.minLength');
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      errors.lastName = t('admin.user.validation.lastName.required');
    } else if (formData.lastName.trim().length < 2) {
      errors.lastName = t('admin.user.validation.lastName.minLength');
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = t('admin.user.validation.email.required');
    } else if (!emailRegex.test(formData.email)) {
      errors.email = t('admin.user.validation.email.invalid');
    }

    // Password validation (only for create mode or when password is provided in edit mode)
    if (mode === 'create' || formData.password) {
      if (!formData.password) {
        errors.password = t('admin.user.validation.password.required');
      } else if (formData.password.length < 8) {
        errors.password = t('admin.user.validation.password.minLength');
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        errors.password = t('admin.user.validation.password.complexity');
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
      setError(err.message || t('admin.user.saveError'));
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'view' && user) {
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
      <div style={modalStyles.overlay}>
        <div style={modalStyles.content}>
          <h2>{t('admin.user.details')}</h2>
          <p><strong>{t('admin.user.firstName')}:</strong> {user.firstName}</p>
          <p><strong>{t('admin.user.lastName')}:</strong> {user.lastName}</p>
          <p><strong>{t('admin.user.email')}:</strong> {user.email}</p>
          <p><strong>{t('admin.user.role')}:</strong> {getRoleLabel(user.role)}</p>
          <p><strong>{t('admin.user.registered')}:</strong> {new Date(user.createdAt).toLocaleString()}</p>
          <p><strong>{t('admin.user.lastLogin')}:</strong> {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : t('admin.user.never')}</p>
          <button onClick={onClose} style={{ marginTop: '20px' }}>{t('admin.user.close')}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.content}>
        <h2>{mode === 'create' ? t('admin.user.createNew') : t('admin.user.edit')}</h2>
        <form onSubmit={handleSubmit}>
          <div style={formGroupStyles}>
            <label>{t('admin.user.firstName')}</label>
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
            <label>{t('admin.user.lastName')}</label>
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
            <label>{t('admin.user.email')}</label>
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
            <label>{t('admin.user.password')} {mode === 'edit' && `(${t('admin.user.password.leaveBlank')})`}</label>
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
            <label>{t('admin.user.role')}</label>
            <select name="role" value={formData.role} onChange={handleChange} style={inputStyles}>
              <option value="admin">{t('admin.role.admin')}</option>
              <option value="designer">{t('admin.role.designer')}</option>
              <option value="merchandiser">{t('admin.role.merchandiser')}</option>
              <option value="viewer">{t('admin.role.viewer')}</option>
            </select>
          </div>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onClose} disabled={loading}>{t('common.cancel')}</button>
            <button type="submit" disabled={loading}>
              {loading ? t('form.saving') : t('common.save')}
            </button>
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
