import { useEffect, useRef, useCallback } from 'react';
import { useTechPack } from '../contexts/TechPackContext';

interface UseAutoSaveOptions {
  delay?: number; // Auto-save delay in milliseconds
  enabled?: boolean; // Enable/disable auto-save
}

export const useAutoSave = (options: UseAutoSaveOptions = {}) => {
  const { delay = 2000, enabled = true } = options ?? {};
  const context = useTechPack();
  const { state, saveTechPack } = context ?? {};
  const { hasUnsavedChanges = false, isSaving = false } = state ?? {};
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<string>('');

  const performAutoSave = useCallback(async () => {
    if (!enabled || isSaving || !saveTechPack) return;

    try {
      await saveTechPack();
      lastSaveRef.current = new Date().toISOString();
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [enabled, isSaving, saveTechPack]);

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

  return {
    lastAutoSave: lastSaveRef.current,
    isAutoSaveEnabled: enabled,
  };
};

export default useAutoSave;
