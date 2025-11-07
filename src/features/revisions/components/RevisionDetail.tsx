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

  const formatFieldName = (fieldPath: string): string => {
    // Extract section and field name from path like "bom[id:xxx].supplierCode"
    const match = fieldPath.match(/^(\w+)(\[.*?\])?\.?(.+)?$/);
    if (!match) return fieldPath;
    
    const [, section, idPart, field] = match;
    let result = '';
    
    // Format section name
    const sectionNames: Record<string, string> = {
      bom: 'BOM',
      measurements: 'Measurement',
      colorways: 'Colorway',
      howToMeasure: 'How to Measure',
      articleInfo: 'Article Info'
    };
    result = sectionNames[section] || section;
    
    // Add item identifier if present
    if (idPart) {
      const idMatch = idPart.match(/\[([+-]?id:.*?)\]/);
      if (idMatch) {
        const idStr = idMatch[1];
        if (idStr.startsWith('+id:')) {
          result += ' (New Item)';
        } else if (idStr.startsWith('-id:')) {
          result += ' (Removed Item)';
        } else {
          result += ' Item';
        }
      }
    }
    
    // Add field name
    if (field) {
      const fieldNames: Record<string, string> = {
        supplierCode: 'Supplier Code',
        materialName: 'Material Name',
        part: 'Part',
        quantity: 'Quantity',
        uom: 'Unit of Measure',
        pomCode: 'POM Code',
        pomName: 'POM Name',
        name: 'Name',
        code: 'Code',
        placement: 'Placement',
        materialType: 'Material Type',
        hexColor: 'Hex Color',
        pantoneCode: 'Pantone Code',
        stepNumber: 'Step Number',
        description: 'Description'
      };
      result += ` > ${fieldNames[field] || field.replace(/([A-Z])/g, ' $1').trim()}`;
    }
    
    return result;
  };

  const formatValue = (val: any, isObject = false): React.ReactNode => {
    if (val === null || val === undefined || val === '') return <span className="text-gray-400">—</span>;
    
    if (typeof val === 'object' && !Array.isArray(val)) {
      // For objects, show as formatted key-value pairs
      const entries = Object.entries(val);
      if (entries.length === 0) return <span className="text-gray-400">(empty)</span>;
      
      return (
        <div className="space-y-1">
          {entries.map(([key, value]) => {
            const displayKey = key.replace(/([A-Z])/g, ' $1').trim();
            return (
              <div key={key} className="text-xs">
                <span className="font-medium text-gray-600">{displayKey}:</span>{' '}
                <span className="text-gray-800">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    
    if (Array.isArray(val)) {
      if (val.length === 0) return <span className="text-gray-400">(empty)</span>;
      return <span className="text-sm">{val.join(', ')}</span>;
    }
    
    return <span className="text-sm">{String(val)}</span>;
  };

  const diffColumns = [
    {
      title: 'Field',
      dataIndex: 'field',
      key: 'field',
      width: '35%',
      render: (text: string) => (
        <span className="font-medium text-gray-900">{formatFieldName(text)}</span>
      )
    },
    {
      title: 'Old Value',
      dataIndex: 'old',
      key: 'old',
      width: '32.5%',
      render: (val: any, record: any) => (
        <div className="bg-red-50 border border-red-200 px-3 py-2 rounded text-sm min-h-[40px]">
          {formatValue(val, record._isObject)}
        </div>
      )
    },
    {
      title: 'New Value',
      dataIndex: 'new',
      key: 'new',
      width: '32.5%',
      render: (val: any, record: any) => (
        <div className="bg-green-50 border border-green-200 px-3 py-2 rounded text-sm min-h-[40px]">
          {formatValue(val, record._isObject)}
        </div>
      )
    }
  ];

  // Process and group diff data by section
  const processDiffData = () => {
    if (!revision.changes?.diff) return [];
    
    const entries = Object.entries(revision.changes.diff);
    const grouped: Record<string, any[]> = {};
    
    entries.forEach(([field, change]: [string, any]) => {
      // Extract section from field path
      const sectionMatch = field.match(/^(\w+)(\[.*?\])?/);
      const section = sectionMatch ? sectionMatch[1] : 'other';
      
      if (!grouped[section]) {
        grouped[section] = [];
      }
      
      grouped[section].push({
        key: field,
        field,
        old: change.old,
        new: change.new,
        _isAdded: change._isAdded,
        _isRemoved: change._isRemoved,
        _isObject: typeof change.old === 'object' || typeof change.new === 'object'
      });
    });
    
    // Flatten with section headers
    const result: any[] = [];
    Object.entries(grouped).forEach(([section, items]) => {
      if (result.length > 0) {
        result.push({ key: `divider-${section}`, _isDivider: true });
      }
      result.push({ key: `header-${section}`, _isHeader: true, section });
      result.push(...items);
    });
    
    return result;
  };

  const diffData = processDiffData();

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
              {revision.changes?.details && Object.keys(revision.changes.details).length > 0 ? (
                <div>
                  <p className="text-sm mb-2">No detailed field-level diff available, but changes were detected:</p>
                  <div className="text-left max-w-md mx-auto">
                    {Object.entries(revision.changes.details).map(([section, details]: [string, any]) => {
                      const changes: string[] = [];
                      if (details.added) changes.push(`${details.added} added`);
                      if (details.modified) changes.push(`${details.modified} modified`);
                      if (details.removed) changes.push(`${details.removed} removed`);
                      if (changes.length > 0) {
                        return (
                          <div key={section} className="text-sm py-1">
                            <span className="font-medium capitalize">{section}:</span> {changes.join(', ')}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm">No field-level changes detected in this revision.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                // Group by section for better display
                const grouped: Record<string, any[]> = {};
                diffData.forEach((item: any) => {
                  if (item._isHeader || item._isDivider) return;
                  const sectionMatch = item.field.match(/^(\w+)(\[.*?\])?/);
                  const section = sectionMatch ? sectionMatch[1] : 'other';
                  if (!grouped[section]) grouped[section] = [];
                  grouped[section].push(item);
                });

                return Object.entries(grouped).map(([section, items]) => {
                  const sectionNames: Record<string, string> = {
                    bom: 'BOM Items',
                    measurements: 'Measurements',
                    colorways: 'Colorways',
                    howToMeasure: 'How to Measure',
                    articleInfo: 'Article Information'
                  };

                  return (
                    <div key={section} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                        <h5 className="font-semibold text-gray-900 text-sm uppercase">
                          {sectionNames[section] || section}
                        </h5>
                      </div>
                      <Table
                        columns={diffColumns}
                        dataSource={items}
                        pagination={false}
                        size="small"
                        scroll={{ x: 'max-content' }}
                        rowClassName="hover:bg-gray-50"
                      />
                    </div>
                  );
                });
              })()}
            </div>
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

