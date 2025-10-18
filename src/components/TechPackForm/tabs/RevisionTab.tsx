import React, { useState, useEffect, useMemo, useImperativeHandle, forwardRef } from 'react';
import { api } from '../../../lib/api';
import { TechPack } from '../../../types/techpack';
import { useTechPack } from '../../../contexts/TechPackContext';
import { Clock, User, FileText, Undo2, AlertCircle, ImageIcon, ExternalLink } from 'lucide-react';

interface ImagePreviewProps {
  src: string;
  alt: string;
  fallbackText: string;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ src, alt, fallbackText }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showFullSize, setShowFullSize] = useState(false);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  const openFullSize = () => {
    setShowFullSize(true);
  };

  const closeFullSize = () => {
    setShowFullSize(false);
  };

  if (imageError) {
    return (
      <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded border">
        <ImageIcon className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-600 font-mono">{fallbackText}</span>
      </div>
    );
  }

  return (
    <>
      <div className="relative group">
        <img
          src={src}
          alt={alt}
          onLoad={handleImageLoad}
          onError={handleImageError}
          onClick={openFullSize}
          className="max-w-[200px] max-h-[150px] object-cover rounded border border-gray-200 cursor-pointer hover:border-blue-300 transition-colors shadow-sm"
          style={{ minHeight: '60px', minWidth: '80px' }}
        />
        {imageLoaded && (
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded flex items-center justify-center opacity-0 group-hover:opacity-100">
            <ExternalLink className="w-5 h-5 text-white" />
          </div>
        )}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-gray-100 rounded flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {/* Full-size modal */}
      {showFullSize && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={closeFullSize}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-full object-contain rounded shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={closeFullSize}
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

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
  const [selectedRevisionDetails, setSelectedRevisionDetails] = useState<any | null>(null);

  // Revert functionality state
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [revertingRevision, setRevertingRevision] = useState<any | null>(null);
  const [isReverting, setIsReverting] = useState(false);
  const [revertError, setRevertError] = useState<string | null>(null);

  // Load revisions when component mounts or techPack ID changes
  useEffect(() => {
    if (techPack?.id && mode !== 'create') {
      console.log('Loading revisions for TechPack ID:', techPack.id);
      loadRevisions(techPack.id);
    }
  }, [techPack?.id, mode, loadRevisions]);

  // Sorted revisions by version (newest first)
  const sortedRevisions = useMemo(() => {
    if (!revisions || revisions.length === 0) return [];
    return [...revisions].sort((a, b) => {
      const versionA = parseFloat(a.version) || 0;
      const versionB = parseFloat(b.version) || 0;
      return versionB - versionA;
    });
  }, [revisions]);

  // Auto-select first revision when revisions load
  useEffect(() => {
    if (sortedRevisions.length > 0 && !selectedRevision) {
      const firstRevision = sortedRevisions[0];
      if (firstRevision) {
        setSelectedRevision(firstRevision._id || firstRevision.id || '');
      }
    }
  }, [sortedRevisions, selectedRevision]);

  // Load revision details when selection changes
  useEffect(() => {
    const loadRevisionDetails = async () => {
      if (!selectedRevision) {
        setSelectedRevisionDetails(null);
        return;
      }

      const revision = revisions?.find(rev => (rev._id || rev.id) === selectedRevision);
      if (!revision) return;

      try {
        const response = await api.get(`/revisions/${selectedRevision}`);
        const revisionData = response.data?.data || response.data;
        setSelectedRevisionDetails(revisionData);
      } catch (error) {
        console.error('Failed to load revision details:', error);
        setSelectedRevisionDetails(revision);
      }
    };

    loadRevisionDetails();
  }, [selectedRevision, revisions]);

  // Handle revert to revision
  const handleRevertClick = (revision: any) => {
    setRevertingRevision(revision);
    setShowRevertModal(true);
    setRevertError(null);
  };

  // Confirm revert action
  const confirmRevert = async () => {
    if (!revertingRevision || !techPack?.id) return;

    setIsReverting(true);
    setRevertError(null);

    try {
      const response = await api.post(`/revisions/revert/${techPack.id}/${revertingRevision._id || revertingRevision.id}`);
      
      if (response.data.success) {
        // Reload revisions
        await loadRevisions(techPack.id);
        
        // Close modal
        setShowRevertModal(false);
        setRevertingRevision(null);
        
        // Show success message
        console.log('Successfully reverted to revision', revertingRevision.version);
      } else {
        setRevertError(response.data.message || 'Failed to revert to revision');
      }
    } catch (error: any) {
      console.error('Error reverting to revision:', error);
      setRevertError(error.response?.data?.message || 'Failed to revert to revision');
    } finally {
      setIsReverting(false);
    }
  };

  // Cancel revert action
  const cancelRevert = () => {
    setShowRevertModal(false);
    setRevertingRevision(null);
    setRevertError(null);
  };

  // Helper functions for formatting
  const isImagePath = (value: any): boolean => {
    if (typeof value !== 'string') return false;

    // Check for common image extensions
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const hasImageExtension = imageExtensions.some(ext => value.toLowerCase().endsWith(ext));

    // Also check for common image field names
    const imageFieldNames = ['image', 'photo', 'picture', 'sketch', 'url', 'avatar', 'thumbnail'];
    const isImageField = imageFieldNames.some(field => value.toLowerCase().includes(field));

    // Check if it looks like an upload path
    const isUploadPath = value.startsWith('/uploads/') || value.includes('/uploads/');

    return hasImageExtension || (isImageField && isUploadPath);
  };

  const buildImageUrl = (path: string): string => {
    // If it's already a full URL, return as is
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    // Get the API base URL and remove the /api/v1 part to get the server base
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1';
    const serverBaseUrl = apiBaseUrl.replace('/api/v1', '');

    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    return `${serverBaseUrl}${normalizedPath}`;
  };

  const formatValue = (val: any): React.ReactNode => {
    if (val === null || val === undefined || val === '') return '—';

    // Check if it's an image path
    if (isImagePath(val)) {
      const fullImageUrl = buildImageUrl(String(val));
      console.log('🖼️ Detected image path:', val, '→', fullImageUrl); // Debug log
      return (
        <div className="flex flex-col space-y-2">
          <ImagePreview
            src={fullImageUrl}
            alt="Revision image"
            fallbackText={String(val)}
          />
          <div className="text-xs text-gray-500 font-mono break-all">
            {String(val)}
          </div>
        </div>
      );
    }

    if (typeof val === 'object') {
      try {
        return (
          <pre className="text-xs bg-gray-50 p-2 rounded border overflow-auto max-h-32">
            {JSON.stringify(val, null, 2)}
          </pre>
        );
      } catch {
        return String(val);
      }
    }

    return (
      <div className="break-words">
        {String(val)}
      </div>
    );
  };

  const formatFieldName = (field: string) => {
    return field
      .replace(/\[(\d+)\]/g, ' [$1]')
      .replace(/\./g, ' > ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Validate and save function for parent component
  useImperativeHandle(ref, () => ({
    validateAndSave: () => {
      return true; // Revision tab doesn't need validation
    }
  }));

  if (mode === 'create') {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-gray-500">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Revisions Yet</h3>
          <p>Revisions will appear here after you save your first TechPack.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Revision History</h2>
          <p className="text-sm text-gray-600 mt-1">
            Track changes and revert to previous versions of your TechPack
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[600px]">
        {/* Left Column: Revisions List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
              <h3 className="text-sm font-semibold text-gray-900">Revision History</h3>
              <p className="text-xs text-gray-500 mt-1">
                {sortedRevisions?.length || 0} revision{(sortedRevisions?.length || 0) !== 1 ? 's' : ''}
              </p>
            </div>

            {revisionsLoading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Loading...</p>
              </div>
            ) : !sortedRevisions || sortedRevisions.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm">No revisions found</p>
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto">
                <div className="space-y-1 p-2">
                  {sortedRevisions.map((revision, index) => (
                    <div
                      key={revision._id || revision.id}
                      onClick={() => setSelectedRevision(revision._id || revision.id || '')}
                      className={`w-full text-left p-3 rounded-md transition-colors cursor-pointer border-l-4 ${selectedRevision === (revision._id || revision.id)
                          ? 'bg-blue-50 border-blue-500'
                          : 'bg-white border-transparent hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            v{revision.version}
                          </span>
                          {index === 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Current
                            </span>
                          )}
                          {revision.changeType === 'rollback' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                              <Undo2 className="w-3 h-3 mr-1" />
                              Rollback
                            </span>
                          )}
                        </div>
                        {/* Visible Revert Button - Only show for non-current revisions */}
                        {index > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRevertClick(revision);
                            }}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-orange-700 bg-orange-100 border border-orange-300 rounded hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
                            title="Revert to this version"
                          >
                            <Undo2 className="w-3 h-3 mr-1" />
                            Revert
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                        {revision.description || revision.changes?.summary || revision.changeSummary || 'No description'}
                      </p>
                      <div className="flex items-center text-xs text-gray-500">
                        <User className="w-3 h-3 mr-1.5" />
                        <span>{revision.createdByName || revision.changedBy || 'Unknown'}</span>
                        <Clock className="w-3 h-3 ml-3 mr-1.5" />
                        <span>{new Date(revision.createdAt || revision.createdDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Auto-Display Revision Details */}
        <div className="lg:col-span-2">
          {selectedRevisionDetails ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Revision {selectedRevisionDetails.version}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      By {selectedRevisionDetails.createdByName || selectedRevisionDetails.changedBy || 'Unknown'} • {' '}
                      {new Date(selectedRevisionDetails.createdAt || selectedRevisionDetails.changedDate).toLocaleString()}
                    </p>
                  </div>
                  {selectedRevisionDetails.version !== sortedRevisions[0]?.version && (
                    <button
                      onClick={() => handleRevertClick(selectedRevisionDetails)}
                      className="inline-flex items-center px-3 py-2 border border-orange-300 shadow-sm text-sm font-medium rounded text-orange-700 bg-orange-50 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                    >
                      <Undo2 className="w-4 h-4 mr-2" />
                      Revert to This Version
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {/* Summary */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Summary</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      {selectedRevisionDetails.changes?.summary || selectedRevisionDetails.changeSummary || 'No summary provided'}
                    </p>
                  </div>
                </div>

                {/* Changed Fields */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Changed Fields</h4>
                  {!selectedRevisionDetails.changes?.diff || Object.keys(selectedRevisionDetails.changes.diff).length === 0 ? (
                    <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                      <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm">No field-level changes detected in this revision.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(selectedRevisionDetails.changes.diff).map(([field, change]: [string, any]) => (
                        <div key={field} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                            <h5 className="text-sm font-medium text-gray-800">{formatFieldName(field)}</h5>
                          </div>
                          <div className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Old Value</label>
                                <div className="bg-gray-100 px-3 py-2 rounded-md text-sm min-h-[80px] flex items-center">
                                  {formatValue(change.old)}
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">New Value</label>
                                <div className="bg-yellow-100 px-3 py-2 rounded-md text-sm font-medium min-h-[80px] flex items-center">
                                  {formatValue(change.new)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Revision</h3>
              <p className="text-gray-500">Click on a revision from the left panel to view its details here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Revert Confirmation Modal */}
      {showRevertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Confirm Revert
                </h3>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-500">
                Are you sure you want to revert to version <strong>{revertingRevision?.version}</strong>?
                This will create a new revision with the data from that version.
              </p>
              {revertingRevision?.changeSummary && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <p className="text-xs text-gray-600">
                    <strong>Original Summary:</strong> {revertingRevision.changeSummary}
                  </p>
                </div>
              )}
            </div>

            {revertError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{revertError}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={cancelRevert}
                disabled={isReverting}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRevert}
                disabled={isReverting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 flex items-center"
              >
                {isReverting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Reverting...
                  </>
                ) : (
                  <>
                    <Undo2 className="w-4 h-4 mr-2" />
                    Revert
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

RevisionTab.displayName = 'RevisionTab';

export default RevisionTab;
