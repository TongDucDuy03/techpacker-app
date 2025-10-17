import React, { useState, useEffect, useMemo, useImperativeHandle, forwardRef } from 'react';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { api } from '../../../lib/api';
import { TechPack, Revision } from '../../../types/techpack';
import { useTechPack } from '../../../contexts/TechPackContext';
import Input from '../shared/Input';
import Select from '../shared/Select';
import Textarea from '../shared/Textarea';
import { Save, RotateCcw, ArrowRight, ArrowLeft, Plus, Edit3, Clock, User, FileText, AlertCircle } from 'lucide-react';
import RevisionDetailModal from './RevisionDetailModal';

interface RevisionTabProps {
  techPack?: TechPack;
  mode?: 'create' | 'edit' | 'view';
  onUpdate?: (updates: Partial<TechPack>) => void;
  setCurrentTab?: (tab: number) => void;
}

export interface RevisionTabRef {
  validateAndSave: () => boolean;
}

const RevisionTab = forwardRef<RevisionTabRef, RevisionTabProps>((props, ref) => {
  const { techPack, mode = 'create', onUpdate, setCurrentTab } = props;
  const { revisions, revisionsLoading, loadRevisions } = useTechPack();
  const [selectedRevision, setSelectedRevision] = useState<string>('');
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRevision, setViewRevision] = useState<any | null>(null);

  // Load revisions when component mounts or techPack ID changes
  useEffect(() => {
    if (techPack?.id && mode !== 'create') {
      console.log('Loading revisions for TechPack ID:', techPack.id);
      loadRevisions(techPack.id);
    }
  }, [techPack?.id, mode, loadRevisions]);

  // Set selected revision when revisions change
  useEffect(() => {
    if (revisions && revisions.length > 0) {
      setSelectedRevision(revisions[0]._id || revisions[0].id || '');
    }
  }, [revisions]);

  const openView = async (rev: any) => {
    try {
      const full = await api.getRevision(rev._id || rev.id);
      const root = (full as any)?.data ?? full; // AxiosResponse or plain
      const payload = root?.data ?? root;       // unwrap { success, data }
      setViewRevision(payload);
      setViewOpen(true);
    } catch (e) {
      console.error('Failed to fetch revision details:', e);
      setViewRevision(rev);
      setViewOpen(true);
    }
  };





  const handleSave = () => {
    onUpdate?.({
      ...techPack,
      revisions
    });
  };

  const handleNextTab = () => {
    handleSave();
    setCurrentTab?.(6); // Assuming this is tab 5, next would be 6
  };

  const handlePrevTab = () => {
    handleSave();
    setCurrentTab?.(4); // Previous tab
  };

  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    if (revisions.length === 0) return 0;
    
    const approvedRevisions = revisions.filter(rev => rev.status === 'Approved').length;
    const totalRevisions = revisions.length;
    
    return Math.round((approvedRevisions / totalRevisions) * 100);
  }, [revisions]);

  const selectedRevisionData = useMemo(() =>
    revisions.find(rev => (rev._id || rev.id) === selectedRevision)
  , [revisions, selectedRevision]);

  // Main render logic
  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Revision History</h1>
        <p className="text-sm text-gray-600 mt-1">Track changes and manage version history of the Tech Pack.</p>
      </div>

      {/* Conditional Rendering: Show placeholder only if there are no revisions at all */}
      {revisionsLoading ? (
        <div className="text-center py-12 text-gray-500">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading revisions...</p>
        </div>
      ) : revisions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Revisions Yet</h3>
          <p className="text-gray-600">Changes will be tracked here once the Tech Pack is saved.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Revision List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">History ({revisions.length})</h3>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                <div className="space-y-1 p-2">
                  {revisions.map((revision) => (
                    <div
                      key={revision._id || revision.id}
                      onClick={() => setSelectedRevision(revision._id || revision.id || '')}
                      className={`w-full text-left p-3 rounded-md transition-colors cursor-pointer border-l-4 ${selectedRevision === (revision._id || revision.id)
                          ? 'bg-blue-50 border-blue-500'
                          : 'border-transparent hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm text-gray-800">{revision.version}</span>
                        <button
                          type="button"
                          className="text-xs px-2 py-1 rounded border bg-white border-gray-300 hover:bg-gray-100"
                          onClick={(e) => { e.stopPropagation(); openView(revision); }}
                          title="View Details"
                        >
                          👁️ View Details
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {revision.description || revision.changes?.summary || 'No description'}
                      </p>
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <User className="w-3 h-3 mr-1.5" />
                        <span>{revision.createdByName || 'N/A'}</span>
                        <Clock className="w-3 h-3 ml-3 mr-1.5" />
                        <span>{new Date(revision.createdAt || revision.createdDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Revision Details */}
          <div className="lg:col-span-2">
            {selectedRevisionData && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 sticky top-24">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedRevisionData.version}
                  </h3>
                  <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      <span>{selectedRevisionData.createdByName || 'N/A'}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>{new Date(selectedRevisionData.createdAt || selectedRevisionData.createdDate).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="p-6 max-h-[50vh] overflow-y-auto">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-800 mb-2">Summary</h4>
                      <p className="text-gray-600 bg-gray-50 rounded-md p-3 text-sm">
                        {selectedRevisionData.changes?.summary || selectedRevisionData.description || 'No summary available.'}
                      </p>
                    </div>
                    {selectedRevisionData.description && (
                      <div>
                        <h4 className="font-medium text-gray-800 mb-2">Notes</h4>
                        <p className="text-gray-600 text-sm">{selectedRevisionData.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <RevisionDetailModal open={viewOpen} onClose={() => setViewOpen(false)} revision={viewRevision} />
    </div>
  );
});

export default RevisionTab;
