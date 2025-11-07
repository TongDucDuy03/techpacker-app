import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useTechPack } from '../contexts/TechPackContext';

interface UseAutoSaveOptions {
  delay?: number; // Auto-save delay in milliseconds
  enabled?: boolean; // Enable/disable auto-save
  maxRetries?: number; // Maximum retry attempts
}

export const useAutoSave = (options: UseAutoSaveOptions = {}) => {
  const { delay = 2000, enabled = true, maxRetries = 3 } = options ?? {};
  const context = useTechPack();
  const { state, saveTechPack } = context ?? {};
  const { hasUnsavedChanges = false, isSaving = false } = state ?? {};

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<string>('');
  const retryCountRef = useRef<number>(0);
  const lastDataHashRef = useRef<string>('');

  // Create a hash of current data to avoid unnecessary saves
  const currentDataHash = useMemo(() => {
    if (!state) return '';
    return JSON.stringify({
      name: state.name,
      description: state.description,
      bom: state.bom,
      measurements: state.measurements,
      colorways: state.colorways
    });
  }, [state]);

  const performAutoSave = useCallback(async () => {
    if (!enabled || isSaving || !saveTechPack) return;

    // Skip if data hasn't changed
    if (currentDataHash === lastDataHashRef.current) return;

    try {
      await saveTechPack();
      lastSaveRef.current = new Date().toISOString();
      lastDataHashRef.current = currentDataHash;
      retryCountRef.current = 0; // Reset retry count on success
    } catch (error) {
      console.error('Auto-save failed:', error);

      // Implement retry logic
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        setTimeout(() => performAutoSave(), delay * retryCountRef.current);
      }
    }
  }, [enabled, isSaving, saveTechPack, currentDataHash, maxRetries, delay]);

  useEffect(() => {
    if (!enabled || !hasUnsavedChanges || isSaving) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(performAutoSave, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, isSaving, enabled, delay, performAutoSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useMemo(() => ({
    lastAutoSave: lastSaveRef.current,
    isAutoSaveEnabled: enabled,
    retryCount: retryCountRef.current,
  }), [enabled]);
};

export default useAutoSave;
