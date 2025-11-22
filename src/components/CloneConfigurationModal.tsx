import React, { useState } from 'react';
import { Modal, Form, Input, Checkbox, Typography, Space, Card, Row, Col, Button, Divider } from 'antd';
import { CopyOutlined, InfoCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { ApiTechPack } from '../types/techpack.types';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface CloneConfigurationModalProps {
  visible: boolean;
  sourceTechPack: ApiTechPack | null;
  onCancel: () => void;
  onConfirm: (config: CloneConfiguration) => void;
  loading?: boolean;
}

export interface CloneConfiguration {
  newProductName: string;
  newArticleCode: string;
  season?: string;
  copySections: string[];
}

const COPY_SECTIONS = [
  {
    key: 'ArticleInfo',
    label: 'Article Info',
    description: 'Basic info (supplier, season, fabric description, etc.)',
    defaultChecked: true,
  },
  {
    key: 'BOM',
    label: 'Bill of Materials',
    description: 'All material rows and specifications',
    defaultChecked: true,
  },
  {
    key: 'Measurements',
    label: 'Measurements',
    description: 'Full measurement chart and specifications',
    defaultChecked: true,
  },
  {
    key: 'Construction',
    label: 'Construction',
    description: 'Construction instructions and guidelines',
    defaultChecked: true,
  },
  {
    key: 'Colorways',
    label: 'Colorways',
    description: 'Color variations and specifications',
    defaultChecked: false,
  },
  {
    key: 'Packing',
    label: 'Packing',
    description: 'Packing & folding instructions',
    defaultChecked: true,
  },
];

export const CloneConfigurationModal: React.FC<CloneConfigurationModalProps> = ({
  visible,
  sourceTechPack,
  onCancel,
  onConfirm,
  loading = false,
}) => {
  const [form] = Form.useForm();
  const [copySections, setCopySections] = useState<string[]>(
    COPY_SECTIONS.filter(section => section.defaultChecked).map(section => section.key)
  );

  const handleConfirm = async () => {
    try {
      const values = await form.validateFields();
      const config: CloneConfiguration = {
        newProductName: values.newProductName,
        newArticleCode: values.newArticleCode,
        season: values.season,
        copySections,
      };
      onConfirm(config);
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setCopySections(COPY_SECTIONS.filter(section => section.defaultChecked).map(section => section.key));
    onCancel();
  };

  const handleSectionChange = (checkedValues: string[]) => {
    setCopySections(checkedValues);
  };

  return (
    <Modal
      title={
        <Space>
          <CopyOutlined />
          <span>Configure New TechPack</span>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      width={700}
      footer={[
        <Button key="cancel" onClick={handleCancel} disabled={loading}>
          Cancel
        </Button>,
        <Button
          key="create"
          type="primary"
          onClick={handleConfirm}
          loading={loading}
        >
          Create TechPack
        </Button>,
      ]}
    >
      <div style={{ padding: '16px 0' }}>
        {sourceTechPack && (
          <Card style={{ marginBottom: 24, backgroundColor: '#f6f8fa' }}>
            <Space>
              <InfoCircleOutlined style={{ color: '#1890ff' }} />
              <div>
                <Text strong>Cloning from: </Text>
                <Text>{(sourceTechPack as any).productName || (sourceTechPack as any).name || 'TechPack'} ({sourceTechPack.articleCode})</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Version {sourceTechPack.version} • {(sourceTechPack as any).season || (sourceTechPack as any).metadata?.season || 'N/A'}
                </Text>
              </div>
            </Space>
          </Card>
        )}

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            season: (sourceTechPack as any)?.season || (sourceTechPack as any)?.metadata?.season,
          }}
        >
          <Title level={5}>New TechPack Details</Title>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="newProductName"
                label="Product Name"
                rules={[{ required: true, message: 'Product name is required' }]}
              >
                <Input placeholder="Enter new product name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="newArticleCode"
                label="Article Code"
                rules={[
                  { required: true, message: 'Article code is required' },
                  {
                    pattern: /^[A-Z0-9_-]+$/,
                    message: 'Article code can only contain uppercase letters, numbers, dash (-), and underscore (_)',
                  },
                ]}
                normalize={(value) => value ? value.toUpperCase() : value}
              >
                <Input placeholder="Enter new article code (e.g., ABC123)" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="season"
            label="Season (Optional)"
          >
            <Input placeholder="e.g., SS25, FW25" />
          </Form.Item>

          <Divider />

          <Title level={5}>
            <Space>
              <CheckCircleOutlined />
              Copy Sections
            </Space>
          </Title>
          <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
            Select which sections you want to copy from the source TechPack:
          </Text>

          <Checkbox.Group
            value={copySections}
            onChange={handleSectionChange}
            style={{ width: '100%' }}
          >
            <Row gutter={[0, 12]}>
              {COPY_SECTIONS.map((section) => (
                <Col span={24} key={section.key}>
                  <Card
                    size="small"
                    style={{
                      border: copySections.includes(section.key) ? '1px solid #1890ff' : '1px solid #d9d9d9',
                      backgroundColor: copySections.includes(section.key) ? '#f6ffed' : 'white',
                    }}
                  >
                    <Checkbox value={section.key} style={{ width: '100%' }}>
                      <div style={{ marginLeft: 8 }}>
                        <Text strong>{section.label}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {section.description}
                        </Text>
                      </div>
                    </Checkbox>
                  </Card>
                </Col>
              ))}
            </Row>
          </Checkbox.Group>

          <div style={{ 
            marginTop: 16, 
            padding: '12px', 
            backgroundColor: '#fff7e6', 
            borderRadius: '6px',
            border: '1px solid #ffd591'
          }}>
            <Space>
              <InfoCircleOutlined style={{ color: '#fa8c16' }} />
              <Text style={{ fontSize: '12px' }}>
                <strong>Note:</strong> The new TechPack will start as a Draft with version v1.0. 
                Revision history, sharing settings, and comments will not be copied.
              </Text>
            </Space>
          </div>
        </Form>
      </div>
    </Modal>
  );
};

export default CloneConfigurationModal;
