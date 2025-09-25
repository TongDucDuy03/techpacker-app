import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { CareInstruction, CareSymbol } from '../../types';

// Async thunks
export const fetchCareInstructions = createAsyncThunk(
  'care/fetchCareInstructions',
  async (techPackId: string) => {
    const response = await fetch(`/api/techpacks/${techPackId}/care`);
    const data = await response.json();
    return data;
  }
);

export const createCareInstruction = createAsyncThunk(
  'care/createCareInstruction',
  async ({ techPackId, instruction }: { techPackId: string; instruction: Partial<CareInstruction> }) => {
    const response = await fetch(`/api/techpacks/${techPackId}/care`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(instruction)
    });
    const data = await response.json();
    return data;
  }
);

export const updateCareInstruction = createAsyncThunk(
  'care/updateCareInstruction',
  async ({ techPackId, instructionId, updates }: { 
    techPackId: string; 
    instructionId: string; 
    updates: Partial<CareInstruction> 
  }) => {
    const response = await fetch(`/api/techpacks/${techPackId}/care/${instructionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const data = await response.json();
    return data;
  }
);

export const deleteCareInstruction = createAsyncThunk(
  'care/deleteCareInstruction',
  async ({ techPackId, instructionId }: { techPackId: string; instructionId: string }) => {
    await fetch(`/api/techpacks/${techPackId}/care/${instructionId}`, {
      method: 'DELETE'
    });
    return instructionId;
  }
);

export const fetchCareSymbols = createAsyncThunk(
  'care/fetchCareSymbols',
  async () => {
    const response = await fetch('/api/care-symbols');
    const data = await response.json();
    return data;
  }
);

export const validateCareInstructions = createAsyncThunk(
  'care/validateCareInstructions',
  async (techPackId: string) => {
    const response = await fetch(`/api/techpacks/${techPackId}/care/validate`);
    const data = await response.json();
    return data;
  }
);

interface CareState {
  instructions: CareInstruction[];
  symbols: CareSymbol[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
  optimisticUpdates: Record<string, {
    updates: Partial<CareInstruction>;
    operation: string;
    timestamp: number;
  }>;
  filters: {
    language?: string;
    symbolType?: string;
    search?: string;
  };
  sortBy: {
    field: keyof CareInstruction;
    direction: 'asc' | 'desc';
  };
  selectedInstruction: CareInstruction | null;
  isEditing: boolean;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    compliance: any;
  } | null;
  compliance: {
    region: string;
    requirements: string[];
    status: 'compliant' | 'non-compliant' | 'warning';
  } | null;
}

const initialState: CareState = {
  instructions: [],
  symbols: [],
  loading: false,
  error: null,
  lastFetch: null,
  optimisticUpdates: {},
  filters: {},
  sortBy: {
    field: 'language',
    direction: 'asc'
  },
  selectedInstruction: null,
  isEditing: false,
  validation: null,
  compliance: null
};

const careSlice = createSlice({
  name: 'care',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<CareState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    setSortBy: (state, action: PayloadAction<CareState['sortBy']>) => {
      state.sortBy = action.payload;
    },
    
    setSelectedInstruction: (state, action: PayloadAction<CareInstruction | null>) => {
      state.selectedInstruction = action.payload;
    },
    
    setIsEditing: (state, action: PayloadAction<boolean>) => {
      state.isEditing = action.payload;
    },
    
    setCompliance: (state, action: PayloadAction<CareState['compliance']>) => {
      state.compliance = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    clearValidation: (state) => {
      state.validation = null;
    },
    
    // Optimistic updates
    optimisticUpdate: (state, action: PayloadAction<{
      instructionId: string;
      updates: Partial<CareInstruction>;
      operation: 'create' | 'update' | 'delete';
    }>) => {
      const { instructionId, updates, operation } = action.payload;
      
      state.optimisticUpdates[instructionId] = {
        updates,
        operation,
        timestamp: Date.now()
      };
      
      if (operation === 'create') {
        state.instructions.unshift(updates as CareInstruction);
      } else if (operation === 'update') {
        const index = state.instructions.findIndex(instruction => instruction.id === instructionId);
        if (index !== -1) {
          state.instructions[index] = { ...state.instructions[index], ...updates };
        }
      } else if (operation === 'delete') {
        state.instructions = state.instructions.filter(instruction => instruction.id !== instructionId);
      }
    },
    
    confirmOptimisticUpdate: (state, action: PayloadAction<string>) => {
      delete state.optimisticUpdates[action.payload];
    },
    
    rollbackOptimisticUpdate: (state, action: PayloadAction<{
      instructionId: string;
      error: any;
    }>) => {
      const { instructionId, error } = action.payload;
      delete state.optimisticUpdates[instructionId];
      state.error = error.message || 'Care instruction update failed';
    },
    
    // Real-time updates
    handleRealtimeUpdate: (state, action: PayloadAction<{
      techPackId: string;
      module: string;
      updateData: any;
    }>) => {
      const { updateData } = action.payload;
      
      if (updateData.careInstructions) {
        state.instructions = updateData.careInstructions;
        state.lastFetch = Date.now();
      }
    },
    
    // Symbol management
    addSymbol: (state, action: PayloadAction<{
      instructionId: string;
      symbolId: string;
    }>) => {
      const { instructionId, symbolId } = action.payload;
      const instruction = state.instructions.find(i => i.id === instructionId);
      if (instruction && !instruction.symbols.includes(symbolId)) {
        instruction.symbols.push(symbolId);
      }
    },
    
    removeSymbol: (state, action: PayloadAction<{
      instructionId: string;
      symbolId: string;
    }>) => {
      const { instructionId, symbolId } = action.payload;
      const instruction = state.instructions.find(i => i.id === instructionId);
      if (instruction) {
        instruction.symbols = instruction.symbols.filter(id => id !== symbolId);
      }
    },
    
    // Text instruction management
    addTextInstruction: (state, action: PayloadAction<{
      instructionId: string;
      text: string;
    }>) => {
      const { instructionId, text } = action.payload;
      const instruction = state.instructions.find(i => i.id === instructionId);
      if (instruction) {
        instruction.textInstructions.push(text);
      }
    },
    
    removeTextInstruction: (state, action: PayloadAction<{
      instructionId: string;
      index: number;
    }>) => {
      const { instructionId, index } = action.payload;
      const instruction = state.instructions.find(i => i.id === instructionId);
      if (instruction) {
        instruction.textInstructions.splice(index, 1);
      }
    },
    
    updateTextInstruction: (state, action: PayloadAction<{
      instructionId: string;
      index: number;
      text: string;
    }>) => {
      const { instructionId, index, text } = action.payload;
      const instruction = state.instructions.find(i => i.id === instructionId);
      if (instruction) {
        instruction.textInstructions[index] = text;
      }
    },
    
    // Bulk operations
    bulkUpdateInstructions: (state, action: PayloadAction<{
      instructionIds: string[];
      updates: Partial<CareInstruction>;
    }>) => {
      const { instructionIds, updates } = action.payload;
      
      instructionIds.forEach(instructionId => {
        const index = state.instructions.findIndex(instruction => instruction.id === instructionId);
        if (index !== -1) {
          state.instructions[index] = { ...state.instructions[index], ...updates };
        }
      });
    },
    
    bulkDeleteInstructions: (state, action: PayloadAction<string[]>) => {
      const instructionIds = action.payload;
      state.instructions = state.instructions.filter(instruction => !instructionIds.includes(instruction.id));
    },
    
    // Template operations
    applyTemplate: (state, action: PayloadAction<{
      templateId: string;
      instructions: CareInstruction[];
    }>) => {
      const { instructions } = action.payload;
      state.instructions = [...state.instructions, ...instructions];
    },
    
    saveAsTemplate: (state, action: PayloadAction<{
      name: string;
      description: string;
    }>) => {
      // This would save the current instructions as a template
    },
    
    // Compliance checking
    checkCompliance: (state, action: PayloadAction<{
      region: string;
      requirements: string[];
    }>) => {
      const { region, requirements } = action.payload;
      // This would check compliance against regional requirements
    }
  },
  
  extraReducers: (builder) => {
    // Fetch care instructions
    builder
      .addCase(fetchCareInstructions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCareInstructions.fulfilled, (state, action) => {
        state.loading = false;
        state.instructions = action.payload.data || [];
        state.lastFetch = Date.now();
      })
      .addCase(fetchCareInstructions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch care instructions';
      });
    
    // Fetch care symbols
    builder
      .addCase(fetchCareSymbols.fulfilled, (state, action) => {
        state.symbols = action.payload.data || [];
      });
    
    // Create care instruction
    builder
      .addCase(createCareInstruction.fulfilled, (state, action) => {
        if (action.payload.data) {
          state.instructions.unshift(action.payload.data);
        }
      });
    
    // Update care instruction
    builder
      .addCase(updateCareInstruction.fulfilled, (state, action) => {
        if (action.payload.data) {
          const index = state.instructions.findIndex(instruction => instruction.id === action.payload.data.id);
          if (index !== -1) {
            state.instructions[index] = action.payload.data;
          }
        }
      });
    
    // Delete care instruction
    builder
      .addCase(deleteCareInstruction.fulfilled, (state, action) => {
        state.instructions = state.instructions.filter(instruction => instruction.id !== action.payload);
      });
    
    // Validate care instructions
    builder
      .addCase(validateCareInstructions.fulfilled, (state, action) => {
        if (action.payload.data) {
          state.validation = action.payload.data;
        }
      });
  }
});

export const {
  setFilters,
  setSortBy,
  setSelectedInstruction,
  setIsEditing,
  setCompliance,
  clearError,
  clearValidation,
  optimisticUpdate,
  confirmOptimisticUpdate,
  rollbackOptimisticUpdate,
  handleRealtimeUpdate,
  addSymbol,
  removeSymbol,
  addTextInstruction,
  removeTextInstruction,
  updateTextInstruction,
  bulkUpdateInstructions,
  bulkDeleteInstructions,
  applyTemplate,
  saveAsTemplate,
  checkCompliance
} = careSlice.actions;

export default careSlice.reducer;
