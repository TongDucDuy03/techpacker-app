import React, { useState } from 'react';
import { Modal, Form, Input, Checkbox, Typography, Space, Card, Row, Col, Button, Divider } from 'antd';
import { CopyOutlined, InfoCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { ApiTechPack } from '../types/techpack.types';
import { useI18n } from '../lib/i18n';

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

const getCopySections = (t: (key: string) => string) => [
  {
    key: 'ArticleInfo',
    label: t('clone.modal.section.articleInfo'),
    description: t('clone.modal.section.articleInfoDesc'),
    defaultChecked: true,
  },
  {
    key: 'BOM',
    label: t('clone.modal.section.bom'),
    description: t('clone.modal.section.bomDesc'),
    defaultChecked: true,
  },
  {
    key: 'Measurements',
    label: t('clone.modal.section.measurements'),
    description: t('clone.modal.section.measurementsDesc'),
    defaultChecked: true,
  },
  {
    key: 'Construction',
    label: t('clone.modal.section.construction'),
    description: t('clone.modal.section.constructionDesc'),
    defaultChecked: true,
  },
  {
    key: 'Colorways',
    label: t('clone.modal.section.colorways'),
    description: t('clone.modal.section.colorwaysDesc'),
    defaultChecked: false,
  },
  {
    key: 'Packing',
    label: t('clone.modal.section.packing'),
    description: t('clone.modal.section.packingDesc'),
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
  const { t } = useI18n();
  const COPY_SECTIONS = getCopySections(t);
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
        <Space><span>{t('clone.modal.title')}</span>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      width={700}
      footer={[
        <Button key="cancel" onClick={handleCancel} disabled={loading}>
          {t('clone.modal.cancel')}
        </Button>,
        <Button
          key="create"
          type="primary"
          onClick={handleConfirm}
          loading={loading}
        >
          {t('clone.modal.create')}
       
        </Button>,
      ]}
    >
      <div style={{ padding: '16px 0' }}>
        {sourceTechPack && (
          <Card style={{ marginBottom: 24, backgroundColor: '#f6f8fa' }}>
            <Space>
              <InfoCircleOutlined style={{ color: '#1890ff' }} />
              <div>
                <Text strong>{t('clone.modal.cloningFrom')} </Text>
                <Text>{(sourceTechPack as any).productName || (sourceTechPack as any).name || 'TechPack'} ({sourceTechPack.articleCode})</Text>
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
          <Title level={5}>{t('clone.modal.newTechPackDetails')}</Title>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="newProductName"
                label={t('clone.modal.productName')}
                rules={[{ required: true, message: t('clone.modal.productNameRequired') }]}
              >
                <Input placeholder={t('clone.modal.productNamePlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="newArticleCode"
                label={t('clone.modal.articleCode')}
                rules={[
                  { required: true, message: t('clone.modal.articleCodeRequired') },
                  {
                    pattern: /^[A-Z0-9_-]+$/,
                    message: t('clone.modal.articleCodePattern'),
                  },
                ]}
                normalize={(value) => value ? value.toUpperCase() : value}
              >
                <Input placeholder={t('clone.modal.articleCodePlaceholder')} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="season"
            label={t('clone.modal.season')}
          >
            <Input placeholder={t('clone.modal.seasonPlaceholder')} />
          </Form.Item>

          <Divider />

          <Title level={5}>
            <Space>
              <CheckCircleOutlined />
              {t('clone.modal.copySections')}
            </Space>
          </Title>
          <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
            {t('clone.modal.copySectionsDescription')}
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
                      </div>
                    </Checkbox>
                  </Card>
                </Col>
              ))}
            </Row>
          </Checkbox.Group>
        </Form>
      </div>
    </Modal>
  );
};

export default CloneConfigurationModal;
