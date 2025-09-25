import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  Users, 
  CheckCircle, 
  XCircle, 
  GitMerge,
  MessageSquare,
  Clock,
  User,
  Save
} from 'lucide-react';
import { ConflictResolution } from '../types';
import { useI18n } from '../lib/i18n';

interface ConflictResolutionModalProps {
  conflicts: ConflictResolution[];
  onResolve: (resolution: ConflictResolution) => void;
  onCancel: () => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  conflicts,
  onResolve,
  onCancel
}) => {
  const { t } = useI18n();
  const [selectedConflict, setSelectedConflict] = useState<ConflictResolution | null>(
    conflicts.length > 0 ? conflicts[0] : null
  );
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionType, setResolutionType] = useState<'Manual' | 'Auto-Merge' | 'User Choice'>('Manual');

  const getConflictTypeColor = (type: string) => {
    switch (type) {
      case 'Simultaneous Edit': return 'bg-orange-100 text-orange-800';
      case 'Version Mismatch': return 'bg-red-100 text-red-800';
      case 'Approval Conflict': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConflictTypeIcon = (type: string) => {
    switch (type) {
      case 'Simultaneous Edit': return <Users className="w-4 h-4" />;
      case 'Version Mismatch': return <GitMerge className="w-4 h-4" />;
      case 'Approval Conflict': return <AlertTriangle className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getResolutionTypeColor = (type: string) => {
    switch (type) {
      case 'Manual': return 'bg-blue-100 text-blue-800';
      case 'Auto-Merge': return 'bg-green-100 text-green-800';
      case 'User Choice': return 'bg-purple-100 text-purple-800';
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

  const handleResolve = () => {
    if (!selectedConflict) return;

    const resolvedConflict: ConflictResolution = {
      ...selectedConflict,
      resolution: resolutionType,
      resolvedBy: 'current-user', // In real app, get from auth context
      resolvedAt: new Date(),
      notes: resolutionNotes
    };

    onResolve(resolvedConflict);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('refit.conflictResolution')}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex h-full">
          {/* Conflicts List */}
          <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-4">
                Active Conflicts ({conflicts.length})
              </h3>
              <div className="space-y-2">
                {conflicts.map((conflict) => (
                  <div
                    key={conflict.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedConflict?.id === conflict.id
                        ? 'bg-teal-50 border border-teal-200'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => setSelectedConflict(conflict)}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      {getConflictTypeIcon(conflict.conflictType)}
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getConflictTypeColor(conflict.conflictType)}`}>
                        {t(`refit.${conflict.conflictType.replace(' ', '').toLowerCase()}`)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {conflict.conflictingUsers.length} user{conflict.conflictingUsers.length > 1 ? 's' : ''} involved
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(conflict.resolvedAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Conflict Details */}
          <div className="flex-1 overflow-y-auto">
            {selectedConflict ? (
              <div className="p-6 space-y-6">
                {/* Conflict Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getConflictTypeIcon(selectedConflict.conflictType)}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {t(`refit.${selectedConflict.conflictType.replace(' ', '').toLowerCase()}`)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Conflict ID: {selectedConflict.id}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConflictTypeColor(selectedConflict.conflictType)}`}>
                    {selectedConflict.conflictType}
                  </span>
                </div>

                {/* Conflict Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Conflict Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">
                        <strong>Conflicting Users:</strong> {selectedConflict.conflictingUsers.join(', ')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">
                        <strong>Detected:</strong> {formatDate(selectedConflict.resolvedAt)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">
                        <strong>Resolved By:</strong> {selectedConflict.resolvedBy}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Resolution Options */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Resolution Method</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {(['Manual', 'Auto-Merge', 'User Choice'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setResolutionType(type)}
                        className={`p-4 rounded-lg border text-center transition-colors ${
                          resolutionType === type
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          {type === 'Manual' && <User className="w-5 h-5" />}
                          {type === 'Auto-Merge' && <GitMerge className="w-5 h-5" />}
                          {type === 'User Choice' && <CheckCircle className="w-5 h-5" />}
                        </div>
                        <span className={`text-sm font-medium ${getResolutionTypeColor(type)}`}>
                          {type}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resolution Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resolution Notes
                  </label>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    rows={4}
                    placeholder="Describe how the conflict was resolved..."
                  />
                </div>

                {/* Existing Notes */}
                {selectedConflict.notes && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Previous Notes</h4>
                    <p className="text-sm text-blue-800">{selectedConflict.notes}</p>
                  </div>
                )}

                {/* Resolution Summary */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-900 mb-2">Resolution Summary</h4>
                  <div className="text-sm text-green-800 space-y-1">
                    <p><strong>Method:</strong> {resolutionType}</p>
                    <p><strong>Resolved By:</strong> Current User</p>
                    <p><strong>Resolved At:</strong> {new Date().toLocaleString()}</p>
                    {resolutionNotes && (
                      <p><strong>Notes:</strong> {resolutionNotes}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No conflict selected</h3>
                  <p className="text-gray-600">Select a conflict from the list to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            disabled={!selectedConflict}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            Resolve Conflict
          </button>
        </div>
      </div>
    </div>
  );
};
