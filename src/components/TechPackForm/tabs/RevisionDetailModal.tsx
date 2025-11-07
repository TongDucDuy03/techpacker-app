import React from 'react';

interface RevisionDetailModalProps {
  open: boolean;
  onClose: () => void;
  revision: any | null;
}

const RevisionDetailModal: React.FC<RevisionDetailModalProps> = ({ open, onClose, revision }) => {
  if (!open || !revision) return null;

  const changes = revision?.changes || {};
  const diffData = extractDiffData(revision);

  const sectionChanges: string[] = (changes.details as any)?.sectionChanges || [];

  // Group changes by section
  const groupedChanges = groupChangesBySection(diffData);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-5xl max-h-[85vh] overflow-auto rounded-xl shadow-2xl border border-gray-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <div className="text-2xl font-bold text-gray-900">Revision {revision.version}</div>
            <div className="text-sm text-gray-600 mt-1">
              By {revision.createdByName || revision.changedBy} • {new Date(revision.createdAt || revision.changedDate).toLocaleString()}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/50 transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-800">
              <span className="font-semibold">Summary:</span> {revision?.changes?.summary || revision?.changeSummary || '—'}
            </div>
          </div>

          {/* Changed Fields */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Changed Fields</h3>
            <div className="mb-2 text-xs text-gray-500">
              Debug: Found {Object.keys(diffData).length} changes
            </div>
            {Object.keys(diffData).length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <div className="text-lg mb-2">⚠️</div>
                <p>No field-level changes detected in this revision.</p>
                <div className="mt-4 text-xs text-left">
                  <p><strong>Debug Info:</strong></p>
                  <p>Revision ID: {revision._id || revision.id}</p>
                  <p>Has changes object: {revision.changes ? 'Yes' : 'No'}</p>
                  <p>Has diff: {revision.changes?.diff ? 'Yes' : 'No'}</p>
                  <p>Raw changes: {JSON.stringify(revision.changes, null, 2)}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedChanges).map(([section, fields]) => (
                  <div key={section} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h4 className="font-semibold text-gray-800 flex items-center">
                        {getSectionIcon(section)} {getSectionTitle(section)}
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {Object.keys(fields).length} changes
                        </span>
                      </h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 w-1/3">Field</th>
                            <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 w-1/3">Old Value</th>
                            <th className="text-left text-xs font-semibold text-gray-600 px-4 py-3 w-1/3">New Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(fields).map(([field, values]) => (
                            <tr key={field} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-sm font-medium text-gray-700 border-b border-gray-100">
                                {formatFieldName(field)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 border-b border-gray-100">
                                <div className="bg-gray-100 px-3 py-2 rounded-md">
                                  {formatValue(values.old)}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm border-b border-gray-100">
                                <div className="bg-yellow-100 px-3 py-2 rounded-md font-medium text-gray-900">
                                  🟨 {formatValue(values.new)}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function formatValue(val: any): string {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

// Helper function to extract diff data from various API response formats
const extractDiffData = (revision: any): Record<string, { old: any; new: any }> => {
  // Try different possible locations for diff data
  const possibleSources = [
    revision?.changes?.diff,
    revision?.diff,
    revision?.data?.changes?.diff,
    revision?.data?.diff,
    revision?.changeData?.diff
  ];

  for (const source of possibleSources) {
    if (source && typeof source === 'object' && Object.keys(source).length > 0) {
      return source;
    }
  }

  // If no diff object found, try to construct from changes array
  if (revision?.changes && Array.isArray(revision.changes)) {
    const diffData: Record<string, { old: any; new: any }> = {};
    revision.changes.forEach((change: any) => {
      if (change.field) {
        diffData[change.field] = {
          old: change.oldValue ?? change.old ?? change.before ?? '',
          new: change.newValue ?? change.new ?? change.after ?? ''
        };
      }
    });
    return diffData;
  }

  // Try to extract from changeDetails if available
  if (revision?.changeDetails && typeof revision.changeDetails === 'object') {
    const diffData: Record<string, { old: any; new: any }> = {};
    Object.entries(revision.changeDetails).forEach(([key, value]: [string, any]) => {
      if (value && typeof value === 'object' && ('old' in value || 'new' in value)) {
        diffData[key] = {
          old: value.old ?? '',
          new: value.new ?? ''
        };
      }
    });
    return diffData;
  }

  // Try to construct from direct field comparisons if available
  if (revision?.fieldChanges && typeof revision.fieldChanges === 'object') {
    return revision.fieldChanges;
  }

  // Last resort: try to find any object that looks like diff data
  const allKeys = Object.keys(revision || {});
  for (const key of allKeys) {
    const value = revision[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Check if this object has the structure of diff data
      const hasValidDiffStructure = Object.values(value).some((item: any) =>
        item && typeof item === 'object' && ('old' in item || 'new' in item)
      );
      if (hasValidDiffStructure) {
        return value;
      }
    }
  }

  return {};
};

// Helper functions for grouping and formatting
const groupChangesBySection = (diffData: Record<string, any>) => {
  const groups: Record<string, any> = {};
  for (const path in diffData) {
    let section = 'articleInfo'; // Default section
    if (path.startsWith('bom[')) section = 'bom';
    if (path.startsWith('measurements[')) section = 'measurements';
    if (path.startsWith('colorways[')) section = 'colorways';
    if (path.startsWith('howToMeasure[')) section = 'howToMeasure';

    if (!groups[section]) {
      groups[section] = {};
    }
    groups[section][path] = diffData[path];
  }
  return groups;
};

const getSectionTitle = (section: string) => {
  const titles: Record<string, string> = {
    articleInfo: 'Article Info',
    bom: 'Bill of Materials (BOM)',
    measurements: 'Measurements',
    colorways: 'Colorways',
    howToMeasure: 'How to Measure',
  };
  return titles[section] || 'General Changes';
};

const getSectionIcon = (section: string) => {
  const icons: Record<string, string> = {
    articleInfo: '🧵',
    bom: '📦',
    measurements: '📏',
    colorways: '🎨',
    howToMeasure: '📐',
  };
  return <span className="mr-2">{icons[section] || '⚙️'}</span>;
};

const formatFieldName = (field: string) => {
  // Example: bom[0].material -> BOM [0] > Material
  return field
    .replace(/\[(\d+)\]/g, ' [$1]')
    .replace(/\./g, ' > ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default RevisionDetailModal;


