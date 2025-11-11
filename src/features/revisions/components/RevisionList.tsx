import React, { useState } from 'react';
import { Card, List, Badge, Space, Select, Input, Empty, Spin } from 'antd';
import { Clock, User, FileText, Undo2, Search } from 'lucide-react';
import { Revision, ChangeType } from '../types';
import { useRevisions } from '../hooks/useRevisions';

const { Search: SearchInput } = Input;

interface RevisionListProps {
  techPackId: string | undefined;
  selectedRevisionId: string | null;
  onSelectRevision: (revision: Revision) => void;
  canEdit: boolean;
}

export const RevisionList: React.FC<RevisionListProps> = ({
  techPackId,
  selectedRevisionId,
  onSelectRevision,
  canEdit
}) => {
  const [filters, setFilters] = useState<{ changeType?: ChangeType; createdBy?: string }>({});
  const [searchTerm, setSearchTerm] = useState('');

  const { revisions, loading, error, pagination } = useRevisions(techPackId, {
    ...filters,
    page: 1,
    limit: 50
  });

  const filteredRevisions = revisions.filter((rev) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      rev.version.toLowerCase().includes(search) ||
      rev.createdByName?.toLowerCase().includes(search) ||
      rev.description?.toLowerCase().includes(search) ||
      rev.changes?.summary?.toLowerCase().includes(search)
    );
  });

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (error) {
    return (
      <Card>
        <div className="text-center py-8 text-red-600">
          <p>Failed to load revisions</p>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Revision History</h3>
            <p className="text-xs text-gray-500 mt-1">
              {pagination.total || 0} revision{(pagination.total || 0) !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      }
  className="h-full"
  styles={{ body: { padding: 0 } }}
    >
      {/* Filters */}
      <div className="p-4 border-b space-y-2">
        <SearchInput
          placeholder="Search revisions..."
          prefix={<Search className="w-4 h-4" />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
        />
        <Space className="w-full" wrap>
          <Select
            placeholder="Filter by type"
            allowClear
            style={{ width: 150 }}
            value={filters.changeType}
            onChange={(value) => setFilters({ ...filters, changeType: value })}
          >
            <Select.Option value="auto">Auto</Select.Option>
            <Select.Option value="manual">Manual</Select.Option>
            <Select.Option value="approval">Approval</Select.Option>
            <Select.Option value="rollback">Rollback</Select.Option>
          </Select>
        </Space>
      </div>

      {/* List */}
      <div className="max-h-[60vh] overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center">
            <Spin size="large" />
            <p className="text-sm text-gray-500 mt-2">Loading...</p>
          </div>
        ) : filteredRevisions.length === 0 ? (
          <div className="p-6 text-center">
            <Empty
              description="No revisions found"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        ) : (
          <List
            dataSource={filteredRevisions}
            renderItem={(revision, index) => (
              <List.Item
                className={`cursor-pointer transition-all ${
                  selectedRevisionId === revision._id
                    ? 'bg-blue-50 border-l-4 border-blue-500'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => onSelectRevision(revision)}
              >
                <div className="w-full">
                  <div className="flex items-start justify-between mb-2">
                    <Space>
                      <Badge
                        count={revision.version}
                        style={{ backgroundColor: '#1890ff' }}
                      />
                      {index === 0 && (
                        <Badge
                          count="Current"
                          style={{ backgroundColor: '#52c41a' }}
                        />
                      )}
                      {revision.changeType === 'rollback' && (
                        <Badge
                          count="Rollback"
                          style={{ backgroundColor: '#fa8c16' }}
                          icon={<Undo2 className="w-3 h-3" />}
                        />
                      )}
                    </Space>
                  </div>

                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                    {revision.description || revision.changes?.summary || 'No description'}
                  </p>

                  <div className="flex items-center text-xs text-gray-500 gap-4">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {revision.createdByName || 'Unknown'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(revision.createdAt)}
                    </span>
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
      </div>
    </Card>
  );
};


