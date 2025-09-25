import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ConstructionDetail } from '../../types';

// Async thunks
export const fetchConstructionDetails = createAsyncThunk(
  'construction/fetchConstructionDetails',
  async (techPackId: string) => {
    const response = await fetch(`/api/techpacks/${techPackId}/construction`);
    const data = await response.json();
    return data;
  }
);

export const createConstructionDetail = createAsyncThunk(
  'construction/createConstructionDetail',
  async ({ techPackId, detail }: { techPackId: string; detail: Partial<ConstructionDetail> }) => {
    const response = await fetch(`/api/techpacks/${techPackId}/construction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(detail)
    });
    const data = await response.json();
    return data;
  }
);

export const updateConstructionDetail = createAsyncThunk(
  'construction/updateConstructionDetail',
  async ({ techPackId, detailId, updates }: { 
    techPackId: string; 
    detailId: string; 
    updates: Partial<ConstructionDetail> 
  }) => {
    const response = await fetch(`/api/techpacks/${techPackId}/construction/${detailId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const data = await response.json();
    return data;
  }
);

export const deleteConstructionDetail = createAsyncThunk(
  'construction/deleteConstructionDetail',
  async ({ techPackId, detailId }: { techPackId: string; detailId: string }) => {
    await fetch(`/api/techpacks/${techPackId}/construction/${detailId}`, {
      method: 'DELETE'
    });
    return detailId;
  }
);

interface ConstructionState {
  details: ConstructionDetail[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
  optimisticUpdates: Record<string, {
    updates: Partial<ConstructionDetail>;
    operation: string;
    timestamp: number;
  }>;
  filters: {
    category?: string;
    difficulty?: string;
    search?: string;
  };
  sortBy: {
    field: keyof ConstructionDetail;
    direction: 'asc' | 'desc';
  };
  selectedDetail: ConstructionDetail | null;
  isEditing: boolean;
  sequence: {
    isReordering: boolean;
    draggedItem: string | null;
  };
}

const initialState: ConstructionState = {
  details: [],
  loading: false,
  error: null,
  lastFetch: null,
  optimisticUpdates: {},
  filters: {},
  sortBy: {
    field: 'sequence',
    direction: 'asc'
  },
  selectedDetail: null,
  isEditing: false,
  sequence: {
    isReordering: false,
    draggedItem: null
  }
};

const constructionSlice = createSlice({
  name: 'construction',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<ConstructionState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    setSortBy: (state, action: PayloadAction<ConstructionState['sortBy']>) => {
      state.sortBy = action.payload;
    },
    
    setSelectedDetail: (state, action: PayloadAction<ConstructionDetail | null>) => {
      state.selectedDetail = action.payload;
    },
    
    setIsEditing: (state, action: PayloadAction<boolean>) => {
      state.isEditing = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    // Optimistic updates
    optimisticUpdate: (state, action: PayloadAction<{
      detailId: string;
      updates: Partial<ConstructionDetail>;
      operation: 'create' | 'update' | 'delete';
    }>) => {
      const { detailId, updates, operation } = action.payload;
      
      state.optimisticUpdates[detailId] = {
        updates,
        operation,
        timestamp: Date.now()
      };
      
      if (operation === 'create') {
        state.details.unshift(updates as ConstructionDetail);
      } else if (operation === 'update') {
        const index = state.details.findIndex(detail => detail.id === detailId);
        if (index !== -1) {
          state.details[index] = { ...state.details[index], ...updates };
        }
      } else if (operation === 'delete') {
        state.details = state.details.filter(detail => detail.id !== detailId);
      }
    },
    
    confirmOptimisticUpdate: (state, action: PayloadAction<string>) => {
      delete state.optimisticUpdates[action.payload];
    },
    
    rollbackOptimisticUpdate: (state, action: PayloadAction<{
      detailId: string;
      error: any;
    }>) => {
      const { detailId, error } = action.payload;
      delete state.optimisticUpdates[detailId];
      state.error = error.message || 'Construction detail update failed';
    },
    
    // Real-time updates
    handleRealtimeUpdate: (state, action: PayloadAction<{
      techPackId: string;
      module: string;
      updateData: any;
    }>) => {
      const { updateData } = action.payload;
      
      if (updateData.constructionDetails) {
        state.details = updateData.constructionDetails;
        state.lastFetch = Date.now();
      }
    },
    
    // Sequence management
    startReordering: (state, action: PayloadAction<string>) => {
      state.sequence.isReordering = true;
      state.sequence.draggedItem = action.payload;
    },
    
    endReordering: (state) => {
      state.sequence.isReordering = false;
      state.sequence.draggedItem = null;
    },
    
    reorderDetails: (state, action: PayloadAction<{
      fromIndex: number;
      toIndex: number;
    }>) => {
      const { fromIndex, toIndex } = action.payload;
      const [movedItem] = state.details.splice(fromIndex, 1);
      state.details.splice(toIndex, 0, movedItem);
      
      // Update sequence numbers
      state.details.forEach((detail, index) => {
        detail.sequence = index + 1;
      });
    },
    
    updateSequence: (state, action: PayloadAction<{
      detailId: string;
      newSequence: number;
    }>) => {
      const { detailId, newSequence } = action.payload;
      const detail = state.details.find(d => d.id === detailId);
      if (detail) {
        detail.sequence = newSequence;
      }
    },
    
    // Bulk operations
    bulkUpdateDetails: (state, action: PayloadAction<{
      detailIds: string[];
      updates: Partial<ConstructionDetail>;
    }>) => {
      const { detailIds, updates } = action.payload;
      
      detailIds.forEach(detailId => {
        const index = state.details.findIndex(detail => detail.id === detailId);
        if (index !== -1) {
          state.details[index] = { ...state.details[index], ...updates };
        }
      });
    },
    
    bulkDeleteDetails: (state, action: PayloadAction<string[]>) => {
      const detailIds = action.payload;
      state.details = state.details.filter(detail => !detailIds.includes(detail.id));
    },
    
    // Template operations
    applyTemplate: (state, action: PayloadAction<{
      templateId: string;
      details: ConstructionDetail[];
    }>) => {
      const { details } = action.payload;
      state.details = [...state.details, ...details];
    },
    
    saveAsTemplate: (state, action: PayloadAction<{
      name: string;
      description: string;
    }>) => {
      // This would save the current details as a template
    }
  },
  
  extraReducers: (builder) => {
    // Fetch construction details
    builder
      .addCase(fetchConstructionDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConstructionDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.details = action.payload.data || [];
        state.lastFetch = Date.now();
      })
      .addCase(fetchConstructionDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch construction details';
      });
    
    // Create construction detail
    builder
      .addCase(createConstructionDetail.fulfilled, (state, action) => {
        if (action.payload.data) {
          state.details.unshift(action.payload.data);
        }
      });
    
    // Update construction detail
    builder
      .addCase(updateConstructionDetail.fulfilled, (state, action) => {
        if (action.payload.data) {
          const index = state.details.findIndex(detail => detail.id === action.payload.data.id);
          if (index !== -1) {
            state.details[index] = action.payload.data;
          }
        }
      });
    
    // Delete construction detail
    builder
      .addCase(deleteConstructionDetail.fulfilled, (state, action) => {
        state.details = state.details.filter(detail => detail.id !== action.payload);
      });
  }
});

export const {
  setFilters,
  setSortBy,
  setSelectedDetail,
  setIsEditing,
  clearError,
  optimisticUpdate,
  confirmOptimisticUpdate,
  rollbackOptimisticUpdate,
  handleRealtimeUpdate,
  startReordering,
  endReordering,
  reorderDetails,
  updateSequence,
  bulkUpdateDetails,
  bulkDeleteDetails,
  applyTemplate,
  saveAsTemplate
} = constructionSlice.actions;

export default constructionSlice.reducer;
