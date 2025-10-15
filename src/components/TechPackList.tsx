import React from 'react';
import { ApiTechPack } from '../types/techpack';
import { Eye, Edit, Trash2, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface TechPackListProps {
  techPacks: ApiTechPack[];
  onViewTechPack?: (techPack: ApiTechPack) => void;
  onEditTechPack?: (techPack: ApiTechPack) => void;
  onCreateTechPack?: () => void;
  onUpdateTechPack?: (id: string, data: Partial<ApiTechPack>) => void;
  onDeleteTechPack?: (id: string) => void;
}

export const TechPackList: React.FC<TechPackListProps> = ({
  techPacks,
  onViewTechPack,
  onEditTechPack,
  onCreateTechPack,
  onUpdateTechPack,
  onDeleteTechPack,
}) => {
  const { user } = useAuth();

  // Permission checks based on user role
  const canCreate = user?.role === 'admin' || user?.role === 'designer';
  const canEdit = user?.role === 'admin' || user?.role === 'designer';
  const canDelete = user?.role === 'admin' || user?.role === 'designer';
  const isReadOnly = user?.role === 'merchandiser' || user?.role === 'viewer';
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'In Review': return 'bg-yellow-100 text-yellow-800';
      case 'Draft': return 'bg-blue-100 text-blue-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Archived': return 'bg-gray-200 text-gray-700';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tech Packs</h2>
          <p className="text-gray-600">Manage your fashion tech packs</p>
        </div>
        {canCreate && (
          <button
            onClick={onCreateTechPack}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create New
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{techPacks.length}</div>
          <div className="text-sm text-gray-600">Total Tech Packs</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">
            {techPacks.filter(tp => tp.status === 'Draft').length}
          </div>
          <div className="text-sm text-gray-600">Draft</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-yellow-600">
            {techPacks.filter(tp => tp.status === 'In Review').length}
          </div>
          <div className="text-sm text-gray-600">In Review</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-green-600">
            {techPacks.filter(tp => tp.status === 'Approved').length}
          </div>
          <div className="text-sm text-gray-600">Approved</div>
        </div>
      </div>

      {/* Tech Packs Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">All Tech Packs</h3>
        </div>
        
        {techPacks.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-500 mb-4">No tech packs found</div>
            {canCreate && (
              <button
                onClick={onCreateTechPack}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Your First Tech Pack
              </button>
            )}
            {isReadOnly && (
              <div className="text-sm text-gray-500 mt-2">
                You have read-only access to tech packs
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Article Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
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
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {(techPack as any).productName || techPack.name || 'Unnamed'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {(techPack as any).category || techPack.metadata?.category || 'No category'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{techPack.articleCode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(techPack.status)}`}>
                        {techPack.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(techPack.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onViewTechPack?.(techPack)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Tech Pack"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => onEditTechPack?.(techPack)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Edit Tech Pack"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => onDeleteTechPack?.(techPack._id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Tech Pack"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {isReadOnly && (
                          <span className="text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded">
                            Read Only
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
