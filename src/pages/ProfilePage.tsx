import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Card, Button, Alert, Space, Typography } from 'antd';
import { SafetyOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const ProfilePage: React.FC = () => {
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ firstName: '', lastName: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({ firstName: user.firstName, lastName: user.lastName });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.updateProfile(formData);
      await refreshUser();
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div>Loading profile...</div>;
  }

  if (!user) {
    return <div>User not found. Please log in.</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px' }}>
      <Title level={2}>My Profile</Title>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: '24px' }}
        />
      )}

      {success && (
        <Alert
          message={success}
          type="success"
          showIcon
          closable
          onClose={() => setSuccess(null)}
          style={{ marginBottom: '24px' }}
        />
      )}

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Profile Information */}
        <Card title="Profile Information">
          {!isEditing ? (
            <div>
              <p><strong>First Name:</strong> {user.firstName}</p>
              <p><strong>Last Name:</strong> {user.lastName}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Role:</strong> {user.role}</p>
              <Button type="primary" onClick={() => setIsEditing(true)} style={{ marginTop: '20px' }}>
                Edit Profile
              </Button>
            </div>
          ) : (
            <form onSubmit={handleUpdate}>
              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="firstName">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', marginTop: '8px' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="lastName">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', marginTop: '8px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <Button type="primary" htmlType="submit" loading={loading}>
                  Save Changes
                </Button>
                <Button onClick={() => setIsEditing(false)}>Cancel</Button>
              </div>
            </form>
          )}
        </Card>

        {/* Security Settings */}
        <Card
          title={
            <Space>
              <SafetyOutlined />
              <span>Security Settings</span>
            </Space>
          }
        >
          <Title level={5} style={{ marginTop: 0 }}>
            Two-Factor Authentication (2FA)
          </Title>
          <Text type="secondary">
            Two-factor authentication is required for all accounts. A verification code will be emailed each time you sign in.
            Please contact an administrator if you need to request changes.
          </Text>
          <Alert
            message={user.is2FAEnabled === false ? '2FA Disabled by Administrator' : '2FA Required'}
            description={
              user.is2FAEnabled === false
                ? 'An administrator has temporarily disabled 2FA for this account. Reach out to your admin for more details.'
                : 'You must enter the verification code sent to your email after entering your password.'
            }
            type={user.is2FAEnabled === false ? 'warning' : 'success'}
            showIcon
            style={{ marginTop: '16px' }}
          />
        </Card>
      </Space>
    </div>
  );
};

export default ProfilePage;

