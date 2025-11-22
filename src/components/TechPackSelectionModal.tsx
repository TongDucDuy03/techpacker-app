import React, { useState, useEffect } from 'react';
import { Modal, Input, List, Card, Typography, Space, Tag, Button, Empty, Spin } from 'antd';
import { SearchOutlined, FileTextOutlined, CalendarOutlined, UserOutlined } from '@ant-design/icons';
import { useTechPack } from '../contexts/TechPackContext';
import { ApiTechPack } from '../types/techpack.types';

const { Title, Text } = Typography;
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

  useEffect(() => {
    if (visible && techPacks.length === 0) {
      loadTechPacks();
    }
  }, [visible, techPacks.length, loadTechPacks]);

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
          <span>Select TechPack to Clone</span>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button
          key="select"
          type="primary"
          disabled={!selectedTechPack}
          onClick={handleSelect}
        >
          Select This TechPack
        </Button>,
      ]}
    >
      <div style={{ padding: '16px 0' }}>
        <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
          Choose an existing TechPack to use as a template for your new one:
        </Text>

        <Search
          placeholder="Search by product name, article code, or season..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ marginBottom: 16 }}
          prefix={<SearchOutlined />}
        />

        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>Loading TechPacks...</div>
            </div>
          ) : filteredTechPacks.length === 0 ? (
            <Empty
              description={searchTerm ? "No TechPacks match your search" : "No TechPacks available"}
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
                        <Title level={5} style={{ margin: '0 0 8px 0' }}>
                          {(techPack as any).productName || (techPack as any).name || 'TechPack'}
                        </Title>
                        <Space direction="vertical" size={4}>
                          <Text strong>Article Code: {techPack.articleCode}</Text>
                          <Space>
                            <CalendarOutlined />
                            <Text type="secondary">Season: {(techPack as any).season || (techPack as any).metadata?.season || 'N/A'}</Text>
                          </Space>
                          <Space>
                            <UserOutlined />
                            <Text type="secondary">Created by: {techPack.createdByName || 'Unknown'}</Text>
                          </Space>
                          {techPack.description && (
                            <Text type="secondary" ellipsis style={{ maxWidth: '400px' }}>
                              {techPack.description}
                            </Text>
                          )}
                        </Space>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                        <Tag color={getStatusColor(techPack.status)}>
                          {techPack.status || 'Draft'}
                        </Tag>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          v{techPack.version || '1.0'}
                        </Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {techPack.updatedAt ? new Date(techPack.updatedAt).toLocaleDateString() : 'N/A'}
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
              Selected: {(selectedTechPack as any).productName || (selectedTechPack as any).name || 'TechPack'} ({selectedTechPack.articleCode})
            </Text>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TechPackSelectionModal;
