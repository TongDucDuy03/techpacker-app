import React, { useState } from 'react';
import { Card, List, Badge, Space, Select, Input, Empty, Spin } from 'antd';
import { Clock, User, FileText, Undo2, Search } from 'lucide-react';
import { Revision, ChangeType } from '../types';
import { useRevisions } from '../hooks/useRevisions';
import { useI18n } from '../../../lib/i18n';

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
  const { t } = useI18n();
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

  // Translate common revision description patterns from backend
  const translateDescription = (description: string | undefined): string => {
    if (!description) return t('form.revision.noDescription');
    
    // Pattern: "Initial version created by cloning from {articleCode}"
    const cloneMatch = description.match(/^Initial version created by cloning from (.+)$/);
    if (cloneMatch) {
      return t('form.revision.description.clonedFrom', { articleCode: cloneMatch[1] });
    }
    
    // Pattern: "First version of the TechPack."
    if (description === 'First version of the TechPack.') {
      return t('form.revision.description.firstVersion');
    }
    
    // Pattern: "Initial version created."
    if (description === 'Initial version created.') {
      return t('form.revision.description.initialCreated');
    }
    
    // Pattern: "Minor updates."
    if (description === 'Minor updates.') {
      return t('form.revision.description.minorUpdates');
    }
    
    // Pattern: "Article Info: X modified" or "Product Info: X modified" or similar
    const articleInfoMatch = description.match(/^(?:Article Info|Product Info):\s*(\d+)\s*modified$/i);
    if (articleInfoMatch) {
      return t('form.revision.description.articleInfoModified', { count: articleInfoMatch[1] });
    }
    
    // Pattern: "Reverted to revision {version}"
    const revertMatch = description.match(/^Reverted to revision (.+)$/i);
    if (revertMatch) {
      return t('form.revision.description.revertedTo', { version: revertMatch[1] });
    }
    
    // Return original if no pattern matches
    return description;
  };

  if (error) {
    return (
      <Card>
        <div className="text-center py-8 text-red-600">
          <p>{t('form.revision.loadError')}</p>
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
            <h3 className="text-sm font-semibold text-gray-900">{t('form.tab.revisionHistory')}</h3>
            <p className="text-xs text-gray-500 mt-1">
              {t('form.revision.count', { count: pagination.total || 0 })}
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
          placeholder={t('form.revision.searchPlaceholder')}
          prefix={<Search className="w-4 h-4" />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
        />
        <Space className="w-full" wrap>
          <Select
            placeholder={t('form.revision.filterByType')}
            allowClear
            style={{ width: 150 }}
            value={filters.changeType}
            onChange={(value) => setFilters({ ...filters, changeType: value })}
          >
            <Select.Option value="auto">{t('form.revision.type.auto')}</Select.Option>
            <Select.Option value="manual">{t('form.revision.type.manual')}</Select.Option>
            <Select.Option value="approval">{t('form.revision.type.approval')}</Select.Option>
            <Select.Option value="rollback">{t('form.revision.type.rollback')}</Select.Option>
          </Select>
        </Space>
      </div>

      {/* List */}
      <div className="max-h-[60vh] overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center">
            <Spin size="large" />
            <p className="text-sm text-gray-500 mt-2">{t('common.loading')}</p>
          </div>
        ) : filteredRevisions.length === 0 ? (
          <div className="p-6 text-center">
            <Empty
              description={t('form.revision.emptyList')}
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
                          count={t('form.revision.current')}
                          style={{ backgroundColor: '#52c41a' }}
                        />
                      )}
                      {revision.changeType === 'rollback' && (
                        <Badge
                          count={t('form.revision.type.rollback')}
                          style={{ backgroundColor: '#fa8c16' }}
                          icon={<Undo2 className="w-3 h-3" />}
                        />
                      )}
                    </Space>
                  </div>

                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                    {translateDescription(revision.description || revision.changes?.summary)}
                  </p>

                  <div className="flex items-center text-xs text-gray-500 gap-4">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {revision.createdByName || t('form.revision.unknownUser')}
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


