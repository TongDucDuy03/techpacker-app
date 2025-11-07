import React, { useState } from 'react';
import { Button, Space, Modal, Input, Tag, Popconfirm } from 'antd';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { api } from '../../../lib/api';
import { showSuccess, showError, showLoading, dismissToast } from '../../../lib/toast';
import { Revision } from '../types';
import { useAuth } from '../../../contexts/AuthContext';

const { TextArea } = Input;

interface ApproveRejectActionsProps {
  revision: Revision | null;
  onUpdate: () => void;
}

export const ApproveRejectActions: React.FC<ApproveRejectActionsProps> = ({
  revision,
  onUpdate
}) => {
  const { user } = useAuth();
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if user can approve/reject (Admin or Merchandiser)
  const canApproveReject = user?.role === 'admin' || user?.role === 'merchandiser';

  if (!canApproveReject || !revision) {
    return null;
  }

  const handleApprove = async () => {
    if (!revision._id) return;

    setLoading(true);
    const toastId = showLoading('Approving revision...');

    try {
      await api.approveRevision(revision._id, reason.trim() || undefined);
      dismissToast(toastId);
      showSuccess('Revision approved successfully');
      setApproveModalOpen(false);
      setReason('');
      onUpdate();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to approve revision';
      showError(errorMessage);
      dismissToast(toastId);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!revision._id || !reason.trim()) {
      showError('Reason is required for rejection');
      return;
    }

    setLoading(true);
    const toastId = showLoading('Rejecting revision...');

    try {
      await api.rejectRevision(revision._id, reason.trim());
      dismissToast(toastId);
      showSuccess('Revision rejected successfully');
      setRejectModalOpen(false);
      setReason('');
      onUpdate();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to reject revision';
      showError(errorMessage);
      dismissToast(toastId);
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = () => {
    if (revision.status === 'approved') {
      return <Tag color="green" icon={<CheckCircle className="w-3 h-3" />}>Approved</Tag>;
    }
    if (revision.status === 'rejected') {
      return <Tag color="red" icon={<XCircle className="w-3 h-3" />}>Rejected</Tag>;
    }
    return <Tag color="default" icon={<Clock className="w-3 h-3" />}>Pending</Tag>;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-gray-600 mr-2">Status:</span>
          {getStatusTag()}
          {revision.approvedBy && (
            <div className="text-xs text-gray-500 mt-1">
              {revision.status === 'approved' ? 'Approved' : 'Rejected'} by {revision.approvedByName} on{' '}
              {revision.approvedAt ? new Date(revision.approvedAt).toLocaleDateString() : ''}
            </div>
          )}
          {revision.approvedReason && (
            <div className="text-xs text-gray-600 mt-1 italic">"{revision.approvedReason}"</div>
          )}
        </div>
        <Space>
          <Button
            type="primary"
            icon={<CheckCircle className="w-4 h-4" />}
            onClick={() => setApproveModalOpen(true)}
            disabled={loading || revision.status === 'approved'}
          >
            Approve
          </Button>
          <Button
            danger
            icon={<XCircle className="w-4 h-4" />}
            onClick={() => setRejectModalOpen(true)}
            disabled={loading || revision.status === 'rejected'}
          >
            Reject
          </Button>
        </Space>
      </div>

      {/* Approve Modal */}
      <Modal
        open={approveModalOpen}
        title="Approve Revision"
        onOk={handleApprove}
        onCancel={() => {
          setApproveModalOpen(false);
          setReason('');
        }}
        confirmLoading={loading}
        okText="Approve"
        okButtonProps={{ type: 'primary' }}
      >
        <div className="space-y-4">
          <p>Are you sure you want to approve revision <strong>{revision.version}</strong>?</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason (optional)
            </label>
            <TextArea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter approval reason (optional)..."
              maxLength={500}
            />
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={rejectModalOpen}
        title="Reject Revision"
        onOk={handleReject}
        onCancel={() => {
          setRejectModalOpen(false);
          setReason('');
        }}
        confirmLoading={loading}
        okText="Reject"
        okButtonProps={{ danger: true }}
      >
        <div className="space-y-4">
          <p>Are you sure you want to reject revision <strong>{revision.version}</strong>?</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason <span className="text-red-500">*</span>
            </label>
            <TextArea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter rejection reason (required)..."
              maxLength={500}
              showCount
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};


