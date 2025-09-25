import React, { useState, useMemo } from 'react';
import { 
  History, 
  Clock, 
  User, 
  GitBranch, 
  ArrowRight, 
  Plus, 
  Minus, 
  Equal,
  Filter,
  Search,
  Download,
  Calendar,
  Tag
} from 'lucide-react';
import { TechPackVersion, Change, ChangeType } from '../types';
import { useI18n } from '../lib/i18n';

interface ChangeLogProps {
  versions: TechPackVersion[];
}

export const ChangeLog: React.FC<ChangeLogProps> = ({ versions }) => {
  const { t } = useI18n();
  const [filterType, setFilterType] = useState<ChangeType | 'all'>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Flatten all changes from all versions
  const allChanges = useMemo(() => {
    const changes: (Change & { version: string; versionId: string })[] = [];
    
    versions.forEach(version => {
      version.changes.forEach(change => {
        changes.push({
          ...change,
          version: version.version,
          versionId: version.id
        });
      });
    });

    // Sort by timestamp (newest first)
    return changes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [versions]);

  const filteredChanges = useMemo(() => {
    let filtered = allChanges;

    if (filterType !== 'all') {
      filtered = filtered.filter(change => change.changeType === filterType);
    }

    if (filterUser !== 'all') {
      filtered = filtered.filter(change => change.userId === filterUser);
    }

    if (searchTerm) {
      filtered = filtered.filter(change => 
        change.field.toLowerCase().includes(searchTerm.toLowerCase()) ||
        change.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        change.userName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(change => change.timestamp >= filterDate);
    }

    return filtered;
  }, [allChanges, filterType, filterUser, searchTerm, dateRange]);

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
    if (oldValue === null || oldValue === undefined) return <Plus className="w-4 h-4 text-green-600" />;
    if (newValue === null || newValue === undefined) return <Minus className="w-4 h-4 text-red-600" />;
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return <Equal className="w-4 h-4 text-gray-600" />;
    return <ArrowRight className="w-4 h-4 text-blue-600" />;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const exportChangeLog = () => {
    const csvContent = [
      ['Timestamp', 'Version', 'User', 'Field', 'Change Type', 'Old Value', 'New Value', 'Description'],
      ...filteredChanges.map(change => [
        formatDate(change.timestamp),
        change.version,
        change.userName,
        change.field,
        change.changeType,
        JSON.stringify(change.oldValue),
        JSON.stringify(change.newValue),
        change.description
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `changelog_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const uniqueUsers = useMemo(() => {
    const users = Array.from(new Set(allChanges.map(change => change.userId)));
    return users.map(userId => {
      const change = allChanges.find(c => c.userId === userId);
      return { id: userId, name: change?.userName || 'Unknown' };
    });
  }, [allChanges]);

  const changeTypeStats = useMemo(() => {
    const stats: Record<ChangeType, number> = {
      'Measurement': 0,
      'Material': 0,
      'Construction': 0,
      'Color': 0,
      'Size': 0,
      'Other': 0
    };

    filteredChanges.forEach(change => {
      stats[change.changeType]++;
    });

    return stats;
  }, [filteredChanges]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{t('refit.changelog')}</h3>
          <p className="text-sm text-gray-600">Complete history of all changes across versions</p>
        </div>
        <div className="flex items-center space-x-2">
          <History className="w-5 h-5 text-teal-600" />
          <span className="text-sm text-gray-600">{filteredChanges.length} changes</span>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {Object.entries(changeTypeStats).map(([type, count]) => (
          <div key={type} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${getChangeTypeColor(type as ChangeType).split(' ')[0]}`}></div>
              <span className="text-sm font-medium text-gray-700">{type}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
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
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="all">All Users</option>
            {uniqueUsers.map(user => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
          <div className="flex items-center space-x-2">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            <button
              onClick={exportChangeLog}
              className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Changes Timeline */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Change
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Version
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Field
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Values
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredChanges.map((change) => (
                <tr key={`${change.versionId}-${change.id}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getChangeIcon(change.oldValue, change.newValue)}
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getChangeTypeColor(change.changeType)}`}>
                        {t(`refit.changeType.${change.changeType.toLowerCase()}`)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      <GitBranch className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">v{change.version}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{change.userName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{change.field}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2 text-sm">
                      {change.oldValue !== null && change.oldValue !== undefined ? (
                        <span className="font-mono bg-red-50 px-2 py-1 rounded text-red-800">
                          {JSON.stringify(change.oldValue)}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">—</span>
                      )}
                      <ArrowRight className="w-3 h-3 text-gray-400" />
                      {change.newValue !== null && change.newValue !== undefined ? (
                        <span className="font-mono bg-green-50 px-2 py-1 rounded text-green-800">
                          {JSON.stringify(change.newValue)}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      <div>
                        <div>{getTimeAgo(change.timestamp)}</div>
                        <div className="text-xs">{formatDate(change.timestamp)}</div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredChanges.length === 0 && (
        <div className="text-center py-12">
          <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No changes found</h3>
          <p className="text-gray-600">No changes match the current filters</p>
        </div>
      )}
    </div>
  );
};
