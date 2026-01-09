import React, { useState, useEffect } from 'react';
import { Modal, Input, List, Card, Typography, Space, Tag, Button, Empty, Spin } from 'antd';
import { SearchOutlined, FileTextOutlined, CalendarOutlined, UserOutlined } from '@ant-design/icons';
import { useTechPack } from '../contexts/TechPackContext';
import { ApiTechPack } from '../types/techpack';
import { useI18n } from '../lib/i18n';

const { Text } = Typography;
const { Search } = Input;

interface TechPackSelectionModalProps {
  visible: boolean;
  onCancel: () => void;
  onSelect: (techPack: ApiTechPack) => void;
}

export const TechPackSelectionModal: React.FC<TechPackSelectionModalProps> = ({
  visible,
  onCancel,
  onSelect,
}) => {
  const { techPacks, loading, loadTechPacks } = useTechPack();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTechPack, setSelectedTechPack] = useState<ApiTechPack | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    if (visible) {
      // Load all techpacks (use large limit to get full list)
      loadTechPacks({ limit: 1000, page: 1 });
    }
  }, [visible, loadTechPacks]);

  const filteredTechPacks = techPacks.filter(tp => {
    const productName = (tp as any).productName || (tp as any).name || '';
    const season = (tp as any).season || (tp as any).metadata?.season || '';
    return (
      productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tp.articleCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      season.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleSelect = () => {
    if (selectedTechPack) {
      onSelect(selectedTechPack);
      setSelectedTechPack(null);
      setSearchTerm('');
    }
  };

  const handleCancel = () => {
    setSelectedTechPack(null);
    setSearchTerm('');
    onCancel();
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft': return 'orange';
      case 'in review': return 'blue';
      case 'approved': return 'green';
      case 'archived': return 'gray';
      default: return 'default';
    }
  };

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          <span>{t('techpack.clone.title')}</span>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          {t('common.cancel')}
        </Button>,
        <Button
          key="select"
          type="primary"
          disabled={!selectedTechPack}
          onClick={handleSelect}
        >
          {t('techpack.clone.selectButton')}
        </Button>,
      ]}
    >
      <div style={{ padding: '16px 0' }}>
        <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
          {t('techpack.clone.subtitle')}
        </Text>

        <Search
          placeholder={t('techpack.clone.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ marginBottom: 16 }}
          prefix={<SearchOutlined />}
        />

        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>{t('techpack.clone.loading')}</div>
            </div>
          ) : filteredTechPacks.length === 0 ? (
            <Empty
              description={
                searchTerm
                  ? t('techpack.clone.emptySearch')
                  : t('techpack.clone.emptyList')
              }
              style={{ padding: '40px' }}
            />
          ) : (
            <List
              dataSource={filteredTechPacks}
              renderItem={(techPack) => (
                <List.Item style={{ padding: 0, marginBottom: 8 }}>
                  <Card
                    hoverable
                    onClick={() => setSelectedTechPack(techPack)}
                    style={{
                      width: '100%',
                      border: (selectedTechPack as any)?._id === (techPack as any)._id || (selectedTechPack as any)?.id === (techPack as any).id ? '2px solid #1890ff' : '1px solid #d9d9d9',
                      cursor: 'pointer',
                    }}
                    styles={{ body: { padding: '16px' } }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <Space direction="vertical" size={4}>
                          <Text strong>
                            {t('techpack.clone.productName')}: {(techPack as any).productName || 
                           (techPack as any).articleName || 
                           (techPack as any).name || 
                           t('techpack.common.defaultName')}
                          </Text>
                          <Text strong>
                            {t('techpack.clone.articleCode')}: {techPack.articleCode}
                          </Text>
                          <Space>
                            <CalendarOutlined />
                            <Text type="secondary">
                              {t('techpack.clone.season')}:{' '}
                              {(techPack as any).season ||
                                (techPack as any).metadata?.season ||
                                t('admin.users.na')}
                            </Text>
                          </Space>
                          <Space>
                            <UserOutlined />
                            <Text type="secondary">
                              {t('techpack.clone.createdBy')}: {
                                (techPack as any).createdBy 
                                  ? `${(techPack as any).createdBy.firstName || ''} ${(techPack as any).createdBy.lastName || ''}`.trim() || t('form.revision.unknownUser')
                                  : (techPack as any).createdByName || t('form.revision.unknownUser')
                              }
                            </Text>
                          </Space>
                          {(techPack as any).description && (
                            <Text type="secondary" ellipsis style={{ maxWidth: '400px' }}>
                              {(techPack as any).description}
                            </Text>
                          )}
                        </Space>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                        <Tag color={getStatusColor(techPack.status)}>
                          {techPack.status || t('techpack.clone.status.draft')}
                        </Tag>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {techPack.updatedAt
                            ? new Date(techPack.updatedAt).toLocaleDateString()
                            : t('admin.users.na')}
                        </Text>
                      </div>
                    </div>
                  </Card>
                </List.Item>
              )}
            />
          )}
        </div>

        {selectedTechPack && (
          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            backgroundColor: '#e6f7ff', 
            borderRadius: '6px',
            border: '1px solid #91d5ff'
          }}>
            <Text strong style={{ color: '#1890ff' }}>
              {t('techpack.clone.selectedLabel')}:{" "}
              {(selectedTechPack as any).productName ||
                (selectedTechPack as any).articleName ||
                (selectedTechPack as any).name ||
                t('techpack.common.defaultName')}{" "}
              ({selectedTechPack.articleCode})
            </Text>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TechPackSelectionModal;
