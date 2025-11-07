import React, { useImperativeHandle, forwardRef } from 'react';
import { TechPack } from '../../../types/techpack';
import { RevisionManager } from '../../../features/revisions/components/RevisionManager';
import { useRevisionPermissions } from '../../../features/revisions/utils/permissions';
import { FileText } from 'lucide-react';

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
  const { techPack, mode = 'create' } = props;
  const { canView, canEdit } = useRevisionPermissions(techPack);

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Revision History</h2>
          <p className="text-sm text-gray-600 mt-1">
            Track changes and revert to previous versions of your TechPack
          </p>
        </div>
      </div>

      <RevisionManager
        techPackId={techPack?.id || techPack?._id}
        canEdit={canEdit}
        canView={canView}
      />
    </div>
  );
});

RevisionTab.displayName = 'RevisionTab';

export default RevisionTab;
