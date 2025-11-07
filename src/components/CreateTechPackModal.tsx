import React, { useState } from 'react';
import { Modal, Button, Card, Row, Col, Typography, Space } from 'antd';
import { PlusOutlined, CopyOutlined, FileAddOutlined, ClusterOutlined } from '@ant-design/icons';

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
          <span>Create a new TechPack</span>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      width={600}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button
          key="continue"
          type="primary"
          disabled={!selectedMode}
          onClick={handleContinue}
        >
          Continue
        </Button>,
      ]}
    >
      <div style={{ padding: '16px 0' }}>
        <Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>
          Choose how you want to create your new TechPack:
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
                  🆕 Create from scratch
                </Title>
                <Text type="secondary">
                  Start a completely new TechPack with empty fields
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
                  ♻️ Create from existing TechPack
                </Title>
                <Text type="secondary">
                  Duplicate an existing TechPack to edit and reuse
                </Text>
              </div>
            </Card>
          </Col>
        </Row>

        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f6f8fa', borderRadius: '6px' }}>
          <Space>
            <ClusterOutlined style={{ color: '#1890ff' }} />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <strong>Tip:</strong> Creating from an existing TechPack is perfect when your new product only differs slightly in color, fabric, or measurements.
            </Text>
          </Space>
        </div>
      </div>
    </Modal>
  );
};

export default CreateTechPackModal;
