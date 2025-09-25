import React, { useState, useMemo } from 'react';
import { 
  GitCompare, 
  ArrowRight, 
  Plus, 
  Minus, 
  Equal,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Filter,
  Search
} from 'lucide-react';
import { TechPackVersion, Change, ChangeType, VersionComparison } from '../types';
import { useI18n } from '../lib/i18n';

interface ComparisonViewProps {
  versions: TechPackVersion[];
  selectedVersions: string[];
  onComparisonComplete?: (comparison: VersionComparison) => void;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  versions,
  selectedVersions,
  onComparisonComplete
}) => {
  const { t } = useI18n();
  const [filterType, setFilterType] = useState<ChangeType | 'all'>('all');
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const version1 = versions.find(v => v.id === selectedVersions[0]);
  const version2 = versions.find(v => v.id === selectedVersions[1]);

  const comparison = useMemo(() => {
    if (!version1 || !version2) return null;

    const differences: Change[] = [];
    const allFields = new Set<string>();

    // Collect all fields from both versions
    version1.changes.forEach(change => allFields.add(change.field));
    version2.changes.forEach(change => allFields.add(change.field));

    // Compare each field
    allFields.forEach(field => {
      const change1 = version1.changes.find(c => c.field === field);
      const change2 = version2.changes.find(c => c.field === field);

      if (change1 && change2) {
        // Both versions have changes to this field
        if (JSON.stringify(change1.newValue) !== JSON.stringify(change2.newValue)) {
          differences.push({
            id: `diff_${field}`,
            field,
            oldValue: change1.newValue,
            newValue: change2.newValue,
            changeType: change1.changeType,
            description: `Changed from ${JSON.stringify(change1.newValue)} to ${JSON.stringify(change2.newValue)}`,
            timestamp: new Date(),
            userId: 'system',
            userName: 'System'
          });
        }
      } else if (change1 && !change2) {
        // Only version 1 has this field
        differences.push({
          id: `diff_${field}_removed`,
          field,
          oldValue: change1.newValue,
          newValue: null,
          changeType: change1.changeType,
          description: `Removed in version ${version2.version}`,
          timestamp: new Date(),
          userId: 'system',
          userName: 'System'
        });
      } else if (!change1 && change2) {
        // Only version 2 has this field
        differences.push({
          id: `diff_${field}_added`,
          field,
          oldValue: null,
          newValue: change2.newValue,
          changeType: change2.changeType,
          description: `Added in version ${version2.version}`,
          timestamp: new Date(),
          userId: 'system',
          userName: 'System'
        });
      }
    });

    return {
      id: `comp_${version1.id}_${version2.id}`,
      version1Id: version1.id,
      version2Id: version2.id,
      differences,
      summary: {
        totalChanges: differences.length,
        measurementChanges: differences.filter(d => d.changeType === 'Measurement').length,
        materialChanges: differences.filter(d => d.changeType === 'Material').length,
        constructionChanges: differences.filter(d => d.changeType === 'Construction').length,
        otherChanges: differences.filter(d => d.changeType === 'Other').length
      },
      createdAt: new Date(),
      createdBy: 'system'
    };
  }, [version1, version2]);

  const filteredDifferences = useMemo(() => {
    if (!comparison) return [];

    let filtered = comparison.differences;

    if (filterType !== 'all') {
      filtered = filtered.filter(diff => diff.changeType === filterType);
    }

    if (searchTerm) {
      filtered = filtered.filter(diff => 
        diff.field.toLowerCase().includes(searchTerm.toLowerCase()) ||
        diff.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [comparison, filterType, searchTerm]);

  const getChangeTypeColor = (changeType: ChangeType) => {
    switch (changeType) {
      case 'Measurement': return 'bg-blue-100 text-blue-800';
      case 'Material': return 'bg-green-100 text-green-800';
      case 'Construction': return 'bg-purple-100 text-purple-800';
      case 'Color': return 'bg-pink-100 text-pink-800';
      case 'Size': return 'bg-orange-100 text-orange-800';
      case 'Other': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getChangeIcon = (oldValue: any, newValue: any) => {
    if (oldValue === null) return <Plus className="w-4 h-4 text-green-600" />;
    if (newValue === null) return <Minus className="w-4 h-4 text-red-600" />;
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return <Equal className="w-4 h-4 text-gray-600" />;
    return <ArrowRight className="w-4 h-4 text-blue-600" />;
  };

  const exportComparison = () => {
    if (!comparison) return;

    const data = {
      comparison: {
        version1: version1?.version,
        version2: version2?.version,
        summary: comparison.summary,
        differences: comparison.differences
      }
    };

    const csvContent = [
      ['Field', 'Change Type', 'Old Value', 'New Value', 'Description'],
      ...comparison.differences.map(diff => [
        diff.field,
        diff.changeType,
        JSON.stringify(diff.oldValue),
        JSON.stringify(diff.newValue),
        diff.description
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison_${version1?.version}_vs_${version2?.version}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!version1 || !version2) {
    return (
      <div className="text-center py-12">
        <GitCompare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Select Versions to Compare</h3>
        <p className="text-gray-600">Choose two versions from the version history to compare</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {t('refit.comparison')}: v{version1.version} vs v{version2.version}
          </h3>
          <p className="text-sm text-gray-600">
            Comparing {version1.changes.length} changes vs {version2.changes.length} changes
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={exportComparison}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {comparison && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <GitCompare className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Total Changes</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{comparison.summary.totalChanges}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Measurements</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{comparison.summary.measurementChanges}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Materials</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{comparison.summary.materialChanges}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Construction</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{comparison.summary.constructionChanges}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Other</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{comparison.summary.otherChanges}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search changes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ChangeType | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="Measurement">Measurement</option>
            <option value="Material">Material</option>
            <option value="Construction">Construction</option>
            <option value="Color">Color</option>
            <option value="Size">Size</option>
            <option value="Other">Other</option>
          </select>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showOnlyDifferences}
              onChange={(e) => setShowOnlyDifferences(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Show only differences</span>
          </label>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Change
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  v{version1.version}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  v{version2.version}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDifferences.map((diff) => (
                <tr key={diff.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getChangeIcon(diff.oldValue, diff.newValue)}
                      <span className="text-sm font-medium text-gray-900">{diff.field}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getChangeTypeColor(diff.changeType)}`}>
                      {t(`refit.changeType.${diff.changeType.toLowerCase()}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {diff.oldValue === null ? (
                        <span className="text-gray-400 italic">Not present</span>
                      ) : (
                        <span className="font-mono bg-red-50 px-2 py-1 rounded">
                          {JSON.stringify(diff.oldValue)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {diff.newValue === null ? (
                        <span className="text-gray-400 italic">Removed</span>
                      ) : (
                        <span className="font-mono bg-green-50 px-2 py-1 rounded">
                          {JSON.stringify(diff.newValue)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600">{diff.description}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredDifferences.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No differences found</h3>
          <p className="text-gray-600">
            {filterType === 'all' 
              ? 'The selected versions are identical'
              : `No ${filterType.toLowerCase()} changes found between these versions`
            }
          </p>
        </div>
      )}

      {/* Version Details Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Version 1 Details */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <h4 className="text-lg font-medium text-gray-900">Version {version1.version}</h4>
            <span className={`px-2 py-1 rounded text-xs font-medium ${version1.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {t(`refit.status.${version1.status.toLowerCase()}`)}
            </span>
          </div>
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              <strong>Created:</strong> {version1.createdAt.toLocaleDateString()}
            </div>
            <div className="text-sm text-gray-600">
              <strong>By:</strong> {version1.createdBy}
            </div>
            <div className="text-sm text-gray-600">
              <strong>Changes:</strong> {version1.changes.length}
            </div>
            {version1.notes && (
              <div className="text-sm text-gray-600">
                <strong>Notes:</strong> {version1.notes}
              </div>
            )}
          </div>
        </div>

        {/* Version 2 Details */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <h4 className="text-lg font-medium text-gray-900">Version {version2.version}</h4>
            <span className={`px-2 py-1 rounded text-xs font-medium ${version2.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {t(`refit.status.${version2.status.toLowerCase()}`)}
            </span>
          </div>
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              <strong>Created:</strong> {version2.createdAt.toLocaleDateString()}
            </div>
            <div className="text-sm text-gray-600">
              <strong>By:</strong> {version2.createdBy}
            </div>
            <div className="text-sm text-gray-600">
              <strong>Changes:</strong> {version2.changes.length}
            </div>
            {version2.notes && (
              <div className="text-sm text-gray-600">
                <strong>Notes:</strong> {version2.notes}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
