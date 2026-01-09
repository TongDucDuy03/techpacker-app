import { useState, useCallback } from 'react';
import { api } from '../../../lib/api';
import { showSuccess, showError, showLoading, dismissToast } from '../../../lib/toast';
import { RevisionComment } from '../types';
import { useI18n } from '../../../lib/i18n';

export const useComments = (revisionId: string | undefined) => {
  const [comments, setComments] = useState<RevisionComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

  const addComment = useCallback(async (comment: string) => {
    if (!revisionId || !comment.trim()) {
      setError(t('validation.commentRequired'));
      return;
    }

    setAdding(true);
    setError(null);

    const toastId = showLoading(t('form.comments.adding'));

    try {
      const response = await api.addRevisionComment(revisionId, comment);
      // API returns { success: true, data: { comment: {...}, revision: {...} } }
      const responseData = response.data;
      const data = responseData?.data || responseData;
      const newComment = data?.comment || data;

      if (newComment) {
        setComments(prev => [...prev, newComment]);
        dismissToast(toastId);
        showSuccess(t('success.commentAdded'));
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || t('error.addComment');
      setError(errorMessage);
      showError(errorMessage);
      dismissToast(toastId);
    } finally {
      setAdding(false);
    }
  }, [revisionId]);

  const setCommentsFromRevision = useCallback((revisionComments?: RevisionComment[]) => {
    setComments(revisionComments || []);
  }, []);

  return {
    comments,
    loading,
    adding,
    error,
    addComment,
    setCommentsFromRevision
  };
};

