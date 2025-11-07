import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../lib/api';
import { showError } from '../../../lib/toast';
import { Revision, RevisionListResponse, RevisionFilters } from '../types';

export const useRevisions = (techPackId: string | undefined, filters?: RevisionFilters) => {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  const loadRevisions = useCallback(async () => {
    if (!techPackId) {
      setRevisions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params: any = {
        page: filters?.page || 1,
        limit: filters?.limit || 20
      };

      if (filters?.changeType) params.changeType = filters.changeType;
      if (filters?.createdBy) params.createdBy = filters.createdBy;
      if (filters?.includeSnapshot) params.includeSnapshot = filters.includeSnapshot;

      const response = await api.getRevisions(techPackId, params);
      // API returns { success: true, data: { revisions: [...], pagination: {...} } }
      const responseData = response.data;
      const data: RevisionListResponse = responseData?.data || responseData || response;

      setRevisions(data.revisions || []);
      
      // Map pagination from API format to component format
      const paginationData = data.pagination || {};
      setPagination({
        page: paginationData.currentPage || paginationData.page || 1,
        limit: paginationData.itemsPerPage || paginationData.limit || 20,
        total: paginationData.totalItems || paginationData.total || 0,
        pages: paginationData.totalPages || paginationData.pages || 0
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load revisions';
      setError(errorMessage);
      showError(errorMessage);
      setRevisions([]);
    } finally {
      setLoading(false);
    }
  }, [techPackId, filters?.page, filters?.limit, filters?.changeType, filters?.createdBy, filters?.includeSnapshot]);

  useEffect(() => {
    loadRevisions();
  }, [loadRevisions]);

  return {
    revisions,
    loading,
    error,
    pagination,
    refetch: loadRevisions
  };
};

