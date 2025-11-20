import React, { useState } from 'react';
import { Card, Button, Space, Divider, Table } from 'antd';
import { Undo2, GitCompare } from 'lucide-react';
import { Revision, RevertResponse } from '../types';
import { RevertModal } from './RevertModal';
import { CommentsSection } from './CommentsSection';
import { useRevert } from '../hooks/useRevert';
import { useRevision } from '../hooks/useRevision';
import ZoomableImage from '../../../components/common/ZoomableImage';

interface RevisionDetailProps {
  revision: Revision | null;
  techPackId: string | undefined;
  canEdit: boolean;
  canView: boolean;
  isCurrent?: boolean;
  onCompare: () => void;
  onRevertSuccess: (result: RevertResponse) => void;
}

export const RevisionDetail: React.FC<RevisionDetailProps> = ({
  revision,
  techPackId,
  canEdit,
  canView,
  isCurrent = false,
  onCompare,
  onRevertSuccess
}) => {
  const { revert, loading: reverting, error: revertError } = useRevert();
  const { revision: detailedRevision, refetch } = useRevision(revision?._id);
  const activeRevision = detailedRevision || revision;
  const [showRevertModal, setShowRevertModal] = useState(false);

  if (!activeRevision) {
    return (
      <Card>
        <div className="text-center py-12 text-gray-500">
          <p>Select a revision to view details</p>
        </div>
      </Card>
    );
  }

  const handleRevert = async (reason?: string) => {
    if (!techPackId || !activeRevision._id) return;

    const result = await revert(techPackId, activeRevision._id, reason);
    if (result) {
      setShowRevertModal(false);
      onRevertSuccess(result);
      refetch();
    }
  };

  const canRevert = canEdit && !!activeRevision.snapshot && activeRevision.changeType !== 'rollback' && !isCurrent;
  const revertDisabledReason = !activeRevision.snapshot
    ? 'Cannot revert — snapshot data missing for this revision'
    : activeRevision.changeType === 'rollback'
    ? 'Reverting to a rollback revision is not allowed'
    : isCurrent
    ? 'This is the current revision'
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
    
    // Helper: determine if a string looks like an image URL/path
    const isLikelyImageUrl = (s: string): boolean => {
      const lower = s.toLowerCase();
      return (
        lower.startsWith('http://') ||
        lower.startsWith('https://') ||
        lower.startsWith('/uploads/') ||
        /\.(png|jpg|jpeg|gif|svg|webp)$/.test(lower)
      );
    };
    // Helper: normalize URL to absolute if backend returns relative
    const getImageUrl = (url: string): string => {
      if (!url) return '';
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      const base = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4001/api/v1';
      if (url.startsWith('/')) return `${base}${url}`;
      return `${base}/${url}`;
    };

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
    
    // String formatting: render image preview if looks like an image URL/path
    const s = String(val);
    if (isLikelyImageUrl(s)) {
      const src = getImageUrl(s);
      return (
        <div className="flex items-center space-x-2">
          <ZoomableImage
            src={src}
            alt="Changed"
            containerClassName="w-12 h-12 rounded border border-gray-200 bg-white"
            className="w-12 h-12"
            fallback={
              <div className="flex items-center justify-center text-gray-400 text-xs w-full h-full">
                Không hiển thị
              </div>
            }
          />
          <span className="text-xs text-gray-600 break-all">{s}</span>
        </div>
      );
    }

    return <span className="text-sm break-all">{s}</span>;
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
    if (!activeRevision.changes?.diff) return [];
    
    const entries = Object.entries(activeRevision.changes.diff);
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

  // Build concise human-readable summary per section (Added/Removed/Updated)
  const buildSectionSummaries = (): Record<string, string> => {
    const diffs = activeRevision.changes?.diff || {};
    const summaries: Record<string, string> = {};

    // Helper to extract section and id info
    const parseKey = (k: string) => {
      const m = k.match(/^(\w+)\[(.+?)\](?:\.(.+))?$/); // section[...].fieldPath?
      if (!m) {
        const m2 = k.match(/^(\w+)\.(.+)$/);
        return { section: m2 ? m2[1] : k, id: null as any, fieldPath: m2 ? m2[2] : null };
      }
      return { section: m[1], id: m[2], fieldPath: m[3] || null };
    };
    const getItemLabel = (section: string, payload: any): string => {
      if (section === 'bom') {
        const part = payload?.part || '';
        const material = payload?.materialName || '';
        return [part, material].filter(Boolean).join(' — ') || 'Item';
      }
      if (section === 'measurements') {
        return payload?.pomCode || 'Measurement';
      }
      if (section === 'colorways') {
        const name = payload?.name || '';
        const code = payload?.code || '';
        return [name, code].filter(Boolean).join(' / ') || 'Colorway';
      }
      if (section === 'howToMeasure') {
        const code = payload?.pomCode || '';
        const step = payload?.stepNumber != null ? `Step ${payload.stepNumber}` : '';
        return [code, step].filter(Boolean).join(' — ') || 'Instruction';
      }
      if (section === 'articleInfo') {
        return 'Article Info';
      }
      return section;
    };

    // Aggregate per section
    const perSection: Record<
      string,
      { added: string[]; removed: string[]; updated: Record<string, string[]> }
    > = {};

    Object.entries(diffs).forEach(([k, v]: [string, any]) => {
      const { section, id, fieldPath } = parseKey(k);
      if (!perSection[section]) {
        perSection[section] = { added: [], removed: [], updated: {} };
      }
      const bucket = perSection[section];

      // Added/Removed entries have synthetic ids like [+id:xxx] / [-id:xxx]
      if (id && id.startsWith('+id:')) {
        const label = getItemLabel(section, v?.new || {});
        if (label) bucket.added.push(label);
        return;
      }
      if (id && id.startsWith('-id:')) {
        const label = getItemLabel(section, v?.old || {});
        if (label) bucket.removed.push(label);
        return;
      }

      // Updated fields: group by item (id:xxx) or for articleInfo by top-level field
      let itemKey = 'root';
      if (id && id.startsWith('id:')) {
        itemKey = id;
      } else if (section === 'articleInfo') {
        itemKey = 'articleInfo';
      }
      if (!bucket.updated[itemKey]) bucket.updated[itemKey] = [];
      // Build compact field change text for some common fields
      const shortField = (fieldPath || '').split('.').slice(-1)[0] || '';
      const from = v?.old;
      const to = v?.new;
      const formatVal = (val: any) => {
        if (val === null || val === undefined || val === '') return '—';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      };
      if (shortField) {
        bucket.updated[itemKey].push(`${shortField}: ${formatVal(from)} → ${formatVal(to)}`);
      }
    });

    // Build final strings
    Object.entries(perSection).forEach(([section, agg]) => {
      const parts: string[] = [];
      if (agg.added.length) {
        parts.push(`Thêm ${agg.added.map(n => `“${n}”`).join(', ')}`);
      }
      if (agg.removed.length) {
        parts.push(`Xóa ${agg.removed.map(n => `“${n}”`).join(', ')}`);
      }
      // For updated, show up to a few items with key field changes
      const updatedEntries: string[] = [];
      Object.entries(agg.updated).forEach(([itemKey, changes]) => {
        if (changes.length === 0) return;
        // Try to find a label for the item (look into any diff key for this item)
        let label = '';
        if (itemKey.startsWith('id:')) {
          const anyKey = Object.keys(diffs).find(dk => dk.startsWith(`${section}[${itemKey}]`));
          if (anyKey) {
            const payloadOld = (diffs as any)[anyKey]?.old;
            const payloadNew = (diffs as any)[anyKey]?.new;
            label = getItemLabel(section, payloadNew || payloadOld || {});
          }
        } else if (section === 'articleInfo') {
          label = 'Article Info';
        }
        const preview = changes.slice(0, 2).join('; ');
        updatedEntries.push(label ? `“${label}” (${preview})` : `(${preview})`);
      });
      if (updatedEntries.length) {
        parts.push(`Sửa ${updatedEntries.join(', ')}`);
      }

      if (parts.length) {
        const sectionNames: Record<string, string> = {
          bom: 'BOM',
          measurements: 'Measurements',
          colorways: 'Colorways',
          howToMeasure: 'Construction',
          articleInfo: 'Article Info'
        };
        summaries[section] = `${sectionNames[section] || section}: ${parts.join(', ')}`;
      }
    });

    return summaries;
  };

  const sectionSummaries = buildSectionSummaries();

  const diffData = processDiffData();

  return (
    <>
      <Card
        title={
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Revision {activeRevision.version}</h3>
              <p className="text-sm text-gray-600 mt-1">
                By {activeRevision.createdByName} • {formatDate(activeRevision.createdAt)}
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
              {activeRevision.changes?.summary || activeRevision.description || 'No summary provided'}
            </p>
          </div>
        </div>

        <Divider />

        {/* Field Changes */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Field Changes</h4>
          {/* High-level per-section summary */}
          {Object.keys(sectionSummaries).length > 0 && (
            <div className="mb-3">
              <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
                {Object.entries(sectionSummaries).map(([sec, text]) => (
                  <li key={sec}>{text}</li>
                ))}
              </ul>
            </div>
          )}
          {diffData.length === 0 ? (
            <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed">
              {activeRevision.changes?.details && Object.keys(activeRevision.changes.details).length > 0 ? (
                <div>
                  <p className="text-sm mb-2">No detailed field-level diff available, but changes were detected:</p>
                  <div className="text-left max-w-md mx-auto">
                    {Object.entries(activeRevision.changes.details).map(([section, details]: [string, any]) => {
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
          <CommentsSection revision={activeRevision} canView={canView} />
        </div>
      </Card>

      {/* Revert Modal */}
      <RevertModal
        open={showRevertModal}
        revision={activeRevision}
        loading={reverting}
        error={revertError}
        onConfirm={handleRevert}
        onCancel={() => setShowRevertModal(false)}
      />
    </>
  );
};

