import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { POMSpecification } from '../../types';

// Async thunks
export const fetchMeasurements = createAsyncThunk(
  'measurement/fetchMeasurements',
  async (techPackId: string) => {
    const response = await fetch(`/api/techpacks/${techPackId}/measurements`);
    const data = await response.json();
    return data;
  }
);

export const createMeasurement = createAsyncThunk(
  'measurement/createMeasurement',
  async ({ techPackId, spec }: { techPackId: string; spec: Partial<POMSpecification> }) => {
    const response = await fetch(`/api/techpacks/${techPackId}/measurements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(spec)
    });
    const data = await response.json();
    return data;
  }
);

export const updateMeasurement = createAsyncThunk(
  'measurement/updateMeasurement',
  async ({ techPackId, specId, updates }: { 
    techPackId: string; 
    specId: string; 
    updates: Partial<POMSpecification> 
  }) => {
    const response = await fetch(`/api/techpacks/${techPackId}/measurements/${specId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const data = await response.json();
    return data;
  }
);

export const deleteMeasurement = createAsyncThunk(
  'measurement/deleteMeasurement',
  async ({ techPackId, specId }: { techPackId: string; specId: string }) => {
    await fetch(`/api/techpacks/${techPackId}/measurements/${specId}`, {
      method: 'DELETE'
    });
    return specId;
  }
);

export const validateMeasurements = createAsyncThunk(
  'measurement/validateMeasurements',
  async (techPackId: string) => {
    const response = await fetch(`/api/techpacks/${techPackId}/measurements/validate`);
    const data = await response.json();
    return data;
  }
);

interface MeasurementState {
  specifications: POMSpecification[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
  optimisticUpdates: Record<string, {
    updates: Partial<POMSpecification>;
    operation: string;
    timestamp: number;
  }>;
  filters: {
    category?: string;
    pomCode?: string;
    search?: string;
  };
  sortBy: {
    field: keyof POMSpecification;
    direction: 'asc' | 'desc';
  };
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } | null;
  units: 'inches' | 'cm';
  sizeChart: {
    sizes: string[];
    variations: string[];
  } | null;
}

const initialState: MeasurementState = {
  specifications: [],
  loading: false,
  error: null,
  lastFetch: null,
  optimisticUpdates: {},
  filters: {},
  sortBy: {
    field: 'pomName',
    direction: 'asc'
  },
  validation: null,
  units: 'inches',
  sizeChart: null
};

const measurementSlice = createSlice({
  name: 'measurement',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<MeasurementState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    setSortBy: (state, action: PayloadAction<MeasurementState['sortBy']>) => {
      state.sortBy = action.payload;
    },
    
    setUnits: (state, action: PayloadAction<'inches' | 'cm'>) => {
      state.units = action.payload;
    },
    
    setSizeChart: (state, action: PayloadAction<MeasurementState['sizeChart']>) => {
      state.sizeChart = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    clearValidation: (state) => {
      state.validation = null;
    },
    
    // Optimistic updates
    optimisticUpdate: (state, action: PayloadAction<{
      specId: string;
      updates: Partial<POMSpecification>;
      operation: 'create' | 'update' | 'delete';
    }>) => {
      const { specId, updates, operation } = action.payload;
      
      state.optimisticUpdates[specId] = {
        updates,
        operation,
        timestamp: Date.now()
      };
      
      if (operation === 'create') {
        state.specifications.unshift(updates as POMSpecification);
      } else if (operation === 'update') {
        const index = state.specifications.findIndex(spec => spec.id === specId);
        if (index !== -1) {
          state.specifications[index] = { ...state.specifications[index], ...updates };
        }
      } else if (operation === 'delete') {
        state.specifications = state.specifications.filter(spec => spec.id !== specId);
      }
    },
    
    confirmOptimisticUpdate: (state, action: PayloadAction<string>) => {
      delete state.optimisticUpdates[action.payload];
    },
    
    rollbackOptimisticUpdate: (state, action: PayloadAction<{
      specId: string;
      error: any;
    }>) => {
      const { specId, error } = action.payload;
      delete state.optimisticUpdates[specId];
      state.error = error.message || 'Measurement update failed';
    },
    
    // Real-time updates
    handleRealtimeUpdate: (state, action: PayloadAction<{
      techPackId: string;
      module: string;
      updateData: any;
    }>) => {
      const { updateData } = action.payload;
      
      if (updateData.measurements) {
        state.specifications = updateData.measurements;
        state.lastFetch = Date.now();
      }
    },
    
    // Measurement calculations
    calculateGrading: (state, action: PayloadAction<{
      baseSize: string;
      sizeRange: string[];
      increments: Record<string, number>;
    }>) => {
      const { baseSize, sizeRange, increments } = action.payload;
      
      // This would contain logic to calculate grading for all measurements
      // based on the base size and increments
    },
    
    // Bulk operations
    bulkUpdateMeasurements: (state, action: PayloadAction<{
      specIds: string[];
      updates: Partial<POMSpecification>;
    }>) => {
      const { specIds, updates } = action.payload;
      
      specIds.forEach(specId => {
        const index = state.specifications.findIndex(spec => spec.id === specId);
        if (index !== -1) {
          state.specifications[index] = { ...state.specifications[index], ...updates };
        }
      });
    },
    
    bulkDeleteMeasurements: (state, action: PayloadAction<string[]>) => {
      const specIds = action.payload;
      state.specifications = state.specifications.filter(spec => !specIds.includes(spec.id));
    },
    
    // Import/Export
    importMeasurements: (state, action: PayloadAction<POMSpecification[]>) => {
      state.specifications = action.payload;
    },
    
    exportMeasurements: (state) => {
      // This would trigger an export action
    }
  },
  
  extraReducers: (builder) => {
    // Fetch measurements
    builder
      .addCase(fetchMeasurements.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMeasurements.fulfilled, (state, action) => {
        state.loading = false;
        state.specifications = action.payload.data || [];
        state.lastFetch = Date.now();
      })
      .addCase(fetchMeasurements.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch measurements';
      });
    
    // Create measurement
    builder
      .addCase(createMeasurement.fulfilled, (state, action) => {
        if (action.payload.data) {
          state.specifications.unshift(action.payload.data);
        }
      });
    
    // Update measurement
    builder
      .addCase(updateMeasurement.fulfilled, (state, action) => {
        if (action.payload.data) {
          const index = state.specifications.findIndex(spec => spec.id === action.payload.data.id);
          if (index !== -1) {
            state.specifications[index] = action.payload.data;
          }
        }
      });
    
    // Delete measurement
    builder
      .addCase(deleteMeasurement.fulfilled, (state, action) => {
        state.specifications = state.specifications.filter(spec => spec.id !== action.payload);
      });
    
    // Validate measurements
    builder
      .addCase(validateMeasurements.fulfilled, (state, action) => {
        if (action.payload.data) {
          state.validation = action.payload.data;
        }
      });
  }
});

export const {
  setFilters,
  setSortBy,
  setUnits,
  setSizeChart,
  clearError,
  clearValidation,
  optimisticUpdate,
  confirmOptimisticUpdate,
  rollbackOptimisticUpdate,
  handleRealtimeUpdate,
  calculateGrading,
  bulkUpdateMeasurements,
  bulkDeleteMeasurements,
  importMeasurements,
  exportMeasurements
} = measurementSlice.actions;

export default measurementSlice.reducer;
