import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// Async thunks
export const validateTechPackData = createAsyncThunk(
  'validation/validateTechPackData',
  async (techPackId: string) => {
    const response = await fetch(`/api/techpacks/${techPackId}/validate`);
    const data = await response.json();
    return data;
  }
);

export const validateBusinessRules = createAsyncThunk(
  'validation/validateBusinessRules',
  async ({ techPackId, ruleType }: { techPackId: string; ruleType: string }) => {
    const response = await fetch(`/api/techpacks/${techPackId}/validate/${ruleType}`, {
      method: 'POST'
    });
    const data = await response.json();
    return data;
  }
);

export const validateCrossModuleConsistency = createAsyncThunk(
  'validation/validateCrossModuleConsistency',
  async (techPackId: string) => {
    const response = await fetch(`/api/techpacks/${techPackId}/consistency`);
    const data = await response.json();
    return data;
  }
);

interface ValidationState {
  currentValidation: {
    techPackId: string | null;
    isValid: boolean;
    errors: string[];
    warnings: string[];
    completeness: {
      basic: number;
      bom: number;
      measurements: number;
      construction: number;
      care: number;
      overall: number;
    };
    consistency: {
      isValid: boolean;
      errors: string[];
      warnings: string[];
    };
    lastValidated: number | null;
  } | null;
  
  validationHistory: Array<{
    id: string;
    techPackId: string;
    timestamp: number;
    isValid: boolean;
    errorCount: number;
    warningCount: number;
  }>;
  
  businessRuleValidations: Record<string, {
    exportReady: boolean;
    productionReady: boolean;
    approvalReady: boolean;
    lastChecked: number;
  }>;
  
  loading: boolean;
  error: string | null;
  
  // Real-time validation settings
  autoValidate: boolean;
  validationInterval: number; // in milliseconds
  validationTimeout: number; // in milliseconds
}

const initialState: ValidationState = {
  currentValidation: null,
  validationHistory: [],
  businessRuleValidations: {},
  loading: false,
  error: null,
  autoValidate: true,
  validationInterval: 30000, // 30 seconds
  validationTimeout: 10000 // 10 seconds
};

const validationSlice = createSlice({
  name: 'validation',
  initialState,
  reducers: {
    setCurrentValidation: (state, action: PayloadAction<ValidationState['currentValidation']>) => {
      state.currentValidation = action.payload;
      
      if (action.payload) {
        // Add to history
        state.validationHistory.unshift({
          id: `validation_${Date.now()}`,
          techPackId: action.payload.techPackId!,
          timestamp: action.payload.lastValidated!,
          isValid: action.payload.isValid,
          errorCount: action.payload.errors.length,
          warningCount: action.payload.warnings.length
        });
        
        // Keep only last 50 validations
        if (state.validationHistory.length > 50) {
          state.validationHistory = state.validationHistory.slice(0, 50);
        }
      }
    },
    
    clearCurrentValidation: (state) => {
      state.currentValidation = null;
    },
    
    updateBusinessRuleValidation: (state, action: PayloadAction<{
      techPackId: string;
      ruleType: 'exportReady' | 'productionReady' | 'approvalReady';
      isValid: boolean;
    }>) => {
      const { techPackId, ruleType, isValid } = action.payload;
      
      if (!state.businessRuleValidations[techPackId]) {
        state.businessRuleValidations[techPackId] = {
          exportReady: false,
          productionReady: false,
          approvalReady: false,
          lastChecked: 0
        };
      }
      
      state.businessRuleValidations[techPackId][ruleType] = isValid;
      state.businessRuleValidations[techPackId].lastChecked = Date.now();
    },
    
    setAutoValidate: (state, action: PayloadAction<boolean>) => {
      state.autoValidate = action.payload;
    },
    
    setValidationInterval: (state, action: PayloadAction<number>) => {
      state.validationInterval = action.payload;
    },
    
    setValidationTimeout: (state, action: PayloadAction<number>) => {
      state.validationTimeout = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    clearValidationHistory: (state) => {
      state.validationHistory = [];
    },
    
    // Real-time validation updates
    handleRealtimeValidationUpdate: (state, action: PayloadAction<{
      techPackId: string;
      validation: any;
    }>) => {
      const { techPackId, validation } = action.payload;
      
      if (state.currentValidation?.techPackId === techPackId) {
        state.currentValidation = {
          ...validation,
          techPackId,
          lastValidated: Date.now()
        };
      }
    },
    
    // Validation progress tracking
    setValidationProgress: (state, action: PayloadAction<{
      techPackId: string;
      progress: number;
      stage: string;
    }>) => {
      // This could be used to show validation progress in the UI
    }
  },
  
  extraReducers: (builder) => {
    // Validate tech pack data
    builder
      .addCase(validateTechPackData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(validateTechPackData.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.success && action.payload.data) {
          state.currentValidation = {
            ...action.payload.data,
            lastValidated: Date.now()
          };
        } else {
          state.error = action.payload.message || 'Validation failed';
        }
      })
      .addCase(validateTechPackData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Validation failed';
      });
    
    // Validate business rules
    builder
      .addCase(validateBusinessRules.fulfilled, (state, action) => {
        if (action.payload.success && action.payload.data) {
          const { techPackId, ruleType } = action.meta.arg;
          const isValid = action.payload.data.isValid;
          
          if (!state.businessRuleValidations[techPackId]) {
            state.businessRuleValidations[techPackId] = {
              exportReady: false,
              productionReady: false,
              approvalReady: false,
              lastChecked: 0
            };
          }
          
          state.businessRuleValidations[techPackId][ruleType as keyof typeof state.businessRuleValidations[string]] = isValid;
          state.businessRuleValidations[techPackId].lastChecked = Date.now();
        }
      });
    
    // Validate cross-module consistency
    builder
      .addCase(validateCrossModuleConsistency.fulfilled, (state, action) => {
        if (action.payload.success && action.payload.data) {
          // Update current validation with consistency results
          if (state.currentValidation) {
            state.currentValidation.consistency = action.payload.data;
          }
        }
      });
  }
});

export const {
  setCurrentValidation,
  clearCurrentValidation,
  updateBusinessRuleValidation,
  setAutoValidate,
  setValidationInterval,
  setValidationTimeout,
  clearError,
  clearValidationHistory,
  handleRealtimeValidationUpdate,
  setValidationProgress
} = validationSlice.actions;

export default validationSlice.reducer;
