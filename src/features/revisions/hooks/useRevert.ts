import { useState, useCallback } from 'react';
import { api } from '../../../lib/api';
import { showSuccess, showError, showLoading, dismissToast } from '../../../lib/toast';
import { RevertResponse } from '../types';

export const useRevert = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revert = useCallback(async (techPackId: string, revisionId: string, reason?: string) => {
    if (!techPackId || !revisionId) {
      setError('TechPack ID and Revision ID are required');
      return null;
    }

    setLoading(true);
    setError(null);

    const toastId = showLoading('Reverting to revision...');

    try {
      const response = await api.revertToRevision(techPackId, revisionId, reason);
      // API returns { success: true, data: { ...revertResponse } }
      const responseData = response.data;
      const data: RevertResponse = responseData?.data || responseData || response;

      dismissToast(toastId);
      showSuccess(`TechPack reverted to ${data.revertedFrom} — a new revision ${data.newRevision.version} has been created.`);

      return data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to revert to revision';
      setError(errorMessage);
      showError(errorMessage);
      dismissToast(toastId);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    revert,
    loading,
    error
  };
};

