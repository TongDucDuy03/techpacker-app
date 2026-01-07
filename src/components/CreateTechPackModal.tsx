import React, { useState } from 'react';
import { Modal, Button, Card, Row, Col, Typography, Space } from 'antd';
import { PlusOutlined, CopyOutlined, FileAddOutlined, ClusterOutlined } from '@ant-design/icons';
import { useI18n } from '../lib/i18n';

const { Title, Text } = Typography;

interface CreateTechPackModalProps {
  visible: boolean;
  onCancel: () => void;
  onCreateFromScratch: () => void;
  onCreateFromExisting: () => void;
}

export const CreateTechPackModal: React.FC<CreateTechPackModalProps> = ({
  visible,
  onCancel,
  onCreateFromScratch,
  onCreateFromExisting,
}) => {
  const [selectedMode, setSelectedMode] = useState<'scratch' | 'existing' | null>(null);
  const { t } = useI18n();

  const handleContinue = () => {
    if (selectedMode === 'scratch') {
      onCreateFromScratch();
    } else if (selectedMode === 'existing') {
      onCreateFromExisting();
    }
    setSelectedMode(null);
  };

  const handleCancel = () => {
    setSelectedMode(null);
    onCancel();
  };

  return (
    <Modal
      title={
        <Space>
          <FileAddOutlined />
          <span>{t('techpack.create.title')}</span>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      width={600}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          {t('common.cancel')}
        </Button>,
        <Button
          key="continue"
          type="primary"
          disabled={!selectedMode}
          onClick={handleContinue}
        >
          {t('techpack.create.continue')}
        </Button>,
      ]}
    >
      <div style={{ padding: '16px 0' }}>
        <Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>
          {t('techpack.create.subtitle')}
        </Text>

        <Row gutter={[16, 16]}>
          {/* Create from Scratch */}
          <Col span={12}>
            <Card
              hoverable
              className={`creation-mode-card ${selectedMode === 'scratch' ? 'selected' : ''}`}
              onClick={() => setSelectedMode('scratch')}
              style={{
                border: selectedMode === 'scratch' ? '2px solid #1890ff' : '1px solid #d9d9d9',
                cursor: 'pointer',
                height: '200px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <PlusOutlined 
                  style={{ 
                    fontSize: '48px', 
                    color: selectedMode === 'scratch' ? '#1890ff' : '#8c8c8c',
                    marginBottom: '16px' 
                  }} 
                />
                <Title level={4} style={{ margin: '0 0 8px 0' }}>
                  🆕 {t('techpack.create.fromScratch.title')}
                </Title>
                <Text type="secondary">
                  {t('techpack.create.fromScratch.description')}
                </Text>
              </div>
            </Card>
          </Col>

          {/* Create from Existing */}
          <Col span={12}>
            <Card
              hoverable
              className={`creation-mode-card ${selectedMode === 'existing' ? 'selected' : ''}`}
              onClick={() => setSelectedMode('existing')}
              style={{
                border: selectedMode === 'existing' ? '2px solid #1890ff' : '1px solid #d9d9d9',
                cursor: 'pointer',
                height: '200px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <CopyOutlined 
                  style={{ 
                    fontSize: '48px', 
                    color: selectedMode === 'existing' ? '#1890ff' : '#8c8c8c',
                    marginBottom: '16px' 
                  }} 
                />
                <Title level={4} style={{ margin: '0 0 8px 0' }}>
                  ♻️ {t('techpack.create.fromExisting.title')}
                </Title>
                <Text type="secondary">
                  {t('techpack.create.fromExisting.description')}
                </Text>
              </div>
            </Card>
          </Col>
        </Row>

        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f6f8fa', borderRadius: '6px' }}>
          <Space>
            <ClusterOutlined style={{ color: '#1890ff' }} />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <strong>{t('techpack.create.tipLabel')}</strong>{' '}
              {t('techpack.create.tipText')}
            </Text>
          </Space>
        </div>
      </div>
    </Modal>
  );
};

export default CreateTechPackModal;
