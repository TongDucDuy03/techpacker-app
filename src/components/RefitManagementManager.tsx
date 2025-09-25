import React, { useState, useMemo } from 'react';
import { 
  GitBranch, 
  GitCompare, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  History,
  Shield,
  Users,
  Settings,
  Eye,
  Edit,
  Trash2,
  Copy,
  Save,
  Languages
} from 'lucide-react';
import { 
  TechPackVersion, 
  RefitRequest, 
  VersionComparison, 
  ConflictResolution,
  AuditTrail,
  VersionStatus,
  RefitReason,
  ChangeType,
  ApprovalLevel,
  TechPack
} from '../types';
import { useI18n } from '../lib/i18n';
import { VersionHistory } from './VersionHistory';
import { ComparisonView } from './ComparisonView';
import { ApprovalWorkflow } from './ApprovalWorkflow';
import { RefitRequestForm } from './RefitRequestForm';
import { ChangeLog } from './ChangeLog';
import { ConflictResolutionModal } from './ConflictResolutionModal';

interface RefitManagementManagerProps {
  techPack?: TechPack;
  onTechPackUpdate?: (techPack: TechPack) => void;
}

// Mock data
const mockVersions: TechPackVersion[] = [
  {
    id: '1',
    techPackId: 'tp1',
    version: '1.0.0',
    status: 'Active',
    changes: [
      {
        id: 'c1',
        field: 'measurements.chest',
        oldValue: 42,
        newValue: 44,
        changeType: 'Measurement',
        description: 'Increased chest measurement by 2 inches',
        timestamp: new Date('2024-01-15'),
        userId: 'user1',
        userName: 'John Designer'
      }
    ],
    approvals: [
      {
        id: 'a1',
        level: 'Designer',
        userId: 'user1',
        userName: 'John Designer',
        status: 'Approved',
        timestamp: new Date('2024-01-15'),
        required: true
      }
    ],
    notes: 'Initial version with basic measurements',
    createdBy: 'user1',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    isActive: true
  },
  {
    id: '2',
    techPackId: 'tp1',
    version: '1.1.0',
    status: 'Review',
    changes: [
      {
        id: 'c2',
        field: 'materials.fabric',
        oldValue: 'Cotton',
        newValue: 'Cotton Blend',
        changeType: 'Material',
        description: 'Changed fabric from pure cotton to cotton blend',
        timestamp: new Date('2024-01-20'),
        userId: 'user2',
        userName: 'Jane Technical'
      }
    ],
    approvals: [
      {
        id: 'a2',
        level: 'Technical',
        userId: 'user2',
        userName: 'Jane Technical',
        status: 'Pending',
        timestamp: new Date('2024-01-20'),
        required: true
      }
    ],
    notes: 'Material update for better durability',
    createdBy: 'user2',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
    parentVersionId: '1',
    isActive: false
  }
];

const mockRefitRequests: RefitRequest[] = [
  {
    id: 'rr1',
    techPackId: 'tp1',
    versionId: '1',
    reason: 'Fit Issue',
    description: 'Customer reported tight fit around shoulders',
    priority: 'High',
    requestedBy: 'user3',
    requestedAt: new Date('2024-01-18'),
    status: 'In Progress',
    beforeMeasurements: { shoulder: 18, chest: 42 },
    afterMeasurements: { shoulder: 18.5, chest: 44 },
    impactAnalysis: 'Minor impact on production, requires pattern adjustment',
    implementationNotes: 'Pattern needs 0.5 inch increase in shoulder width',
    completedAt: new Date('2024-01-22'),
    completedBy: 'user2'
  }
];

const mockConflicts: ConflictResolution[] = [
  {
    id: 'cr1',
    techPackId: 'tp1',
    conflictType: 'Simultaneous Edit',
    conflictingUsers: ['user1', 'user2'],
    resolution: 'Manual',
    resolvedBy: 'user3',
    resolvedAt: new Date('2024-01-19'),
    notes: 'Resolved by merging both changes with designer approval'
  }
];

export const RefitManagementManager: React.FC<RefitManagementManagerProps> = ({ 
  techPack,
  onTechPackUpdate 
}) => {
  const { t, language, changeLanguage } = useI18n();
  const [activeTab, setActiveTab] = useState<'versions' | 'comparison' | 'requests' | 'approvals' | 'changelog' | 'audit'>('versions');
  const [versions, setVersions] = useState<TechPackVersion[]>(mockVersions);
  const [refitRequests, setRefitRequests] = useState<RefitRequest[]>(mockRefitRequests);
  const [conflicts, setConflicts] = useState<ConflictResolution[]>(mockConflicts);
  const [showVersionForm, setShowVersionForm] = useState(false);
  const [showRefitForm, setShowRefitForm] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<VersionStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const statuses: VersionStatus[] = ['Draft', 'Review', 'Approved', 'Active', 'Rejected', 'Archived'];
  const priorities = ['Low', 'Medium', 'High', 'Critical'];
  const reasons: RefitReason[] = ['Fit Issue', 'Measurement Error', 'Material Change', 'Construction Update', 'Customer Request', 'Quality Issue', 'Other'];

  const filteredVersions = useMemo(() => {
    let filtered = versions;
    
    if (searchTerm) {
      filtered = filtered.filter(version => 
        version.version.toLowerCase().includes(searchTerm.toLowerCase()) ||
        version.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
        version.createdBy.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(version => version.status === statusFilter);
    }

    return filtered;
  }, [versions, searchTerm, statusFilter]);

  const filteredRefitRequests = useMemo(() => {
    let filtered = refitRequests;
    
    if (searchTerm) {
      filtered = filtered.filter(request => 
        request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.reason.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(request => request.priority === priorityFilter);
    }

    return filtered;
  }, [refitRequests, searchTerm, priorityFilter]);

  const handleCreateVersion = () => {
    setShowVersionForm(true);
  };

  const handleCreateRefitRequest = () => {
    setShowRefitForm(true);
  };

  const handleCompareVersions = () => {
    if (selectedVersions.length === 2) {
      setActiveTab('comparison');
    }
  };

  const handleResolveConflict = () => {
    setShowConflictModal(true);
  };

  const handleVersionSelect = (versionId: string) => {
    setSelectedVersions(prev => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId);
      } else if (prev.length < 2) {
        return [...prev, versionId];
      } else {
        return [prev[1], versionId];
      }
    });
  };

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Low': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const tabs = [
    { id: 'versions', label: t('refit.versions'), icon: GitBranch },
    { id: 'comparison', label: t('refit.comparison'), icon: GitCompare },
    { id: 'requests', label: t('refit.requests'), icon: FileText },
    { id: 'approvals', label: t('refit.approvals'), icon: CheckCircle },
    { id: 'changelog', label: t('refit.changelog'), icon: History },
    { id: 'audit', label: t('refit.audit'), icon: Shield }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('refit.title')}</h2>
          <p className="text-gray-600">{t('refit.subtitle')}</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Language Switcher */}
          <div className="flex items-center space-x-2">
            <Languages className="w-4 h-4 text-gray-500" />
            <button
              onClick={() => changeLanguage(language === 'en' ? 'vi' : 'en')}
              className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              {language === 'en' ? 'VI' : 'EN'}
            </button>
          </div>
          
          <button
            onClick={handleResolveConflict}
            className="flex items-center px-4 py-2 border border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            {t('refit.resolve')}
          </button>
          <button
            onClick={handleCreateRefitRequest}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('refit.createRequest')}
          </button>
          <button
            onClick={handleCreateVersion}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('refit.createVersion')}
          </button>
        </div>
      </div>

      {/* Version Selection for Comparison */}
      {selectedVersions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <GitCompare className="w-5 h-5 text-blue-600" />
              <span className="text-blue-800 font-medium">
                {selectedVersions.length} version{selectedVersions.length > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {selectedVersions.length === 2 && (
                <button
                  onClick={handleCompareVersions}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t('refit.compareVersions')}
                </button>
              )}
              <button
                onClick={() => setSelectedVersions([])}
                className="text-blue-600 hover:text-blue-700"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center ${
                    isActive
                      ? 'border-teal-500 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'versions' && (
            <>
              {/* Search and Filters */}
              <div className="mb-6">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder={`${t('refit.versions')}...`}
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
                </div>
              </div>

              {/* Versions List */}
              <div className="space-y-4">
                {filteredVersions.map((version) => (
                  <div 
                    key={version.id} 
                    className={`border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer ${
                      selectedVersions.includes(version.id) ? 'border-teal-500 bg-teal-50' : 'border-gray-200'
                    }`}
                    onClick={() => handleVersionSelect(version.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">Version {version.version}</h3>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className={`px-2 py-1 rounded text-sm font-medium border ${getStatusColor(version.status)}`}>
                              {t(`refit.status.${version.status.toLowerCase()}`)}
                            </span>
                            <span className="text-sm text-gray-600">
                              {version.changes.length} change{version.changes.length !== 1 ? 's' : ''}
                            </span>
                            <span className="text-sm text-gray-600">
                              {version.approvals.filter(a => a.status === 'Approved').length}/{version.approvals.length} approved
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="text-teal-600 hover:text-teal-900 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-blue-600 hover:text-blue-900 transition-colors">
                          <Copy className="w-4 h-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-900 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Changes Preview */}
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Changes:</h4>
                      <div className="space-y-2">
                        {version.changes.slice(0, 3).map((change) => (
                          <div key={change.id} className="flex items-center space-x-2 text-sm">
                            <span className={`px-2 py-1 rounded text-xs ${getChangeTypeColor(change.changeType)}`}>
                              {t(`refit.changeType.${change.changeType.toLowerCase()}`)}
                            </span>
                            <span className="text-gray-600">{change.description}</span>
                            <span className="text-gray-400">• {change.userName}</span>
                          </div>
                        ))}
                        {version.changes.length > 3 && (
                          <div className="text-sm text-gray-500">
                            +{version.changes.length - 3} more changes
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredVersions.length === 0 && (
                <div className="text-center py-12">
                  <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No versions found</h3>
                  <p className="text-gray-600 mb-6">Create your first version to get started</p>
                  <button
                    onClick={handleCreateVersion}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    {t('refit.createVersion')}
                  </button>
                </div>
              )}
            </>
          )}

          {activeTab === 'comparison' && (
            <ComparisonView 
              versions={versions}
              selectedVersions={selectedVersions}
            />
          )}

          {activeTab === 'requests' && (
            <>
              {/* Refit Requests */}
              <div className="mb-6">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder={`${t('refit.requests')}...`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="all">All Priorities</option>
                    {priorities.map(priority => (
                      <option key={priority} value={priority}>{t(`refit.priority.${priority.toLowerCase()}`)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                {filteredRefitRequests.map((request) => (
                  <div key={request.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{t(`refit.reason.${request.reason.replace(' ', '')}`)}</h3>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className={`px-2 py-1 rounded text-sm font-medium ${getPriorityColor(request.priority)}`}>
                              {t(`refit.priority.${request.priority.toLowerCase()}`)}
                            </span>
                            <span className="text-sm text-gray-600">
                              {request.status}
                            </span>
                            <span className="text-sm text-gray-600">
                              {request.requestedAt.toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="text-teal-600 hover:text-teal-900 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-blue-600 hover:text-blue-900 transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <p className="text-gray-600">{request.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'approvals' && (
            <ApprovalWorkflow 
              versions={versions}
              onUpdateVersions={setVersions}
            />
          )}

          {activeTab === 'changelog' && (
            <ChangeLog 
              versions={versions}
            />
          )}

          {activeTab === 'audit' && (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Audit Trail</h3>
              <p className="text-gray-600">Complete audit trail and activity logging coming soon</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showVersionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Version</h3>
            <p className="text-gray-600 mb-4">Version creation form will be implemented here</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowVersionForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowVersionForm(false)}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                Create Version
              </button>
            </div>
          </div>
        </div>
      )}

      {showRefitForm && (
        <RefitRequestForm
          techPack={techPack}
          onSave={(request) => {
            setRefitRequests(prev => [...prev, request]);
            setShowRefitForm(false);
          }}
          onCancel={() => setShowRefitForm(false)}
        />
      )}

      {showConflictModal && (
        <ConflictResolutionModal
          conflicts={conflicts}
          onResolve={(resolution) => {
            setConflicts(prev => prev.filter(c => c.id !== resolution.id));
            setShowConflictModal(false);
          }}
          onCancel={() => setShowConflictModal(false)}
        />
      )}
    </div>
  );
};
