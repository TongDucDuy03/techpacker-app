import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../lib/api';
import { showError } from '../../../lib/toast';
import { Revision } from '../types';

export const useRevision = (revisionId: string | undefined) => {
  const [revision, setRevision] = useState<Revision | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRevision = useCallback(async () => {
    if (!revisionId) {
      setRevision(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.getRevision(revisionId);
      // API returns { success: true, data: { ...revision } }
      const responseData = response.data;
      const data: Revision = responseData?.data || responseData || response;
      setRevision(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load revision';
      setError(errorMessage);
      showError(errorMessage);
      setRevision(null);
    } finally {
      setLoading(false);
    }
  }, [revisionId]);

  useEffect(() => {
    loadRevision();
  }, [loadRevision]);

  return {
    revision,
    loading,
    error,
    refetch: loadRevision
  };
};

