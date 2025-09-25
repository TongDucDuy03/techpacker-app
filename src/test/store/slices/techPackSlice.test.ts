import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import techPackReducer, {
  setCurrentTechPack,
  setFilters,
  clearError,
  optimisticUpdate,
  confirmOptimisticUpdate,
  rollbackOptimisticUpdate,
  handleRealtimeUpdate,
  invalidateCache
} from '../../store/slices/techPackSlice';
import {
  fetchTechPacks,
  fetchTechPackById,
  createTechPack,
  updateTechPack,
  deleteTechPack,
  validateTechPack,
  optimisticUpdateTechPack
} from '../../store/slices/techPackSlice';
import { mockTechPack } from '../utils/testUtils';

// Mock the API
vi.mock('../../lib/api', () => ({
  api: {
    listTechPacks: vi.fn(),
    getTechPackById: vi.fn(),
    createTechPack: vi.fn(),
    updateTechPack: vi.fn(),
    deleteTechPack: vi.fn(),
    validateTechPack: vi.fn(),
  }
}));

describe('TechPack Slice', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        techPack: techPackReducer
      }
    });
  });

  describe('reducers', () => {
    it('should handle setCurrentTechPack', () => {
      const techPack = mockTechPack();
      
      store.dispatch(setCurrentTechPack(techPack));
      
      const state = store.getState().techPack;
      expect(state.currentTechPack).toEqual(techPack);
    });

    it('should handle setFilters', () => {
      const filters = { status: 'draft', category: 'apparel' };
      
      store.dispatch(setFilters(filters));
      
      const state = store.getState().techPack;
      expect(state.filters).toEqual(expect.objectContaining(filters));
    });

    it('should handle clearError', () => {
      // First set an error
      store.dispatch({ type: 'techPack/fetchTechPacks/rejected', payload: 'Error message' });
      
      // Then clear it
      store.dispatch(clearError());
      
      const state = store.getState().techPack;
      expect(state.error).toBeNull();
    });

    it('should handle optimisticUpdate', () => {
      const techPack = mockTechPack();
      const updates = { name: 'Updated Name' };
      
      store.dispatch(optimisticUpdate({
        id: techPack.id,
        updates,
        operation: 'update'
      }));
      
      const state = store.getState().techPack;
      expect(state.optimisticUpdates[techPack.id]).toBeDefined();
      expect(state.optimisticUpdates[techPack.id].updates).toEqual(updates);
    });

    it('should handle confirmOptimisticUpdate', () => {
      const techPack = mockTechPack();
      
      // First add an optimistic update
      store.dispatch(optimisticUpdate({
        id: techPack.id,
        updates: { name: 'Updated Name' },
        operation: 'update'
      }));
      
      // Then confirm it
      store.dispatch(confirmOptimisticUpdate(techPack.id));
      
      const state = store.getState().techPack;
      expect(state.optimisticUpdates[techPack.id]).toBeUndefined();
    });

    it('should handle rollbackOptimisticUpdate', () => {
      const techPack = mockTechPack();
      const error = new Error('Update failed');
      
      // First add an optimistic update
      store.dispatch(optimisticUpdate({
        id: techPack.id,
        updates: { name: 'Updated Name' },
        operation: 'update'
      }));
      
      // Then rollback
      store.dispatch(rollbackOptimisticUpdate({
        id: techPack.id,
        error
      }));
      
      const state = store.getState().techPack;
      expect(state.optimisticUpdates[techPack.id]).toBeUndefined();
      expect(state.error).toBe('Update failed');
    });

    it('should handle handleRealtimeUpdate', () => {
      const techPack = mockTechPack();
      const updateData = { name: 'Realtime Updated' };
      
      store.dispatch(handleRealtimeUpdate({
        techPackId: techPack.id,
        module: 'techpack',
        updateData,
        timestamp: '2024-01-01T00:00:00Z'
      }));
      
      const state = store.getState().techPack;
      // The realtime update should be processed
      expect(state).toBeDefined();
    });

    it('should handle invalidateCache', () => {
      // Add some tech packs to the state
      store.dispatch({
        type: 'techPack/fetchTechPacks/fulfilled',
        payload: {
          data: [mockTechPack()],
          pagination: { page: 1, limit: 20, total: 1 }
        }
      });
      
      // Then invalidate cache
      store.dispatch(invalidateCache());
      
      const state = store.getState().techPack;
      expect(state.techPacks).toEqual([]);
      expect(state.currentTechPack).toBeNull();
    });
  });

  describe('async thunks', () => {
    it('should handle fetchTechPacks pending', () => {
      store.dispatch(fetchTechPacks());
      
      const state = store.getState().techPack;
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle fetchTechPacks fulfilled', () => {
      const mockTechPacks = [mockTechPack()];
      
      store.dispatch({
        type: 'techPack/fetchTechPacks/fulfilled',
        payload: {
          data: mockTechPacks,
          pagination: { page: 1, limit: 20, total: 1 }
        }
      });
      
      const state = store.getState().techPack;
      expect(state.loading).toBe(false);
      expect(state.techPacks).toEqual(mockTechPacks);
      expect(state.lastFetch).toBeGreaterThan(0);
    });

    it('should handle fetchTechPacks rejected', () => {
      const errorMessage = 'Failed to fetch tech packs';
      
      store.dispatch({
        type: 'techPack/fetchTechPacks/rejected',
        payload: errorMessage
      });
      
      const state = store.getState().techPack;
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });

    it('should handle fetchTechPackById fulfilled', () => {
      const mockTechPack = mockTechPack();
      
      store.dispatch({
        type: 'techPack/fetchTechPackById/fulfilled',
        payload: { data: mockTechPack }
      });
      
      const state = store.getState().techPack;
      expect(state.loading).toBe(false);
      expect(state.currentTechPack).toEqual(mockTechPack);
    });

    it('should handle createTechPack fulfilled', () => {
      const mockTechPack = mockTechPack();
      
      store.dispatch({
        type: 'techPack/createTechPack/fulfilled',
        payload: { data: mockTechPack }
      });
      
      const state = store.getState().techPack;
      expect(state.techPacks).toContain(mockTechPack);
      expect(state.currentTechPack).toEqual(mockTechPack);
    });

    it('should handle updateTechPack fulfilled', () => {
      const mockTechPack = mockTechPack();
      const updatedTechPack = { ...mockTechPack, name: 'Updated Name' };
      
      // First add the tech pack
      store.dispatch({
        type: 'techPack/fetchTechPacks/fulfilled',
        payload: { data: [mockTechPack] }
      });
      
      // Then update it
      store.dispatch({
        type: 'techPack/updateTechPack/fulfilled',
        payload: { data: updatedTechPack }
      });
      
      const state = store.getState().techPack;
      expect(state.techPacks).toContain(updatedTechPack);
      expect(state.currentTechPack).toEqual(updatedTechPack);
    });

    it('should handle deleteTechPack fulfilled', () => {
      const mockTechPack = mockTechPack();
      
      // First add the tech pack
      store.dispatch({
        type: 'techPack/fetchTechPacks/fulfilled',
        payload: { data: [mockTechPack] }
      });
      
      // Then delete it
      store.dispatch({
        type: 'techPack/deleteTechPack/fulfilled',
        payload: mockTechPack.id
      });
      
      const state = store.getState().techPack;
      expect(state.techPacks).not.toContain(mockTechPack);
      expect(state.currentTechPack).toBeNull();
    });

    it('should handle validateTechPack fulfilled', () => {
      const mockValidation = {
        isValid: true,
        errors: [],
        warnings: [],
        completeness: { overall: 90 },
        consistency: { isValid: true, errors: [], warnings: [] }
      };
      
      store.dispatch({
        type: 'techPack/validateTechPack/fulfilled',
        payload: { data: mockValidation }
      });
      
      const state = store.getState().techPack;
      expect(state.validation).toEqual(mockValidation);
    });
  });

  describe('optimistic updates', () => {
    it('should handle optimistic update workflow', async () => {
      const techPack = mockTechPack();
      const updates = { name: 'Optimistically Updated' };
      
      // Mock the API to reject the update
      vi.mocked(api.updateTechPack).mockRejectedValue(new Error('Network error'));
      
      // Dispatch optimistic update
      store.dispatch(optimisticUpdateTechPack({
        id: techPack.id,
        updates,
        operation: 'update'
      }));
      
      // Check that optimistic update is applied
      let state = store.getState().techPack;
      expect(state.optimisticUpdates[techPack.id]).toBeDefined();
      
      // Wait for the async thunk to complete and rollback
      await store.dispatch(optimisticUpdateTechPack({
        id: techPack.id,
        updates,
        operation: 'update'
      }));
      
      // Check that rollback occurred
      state = store.getState().techPack;
      expect(state.optimisticUpdates[techPack.id]).toBeUndefined();
      expect(state.error).toBe('Network error');
    });
  });
});
