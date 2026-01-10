import React, { useState } from 'react';
import { Modal, Button, Input, Alert } from 'antd';
import { Undo2, AlertCircle } from 'lucide-react';
import { Revision } from '../types';
import { useI18n } from '../../../lib/i18n';

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
  const { t } = useI18n();
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
          <span>{t('form.revision.confirmRevert')}</span>
        </div>
      }
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel} disabled={loading}>
          {t('common.cancel')}
        </Button>,
        <Button
          key="confirm"
          type="primary"
          danger
          icon={<Undo2 className="w-4 h-4" />}
          loading={loading}
          onClick={handleConfirm}
        >
          {t('form.revision.revert')}
        </Button>
      ]}
      width={500}
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2" dangerouslySetInnerHTML={{
            __html: t('form.revision.revertConfirmMessage', { version: revision.version })
          }} />
          <p className="text-sm text-gray-500">
            {t('form.revision.revertDescription')}
          </p>
        </div>

        {revision.description && (
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="text-xs text-gray-600">
              <strong>{t('form.revision.originalSummary')}</strong> {revision.description}
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('form.revision.revertReasonLabel')}
          </label>
          <TextArea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('form.revision.revertReasonPlaceholder')}
            maxLength={500}
            showCount
          />
        </div>

        {error && (
          <Alert
            message={t('common.error')}
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


