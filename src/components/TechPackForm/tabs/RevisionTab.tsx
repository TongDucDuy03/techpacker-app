import React, { useState, useEffect, useMemo, useImperativeHandle, forwardRef } from 'react';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { api } from '../../../lib/api';
import { TechPack, Revision } from '../../../types/techpack';
import Input from '../shared/Input';
import Select from '../shared/Select';
import Textarea from '../shared/Textarea';
import { Save, RotateCcw, ArrowRight, ArrowLeft, Plus, Edit3, Clock, User, FileText, AlertCircle } from 'lucide-react';

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
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [selectedRevision, setSelectedRevision] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRevision, setNewRevision] = useState<Partial<Revision>>({
    version: '',
    description: '',
    changes: '',
    status: 'Draft',
    createdBy: '',
    createdDate: new Date().toISOString(),
  });

  // Initialize revisions from techPack
  useEffect(() => {
    if (techPack?.revisions) {
      setRevisions(techPack.revisions);
      if (techPack.revisions.length > 0) {
        setSelectedRevision(techPack.revisions[0].id || '');
      }
    }
  }, [techPack]);

  // Revision status options
  const statusOptions = [
    { value: 'Draft', label: 'Draft' },
    { value: 'In Review', label: 'In Review' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Rejected', label: 'Rejected' },
    { value: 'Archived', label: 'Archived' }
  ];

  const handleAddRevision = () => {
    if (!newRevision.version || !newRevision.description) {
      alert('Please fill in version and description fields');
      return;
    }

    const revision: Revision = {
      id: Date.now().toString(),
      version: newRevision.version!,
      description: newRevision.description!,
      changes: newRevision.changes || '',
      status: newRevision.status as 'Draft' | 'In Review' | 'Approved' | 'Rejected' | 'Archived',
      createdBy: newRevision.createdBy || 'Current User',
      createdDate: new Date().toISOString(),
      approvedBy: newRevision.approvedBy,
      approvedDate: newRevision.approvedDate,
    };

    const updatedRevisions = [revision, ...revisions];
    setRevisions(updatedRevisions);
    setSelectedRevision(revision.id);
    
    onUpdate?.({
      ...techPack,
      revisions: updatedRevisions
    });

    // Reset form
    setNewRevision({
      version: '',
      description: '',
      changes: '',
      status: 'Draft',
      createdBy: '',
      createdDate: new Date().toISOString(),
    });
    setShowAddForm(false);
  };

  const handleUpdateRevision = (revisionId: string, updates: Partial<Revision>) => {
    const updatedRevisions = revisions.map(rev => 
      rev.id === revisionId ? { ...rev, ...updates } : rev
    );
    setRevisions(updatedRevisions);
    
    onUpdate?.({
      ...techPack,
      revisions: updatedRevisions
    });
  };

  const selectedRevisionData = revisions.find(rev => rev.id === selectedRevision);

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

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Revision History</h1>
            <p className="text-sm text-gray-600 mt-1">
              Track changes and manage version history
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-sm text-gray-500">
              Approved: <span className="font-medium text-green-600">{completionPercentage}%</span>
            </div>
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revision List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Revisions</h3>
              {mode !== 'view' && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </button>
              )}
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {revisions.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No revisions yet</p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {revisions.map((revision) => (
                    <button
                      key={revision.id}
                      onClick={() => setSelectedRevision(revision.id!)}
                      className={`w-full text-left p-3 rounded-md transition-colors ${
                        selectedRevision === revision.id
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{revision.version}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          revision.status === 'Approved' ? 'bg-green-100 text-green-800' :
                          revision.status === 'In Review' ? 'bg-yellow-100 text-yellow-800' :
                          revision.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {revision.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {revision.description}
                      </p>
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(revision.createdDate).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Add Revision Form */}
          {showAddForm && mode !== 'view' && (
            <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h4 className="font-medium text-gray-800 mb-4">Add New Revision</h4>
              
              <div className="space-y-4">
                <Input
                  label="Version"
                  value={newRevision.version || ''}
                  onChange={(value) => setNewRevision({...newRevision, version: value})}
                  placeholder="e.g., v1.1, Rev A"
                  required
                />
                
                <Textarea
                  label="Description"
                  value={newRevision.description || ''}
                  onChange={(value) => setNewRevision({...newRevision, description: value})}
                  placeholder="Brief description of this revision"
                  required
                  rows={3}
                />
                
                <Textarea
                  label="Changes"
                  value={newRevision.changes || ''}
                  onChange={(value) => setNewRevision({...newRevision, changes: value})}
                  placeholder="Detailed list of changes made"
                  rows={4}
                />
                
                <Select
                  label="Status"
                  value={newRevision.status || 'Draft'}
                  onChange={(value) => setNewRevision({...newRevision, status: value})}
                  options={statusOptions}
                />
                
                <div className="flex items-center space-x-2 pt-2">
                  <button
                    onClick={handleAddRevision}
                    className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Add Revision
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Revision Details */}
        <div className="lg:col-span-2">
          {selectedRevisionData ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">
                    {selectedRevisionData.version}
                  </h3>
                  <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      {selectedRevisionData.createdBy}
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {new Date(selectedRevisionData.createdDate).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                {mode !== 'view' && (
                  <Select
                    label=""
                    value={selectedRevisionData.status}
                    onChange={(value) => handleUpdateRevision(selectedRevisionData.id!, { status: value as any })}
                    options={statusOptions}
                  />
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Description</h4>
                  <p className="text-gray-600">{selectedRevisionData.description}</p>
                </div>

                {selectedRevisionData.changes && (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Changes Made</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedRevisionData.changes}
                      </pre>
                    </div>
                  </div>
                )}

                {selectedRevisionData.approvedBy && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <AlertCircle className="w-5 h-5 text-green-600 mr-2" />
                      <div>
                        <p className="font-medium text-green-800">
                          Approved by {selectedRevisionData.approvedBy}
                        </p>
                        {selectedRevisionData.approvedDate && (
                          <p className="text-sm text-green-600">
                            {new Date(selectedRevisionData.approvedDate).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Revision Selected</h3>
              <p className="text-gray-600">
                Select a revision from the list to view its details
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {mode !== 'view' && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={handlePrevTab}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous: Sharing
          </button>

          <div className="flex items-center space-x-4">
            <button
              onClick={handleSave}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 border border-transparent rounded-md"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </button>

            <button
              onClick={handleNextTab}
              className="flex items-center px-6 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 border border-transparent rounded-md"
            >
              Complete Tech Pack
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default RevisionTab;
