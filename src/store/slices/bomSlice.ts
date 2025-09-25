import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { BOMItem } from '../../types';

// Async thunks
export const fetchBOMItems = createAsyncThunk(
  'bom/fetchBOMItems',
  async (techPackId: string) => {
    const response = await fetch(`/api/techpacks/${techPackId}/bom`);
    const data = await response.json();
    return data;
  }
);

export const createBOMItem = createAsyncThunk(
  'bom/createBOMItem',
  async ({ techPackId, item }: { techPackId: string; item: Partial<BOMItem> }) => {
    const response = await fetch(`/api/techpacks/${techPackId}/bom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    const data = await response.json();
    return data;
  }
);

export const updateBOMItem = createAsyncThunk(
  'bom/updateBOMItem',
  async ({ techPackId, itemId, updates }: { 
    techPackId: string; 
    itemId: string; 
    updates: Partial<BOMItem> 
  }) => {
    const response = await fetch(`/api/techpacks/${techPackId}/bom/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const data = await response.json();
    return data;
  }
);

export const deleteBOMItem = createAsyncThunk(
  'bom/deleteBOMItem',
  async ({ techPackId, itemId }: { techPackId: string; itemId: string }) => {
    await fetch(`/api/techpacks/${techPackId}/bom/${itemId}`, {
      method: 'DELETE'
    });
    return itemId;
  }
);

interface BOMState {
  items: BOMItem[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
  optimisticUpdates: Record<string, {
    updates: Partial<BOMItem>;
    operation: string;
    timestamp: number;
  }>;
  filters: {
    part?: string;
    supplier?: string;
    search?: string;
  };
  sortBy: {
    field: keyof BOMItem;
    direction: 'asc' | 'desc';
  };
}

const initialState: BOMState = {
  items: [],
  loading: false,
  error: null,
  lastFetch: null,
  optimisticUpdates: {},
  filters: {},
  sortBy: {
    field: 'createdAt',
    direction: 'desc'
  }
};

const bomSlice = createSlice({
  name: 'bom',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<BOMState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    setSortBy: (state, action: PayloadAction<BOMState['sortBy']>) => {
      state.sortBy = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    // Optimistic updates
    optimisticUpdate: (state, action: PayloadAction<{
      itemId: string;
      updates: Partial<BOMItem>;
      operation: 'create' | 'update' | 'delete';
    }>) => {
      const { itemId, updates, operation } = action.payload;
      
      state.optimisticUpdates[itemId] = {
        updates,
        operation,
        timestamp: Date.now()
      };
      
      if (operation === 'create') {
        state.items.unshift(updates as BOMItem);
      } else if (operation === 'update') {
        const index = state.items.findIndex(item => item.id === itemId);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...updates };
        }
      } else if (operation === 'delete') {
        state.items = state.items.filter(item => item.id !== itemId);
      }
    },
    
    confirmOptimisticUpdate: (state, action: PayloadAction<string>) => {
      delete state.optimisticUpdates[action.payload];
    },
    
    rollbackOptimisticUpdate: (state, action: PayloadAction<{
      itemId: string;
      error: any;
    }>) => {
      const { itemId, error } = action.payload;
      delete state.optimisticUpdates[itemId];
      state.error = error.message || 'BOM update failed';
    },
    
    // Real-time updates
    handleRealtimeUpdate: (state, action: PayloadAction<{
      techPackId: string;
      module: string;
      updateData: any;
    }>) => {
      const { updateData } = action.payload;
      
      if (updateData.bomItems) {
        state.items = updateData.bomItems;
        state.lastFetch = Date.now();
      }
    },
    
    // Bulk operations
    bulkUpdateItems: (state, action: PayloadAction<{
      itemIds: string[];
      updates: Partial<BOMItem>;
    }>) => {
      const { itemIds, updates } = action.payload;
      
      itemIds.forEach(itemId => {
        const index = state.items.findIndex(item => item.id === itemId);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...updates };
        }
      });
    },
    
    bulkDeleteItems: (state, action: PayloadAction<string[]>) => {
      const itemIds = action.payload;
      state.items = state.items.filter(item => !itemIds.includes(item.id));
    }
  },
  
  extraReducers: (builder) => {
    // Fetch BOM items
    builder
      .addCase(fetchBOMItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBOMItems.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data || [];
        state.lastFetch = Date.now();
      })
      .addCase(fetchBOMItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch BOM items';
      });
    
    // Create BOM item
    builder
      .addCase(createBOMItem.fulfilled, (state, action) => {
        if (action.payload.data) {
          state.items.unshift(action.payload.data);
        }
      });
    
    // Update BOM item
    builder
      .addCase(updateBOMItem.fulfilled, (state, action) => {
        if (action.payload.data) {
          const index = state.items.findIndex(item => item.id === action.payload.data.id);
          if (index !== -1) {
            state.items[index] = action.payload.data;
          }
        }
      });
    
    // Delete BOM item
    builder
      .addCase(deleteBOMItem.fulfilled, (state, action) => {
        state.items = state.items.filter(item => item.id !== action.payload);
      });
  }
});

export const {
  setFilters,
  setSortBy,
  clearError,
  optimisticUpdate,
  confirmOptimisticUpdate,
  rollbackOptimisticUpdate,
  handleRealtimeUpdate,
  bulkUpdateItems,
  bulkDeleteItems
} = bomSlice.actions;

export default bomSlice.reducer;
