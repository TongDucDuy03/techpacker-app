import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { TechPack } from '../../types';
import { api } from '../../lib/api';

// Async thunks
export const fetchTechPacks = createAsyncThunk(
  'techPack/fetchTechPacks',
  async (filters: any = {}) => {
    const response = await api.listTechPacks(filters);
    return response;
  }
);

export const fetchTechPackById = createAsyncThunk(
  'techPack/fetchTechPackById',
  async (id: string) => {
    const response = await api.getTechPackById(id);
    return response;
  }
);

export const createTechPack = createAsyncThunk(
  'techPack/createTechPack',
  async (techPackData: Partial<TechPack>) => {
    const response = await api.createTechPack(techPackData);
    return response;
  }
);

export const updateTechPack = createAsyncThunk(
  'techPack/updateTechPack',
  async ({ id, data }: { id: string; data: Partial<TechPack> }) => {
    const response = await api.updateTechPack(id, data);
    return response;
  }
);

export const deleteTechPack = createAsyncThunk(
  'techPack/deleteTechPack',
  async (id: string) => {
    await api.deleteTechPack(id);
    return id;
  }
);

export const validateTechPack = createAsyncThunk(
  'techPack/validateTechPack',
  async (id: string) => {
    const response = await api.validateTechPack(id);
    return response;
  }
);

// Optimistic updates
export const optimisticUpdateTechPack = createAsyncThunk(
  'techPack/optimisticUpdateTechPack',
  async ({ id, updates, operation }: { 
    id: string; 
    updates: Partial<TechPack>; 
    operation: 'update' | 'create' | 'delete' 
  }, { dispatch, getState }) => {
    // Apply optimistic update immediately
    dispatch(techPackSlice.actions.optimisticUpdate({ id, updates, operation }));
    
    try {
      // Perform actual API call
      let result;
      switch (operation) {
        case 'update':
          result = await api.updateTechPack(id, updates);
          break;
        case 'create':
          result = await api.createTechPack(updates);
          break;
        case 'delete':
          result = await api.deleteTechPack(id);
          break;
      }
      
      // Confirm the update
      dispatch(techPackSlice.actions.confirmOptimisticUpdate({ id, result }));
      return result;
    } catch (error) {
      // Rollback on error
      dispatch(techPackSlice.actions.rollbackOptimisticUpdate({ id, error }));
      throw error;
    }
  }
);

interface TechPackState {
  techPacks: TechPack[];
  currentTechPack: TechPack | null;
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
  optimisticUpdates: Record<string, {
    updates: Partial<TechPack>;
    operation: string;
    timestamp: number;
  }>;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    completeness: any;
    consistency: any;
  } | null;
  filters: {
    status?: string;
    category?: string;
    brand?: string;
    season?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const initialState: TechPackState = {
  techPacks: [],
  currentTechPack: null,
  loading: false,
  error: null,
  lastFetch: null,
  optimisticUpdates: {},
  validation: null,
  filters: {
    page: 1,
    limit: 20,
    sortBy: 'last_modified',
    sortOrder: 'DESC'
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  }
};

const techPackSlice = createSlice({
  name: 'techPack',
  initialState,
  reducers: {
    setCurrentTechPack: (state, action: PayloadAction<TechPack | null>) => {
      state.currentTechPack = action.payload;
    },
    
    setFilters: (state, action: PayloadAction<Partial<TechPackState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    clearValidation: (state) => {
      state.validation = null;
    },
    
    // Optimistic update actions
    optimisticUpdate: (state, action: PayloadAction<{
      id: string;
      updates: Partial<TechPack>;
      operation: string;
    }>) => {
      const { id, updates, operation } = action.payload;
      
      // Store the optimistic update
      state.optimisticUpdates[id] = {
        updates,
        operation,
        timestamp: Date.now()
      };
      
      // Apply the update to the current tech pack if it matches
      if (state.currentTechPack?.id === id) {
        state.currentTechPack = { ...state.currentTechPack, ...updates };
      }
      
      // Apply the update to the tech packs list
      const index = state.techPacks.findIndex(tp => tp.id === id);
      if (index !== -1) {
        if (operation === 'delete') {
          state.techPacks.splice(index, 1);
        } else {
          state.techPacks[index] = { ...state.techPacks[index], ...updates };
        }
      }
    },
    
    confirmOptimisticUpdate: (state, action: PayloadAction<{
      id: string;
      result: any;
    }>) => {
      const { id } = action.payload;
      delete state.optimisticUpdates[id];
    },
    
    rollbackOptimisticUpdate: (state, action: PayloadAction<{
      id: string;
      error: any;
    }>) => {
      const { id, error } = action.payload;
      delete state.optimisticUpdates[id];
      state.error = error.message || 'Optimistic update failed';
    },
    
    // Real-time update handlers
    handleRealtimeUpdate: (state, action: PayloadAction<{
      techPackId: string;
      module: string;
      updateData: any;
      timestamp: string;
    }>) => {
      const { techPackId, updateData } = action.payload;
      
      // Update current tech pack if it matches
      if (state.currentTechPack?.id === techPackId) {
        state.currentTechPack = { ...state.currentTechPack, ...updateData };
      }
      
      // Update tech packs list
      const index = state.techPacks.findIndex(tp => tp.id === techPackId);
      if (index !== -1) {
        state.techPacks[index] = { ...state.techPacks[index], ...updateData };
      }
    },
    
    // Cache management
    invalidateCache: (state) => {
      state.techPacks = [];
      state.currentTechPack = null;
      state.lastFetch = null;
    },
    
    // Offline support
    setOfflineMode: (state, action: PayloadAction<boolean>) => {
      // This would be handled by the offline service
    }
  },
  
  extraReducers: (builder) => {
    // Fetch tech packs
    builder
      .addCase(fetchTechPacks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTechPacks.fulfilled, (state, action) => {
        state.loading = false;
        state.techPacks = action.payload.data || [];
        state.pagination = action.payload.pagination || state.pagination;
        state.lastFetch = Date.now();
      })
      .addCase(fetchTechPacks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch tech packs';
      });
    
    // Fetch tech pack by ID
    builder
      .addCase(fetchTechPackById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTechPackById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTechPack = action.payload.data;
      })
      .addCase(fetchTechPackById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch tech pack';
      });
    
    // Create tech pack
    builder
      .addCase(createTechPack.fulfilled, (state, action) => {
        if (action.payload.data) {
          state.techPacks.unshift(action.payload.data);
          state.currentTechPack = action.payload.data;
        }
      });
    
    // Update tech pack
    builder
      .addCase(updateTechPack.fulfilled, (state, action) => {
        if (action.payload.data) {
          const index = state.techPacks.findIndex(tp => tp.id === action.payload.data.id);
          if (index !== -1) {
            state.techPacks[index] = action.payload.data;
          }
          if (state.currentTechPack?.id === action.payload.data.id) {
            state.currentTechPack = action.payload.data;
          }
        }
      });
    
    // Delete tech pack
    builder
      .addCase(deleteTechPack.fulfilled, (state, action) => {
        state.techPacks = state.techPacks.filter(tp => tp.id !== action.payload);
        if (state.currentTechPack?.id === action.payload) {
          state.currentTechPack = null;
        }
      });
    
    // Validate tech pack
    builder
      .addCase(validateTechPack.fulfilled, (state, action) => {
        state.validation = action.payload.data;
      });
  }
});

export const {
  setCurrentTechPack,
  setFilters,
  clearError,
  clearValidation,
  optimisticUpdate,
  confirmOptimisticUpdate,
  rollbackOptimisticUpdate,
  handleRealtimeUpdate,
  invalidateCache,
  setOfflineMode
} = techPackSlice.actions;

export default techPackSlice.reducer;
