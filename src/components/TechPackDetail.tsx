import React, { memo, useCallback, useMemo } from 'react';
import { ApiTechPack } from '../types/techpack';
import { ArrowLeft, Edit, Trash2, Download } from 'lucide-react';

interface TechPackDetailProps {
  techPack: ApiTechPack;
  onBack: () => void;
  onUpdate: (id: string, data: Partial<ApiTechPack>) => void;
  onDelete: (id: string) => void;
}

const TechPackDetailComponent: React.FC<TechPackDetailProps> = ({
  techPack,
  onBack,
  onUpdate,
  onDelete,
}) => {
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  const statusColor = useMemo(() => getStatusColor(techPack.status), [techPack.status, getStatusColor]);
  const formattedCreatedAt = useMemo(() => formatDate(techPack.createdAt), [techPack.createdAt, formatDate]);
  const formattedUpdatedAt = useMemo(() => formatDate(techPack.updatedAt), [techPack.updatedAt, formatDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to List
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{techPack.name}</h1>
            <p className="text-gray-600">Tech Pack Details</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdate(techPack._id, {})}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => {/* TODO: Implement PDF export */}}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
          <button
            onClick={() => onDelete(techPack._id)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Tech Pack Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Product Name</label>
                <p className="mt-1 text-sm text-gray-900">{techPack.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Article Code</label>
                <p className="mt-1 text-sm text-gray-900">{techPack.articleCode}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Version</label>
                <p className="mt-1 text-sm text-gray-900">{(techPack as any).sampleType || techPack.version || ''}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                  {techPack.status}
                </span>
              </div>
            </div>
          </div>

          {/* Metadata */}
          {techPack.metadata && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {techPack.metadata.description && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <p className="mt-1 text-sm text-gray-900">{techPack.metadata.description}</p>
                  </div>
                )}
                {techPack.metadata.category && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <p className="mt-1 text-sm text-gray-900">{techPack.metadata.category}</p>
                  </div>
                )}
                {techPack.metadata.season && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Season</label>
                    <p className="mt-1 text-sm text-gray-900">{techPack.metadata.season}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Timeline</h3>
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-900">Created</div>
                <div className="text-sm text-gray-600">{formattedCreatedAt}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Last Updated</div>
                <div className="text-sm text-gray-600">{formattedUpdatedAt}</div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Materials</span>
                <span className="text-sm font-medium text-gray-900">
                  {techPack.materials?.length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Measurements</span>
                <span className="text-sm font-medium text-gray-900">
                  {techPack.measurements?.length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Colorways</span>
                <span className="text-sm font-medium text-gray-900">
                  {techPack.colorways?.length || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TechPackDetail = memo(TechPackDetailComponent);
