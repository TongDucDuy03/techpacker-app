import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Eye,
  Download,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  X,
  CheckSquare,
  Square
} from 'lucide-react';
import { TechPack, CreateTechPackInput } from '../types/techpack';
import { api } from '../lib/api';

interface TechPackListProps {
  onViewTechPack?: (techPack: TechPack) => void;
  techPacks?: TechPack[];
  onCreateTechPack?: (techPackData: Omit<TechPack, 'id' | 'dateCreated' | 'lastModified'>) => void;
  onUpdateTechPack?: (id: string, techPackData: Omit<TechPack, 'id' | 'dateCreated' | 'lastModified'>) => void;
  onDeleteTechPack?: (id: string) => void;
}

export const TechPackList: React.FC<TechPackListProps> = ({
  onViewTechPack,
  techPacks: propTechPacks = [],
  onCreateTechPack,
  onUpdateTechPack,
  onDeleteTechPack
}) => {
  // State management
  const [techPacks, setTechPacks] = useState<TechPack[]>(propTechPacks);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [designerFilter, setDesignerFilter] = useState('');
  const [sortField, setSortField] = useState<keyof TechPack>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Bulk operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Modals and forms
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicatingTechPack, setDuplicatingTechPack] = useState<TechPack | null>(null);

  // Debounced search
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(null);

  // Load tech packs data
  const loadTechPacks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page: currentPage,
        limit: 20
      };

      if (searchTerm) params.q = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (designerFilter) params.designer = designerFilter;

      const response = await api.listTechPacks(params);
      setTechPacks(response.data);
      setTotalPages(response.totalPages);
      setTotalItems(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tech packs');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter, designerFilter]);

  // Effects
  useEffect(() => {
    loadTechPacks();
  }, [loadTechPacks]);

  // Debounced search
  useEffect(() => {
    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }

    const timeout = setTimeout(() => {
      setCurrentPage(1);
      loadTechPacks();
    }, 300);

    setSearchDebounce(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchTerm]);

  // Utility functions
  const getStatusColor = (status: TechPack['status']) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: TechPack['status']) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'pending_approval': return 'Pending Approval';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      'day'
    );
  };

  // Event handlers
  const handleSort = (field: keyof TechPack) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === techPacks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(techPacks.map(tp => tp._id)));
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async () => {
    try {
      await api.bulkOperations({
        ids: Array.from(selectedIds),
        action: 'delete'
      });
      setSelectedIds(new Set());
      loadTechPacks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk delete failed');
    }
  };

  const handleBulkStatusChange = async (status: TechPack['status']) => {
    try {
      await api.bulkOperations({
        ids: Array.from(selectedIds),
        action: 'setStatus',
        payload: { status }
      });
      setSelectedIds(new Set());
      loadTechPacks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk status change failed');
    }
  };

  const handleCreateTechPack = async (data: CreateTechPackInput) => {
    try {
      if (onCreateTechPack) {
        await onCreateTechPack(data);
        setShowCreateModal(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tech pack');
    }
  };

  const handleDuplicate = async (techPack: TechPack) => {
    setDuplicatingTechPack(techPack);
    setShowDuplicateModal(true);
  };

  const handleConfirmDuplicate = async (keepVersion: boolean) => {
    if (!duplicatingTechPack) return;

    try {
      await api.duplicateTechPack(duplicatingTechPack._id, keepVersion);
      setShowDuplicateModal(false);
      setDuplicatingTechPack(null);
      loadTechPacks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate tech pack');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tech pack?')) return;

    try {
      await api.deleteTechPack(id);
      loadTechPacks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tech pack');
    }
  };

  const handleExport = (techPack: TechPack) => {
    const exportData = `
TECH PACK EXPORT
================

Article Code: ${techPack.articleCode}
Name: ${techPack.name}
Version: ${techPack.version}
Status: ${getStatusLabel(techPack.status)}
Owner: ${techPack.ownerId.firstName} ${techPack.ownerId.lastName}
Created: ${new Date(techPack.createdAt).toLocaleDateString()}
Last Modified: ${new Date(techPack.updatedAt).toLocaleDateString()}

METADATA:
${techPack.metadata.description ? `Description: ${techPack.metadata.description}` : ''}
${techPack.metadata.category ? `Category: ${techPack.metadata.category}` : ''}
${techPack.metadata.season ? `Season: ${techPack.metadata.season}` : ''}

MATERIALS:
${techPack.materials.map(m => `- ${m.name} (${m.type}): ${m.supplier || 'N/A'}`).join('\n')}

MEASUREMENTS:
${techPack.measurements.map(m => `- ${m.pomCode} - ${m.pomName}: Tolerance ±${m.toleranceMinus}/${m.tolerancePlus}`).join('\n')}

COLORWAYS:
${techPack.colorways.map(c => `- ${c.name} (${c.code}): ${c.materialType} - ${c.placement}`).join('\n')}
    `.trim();

    const blob = new Blob([exportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${techPack.articleCode}_${techPack.name.replace(/\s+/g, '_')}_techpack.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tech Packs</h1>
          <p className="text-gray-600">Manage your technical specification documents</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Tech Pack
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <X className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="h-4 w-4 text-red-400" />
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tech packs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={designerFilter}
            onChange={(e) => setDesignerFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Designers</option>
            {/* Designer options would be populated from API */}
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
              setDesignerFilter('');
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
          >
            <X className="w-4 h-4 mr-2" />
            Clear Filters
          </button>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium text-blue-900">
                {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleBulkDelete}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
              >
                Delete Selected
              </button>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkStatusChange(e.target.value as TechPack['status']);
                    e.target.value = '';
                  }
                }}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="">Change Status</option>
                <option value="draft">Set to Draft</option>
                <option value="pending_approval">Set to Pending Approval</option>
                <option value="approved">Set to Approved</option>
                <option value="rejected">Set to Rejected</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center"
                  >
                    {selectedIds.size === techPacks.length && techPacks.length > 0 ? (
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Square className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('articleCode')}
                >
                  <div className="flex items-center">
                    Article Code
                    {sortField === 'articleCode' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Name
                    {sortField === 'name' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Version
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Designer/Owner
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('updatedAt')}
                >
                  <div className="flex items-center">
                    Last Modified
                    {sortField === 'updatedAt' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {techPacks.map((techPack) => (
                <tr key={techPack._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleSelectItem(techPack._id)}
                      className="flex items-center"
                    >
                      {selectedIds.has(techPack._id) ? (
                        <CheckSquare className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => onViewTechPack?.(techPack)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {techPack.articleCode}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{techPack.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{techPack.version}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(techPack.status)}`}>
                      {getStatusLabel(techPack.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {techPack.ownerId.firstName} {techPack.ownerId.lastName}
                    </div>
                    <div className="text-sm text-gray-500">@{techPack.ownerId.username}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(techPack.updatedAt)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(techPack.updatedAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onViewTechPack?.(techPack)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleExport(techPack)}
                        className="text-green-600 hover:text-green-800 p-1"
                        title="Download PDF"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(techPack)}
                        className="text-purple-600 hover:text-purple-800 p-1"
                        title="Duplicate"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(techPack._id)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {techPacks.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No tech packs found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new tech pack.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Tech Pack
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow-sm">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">{(currentPage - 1) * 20 + 1}</span>
                {' '}to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * 20, totalItems)}
                </span>
                {' '}of{' '}
                <span className="font-medium">{totalItems}</span>
                {' '}results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        pageNum === currentPage
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Create Tech Pack Modal */}
      {showCreateModal && (
        <CreateTechPackModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTechPack}
        />
      )}

      {/* Duplicate Confirmation Modal */}
      {showDuplicateModal && duplicatingTechPack && (
        <DuplicateModal
          techPack={duplicatingTechPack}
          onClose={() => {
            setShowDuplicateModal(false);
            setDuplicatingTechPack(null);
          }}
          onConfirm={handleConfirmDuplicate}
        />
      )}
    </div>
  );
};

// Create Tech Pack Modal Component
const CreateTechPackModal: React.FC<{
  onClose: () => void;
  onSubmit: (data: CreateTechPackInput) => void;
}> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState<CreateTechPackInput>({
    articleCode: '',
    name: '',
    ownerId: '507f1f77bcf86cd799439011', // Placeholder - would come from auth context
    metadata: {
      description: '',
      category: '',
      season: ''
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Create New Tech Pack</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Article Code</label>
              <input
                type="text"
                required
                value={formData.articleCode}
                onChange={(e) => setFormData({ ...formData, articleCode: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., TP-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Cotton T-Shirt"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.metadata?.description || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  metadata: { ...formData.metadata, description: e.target.value }
                })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Brief description of the tech pack"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <input
                  type="text"
                  value={formData.metadata?.category || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    metadata: { ...formData.metadata, category: e.target.value }
                  })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Shirts"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Season</label>
                <input
                  type="text"
                  value={formData.metadata?.season || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    metadata: { ...formData.metadata, season: e.target.value }
                  })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., SS24"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Create Tech Pack
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Duplicate Modal Component
const DuplicateModal: React.FC<{
  techPack: TechPack;
  onClose: () => void;
  onConfirm: (keepVersion: boolean) => void;
}> = ({ techPack, onClose, onConfirm }) => {
  const [keepVersion, setKeepVersion] = useState(false);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Duplicate Tech Pack</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600">
              You are about to duplicate "{techPack.name}" ({techPack.articleCode}).
            </p>
          </div>

          <div className="mb-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={keepVersion}
                onChange={(e) => setKeepVersion(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">
                Keep same version (otherwise auto-increment)
              </span>
            </label>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(keepVersion)}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Duplicate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};