import React, { useState, useCallback, memo } from 'react';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import CreateTechPackModal from './CreateTechPackModal';
import TechPackSelectionModal from './TechPackSelectionModal';
import CloneConfigurationModal, { CloneConfiguration } from './CloneConfigurationModal';
import { ApiTechPack } from '../types/techpack.types';
import { api } from '../lib/api';
import { useTechPack } from '../contexts/TechPackContext';

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
  const { loadTechPacks, addTechPackToList } = useTechPack();
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

    // Get the ID from _id or id field (ApiTechPack uses _id)
    const sourceId = (selectedSourceTechPack as any)._id || (selectedSourceTechPack as any).id;
    if (!sourceId) {
      message.error('Source TechPack ID is missing');
      return;
    }

    setIsCreating(true);
    try {
      const newTechPack = await api.cloneTechPack({
        sourceId: sourceId,
        newProductName: config.newProductName,
        newArticleCode: config.newArticleCode,
        season: config.season,
        copySections: config.copySections,
      });

      const sourceProductName = (selectedSourceTechPack as any).productName || (selectedSourceTechPack as any).name || 'TechPack';
      message.success({
        content: `✅ New TechPack created from ${sourceProductName}`,
        duration: 4,
      });

      // OPTIMISTIC UPDATE: Add new techpack to list immediately (before API refresh)
      // This ensures the list is updated instantly, even if backend cache hasn't updated yet
      if (addTechPackToList && newTechPack) {
        addTechPackToList(newTechPack);
      }

      // Reset workflow and close modals first
      handleCancel();

      // Refresh the techpack list from server to ensure consistency
      // This will run in background and update the list with server data
      // The optimistic update above ensures user sees the new techpack immediately
      loadTechPacks({ page: 1, limit: 10 }).catch(error => {
        console.error('Failed to refresh techpack list:', error);
        // Fallback: try reloading with default params
        loadTechPacks({ page: 1, limit: 10 }).catch(fallbackError => {
          console.error('Failed to refresh techpack list (fallback):', fallbackError);
        });
      });

      // Call success callback or navigate
      if (onSuccess) {
        onSuccess(newTechPack);
      } else {
        const newTechPackId = (newTechPack as any)._id || (newTechPack as any).id;
        navigate(`/techpacks/${newTechPackId}`);
      }
    } catch (error: any) {
      console.error('Clone TechPack error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to clone TechPack';
      message.error(errorMessage);
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
