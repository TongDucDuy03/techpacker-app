import { useState, useCallback } from 'react';
import { api } from '../../../lib/api';
import { showError, showLoading, dismissToast } from '../../../lib/toast';
import { CompareResponse } from '../types';

export const useCompare = () => {
  const [comparison, setComparison] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compare = useCallback(async (techPackId: string, from: string, to: string) => {
    if (!techPackId || !from || !to) {
      setError('TechPack ID and both revision IDs are required');
      return;
    }

    setLoading(true);
    setError(null);
    setComparison(null);

    const toastId = showLoading('Comparing revisions...');

    try {
      const response = await api.compareRevisions(techPackId, from, to);
      // API returns { success: true, data: { ...comparison } }
      const responseData = response.data;
      const data: CompareResponse = responseData?.data || responseData || response;
      setComparison(data);
      dismissToast(toastId);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to compare revisions';
      setError(errorMessage);
      showError(errorMessage);
      dismissToast(toastId);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearComparison = useCallback(() => {
    setComparison(null);
    setError(null);
  }, []);

  return {
    comparison,
    loading,
    error,
    compare,
    clearComparison
  };
};

