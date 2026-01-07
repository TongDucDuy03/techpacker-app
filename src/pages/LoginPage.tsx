import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../lib/i18n';
import { Form, Input, Button, Typography, Alert } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import TwoFactorForm from '../components/TwoFactorForm';
import './LoginPage.css';

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const onFinish = async (values: any) => {
    setLoading(true);
    setError(null);
    try {
      const result = await login(values.email, values.password);
      
      // Check if 2FA is required
      if (result && typeof result === 'object' && 'requires2FA' in result && result.requires2FA) {
        setRequires2FA(true);
        setSessionToken(result.sessionToken || null);
        return;
      }

      // Normal login success
      navigate('/');
    } catch (err: any) {
      setError(err.message || t('auth.login.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setRequires2FA(false);
    setSessionToken(null);
    setError(null);
  };

  // Show 2FA form if required
  if (requires2FA && sessionToken) {
    return (
      <div className="login-page">
        <div className="login-card">
          <TwoFactorForm sessionToken={sessionToken} onBack={handleBackToLogin} />
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <Title level={2} className="login-title">{t('auth.login.title')}</Title>
        <Text className="login-subtitle">{t('auth.login.title')}</Text>
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            name="email"
            rules={[{ required: true, message: t('auth.login.emailRequired') }, { type: 'email', message: t('validation.invalidEmail') }]}
          >
            <Input prefix={<MailOutlined />} placeholder={t('auth.login.email')} />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: t('auth.login.passwordRequired') }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder={t('auth.login.password')} />
          </Form.Item>

          {error && <Alert message={error} type="error" showIcon style={{ marginBottom: '24px' }}/>}

          <Form.Item>
            <Button type="primary" htmlType="submit" className="login-form-button" loading={loading}>
              {t('auth.login.button')}
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default LoginPage;

