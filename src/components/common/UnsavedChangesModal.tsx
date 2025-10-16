import React from 'react';
import { Modal, Button, Typography, Space } from 'antd';
import { ExclamationCircleOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface UnsavedChangesModalProps {
  visible: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  visible,
  onSave,
  onDiscard,
  onCancel,
  loading = false
}) => {
  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: '20px' }} />
          <Title level={4} style={{ margin: 0 }}>
            Thay đổi chưa được lưu
          </Title>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={480}
      centered
      maskClosable={false}
      closable={false}
    >
      <div style={{ padding: '16px 0' }}>
        <Text style={{ fontSize: '16px', lineHeight: '1.6' }}>
          Bạn có thay đổi chưa được lưu. Bạn có muốn lưu trước khi thoát không?
        </Text>
        
        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Button
            onClick={onDiscard}
            disabled={loading}
            icon={<CloseOutlined />}
            danger
          >
            Thoát mà không lưu
          </Button>
          
          <Button onClick={onCancel} disabled={loading}>
            Hủy
          </Button>
          
          <Button
            type="primary"
            onClick={onSave}
            loading={loading}
            icon={<SaveOutlined />}
          >
            Lưu và thoát
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UnsavedChangesModal;
