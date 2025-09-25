import React, { useState } from 'react';
import { 
  GitBranch, 
  Clock, 
  User, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  Copy,
  Trash2,
  Download,
  ArrowRight,
  Calendar,
  Archive
} from 'lucide-react';
import { TechPackVersion, Change, Approval, VersionStatus, ChangeType } from '../types';
import { useI18n } from '../lib/i18n';

interface VersionHistoryProps {
  versions: TechPackVersion[];
  onVersionSelect?: (version: TechPackVersion) => void;
  onVersionAction?: (action: string, version: TechPackVersion) => void;
}

export const VersionHistory: React.FC<VersionHistoryProps> = ({
  versions,
  onVersionSelect,
  onVersionAction
}) => {
  const { t } = useI18n();
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [showChanges, setShowChanges] = useState<boolean>(true);
  const [showApprovals, setShowApprovals] = useState<boolean>(true);

  const getStatusColor = (status: VersionStatus) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Review': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'Active': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'Archived': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: VersionStatus) => {
    switch (status) {
      case 'Draft': return <Clock className="w-4 h-4" />;
      case 'Review': return <AlertCircle className="w-4 h-4" />;
      case 'Approved': return <CheckCircle className="w-4 h-4" />;
      case 'Active': return <CheckCircle className="w-4 h-4" />;
      case 'Rejected': return <XCircle className="w-4 h-4" />;
      case 'Archived': return <Archive className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

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

  const getApprovalStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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

  const handleVersionClick = (version: TechPackVersion) => {
    if (expandedVersion === version.id) {
      setExpandedVersion(null);
    } else {
      setExpandedVersion(version.id);
    }
    onVersionSelect?.(version);
  };

  const handleAction = (action: string, version: TechPackVersion, e: React.MouseEvent) => {
    e.stopPropagation();
    onVersionAction?.(action, version);
  };

  const exportVersion = (version: TechPackVersion) => {
    const data = {
      version: version.version,
      status: version.status,
      changes: version.changes,
      approvals: version.approvals,
      notes: version.notes,
      createdAt: version.createdAt,
      createdBy: version.createdBy
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `version_${version.version}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showChanges}
              onChange={(e) => setShowChanges(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Show Changes</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showApprovals}
              onChange={(e) => setShowApprovals(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Show Approvals</span>
          </label>
        </div>
        <div className="text-sm text-gray-500">
          {versions.length} version{versions.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Version Timeline */}
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
        
        <div className="space-y-6">
          {versions.map((version, index) => (
            <div key={version.id} className="relative">
              {/* Timeline Node */}
              <div className="absolute left-4 w-4 h-4 bg-white border-2 border-teal-500 rounded-full z-10"></div>
              
              {/* Version Card */}
              <div 
                className={`ml-12 bg-white border rounded-lg p-6 cursor-pointer transition-all hover:shadow-md ${
                  expandedVersion === version.id ? 'border-teal-500 shadow-md' : 'border-gray-200'
                }`}
                onClick={() => handleVersionClick(version)}
              >
                {/* Version Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <GitBranch className="w-5 h-5 text-gray-400" />
                      <span className="text-lg font-medium text-gray-900">v{version.version}</span>
                    </div>
                    <span className={`px-2 py-1 rounded text-sm font-medium border flex items-center space-x-1 ${getStatusColor(version.status)}`}>
                      {getStatusIcon(version.status)}
                      <span>{t(`refit.status.${version.status.toLowerCase()}`)}</span>
                    </span>
                    {version.isActive && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                        Active
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => handleAction('view', version, e)}
                      className="p-2 text-gray-400 hover:text-teal-600 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleAction('copy', version, e)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Copy Version"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => exportVersion(version)}
                      className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                      title="Export Version"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {!version.isActive && (
                      <button
                        onClick={(e) => handleAction('delete', version, e)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Version"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Version Info */}
                <div className="mt-3 flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <User className="w-4 h-4" />
                    <span>{version.createdBy}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(version.createdAt)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{getTimeAgo(version.createdAt)}</span>
                  </div>
                </div>

                {/* Version Notes */}
                {version.notes && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
                      <p className="text-sm text-gray-700">{version.notes}</p>
                    </div>
                  </div>
                )}

                {/* Expanded Content */}
                {expandedVersion === version.id && (
                  <div className="mt-4 space-y-4">
                    {/* Changes */}
                    {showChanges && version.changes.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">
                          Changes ({version.changes.length})
                        </h4>
                        <div className="space-y-2">
                          {version.changes.map((change) => (
                            <div key={change.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getChangeTypeColor(change.changeType)}`}>
                                {t(`refit.changeType.${change.changeType.toLowerCase()}`)}
                              </span>
                              <div className="flex-1">
                                <p className="text-sm text-gray-900">{change.description}</p>
                                <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                                  <span>{change.field}</span>
                                  <ArrowRight className="w-3 h-3" />
                                  <span className="font-mono">{JSON.stringify(change.oldValue)} → {JSON.stringify(change.newValue)}</span>
                                </div>
                                <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                                  <User className="w-3 h-3" />
                                  <span>{change.userName}</span>
                                  <Clock className="w-3 h-3" />
                                  <span>{formatDate(change.timestamp)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Approvals */}
                    {showApprovals && version.approvals.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">
                          Approvals ({version.approvals.length})
                        </h4>
                        <div className="space-y-2">
                          {version.approvals.map((approval) => (
                            <div key={approval.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getApprovalStatusColor(approval.status)}`}>
                                {approval.status}
                              </span>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium text-gray-900">{approval.userName}</span>
                                  <span className="text-xs text-gray-500">({t(`refit.approvalLevel.${approval.level.toLowerCase()}`)})</span>
                                </div>
                                {approval.comments && (
                                  <p className="text-xs text-gray-600 mt-1">{approval.comments}</p>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatDate(approval.timestamp)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {versions.length === 0 && (
        <div className="text-center py-12">
          <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No version history</h3>
          <p className="text-gray-600">Create your first version to start tracking changes</p>
        </div>
      )}
    </div>
  );
};
