import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  MessageSquare, 
  AlertTriangle,
  Eye,
  Send,
  Filter,
  Search,
  Users,
  Shield,
  ArrowRight,
  Calendar
} from 'lucide-react';
import { TechPackVersion, Approval, ApprovalLevel, VersionStatus } from '../types';
import { useI18n } from '../lib/i18n';

interface ApprovalWorkflowProps {
  versions: TechPackVersion[];
  onUpdateVersions: (versions: TechPackVersion[]) => void;
}

export const ApprovalWorkflow: React.FC<ApprovalWorkflowProps> = ({
  versions,
  onUpdateVersions
}) => {
  const { t } = useI18n();
  const [selectedVersion, setSelectedVersion] = useState<TechPackVersion | null>(null);
  const [statusFilter, setStatusFilter] = useState<VersionStatus | 'all'>('all');
  const [approvalFilter, setApprovalFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<{ version: TechPackVersion; approval: Approval } | null>(null);

  const approvalLevels: ApprovalLevel[] = ['Designer', 'Technical', 'Production', 'Quality', 'Final'];
  const statuses: VersionStatus[] = ['Draft', 'Review', 'Approved', 'Active', 'Rejected', 'Archived'];

  const filteredVersions = versions.filter(version => {
    if (statusFilter !== 'all' && version.status !== statusFilter) return false;
    if (searchTerm && !version.version.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

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

  const getApprovalStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getApprovalStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <CheckCircle className="w-4 h-4" />;
      case 'Rejected': return <XCircle className="w-4 h-4" />;
      case 'Pending': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getApprovalLevelColor = (level: ApprovalLevel) => {
    switch (level) {
      case 'Designer': return 'bg-blue-100 text-blue-800';
      case 'Technical': return 'bg-green-100 text-green-800';
      case 'Production': return 'bg-purple-100 text-purple-800';
      case 'Quality': return 'bg-orange-100 text-orange-800';
      case 'Final': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getWorkflowProgress = (version: TechPackVersion) => {
    const totalApprovals = version.approvals.length;
    const completedApprovals = version.approvals.filter(a => a.status !== 'Pending').length;
    return { completed: completedApprovals, total: totalApprovals };
  };

  const canApprove = (version: TechPackVersion, approval: Approval) => {
    // In a real app, this would check user permissions
    return approval.status === 'Pending';
  };

  const handleApprove = (version: TechPackVersion, approval: Approval) => {
    setPendingApproval({ version, approval });
    setShowApprovalModal(true);
  };

  const submitApproval = (approved: boolean, comments?: string) => {
    if (!pendingApproval) return;

    const updatedVersions = versions.map(v => {
      if (v.id === pendingApproval.version.id) {
        const updatedApprovals = v.approvals.map(a => {
          if (a.id === pendingApproval.approval.id) {
            return {
              ...a,
              status: approved ? 'Approved' : 'Rejected',
              comments,
              timestamp: new Date()
            };
          }
          return a;
        });

        // Update version status based on approvals
        let newStatus: VersionStatus = v.status;
        const allApproved = updatedApprovals.every(a => a.status === 'Approved');
        const anyRejected = updatedApprovals.some(a => a.status === 'Rejected');

        if (anyRejected) {
          newStatus = 'Rejected';
        } else if (allApproved) {
          newStatus = 'Approved';
        } else {
          newStatus = 'Review';
        }

        return {
          ...v,
          approvals: updatedApprovals,
          status: newStatus,
          updatedAt: new Date()
        };
      }
      return v;
    });

    onUpdateVersions(updatedVersions);
    setShowApprovalModal(false);
    setPendingApproval(null);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{t('refit.approvals')}</h3>
          <p className="text-sm text-gray-600">Manage approval workflow for tech pack versions</p>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-teal-600" />
          <span className="text-sm text-gray-600">Multi-level approval system</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search versions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as VersionStatus | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            {statuses.map(status => (
              <option key={status} value={status}>{t(`refit.status.${status.toLowerCase()}`)}</option>
            ))}
          </select>
          <select
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="all">All Approval Levels</option>
            {approvalLevels.map(level => (
              <option key={level} value={level}>{t(`refit.approvalLevel.${level.toLowerCase()}`)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Versions List */}
      <div className="space-y-4">
        {filteredVersions.map((version) => {
          const progress = getWorkflowProgress(version);
          const isSelected = selectedVersion?.id === version.id;
          
          return (
            <div 
              key={version.id} 
              className={`border rounded-lg p-6 cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'border-teal-500 bg-teal-50' : 'border-gray-200'
              }`}
              onClick={() => setSelectedVersion(isSelected ? null : version)}
            >
              {/* Version Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Version {version.version}</h3>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className={`px-2 py-1 rounded text-sm font-medium border ${getStatusColor(version.status)}`}>
                        {t(`refit.status.${version.status.toLowerCase()}`)}
                      </span>
                      <span className="text-sm text-gray-600">
                        {progress.completed}/{progress.total} approvals
                      </span>
                      <span className="text-sm text-gray-600">
                        {version.changes.length} changes
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="text-teal-600 hover:text-teal-900 transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Approval Progress</span>
                  <span>{Math.round((progress.completed / progress.total) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Approvals List */}
              {isSelected && (
                <div className="mt-6 space-y-4">
                  <h4 className="text-sm font-medium text-gray-900">Approval Workflow</h4>
                  <div className="space-y-3">
                    {version.approvals.map((approval, index) => (
                      <div key={approval.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getApprovalStatusColor(approval.status)}`}>
                            {getApprovalStatusIcon(approval.status)}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">{approval.userName}</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getApprovalLevelColor(approval.level)}`}>
                              {t(`refit.approvalLevel.${approval.level.toLowerCase()}`)}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getApprovalStatusColor(approval.status)}`}>
                              {approval.status}
                            </span>
                          </div>
                          {approval.comments && (
                            <p className="text-sm text-gray-600 mt-1">{approval.comments}</p>
                          )}
                          <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(approval.timestamp)}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {canApprove(version, approval) && (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApprove(version, approval);
                                }}
                                className="flex items-center px-3 py-1 bg-teal-600 text-white rounded text-sm hover:bg-teal-700 transition-colors"
                              >
                                <Send className="w-3 h-3 mr-1" />
                                Review
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredVersions.length === 0 && (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No versions found</h3>
          <p className="text-gray-600">No versions match the current filters</p>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && pendingApproval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Review Approval - {t(`refit.approvalLevel.${pendingApproval.approval.level.toLowerCase()}`)}
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Version: {pendingApproval.version.version}
              </p>
              <p className="text-sm text-gray-600">
                Changes: {pendingApproval.version.changes.length} modifications
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments (Optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                rows={3}
                placeholder="Add comments about your decision..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => submitApproval(false)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                {t('refit.reject')}
              </button>
              <button
                onClick={() => submitApproval(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {t('refit.approve')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
