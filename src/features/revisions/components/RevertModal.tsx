import React, { useState } from 'react';
import { Modal, Button, Input, Alert } from 'antd';
import { Undo2, AlertCircle } from 'lucide-react';
import { Revision } from '../types';

const { TextArea } = Input;

interface RevertModalProps {
  open: boolean;
  revision: Revision | null;
  loading: boolean;
  error: string | null;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}

export const RevertModal: React.FC<RevertModalProps> = ({
  open,
  revision,
  loading,
  error,
  onConfirm,
  onCancel
}) => {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirm(reason.trim() || undefined);
    setReason('');
  };

  const handleCancel = () => {
    setReason('');
    onCancel();
  };

  if (!revision) return null;

  return (
    <Modal
      open={open}
      title={
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-600" />
          <span>Confirm Revert</span>
        </div>
      }
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel} disabled={loading}>
          Cancel
        </Button>,
        <Button
          key="confirm"
          type="primary"
          danger
          icon={<Undo2 className="w-4 h-4" />}
          loading={loading}
          onClick={handleConfirm}
        >
          Revert
        </Button>
      ]}
      width={500}
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">
            Bạn có chắc muốn revert về version <strong>{revision.version}</strong>?
          </p>
          <p className="text-sm text-gray-500">
            Hành động này sẽ tạo revision mới và ghi lại lịch sử. Dữ liệu hiện tại sẽ được thay thế bằng dữ liệu từ revision này.
          </p>
        </div>

        {revision.description && (
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="text-xs text-gray-600">
              <strong>Original Summary:</strong> {revision.description}
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lý do revert (tùy chọn)
          </label>
          <TextArea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Nhập lý do revert (nếu có)..."
            maxLength={500}
            showCount
          />
        </div>

        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            closable
          />
        )}
      </div>
    </Modal>
  );
};


