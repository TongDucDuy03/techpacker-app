import React, { useState, useCallback, memo } from 'react';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import CreateTechPackModal from './CreateTechPackModal';
import TechPackSelectionModal from './TechPackSelectionModal';
import CloneConfigurationModal, { CloneConfiguration } from './CloneConfigurationModal';
import { ApiTechPack } from '../types/techpack.types';
import { api } from '../lib/api';

interface CreateTechPackWorkflowProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess?: (techPack: ApiTechPack) => void;
  onCreateTechPack?: () => void; // Callback for creating from scratch
}

type WorkflowStep = 'mode-selection' | 'techpack-selection' | 'clone-configuration' | 'creating';

const CreateTechPackWorkflowComponent: React.FC<CreateTechPackWorkflowProps> = ({
  visible,
  onCancel,
  onSuccess,
  onCreateTechPack,
}) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('mode-selection');
  const [selectedSourceTechPack, setSelectedSourceTechPack] = useState<ApiTechPack | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCancel = useCallback(() => {
    // Reset workflow state
    setCurrentStep('mode-selection');
    setSelectedSourceTechPack(null);
    setIsCreating(false);
    onCancel();
  }, [onCancel]);

  const handleCreateFromScratch = useCallback(() => {
    // Close modal and call callback to create from scratch
    handleCancel();
    if (onCreateTechPack) {
      onCreateTechPack();
    } else {
      // Fallback: try to navigate (may not work if route doesn't exist)
      navigate('/techpacks/create');
    }
  }, [handleCancel, onCreateTechPack, navigate]);

  const handleCreateFromExisting = useCallback(() => {
    setCurrentStep('techpack-selection');
  }, []);

  const handleSourceTechPackSelected = useCallback((techPack: ApiTechPack) => {
    setSelectedSourceTechPack(techPack);
    setCurrentStep('clone-configuration');
  }, []);

  const handleCloneConfiguration = async (config: CloneConfiguration) => {
    if (!selectedSourceTechPack) {
      message.error('No source TechPack selected');
      return;
    }

    setIsCreating(true);
    try {
      const newTechPack = await api.cloneTechPack({
        sourceId: selectedSourceTechPack.id,
        newProductName: config.newProductName,
        newArticleCode: config.newArticleCode,
        season: config.season,
        copySections: config.copySections,
      });

      message.success({
        content: `✅ New TechPack created from ${selectedSourceTechPack.productName}`,
        duration: 4,
      });

      // Reset workflow and close modals
      handleCancel();

      // Call success callback or navigate
      if (onSuccess) {
        onSuccess(newTechPack);
      } else {
        navigate(`/techpacks/${newTechPack.id}`);
      }
    } catch (error: any) {
      console.error('Clone TechPack error:', error);
      message.error(error.message || 'Failed to clone TechPack');
    } finally {
      setIsCreating(false);
    }
  };

  const handleBackToModeSelection = () => {
    setCurrentStep('mode-selection');
    setSelectedSourceTechPack(null);
  };

  const handleBackToTechPackSelection = () => {
    setCurrentStep('techpack-selection');
  };

  return (
    <>
      {/* Step 1: Mode Selection */}
      <CreateTechPackModal
        visible={visible && currentStep === 'mode-selection'}
        onCancel={handleCancel}
        onCreateFromScratch={handleCreateFromScratch}
        onCreateFromExisting={handleCreateFromExisting}
      />

      {/* Step 2: TechPack Selection */}
      <TechPackSelectionModal
        visible={visible && currentStep === 'techpack-selection'}
        onCancel={handleBackToModeSelection}
        onSelect={handleSourceTechPackSelected}
      />

      {/* Step 3: Clone Configuration */}
      <CloneConfigurationModal
        visible={visible && currentStep === 'clone-configuration'}
        sourceTechPack={selectedSourceTechPack}
        onCancel={handleBackToTechPackSelection}
        onConfirm={handleCloneConfiguration}
        loading={isCreating}
      />
    </>
  );
};

export const CreateTechPackWorkflow = memo(CreateTechPackWorkflowComponent);
export default CreateTechPackWorkflow;
