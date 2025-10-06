import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { TechPack, TechPackFormState, ArticleInfo, BomItem, MeasurementPoint, HowToMeasure, Colorway, RevisionEntry } from '../types/techpack';

// Action types
type TechPackAction =
  | { type: 'SET_TECH_PACK'; payload: TechPack }
  | { type: 'UPDATE_ARTICLE_INFO'; payload: Partial<ArticleInfo> }
  | { type: 'ADD_BOM_ITEM'; payload: BomItem }
  | { type: 'UPDATE_BOM_ITEM'; payload: { index: number; item: Partial<BomItem> } }
  | { type: 'DELETE_BOM_ITEM'; payload: number }
  | { type: 'ADD_MEASUREMENT'; payload: MeasurementPoint }
  | { type: 'UPDATE_MEASUREMENT'; payload: { index: number; measurement: Partial<MeasurementPoint> } }
  | { type: 'DELETE_MEASUREMENT'; payload: number }
  | { type: 'ADD_HOW_TO_MEASURE'; payload: HowToMeasure }
  | { type: 'UPDATE_HOW_TO_MEASURE'; payload: { index: number; howTo: Partial<HowToMeasure> } }
  | { type: 'DELETE_HOW_TO_MEASURE'; payload: number }
  | { type: 'ADD_COLORWAY'; payload: Colorway }
  | { type: 'UPDATE_COLORWAY'; payload: { index: number; colorway: Partial<Colorway> } }
  | { type: 'DELETE_COLORWAY'; payload: number }
  | { type: 'ADD_REVISION'; payload: RevisionEntry }
  | { type: 'SET_CURRENT_TAB'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_LAST_SAVED'; payload: string }
  | { type: 'SET_UNSAVED_CHANGES'; payload: boolean }
  | { type: 'UPDATE_TAB_STATE'; payload: { tab: string; state: Partial<any> } };

// Initial state
const createInitialTechPack = (): TechPack => ({
  id: '',
  articleInfo: {
    articleCode: '',
    productName: '',
    version: 1,
    gender: 'Unisex',
    productClass: '',
    fitType: 'Regular',
    supplier: '',
    technicalDesigner: '',
    fabricDescription: '',
    season: 'Spring',
    lifecycleStage: 'Concept',
    createdDate: new Date().toISOString(),
    lastModified: new Date().toISOString(),
  },
  bom: [],
  measurements: [],
  howToMeasures: [],
  colorways: [],
  revisionHistory: [],
  status: 'Draft',
  completeness: {
    isComplete: false,
    missingItems: [],
    completionPercentage: 0,
  },
  createdBy: '',
  updatedBy: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const initialState: TechPackFormState = {
  techpack: createInitialTechPack(),
  currentTab: 0,
  tabStates: {},
  isLoading: false,
  isSaving: false,
  hasUnsavedChanges: false,
};

// Reducer
const techPackReducer = (state: TechPackFormState, action: TechPackAction): TechPackFormState => {
  switch (action.type) {
    case 'SET_TECH_PACK':
      return {
        ...state,
        techpack: action.payload,
        hasUnsavedChanges: false,
      };

    case 'UPDATE_ARTICLE_INFO':
      return {
        ...state,
        techpack: {
          ...state.techpack,
          articleInfo: { ...state.techpack.articleInfo, ...action.payload },
          updatedAt: new Date().toISOString(),
        },
        hasUnsavedChanges: true,
      };

    case 'ADD_BOM_ITEM':
      return {
        ...state,
        techpack: {
          ...state.techpack,
          bom: [...state.techpack.bom, action.payload],
          updatedAt: new Date().toISOString(),
        },
        hasUnsavedChanges: true,
      };

    case 'UPDATE_BOM_ITEM':
      return {
        ...state,
        techpack: {
          ...state.techpack,
          bom: state.techpack.bom.map((item, index) =>
            index === action.payload.index ? { ...item, ...action.payload.item } : item
          ),
          updatedAt: new Date().toISOString(),
        },
        hasUnsavedChanges: true,
      };

    case 'DELETE_BOM_ITEM':
      return {
        ...state,
        techpack: {
          ...state.techpack,
          bom: state.techpack.bom.filter((_, index) => index !== action.payload),
          updatedAt: new Date().toISOString(),
        },
        hasUnsavedChanges: true,
      };

    case 'ADD_MEASUREMENT':
      return {
        ...state,
        techpack: {
          ...state.techpack,
          measurements: [...state.techpack.measurements, action.payload],
          updatedAt: new Date().toISOString(),
        },
        hasUnsavedChanges: true,
      };

    case 'UPDATE_MEASUREMENT':
      return {
        ...state,
        techpack: {
          ...state.techpack,
          measurements: state.techpack.measurements.map((item, index) =>
            index === action.payload.index ? { ...item, ...action.payload.measurement } : item
          ),
          updatedAt: new Date().toISOString(),
        },
        hasUnsavedChanges: true,
      };

    case 'DELETE_MEASUREMENT':
      return {
        ...state,
        techpack: {
          ...state.techpack,
          measurements: state.techpack.measurements.filter((_, index) => index !== action.payload),
          updatedAt: new Date().toISOString(),
        },
        hasUnsavedChanges: true,
      };

    case 'ADD_COLORWAY':
      return {
        ...state,
        techpack: {
          ...state.techpack,
          colorways: [...state.techpack.colorways, action.payload],
          updatedAt: new Date().toISOString(),
        },
        hasUnsavedChanges: true,
      };

    case 'UPDATE_COLORWAY':
      return {
        ...state,
        techpack: {
          ...state.techpack,
          colorways: state.techpack.colorways.map((item, index) =>
            index === action.payload.index ? { ...item, ...action.payload.colorway } : item
          ),
          updatedAt: new Date().toISOString(),
        },
        hasUnsavedChanges: true,
      };

    case 'DELETE_COLORWAY':
      return {
        ...state,
        techpack: {
          ...state.techpack,
          colorways: state.techpack.colorways.filter((_, index) => index !== action.payload),
          updatedAt: new Date().toISOString(),
        },
        hasUnsavedChanges: true,
      };

    case 'ADD_REVISION':
      return {
        ...state,
        techpack: {
          ...state.techpack,
          revisionHistory: [action.payload, ...state.techpack.revisionHistory],
        },
      };

    case 'SET_CURRENT_TAB':
      return { ...state, currentTab: action.payload };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_SAVING':
      return { ...state, isSaving: action.payload };

    case 'SET_LAST_SAVED':
      return { ...state, lastSaved: action.payload };

    case 'SET_UNSAVED_CHANGES':
      return { ...state, hasUnsavedChanges: action.payload };

    case 'UPDATE_TAB_STATE':
      return {
        ...state,
        tabStates: {
          ...state.tabStates,
          [action.payload.tab]: { ...state.tabStates[action.payload.tab], ...action.payload.state },
        },
      };

    default:
      return state;
  }
};

// Context
interface TechPackContextType {
  state: TechPackFormState;
  dispatch: React.Dispatch<TechPackAction>;
  
  // Helper functions
  updateArticleInfo: (updates: Partial<ArticleInfo>) => void;
  addBomItem: (item: BomItem) => void;
  updateBomItem: (index: number, updates: Partial<BomItem>) => void;
  deleteBomItem: (index: number) => void;
  addMeasurement: (measurement: MeasurementPoint) => void;
  updateMeasurement: (index: number, updates: Partial<MeasurementPoint>) => void;
  deleteMeasurement: (index: number) => void;
  addColorway: (colorway: Colorway) => void;
  updateColorway: (index: number, updates: Partial<Colorway>) => void;
  deleteColorway: (index: number) => void;
  
  // Utility functions
  calculateCompleteness: () => void;
  saveTechPack: () => Promise<void>;
  loadTechPack: (id: string) => Promise<void>;
  exportToPDF: () => void;
  setCurrentTab: (tab: number) => void;
}

const TechPackContext = createContext<TechPackContextType | undefined>(undefined);

// Provider component
export const TechPackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(techPackReducer, initialState);

  // Helper functions
  const updateArticleInfo = useCallback((updates: Partial<ArticleInfo>) => {
    dispatch({ type: 'UPDATE_ARTICLE_INFO', payload: updates });
  }, []);

  const addBomItem = useCallback((item: BomItem) => {
    dispatch({ type: 'ADD_BOM_ITEM', payload: item });
  }, []);

  const updateBomItem = useCallback((index: number, updates: Partial<BomItem>) => {
    dispatch({ type: 'UPDATE_BOM_ITEM', payload: { index, item: updates } });
  }, []);

  const deleteBomItem = useCallback((index: number) => {
    dispatch({ type: 'DELETE_BOM_ITEM', payload: index });
  }, []);

  const addMeasurement = useCallback((measurement: MeasurementPoint) => {
    dispatch({ type: 'ADD_MEASUREMENT', payload: measurement });
  }, []);

  const updateMeasurement = useCallback((index: number, updates: Partial<MeasurementPoint>) => {
    dispatch({ type: 'UPDATE_MEASUREMENT', payload: { index, measurement: updates } });
  }, []);

  const deleteMeasurement = useCallback((index: number) => {
    dispatch({ type: 'DELETE_MEASUREMENT', payload: index });
  }, []);

  const addColorway = useCallback((colorway: Colorway) => {
    dispatch({ type: 'ADD_COLORWAY', payload: colorway });
  }, []);

  const updateColorway = useCallback((index: number, updates: Partial<Colorway>) => {
    dispatch({ type: 'UPDATE_COLORWAY', payload: { index, colorway: updates } });
  }, []);

  const deleteColorway = useCallback((index: number) => {
    dispatch({ type: 'DELETE_COLORWAY', payload: index });
  }, []);

  const setCurrentTab = useCallback((tab: number) => {
    dispatch({ type: 'SET_CURRENT_TAB', payload: tab });
  }, []);

  // Utility functions
  const calculateCompleteness = useCallback(() => {
    const { techpack } = state;
    const missingItems: string[] = [];
    let completionPercentage = 0;

    // Check article info completeness
    if (!techpack.articleInfo.articleCode) missingItems.push('Article Code');
    if (!techpack.articleInfo.productName) missingItems.push('Product Name');
    if (!techpack.articleInfo.fabricDescription) missingItems.push('Fabric Description');
    
    // Check BOM completeness
    if (techpack.bom.length === 0) missingItems.push('Bill of Materials');
    
    // Check measurements completeness
    if (techpack.measurements.length === 0) missingItems.push('Measurement Chart');
    
    // Check colorways completeness
    if (techpack.colorways.length === 0) missingItems.push('Colorways');

    // Calculate completion percentage
    const totalSections = 4; // Article, BOM, Measurements, Colorways
    const completedSections = totalSections - missingItems.length;
    completionPercentage = Math.round((completedSections / totalSections) * 100);

    // Update techpack completeness
    dispatch({
      type: 'SET_TECH_PACK',
      payload: {
        ...techpack,
        completeness: {
          isComplete: missingItems.length === 0,
          missingItems,
          completionPercentage,
        },
      },
    });
  }, [state]);

  const saveTechPack = useCallback(async () => {
    dispatch({ type: 'SET_SAVING', payload: true });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Save to localStorage as fallback
      localStorage.setItem(`techpack_${state.techpack.id}`, JSON.stringify(state.techpack));
      
      dispatch({ type: 'SET_LAST_SAVED', payload: new Date().toISOString() });
      dispatch({ type: 'SET_UNSAVED_CHANGES', payload: false });
    } catch (error) {
      console.error('Failed to save tech pack:', error);
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false });
    }
  }, [state.techpack]);

  const loadTechPack = useCallback(async (id: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Try to load from localStorage first
      const saved = localStorage.getItem(`techpack_${id}`);
      if (saved) {
        const techpack = JSON.parse(saved);
        dispatch({ type: 'SET_TECH_PACK', payload: techpack });
      }
    } catch (error) {
      console.error('Failed to load tech pack:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const exportToPDF = useCallback(() => {
    // TODO: Implement PDF export functionality
    console.log('Exporting to PDF...');
  }, []);

  // Auto-save functionality
  useEffect(() => {
    if (state.hasUnsavedChanges && !state.isSaving) {
      const timer = setTimeout(() => {
        saveTechPack();
      }, 2000); // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timer);
    }
  }, [state.hasUnsavedChanges, state.isSaving, saveTechPack]);

  // Calculate completeness when techpack changes
  useEffect(() => {
    calculateCompleteness();
  }, [state.techpack.articleInfo, state.techpack.bom, state.techpack.measurements, state.techpack.colorways]);

  const contextValue: TechPackContextType = {
    state,
    dispatch,
    updateArticleInfo,
    addBomItem,
    updateBomItem,
    deleteBomItem,
    addMeasurement,
    updateMeasurement,
    deleteMeasurement,
    addColorway,
    updateColorway,
    deleteColorway,
    calculateCompleteness,
    saveTechPack,
    loadTechPack,
    exportToPDF,
    setCurrentTab,
  };

  return (
    <TechPackContext.Provider value={contextValue}>
      {children}
    </TechPackContext.Provider>
  );
};

// Hook to use the context
export const useTechPack = () => {
  const context = useContext(TechPackContext);
  if (context === undefined) {
    throw new Error('useTechPack must be used within a TechPackProvider');
  }
  return context;
};

export default TechPackContext;
