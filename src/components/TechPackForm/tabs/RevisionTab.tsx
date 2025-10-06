import React, { useState } from 'react';
import { useTechPack } from '../../../contexts/TechPackContext';
import { RevisionEntry } from '../../../types/techpack';
import { Clock, User, GitCommit, FileDiff, CheckCircle, XCircle, Edit3 } from 'lucide-react';

const RevisionTab: React.FC = () => {
  const { state } = useTechPack();
  const { revisionHistory } = state.techpack;

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggleExpand = (id: string) => {
    setExpandedId(prevId => (prevId === id ? null : id));
  };

  const getChangeTypeIcon = (changeType: RevisionEntry['changeType']) => {
    switch (changeType) {
      case 'CREATE':
        return <PlusCircle className="w-5 h-5 text-green-500" />;
      case 'UPDATE':
        return <Edit3 className="w-5 h-5 text-blue-500" />;
      case 'STATUS_CHANGE':
        return <GitCommit className="w-5 h-5 text-purple-500" />;
      case 'DELETE':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FileDiff className="w-5 h-5 text-gray-500" />;
    }
  };

  const renderChangeValue = (value: any) => {
    if (typeof value === 'object' && value !== null) {
      return <pre className="text-xs bg-gray-100 p-1 rounded font-mono">{JSON.stringify(value, null, 2)}</pre>;
    }
    if (typeof value === 'boolean') {
      return value ? 'True' : 'False';
    }
    return String(value);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Revision History</h1>
            <p className="text-sm text-gray-600 mt-1">
              Track all changes, updates, and version history for this tech pack.
            </p>
          </div>
          <div className="text-sm text-center">
            <div className="text-2xl font-bold text-blue-600">{revisionHistory.length}</div>
            <div className="text-gray-500">Revisions</div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flow-root">
        {revisionHistory.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No revision history yet</p>
            <p className="text-sm">Changes will be logged here as you save the tech pack.</p>
          </div>
        ) : (
          <ul className="-mb-8">
            {revisionHistory.map((revision, index) => (
              <li key={revision.id}>
                <div className="relative pb-8">
                  {index !== revisionHistory.length - 1 && (
                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                  )}
                  <div className="relative flex space-x-3">
                    <div>
                      <span className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center ring-8 ring-white">
                        {getChangeTypeIcon(revision.changeType)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 pt-1.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm text-gray-500">
                            Version <span className="font-medium text-gray-900">{revision.version}</span> by{' '}
                            <span className="font-medium text-gray-900">{revision.userName}</span> ({revision.userRole})
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {new Date(revision.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <button className="text-xs text-blue-600 hover:underline">Compare</button>
                          <button 
                            onClick={() => handleToggleExpand(revision.id)}
                            className="text-xs text-gray-600 hover:underline"
                          >
                            {expandedId === revision.id ? 'Hide Details' : 'Show Details'}
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <p className="text-sm text-gray-800">
                          {revision.description || `Performed a ${revision.changeType.toLowerCase()} action.`}
                        </p>
                        
                        {revision.approvalStatus && (
                          <div className={`mt-2 flex items-center text-sm font-medium ${
                            revision.approvalStatus === 'Approved' ? 'text-green-600' :
                            revision.approvalStatus === 'Rejected' ? 'text-red-600' : 'text-yellow-600'
                          }`}>
                            {revision.approvalStatus === 'Approved' ? <CheckCircle className="w-4 h-4 mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
                            Status: {revision.approvalStatus}
                          </div>
                        )}

                        {expandedId === revision.id && (
                          <div className="mt-3 bg-gray-50 rounded-lg border border-gray-200 p-4">
                            <h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">Changed Fields</h4>
                            {revision.changedFields.length > 0 ? (
                              <table className="min-w-full text-sm">
                                <thead className="text-left text-xs text-gray-500">
                                  <tr>
                                    <th className="py-1 pr-2 w-1/3">Field</th>
                                    <th className="py-1 px-2 w-1/3">Previous Value</th>
                                    <th className="py-1 pl-2 w-1/3">New Value</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {revision.changedFields.map((change, i) => (
                                    <tr key={i} className="border-t border-gray-200">
                                      <td className="py-2 pr-2 font-medium text-gray-800 align-top">{change.field}</td>
                                      <td className="py-2 px-2 text-gray-600 align-top">{renderChangeValue(change.previousValue)}</td>
                                      <td className="py-2 pl-2 text-gray-600 align-top">{renderChangeValue(change.newValue)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <p className="text-xs text-gray-500">No specific field changes were logged for this revision.</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// Dummy icons for change types if not using lucide-react
const PlusCircle: React.FC<{className: string}> = ({className}) => <div className={className}>+</div>;

export default RevisionTab;
