import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, Alert, Space } from 'antd';
import { SafetyOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

interface TwoFactorFormProps {
  sessionToken: string;
  onBack?: () => void;
}

const TwoFactorForm: React.FC<TwoFactorFormProps> = ({ sessionToken, onBack }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { verify2FA, send2FACode } = useAuth();
  const navigate = useNavigate();

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSubmit = async () => {
    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await verify2FA(sessionToken, code);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid verification code. Please try again.');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;

    setResending(true);
    setError(null);

    try {
      await send2FACode(sessionToken);
      setCountdown(60); // 60 seconds cooldown
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
    setError(null);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <SafetyOutlined style={{ fontSize: '48px', color: '#4F46E5', marginBottom: '16px' }} />
        <Title level={3}>Two-Factor Authentication</Title>
        <Text type="secondary">
          We've sent a 6-digit verification code to your email address.
          <br />
          Please enter it below to complete your login.
        </Text>
      </div>

      <Form onFinish={handleSubmit} layout="vertical">
        <Form.Item
          label="Verification Code"
          validateStatus={error ? 'error' : ''}
          help={error || 'Enter the 6-digit code from your email'}
        >
          <Input
            size="large"
            placeholder="000000"
            value={code}
            onChange={handleCodeChange}
            maxLength={6}
            style={{
              textAlign: 'center',
              fontSize: '24px',
              letterSpacing: '8px',
              fontFamily: 'monospace',
            }}
            autoFocus
          />
        </Form.Item>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: '16px' }}
            closable
            onClose={() => setError(null)}
          />
        )}

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={loading}
            disabled={code.length !== 6}
          >
            Verify Code
          </Button>
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Didn't receive the code?
            </Text>
            <Button
              type="link"
              icon={<ReloadOutlined />}
              onClick={handleResend}
              loading={resending}
              disabled={countdown > 0}
            >
              {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend Code'}
            </Button>
            {onBack && (
              <Button type="link" onClick={onBack} style={{ marginTop: '8px' }}>
                Back to Login
              </Button>
            )}
          </Space>
        </Form.Item>
      </Form>

      <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#F3F4F6', borderRadius: '8px' }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          <strong>Security Tips:</strong>
          <br />
          • The code expires in 10 minutes
          <br />
          • Never share this code with anyone
          <br />
          • If you didn't request this code, please secure your account
        </Text>
      </div>
    </div>
  );
};

export default TwoFactorForm;

