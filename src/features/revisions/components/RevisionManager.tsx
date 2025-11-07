import React, { useState } from 'react';
import { Row, Col } from 'antd';
import { RevisionList } from './RevisionList';
import { RevisionDetail } from './RevisionDetail';
import { RevisionCompare } from './RevisionCompare';
import { Revision } from '../types';
import { useRevisions } from '../hooks/useRevisions';

interface RevisionManagerProps {
  techPackId: string | undefined;
  canEdit: boolean;
  canView: boolean;
}

export const RevisionManager: React.FC<RevisionManagerProps> = ({
  techPackId,
  canEdit,
  canView
}) => {
  const [selectedRevision, setSelectedRevision] = useState<Revision | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const { revisions, refetch } = useRevisions(techPackId);

  const handleSelectRevision = (revision: Revision) => {
    setSelectedRevision(revision);
  };

  const handleRevertSuccess = () => {
    refetch();
    // Optionally select the new revision if needed
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


