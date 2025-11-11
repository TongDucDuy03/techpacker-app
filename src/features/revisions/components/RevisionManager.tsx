import React, { useState } from 'react';
import { Row, Col } from 'antd';
import { RevisionList } from './RevisionList';
import { RevisionDetail } from './RevisionDetail';
import { RevisionCompare } from './RevisionCompare';
import { Revision, RevertResponse } from '../types';
import { useRevisions } from '../hooks/useRevisions';
import { useTechPack } from '../../../contexts/TechPackContext';

interface RevisionManagerProps {
  techPackId: string | undefined;
  canEdit: boolean;
  canView: boolean;
  onBackToList?: () => void;
}

export const RevisionManager: React.FC<RevisionManagerProps> = ({
  techPackId,
  canEdit,
  canView,
  onBackToList
}) => {
  const { setCurrentTab, getTechPack, updateFormState } = useTechPack();
  const [selectedRevision, setSelectedRevision] = useState<Revision | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const { revisions, refetch } = useRevisions(techPackId);

  const handleSelectRevision = (revision: Revision) => {
    setSelectedRevision(revision);
  };

  const isCurrentSelected =
    !!selectedRevision && revisions.length > 0 && selectedRevision._id === revisions[0]._id;

  const handleRevertSuccess = async (result: RevertResponse) => {
    const newRevisionId = result?.newRevision?._id;
    await refetch();
    if (newRevisionId) {
      // Try to select the newly created revision
      const found = (revisions || []).find(r => r._id === newRevisionId);
      setSelectedRevision(found || (revisions[0] ?? null));
    } else if (revisions.length > 0) {
      // Fallback to the latest revision
      setSelectedRevision(revisions[0]);
    }

    // Refresh techpack detail (keep local state fresh)
    if (techPackId) {
      try {
        const fresh = await getTechPack(techPackId);
        if (fresh) {
          updateFormState(fresh as any, true);
        }
      } catch (_e) {
        // ignore
      }
    }
    // Navigate back to the TechPack list if provided
    if (onBackToList) {
      onBackToList();
    } else {
      // Fallback: go to Article Info tab
      setCurrentTab(0);
    }
  };

  const handleCompare = () => {
    setShowCompare(true);
  };

  return (
    <div className="space-y-6">
      <Row gutter={16}>
        <Col xs={24} lg={8}>
          <RevisionList
            techPackId={techPackId}
            selectedRevisionId={selectedRevision?._id || null}
            onSelectRevision={handleSelectRevision}
            canEdit={canEdit}
          />
        </Col>
        <Col xs={24} lg={16}>
          <RevisionDetail
            revision={selectedRevision}
            techPackId={techPackId}
            canEdit={canEdit}
            canView={canView}
            isCurrent={isCurrentSelected}
            onCompare={handleCompare}
            onRevertSuccess={handleRevertSuccess}
          />
        </Col>
      </Row>

      <RevisionCompare
        open={showCompare}
        revisions={revisions}
        techPackId={techPackId}
        onClose={() => setShowCompare(false)}
      />
    </div>
  );
};


