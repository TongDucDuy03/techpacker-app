import React, { useState } from 'react';
import { Card, Button, Space, Tag, Divider, Table, Image } from 'antd';
import { Undo2, GitCompare, MessageCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Revision } from '../types';
import { RevertModal } from './RevertModal';
import { CommentsSection } from './CommentsSection';
import { ApproveRejectActions } from './ApproveRejectActions';
import { useRevert } from '../hooks/useRevert';
import { useRevision } from '../hooks/useRevision';

interface RevisionDetailProps {
  revision: Revision | null;
  techPackId: string | undefined;
  canEdit: boolean;
  canView: boolean;
  onCompare: () => void;
  onRevertSuccess: () => void;
}

export const RevisionDetail: React.FC<RevisionDetailProps> = ({
  revision,
  techPackId,
  canEdit,
  canView,
  onCompare,
  onRevertSuccess
}) => {
  const { revert, loading: reverting, error: revertError } = useRevert();
  const { refetch } = useRevision(revision?._id);
  const [showRevertModal, setShowRevertModal] = useState(false);

  if (!revision) {
    return (
      <Card>
        <div className="text-center py-12 text-gray-500">
          <p>Select a revision to view details</p>
        </div>
      </Card>
    );
  }

  const handleRevert = async (reason?: string) => {
    if (!techPackId || !revision._id) return;

    const result = await revert(techPackId, revision._id, reason);
    if (result) {
      setShowRevertModal(false);
      onRevertSuccess();
      refetch();
    }
  };

  const canRevert = canEdit && revision.snapshot && revision.changeType !== 'rollback';
  const revertDisabledReason = !revision.snapshot
    ? 'Cannot revert — snapshot data missing for this revision'
    : revision.changeType === 'rollback'
    ? 'Reverting to a rollback revision is not allowed'
    : !canEdit
    ? 'You need Editor access to revert this TechPack'
    : '';

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatValue = (val: any): React.ReactNode => {
    if (val === null || val === undefined || val === '') return '—';
    if (typeof val === 'object') {
      try {
        return <pre className="text-xs">{JSON.stringify(val, null, 2)}</pre>;
      } catch {
        return String(val);
      }
    }
    return String(val);
  };

  const diffColumns = [
    {
      title: 'Field',
      dataIndex: 'field',
      key: 'field',
      render: (text: string) => (
        <span className="font-medium">{text.replace(/\./g, ' > ')}</span>
      )
    },
    {
      title: 'Old Value',
      dataIndex: 'old',
      key: 'old',
      render: (val: any) => (
        <div className="bg-gray-100 px-2 py-1 rounded text-sm">{formatValue(val)}</div>
      )
    },
    {
      title: 'New Value',
      dataIndex: 'new',
      key: 'new',
      render: (val: any) => (
        <div className="bg-yellow-100 px-2 py-1 rounded text-sm font-medium">{formatValue(val)}</div>
      )
    }
  ];

  const diffData = revision.changes?.diff
    ? Object.entries(revision.changes.diff).map(([field, change]: [string, any]) => ({
        key: field,
        field,
        old: change.old,
        new: change.new
      }))
    : [];

  return (
    <>
      <Card
        title={
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Revision {revision.version}</h3>
              <p className="text-sm text-gray-600 mt-1">
                By {revision.createdByName} • {formatDate(revision.createdAt)}
              </p>
            </div>
            <Space>
              <Button icon={<GitCompare className="w-4 h-4" />} onClick={onCompare}>
                Compare
              </Button>
              <Button
                type="primary"
                danger
                icon={<Undo2 className="w-4 h-4" />}
                disabled={!canRevert}
                title={revertDisabledReason}
                onClick={() => setShowRevertModal(true)}
              >
                Revert
              </Button>
            </Space>
          </div>
        }
      >
        {/* Summary */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Change Summary</h4>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              {revision.changes?.summary || revision.description || 'No summary provided'}
            </p>
          </div>
        </div>

        {/* Status & Approval */}
        <div className="mb-6">
          <ApproveRejectActions revision={revision} onUpdate={refetch} />
        </div>

        <Divider />

        {/* Field Changes */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Field Changes</h4>
          {diffData.length === 0 ? (
            <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed">
              <p className="text-sm">No field-level changes detected in this revision.</p>
            </div>
          ) : (
            <Table
              columns={diffColumns}
              dataSource={diffData}
              pagination={false}
              size="small"
              scroll={{ x: 'max-content' }}
            />
          )}
        </div>

        {/* Comments */}
        <div className="mt-6">
          <CommentsSection revision={revision} canView={canView} />
        </div>
      </Card>

      {/* Revert Modal */}
      <RevertModal
        open={showRevertModal}
        revision={revision}
        loading={reverting}
        error={revertError}
        onConfirm={handleRevert}
        onCancel={() => setShowRevertModal(false)}
      />
    </>
  );
};

