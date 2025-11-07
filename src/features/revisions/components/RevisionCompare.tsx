import React, { useState } from 'react';
import { Modal, Select, Button, Table, Space, Card, Spin, Alert } from 'antd';
import { GitCompare, X } from 'lucide-react';
import { useCompare } from '../hooks/useCompare';
import { Revision } from '../types';

interface RevisionCompareProps {
  open: boolean;
  revisions: Revision[];
  techPackId: string | undefined;
  onClose: () => void;
}

export const RevisionCompare: React.FC<RevisionCompareProps> = ({
  open,
  revisions,
  techPackId,
  onClose
}) => {
  const [fromId, setFromId] = useState<string>('');
  const [toId, setToId] = useState<string>('');
  const { comparison, loading, error, compare, clearComparison } = useCompare();

  const handleCompare = () => {
    if (!techPackId || !fromId || !toId) return;
    if (fromId === toId) {
      return;
    }
    compare(techPackId, fromId, toId);
  };

  const handleClose = () => {
    clearComparison();
    setFromId('');
    setToId('');
    onClose();
  };

  const formatValue = (val: any): React.ReactNode => {
    if (val === null || val === undefined || val === '') return '—';
    if (typeof val === 'object') {
      try {
        return <pre className="text-xs max-h-32 overflow-auto">{JSON.stringify(val, null, 2)}</pre>;
      } catch {
        return String(val);
      }
    }
    return <span className="break-words">{String(val)}</span>;
  };

  const diffColumns = [
    {
      title: 'Field',
      dataIndex: 'field',
      key: 'field',
      width: 200,
      render: (text: string) => (
        <span className="font-medium text-sm">{text.replace(/\./g, ' > ')}</span>
      )
    },
    {
      title: 'Old Value',
      dataIndex: 'old',
      key: 'old',
      render: (val: any) => (
        <div className="bg-red-50 border border-red-200 px-3 py-2 rounded text-sm">
          {formatValue(val)}
        </div>
      )
    },
    {
      title: 'New Value',
      dataIndex: 'new',
      key: 'new',
      render: (val: any) => (
        <div className="bg-green-50 border border-green-200 px-3 py-2 rounded text-sm font-medium">
          {formatValue(val)}
        </div>
      )
    }
  ];

  const diffData = comparison?.comparison?.diffData
    ? Object.entries(comparison.comparison.diffData).map(([field, change]: [string, any]) => ({
        key: field,
        field,
        old: change.old,
        new: change.new
      }))
    : [];

  return (
    <Modal
      open={open}
      title={
        <div className="flex items-center gap-2">
          <GitCompare className="w-5 h-5" />
          <span>Compare Revisions</span>
        </div>
      }
      onCancel={handleClose}
      footer={null}
      width={1000}
      style={{ top: 20 }}
    >
      <div className="space-y-4">
        {/* Selection */}
        <Card>
          <Space className="w-full" direction="vertical" size="middle">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">From Revision</label>
                <Select
                  className="w-full"
                  placeholder="Select revision"
                  value={fromId}
                  onChange={setFromId}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={revisions.map((rev) => ({
                    value: rev._id,
                    label: `${rev.version} - ${rev.createdByName} (${new Date(rev.createdAt).toLocaleDateString()})`
                  }))}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">To Revision</label>
                <Select
                  className="w-full"
                  placeholder="Select revision"
                  value={toId}
                  onChange={setToId}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={revisions.map((rev) => ({
                    value: rev._id,
                    label: `${rev.version} - ${rev.createdByName} (${new Date(rev.createdAt).toLocaleDateString()})`
                  }))}
                />
              </div>
              <Button
                type="primary"
                icon={<GitCompare className="w-4 h-4" />}
                onClick={handleCompare}
                disabled={!fromId || !toId || fromId === toId || loading}
                loading={loading}
              >
                Compare
              </Button>
            </div>
          </Space>
        </Card>

        {/* Error */}
        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            closable
          />
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <Spin size="large" />
            <p className="text-gray-500 mt-2">Comparing revisions...</p>
          </div>
        )}

        {/* Comparison Results */}
        {comparison && !loading && (
          <Card>
            <div className="mb-4">
              <h4 className="font-semibold mb-2">Comparison Summary</h4>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">{comparison.comparison.summary}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">From Revision</p>
                  <p className="font-medium">{comparison.fromRevision.version}</p>
                  <p className="text-xs text-gray-500">
                    {comparison.fromRevision.createdByName} • {new Date(comparison.fromRevision.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">To Revision</p>
                  <p className="font-medium">{comparison.toRevision.version}</p>
                  <p className="text-xs text-gray-500">
                    {comparison.toRevision.createdByName} • {new Date(comparison.toRevision.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {diffData.length === 0 ? (
              <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed">
                <p className="text-sm">No differences found between these revisions.</p>
              </div>
            ) : (
              <>
                <Table
                  columns={diffColumns}
                  dataSource={diffData}
                  pagination={false}
                  size="small"
                  scroll={{ x: 'max-content', y: 400 }}
                />
                {comparison.comparison.hasMore && (
                  <div className="mt-4 text-center">
                    <Alert
                      message="Showing first 100 fields"
                      description="There are more differences. Use the API to fetch additional fields."
                      type="info"
                      showIcon
                    />
                  </div>
                )}
              </>
            )}
          </Card>
        )}
      </div>
    </Modal>
  );
};


