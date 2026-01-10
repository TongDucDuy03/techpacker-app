import React, { useState, useMemo } from 'react';
import { Card, Button, Space, Divider, Table } from 'antd';
import { Undo2, GitCompare } from 'lucide-react';
import { Revision, RevertResponse } from '../types';
import { RevertModal } from './RevertModal';
import { CommentsSection } from './CommentsSection';
import { useRevert } from '../hooks/useRevert';
import { useI18n } from '../../../lib/i18n';
import { useRevision } from '../hooks/useRevision';
import ZoomableImage from '../../../components/common/ZoomableImage';
import { getFieldMetadata, getFieldLabel, getSectionLabel, resolveFieldValue, FieldMetadataConfig } from '../../../utils/fieldMetadata';

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
  const { t } = useI18n();
  const activeRevision = detailedRevision || revision;
  const [showRevertModal, setShowRevertModal] = useState(false);
  
  // Get field metadata configuration (Single Source of Truth - shared with Form)
  const fieldMetadata = useMemo(() => getFieldMetadata(t), [t]);

  if (!activeRevision) {
    return (
      <Card>
        <div className="text-center py-12 text-gray-500">
          <p>{t('form.revision.selectPrompt')}</p>
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
    ? t('form.revision.cannotRevertNoSnapshot')
    : activeRevision.changeType === 'rollback'
    ? t('form.revision.cannotRevertRollback')
    : isCurrent
    ? t('form.revision.isCurrentRevision')
    : !canEdit
    ? t('form.revision.needEditorAccess')
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
    // Extract section and field name from path like "bom[id:xxx].supplierCode" or "articleInfo.fitType" or "fitType"
    const match = fieldPath.match(/^(\w+)(\[.*?\])?\.?(.+)?$/);
    if (!match) {
      // Fallback: try to get field label directly
      const label = getFieldLabel(fieldPath, fieldMetadata);
      if (label !== fieldPath) return label;
      console.warn(`[RevisionDetail] Unknown field: ${fieldPath}`);
      return t('form.revision.unknownField') || 'Unknown Field';
    }
    
    const [, sectionPart, idPart, fieldPart] = match;
    let section = sectionPart;
    let field = fieldPart;
    
    // Handle case where field path is just a field name (e.g., "fitType")
    if (!field && sectionPart && !idPart) {
      // Check if it's a known field in articleInfo
      if (fieldMetadata[sectionPart]) {
        field = sectionPart;
        section = 'articleInfo';
      } else {
        // Unknown field
        console.warn(`[RevisionDetail] Unknown field: ${sectionPart}`);
        return t('form.revision.unknownField') || 'Unknown Field';
      }
    }
    
    let result = '';
    
    // Format section name using metadata
    if (field && fieldMetadata[field]?.sectionLabel) {
      result = fieldMetadata[field].sectionLabel;
    } else {
      // Fallback to section names
      const sectionNames: Record<string, string> = {
        bom: t('form.revision.section.bom'),
        measurements: t('form.revision.section.measurements'),
        colorways: t('form.revision.section.colorways'),
        howToMeasure: t('form.revision.section.howToMeasure'),
        articleInfo: t('form.revision.section.articleInfo')
      };
      result = sectionNames[section] || section;
    }
    
    // Add item identifier if present
    if (idPart) {
      const idMatch = idPart.match(/\[([+-]?id:.*?)\]/);
      if (idMatch) {
        const idStr = idMatch[1];
        if (idStr.startsWith('+id:')) {
          result += ` (${t('form.revision.item.new')})`;
        } else if (idStr.startsWith('-id:')) {
          result += ` (${t('form.revision.item.removed')})`;
        } else {
          result += ` ${t('form.revision.item.item')}`;
        }
      }
    }
    
    // Add field name using metadata (Single Source of Truth)
    if (field) {
      const fieldLabel = getFieldLabel(field, fieldMetadata);
      result += ` > ${fieldLabel}`;
    }
    
    return result;
  };

  const formatValue = (val: any, isObject = false, fieldName?: string, section?: string): React.ReactNode => {
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
    
    // Helper: translate field values based on field name and section
    // Use metadata to resolve field value (Single Source of Truth)
    const translateFieldValue = (value: any, field: string | undefined, sect: string | undefined): string => {
      // If no field name, try to infer from section or return as-is for unknown fields
      if (!field) {
        // For unknown fields without field name, return '—' per fallback rule
        if (value === null || value === undefined || value === '') {
          return '—';
        }
        // Log warning for unknown fields
        console.warn(`[RevisionDetail] Unknown field (no fieldName), value: ${value}`);
        return '—';
      }
      
      // Use resolveFieldValue from metadata with t function for proper translation
      const resolved = resolveFieldValue(value, field, fieldMetadata, t);
      
      // If resolved is '—' and value is not null/undefined/empty, it means no mapping found
      // This is correct per fallback rule - we already logged warning in resolveFieldValue
      return resolved;
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
                  {typeof value === 'object' ? JSON.stringify(value) : translateFieldValue(value, key, section)}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    
    if (Array.isArray(val)) {
      if (val.length === 0) return <span className="text-gray-400">(empty)</span>;
      return <span className="text-sm">{val.map(v => translateFieldValue(v, fieldName, section)).join(', ')}</span>;
    }
    
    // Translate the value if it's a known field
    const translatedVal = translateFieldValue(val, fieldName, section);
    
    // String formatting: render image preview if looks like an image URL/path
    if (isLikelyImageUrl(translatedVal)) {
      const src = getImageUrl(translatedVal);
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
          <span className="text-xs text-gray-600 break-all">{translatedVal}</span>
        </div>
      );
    }

    return <span className="text-sm break-all">{translatedVal}</span>;
  };

  const diffColumns = [
    {
      title: t('form.revision.field'),
      dataIndex: 'field',
      key: 'field',
      width: '35%',
      render: (text: string) => (
        <span className="font-medium text-gray-900">{formatFieldName(text)}</span>
      )
    },
    {
      title: t('form.revision.oldValue'),
      dataIndex: 'old',
      key: 'old',
      width: '32.5%',
      render: (val: any, record: any) => {
        // Use fieldName and section from record (already parsed in processDiffData)
        // Fallback to parsing if not available
        let fieldName = record.fieldName;
        let section = record.section || 'articleInfo';
        
        if (!fieldName) {
          const fieldMatch = record.field?.match(/^(\w+)(\[.*?\])?\.?(.+)?$/);
          if (fieldMatch) {
            const [, sectionPart, , fieldPart] = fieldMatch;
            if (fieldPart) {
              section = sectionPart;
              fieldName = fieldPart;
            } else {
              // No field part, check if it's a known section or just a field
              if (['bom', 'measurements', 'colorways', 'howToMeasure', 'articleInfo'].includes(sectionPart)) {
                section = sectionPart;
              } else {
                section = 'articleInfo';
                fieldName = sectionPart;
              }
            }
          }
        }
        
        return (
          <div className="bg-red-50 border border-red-200 px-3 py-2 rounded text-sm min-h-[40px]">
            {formatValue(val, record._isObject, fieldName, section)}
          </div>
        );
      }
    },
    {
      title: t('form.revision.newValue'),
      dataIndex: 'new',
      key: 'new',
      width: '32.5%',
      render: (val: any, record: any) => {
        // Use fieldName and section from record (already parsed in processDiffData)
        // Fallback to parsing if not available
        let fieldName = record.fieldName;
        let section = record.section || 'articleInfo';
        
        if (!fieldName) {
          const fieldMatch = record.field?.match(/^(\w+)(\[.*?\])?\.?(.+)?$/);
          if (fieldMatch) {
            const [, sectionPart, , fieldPart] = fieldMatch;
            if (fieldPart) {
              section = sectionPart;
              fieldName = fieldPart;
            } else {
              // No field part, check if it's a known section or just a field
              if (['bom', 'measurements', 'colorways', 'howToMeasure', 'articleInfo'].includes(sectionPart)) {
                section = sectionPart;
              } else {
                section = 'articleInfo';
                fieldName = sectionPart;
              }
            }
          }
        }
        
        return (
          <div className="bg-green-50 border border-green-200 px-3 py-2 rounded text-sm min-h-[40px]">
            {formatValue(val, record._isObject, fieldName, section)}
          </div>
        );
      }
    }
  ];

  // Process and group diff data by section
  const processDiffData = () => {
    if (!activeRevision.changes?.diff) return [];
    
    const entries = Object.entries(activeRevision.changes.diff);
    const grouped: Record<string, any[]> = {};
    
    entries.forEach(([field, change]: [string, any]) => {
      // Extract section from field path
      // Handle both "articleInfo.fitType" and "fitType" formats
      const sectionMatch = field.match(/^(\w+)(\[.*?\])?\.?(.+)?$/);
      let section = 'other';
      let fieldName = field;
      
      if (sectionMatch) {
        const [, sectionPart, , fieldPart] = sectionMatch;
        // If there's a field part, it's a section.field format
        if (fieldPart) {
          section = sectionPart;
          fieldName = fieldPart;
        } else {
          // If no field part, check if it's a known section or just a field
          if (['bom', 'measurements', 'colorways', 'howToMeasure', 'articleInfo'].includes(sectionPart)) {
            section = sectionPart;
          } else {
            // It's a field without section prefix, assume articleInfo
            section = 'articleInfo';
            fieldName = sectionPart;
          }
        }
      }
      
      if (!grouped[section]) {
        grouped[section] = [];
      }
      
      grouped[section].push({
        key: field,
        field,
        fieldName, // Store extracted field name
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
        return t('form.revision.section.articleInfo');
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
        // Use metadata to resolve field value (Single Source of Truth)
        // Pass t function for proper translation (including boolean values)
        if (shortField && section === 'articleInfo') {
          return resolveFieldValue(val, shortField, fieldMetadata, t);
        }
        // For non-articleInfo fields, still try to resolve if field exists in metadata
        if (shortField) {
          const resolved = resolveFieldValue(val, shortField, fieldMetadata, t);
          // If resolved is not '—' or if it's a known field, use resolved value
          if (resolved !== '—' || fieldMetadata[shortField]) {
            return resolved;
          }
        }
        // Fallback: return '—' per fallback rule (don't show raw English text)
        console.warn(`[RevisionDetail] Unknown field in summary: ${shortField}, value: ${val}`);
        return '—';
      };
      if (shortField) {
        // Use field label from metadata (Single Source of Truth)
        const fieldLabel = shortField && section === 'articleInfo' 
          ? getFieldLabel(shortField, fieldMetadata)
          : shortField.replace(/([A-Z])/g, ' $1').trim();
        bucket.updated[itemKey].push(`${fieldLabel}: ${formatVal(from)} → ${formatVal(to)}`);
      }
    });

    // Build final strings
    Object.entries(perSection).forEach(([section, agg]) => {
      const parts: string[] = [];
      if (agg.added.length) {
        parts.push(`${t('form.revision.action.add')} ${agg.added.map(n => `"${n}"`).join(', ')}`);
      }
      if (agg.removed.length) {
        parts.push(`${t('form.revision.action.remove')} ${agg.removed.map(n => `"${n}"`).join(', ')}`);
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
          // Use section label from metadata - try to get from field path
          const anyKey = Object.keys(diffs).find(dk => {
            if (dk.startsWith(`${section}.`)) {
              const fieldMatch = dk.match(/\.([^.]+)$/);
              return fieldMatch && fieldMatch[1];
            }
            return false;
          });
          if (anyKey) {
            const fieldMatch = anyKey.match(/\.([^.]+)$/);
            if (fieldMatch) {
              label = getSectionLabel(fieldMatch[1], fieldMetadata);
            } else {
              label = t('form.revision.section.articleInfo');
            }
          } else {
            label = t('form.revision.section.articleInfo');
          }
        }
        const preview = changes.slice(0, 2).join('; ');
        updatedEntries.push(label ? `"${label}" (${preview})` : `(${preview})`);
      });
      if (updatedEntries.length) {
        parts.push(`${t('form.revision.action.update')} ${updatedEntries.join(', ')}`);
      }

      if (parts.length) {
        // Use section label from metadata for articleInfo
        let sectionLabel: string;
        if (section === 'articleInfo') {
          // Try to get section label from any field in this section
          const anyKey = Object.keys(diffs).find(dk => dk.startsWith(`${section}.`) || dk === section);
          if (anyKey) {
            const fieldMatch = anyKey.match(/\.([^.]+)$/);
            if (fieldMatch) {
              sectionLabel = getSectionLabel(fieldMatch[1], fieldMetadata);
            } else if (fieldMetadata[anyKey]) {
              sectionLabel = getSectionLabel(anyKey, fieldMetadata);
            } else {
              sectionLabel = t('form.revision.section.articleInfo');
            }
          } else {
            sectionLabel = t('form.revision.section.articleInfo');
          }
        } else {
          const sectionNames: Record<string, string> = {
            bom: t('form.revision.section.bom'),
            measurements: t('form.revision.section.measurements'),
            colorways: t('form.revision.section.colorways'),
            howToMeasure: t('form.revision.section.construction'),
            articleInfo: t('form.revision.section.articleInfo')
          };
          sectionLabel = sectionNames[section] || section;
        }
        summaries[section] = `${sectionLabel}: ${parts.join(', ')}`;
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
              <h3 className="text-lg font-semibold">{t('form.revision.revisionTitle', { version: activeRevision.version })}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {t('form.revision.byUser', { name: activeRevision.createdByName, date: formatDate(activeRevision.createdAt) })}
              </p>
            </div>
            <Space>
              <Button icon={<GitCompare className="w-4 h-4" />} onClick={onCompare}>
                {t('form.revision.compare')}
              </Button>
              <Button
                type="primary"
                danger
                icon={<Undo2 className="w-4 h-4" />}
                disabled={!canRevert}
                title={revertDisabledReason}
                onClick={() => setShowRevertModal(true)}
              >
                {t('form.revision.revert')}
              </Button>
            </Space>
          </div>
        }
      >
        {/* Summary */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('form.revision.changeSummary')}</h4>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              {(() => {
                const summary = activeRevision.changes?.summary || activeRevision.description || t('form.revision.noSummary');
                // Translate common patterns from backend
                if (typeof summary === 'string') {
                  // Pattern: "Article Info: X modified" or "Product Info: X modified"
                  const articleInfoMatch = summary.match(/^(?:Article Info|Product Info):\s*(\d+)\s*modified$/i);
                  if (articleInfoMatch) {
                    return t('form.revision.description.articleInfoModified', { count: articleInfoMatch[1] });
                  }
                  // Pattern: "Initial version created by cloning from {articleCode}"
                  const cloneMatch = summary.match(/^Initial version created by cloning from (.+)$/);
                  if (cloneMatch) {
                    return t('form.revision.description.clonedFrom', { articleCode: cloneMatch[1] });
                  }
                  // Pattern: "First version of the TechPack."
                  if (summary === 'First version of the TechPack.') {
                    return t('form.revision.description.firstVersion');
                  }
                  // Pattern: "Initial version created."
                  if (summary === 'Initial version created.') {
                    return t('form.revision.description.initialCreated');
                  }
                  // Pattern: "Minor updates."
                  if (summary === 'Minor updates.') {
                    return t('form.revision.description.minorUpdates');
                  }
                  // Pattern: "Reverted to revision {version}"
                  const revertMatch = summary.match(/^Reverted to revision (.+)$/i);
                  if (revertMatch) {
                    return t('form.revision.description.revertedTo', { version: revertMatch[1] });
                  }
                }
                return summary;
              })()}
            </p>
          </div>
        </div>

        <Divider />

        {/* Field Changes */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('form.revision.fieldChanges')}</h4>
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
                  <p className="text-sm mb-2">{t('form.revision.noDetailedDiff')}</p>
                  <div className="text-left max-w-md mx-auto">
                    {Object.entries(activeRevision.changes.details).map(([section, details]: [string, any]) => {
                      const changes: string[] = [];
                      if (details.added) changes.push(`${details.added} ${t('form.revision.added')}`);
                      if (details.modified) changes.push(`${details.modified} ${t('form.revision.modified')}`);
                      if (details.removed) changes.push(`${details.removed} ${t('form.revision.removed')}`);
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
                <p className="text-sm">{t('form.revision.noFieldChanges')}</p>
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
                  // Use metadata to get section label (Single Source of Truth)
                  let headerText: string;
                  
                  // For articleInfo section, if there's only one field, show field label instead of section name
                  if (section === 'articleInfo' && items.length === 1 && items[0].fieldName) {
                    const fieldName = items[0].fieldName;
                    // Use field label from metadata
                    headerText = getFieldLabel(fieldName, fieldMetadata);
                  } else {
                    // Use section label from metadata or fallback
                    if (items.length > 0 && items[0].fieldName) {
                      const firstField = items[0].fieldName;
                      const sectionLabel = getSectionLabel(firstField, fieldMetadata);
                      if (sectionLabel && sectionLabel !== 'Unknown Section') {
                        headerText = sectionLabel;
                      } else {
                        // Fallback to section names
                        const sectionNames: Record<string, string> = {
                          bom: t('form.revision.section.bomItems'),
                          measurements: t('form.revision.section.measurements'),
                          colorways: t('form.revision.section.colorways'),
                          howToMeasure: t('form.revision.section.howToMeasure'),
                          articleInfo: t('form.revision.section.articleInformation')
                        };
                        headerText = sectionNames[section] || section;
                      }
                    } else {
                      // Fallback to section names
                      const sectionNames: Record<string, string> = {
                        bom: t('form.revision.section.bomItems'),
                        measurements: t('form.revision.section.measurements'),
                        colorways: t('form.revision.section.colorways'),
                        howToMeasure: t('form.revision.section.howToMeasure'),
                        articleInfo: t('form.revision.section.articleInformation')
                      };
                      headerText = sectionNames[section] || section;
                    }
                  }

                  return (
                    <div key={section} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                        <h5 className="font-semibold text-gray-900 text-sm">
                          {headerText}
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

