import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { TechPack, CreateTechPackInput, TechPackListResponse, TechPackFormState, MeasurementPoint, HowToMeasure, BomItem, Colorway } from '../types/techpack';
import { api } from '../lib/api';
import { showPromise, showError } from '../lib/toast';

interface TechPackContextType {
  techPacks: TechPack[];
  loading: boolean;
  pagination: Omit<TechPackListResponse, 'data'>;
  state: TechPackFormState;
  loadTechPacks: (params?: { page?: number; limit?: number; q?: string; status?: string }) => Promise<void>;
  createTechPack: (data: CreateTechPackInput) => Promise<TechPack | undefined>;
  updateTechPack: (id: string, data: Partial<TechPack>) => Promise<TechPack | undefined>;
  deleteTechPack: (id: string) => Promise<void>;
  getTechPack: (id: string) => Promise<TechPack | undefined>;
  setCurrentTab: (tab: number) => void;
  saveTechPack: () => Promise<void>;
  exportToPDF: () => void;
  addMeasurement: (measurement: MeasurementPoint) => void;
  updateMeasurement: (index: number, measurement: MeasurementPoint) => void;
  deleteMeasurement: (index: number) => void;
  addHowToMeasure: (howToMeasure: HowToMeasure) => void;
  updateHowToMeasure: (index: number, howToMeasure: HowToMeasure) => void;
  deleteHowToMeasure: (index: number) => void;
  addBomItem: (bomItem: BomItem) => void;
  updateBomItem: (index: number, bomItem: BomItem) => void;
  deleteBomItem: (index: number) => void;
  addColorway: (colorway: Colorway) => void;
  updateColorway: (index: number, colorway: Colorway) => void;
  deleteColorway: (index: number) => void;
}

const TechPackContext = createContext<TechPackContextType | undefined>(undefined);

export const TechPackProvider = ({ children }: { children: ReactNode }) => {
  const [techPacks, setTechPacks] = useState<TechPack[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pagination, setPagination] = useState<Omit<TechPackListResponse, 'data'>>({ total: 0, page: 1, totalPages: 1 });

  // Initialize default TechPack state
  const [state, setState] = useState<TechPackFormState>({
    techpack: {
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
        season: 'SS25',
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
    },
    currentTab: 0,
    tabStates: {},
    isLoading: false,
    isSaving: false,
    hasUnsavedChanges: false,
  });

  const loadTechPacks = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const response = await api.listTechPacks(params);
      setTechPacks(response.data);
      setPagination({ total: response.total, page: response.page, totalPages: response.totalPages });
    } catch (error: any) {
      showError(error.message || 'Failed to load tech packs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTechPacks();
  }, [loadTechPacks]);

  const createTechPack = async (data: CreateTechPackInput) => {
    try {
      const newTechPack = await showPromise(
        api.createTechPack(data),
        {
          loading: 'Creating tech pack...',
          success: 'Tech pack created successfully!',
          error: (err) => err.message || 'Failed to create tech pack',
        }
      );
      await loadTechPacks();
      return newTechPack;
    } catch (error) {
      // Error is already handled by showPromise
    }
  };

  const updateTechPack = async (id: string, data: Partial<TechPack>) => {
    try {
      const updatedTechPack = await showPromise(
        api.updateTechPack(id, data),
        {
          loading: 'Updating tech pack...',
          success: 'Tech pack updated successfully!',
          error: (err) => err.message || 'Failed to update tech pack',
        }
      );
      await loadTechPacks();
      return updatedTechPack;
    } catch (error) {
      // Error is already handled by showPromise
    }
  };

  const deleteTechPack = async (id: string) => {
    try {
      await showPromise(
        api.deleteTechPack(id),
        {
          loading: 'Deleting tech pack...',
          success: 'Tech pack archived successfully!',
          error: (err) => err.message || 'Failed to delete tech pack',
        }
      );
      await loadTechPacks();
    } catch (error) {
      // Error is already handled by showPromise
    }
  };

  const getTechPack = async (id: string) => {
    setLoading(true);
    try {
      return await api.getTechPack(id);
    } catch (error: any) {
      showError(error.message || 'Failed to fetch tech pack');
    } finally {
      setLoading(false);
    }
  };

  // Form-specific methods
  const setCurrentTab = (tab: number) => {
    setState(prev => ({ ...prev, currentTab: tab }));
  };

  const saveTechPack = async () => {
    setState(prev => ({ ...prev, isSaving: true }));
    try {
      // Simulate save operation
      await new Promise(resolve => setTimeout(resolve, 1000));
      setState(prev => ({
        ...prev,
        isSaving: false,
        hasUnsavedChanges: false,
        lastSaved: new Date().toISOString()
      }));
    } catch (error) {
      setState(prev => ({ ...prev, isSaving: false }));
      showError('Failed to save tech pack');
    }
  };

  const exportToPDF = () => {
    // Simulate PDF export
    console.log('Exporting to PDF...');
  };

  const addMeasurement = (measurement: MeasurementPoint) => {
    setState(prev => ({
      ...prev,
      techpack: {
        ...prev.techpack,
        measurements: [...prev.techpack.measurements, measurement]
      },
      hasUnsavedChanges: true
    }));
  };

  const updateMeasurement = (index: number, measurement: MeasurementPoint) => {
    setState(prev => ({
      ...prev,
      techpack: {
        ...prev.techpack,
        measurements: prev.techpack.measurements.map((m, i) => i === index ? measurement : m)
      },
      hasUnsavedChanges: true
    }));
  };

  const deleteMeasurement = (index: number) => {
    setState(prev => ({
      ...prev,
      techpack: {
        ...prev.techpack,
        measurements: prev.techpack.measurements.filter((_, i) => i !== index)
      },
      hasUnsavedChanges: true
    }));
  };

  const addHowToMeasure = (howToMeasure: HowToMeasure) => {
    setState(prev => ({
      ...prev,
      techpack: {
        ...prev.techpack,
        howToMeasures: [...prev.techpack.howToMeasures, howToMeasure]
      },
      hasUnsavedChanges: true
    }));
  };

  const updateHowToMeasure = (index: number, howToMeasure: HowToMeasure) => {
    setState(prev => ({
      ...prev,
      techpack: {
        ...prev.techpack,
        howToMeasures: prev.techpack.howToMeasures.map((htm, i) => i === index ? howToMeasure : htm)
      },
      hasUnsavedChanges: true
    }));
  };

  const deleteHowToMeasure = (index: number) => {
    setState(prev => ({
      ...prev,
      techpack: {
        ...prev.techpack,
        howToMeasures: prev.techpack.howToMeasures.filter((_, i) => i !== index)
      },
      hasUnsavedChanges: true
    }));
  };

  const addBomItem = (bomItem: BomItem) => {
    setState(prev => ({
      ...prev,
      techpack: {
        ...prev.techpack,
        bom: [...prev.techpack.bom, bomItem]
      },
      hasUnsavedChanges: true
    }));
  };

  const updateBomItem = (index: number, bomItem: BomItem) => {
    setState(prev => ({
      ...prev,
      techpack: {
        ...prev.techpack,
        bom: prev.techpack.bom.map((item, i) => i === index ? bomItem : item)
      },
      hasUnsavedChanges: true
    }));
  };

  const deleteBomItem = (index: number) => {
    setState(prev => ({
      ...prev,
      techpack: {
        ...prev.techpack,
        bom: prev.techpack.bom.filter((_, i) => i !== index)
      },
      hasUnsavedChanges: true
    }));
  };

  const addColorway = (colorway: Colorway) => {
    setState(prev => ({
      ...prev,
      techpack: {
        ...prev.techpack,
        colorways: [...prev.techpack.colorways, colorway]
      },
      hasUnsavedChanges: true
    }));
  };

  const updateColorway = (index: number, colorway: Colorway) => {
    setState(prev => ({
      ...prev,
      techpack: {
        ...prev.techpack,
        colorways: prev.techpack.colorways.map((item, i) => i === index ? colorway : item)
      },
      hasUnsavedChanges: true
    }));
  };

  const deleteColorway = (index: number) => {
    setState(prev => ({
      ...prev,
      techpack: {
        ...prev.techpack,
        colorways: prev.techpack.colorways.filter((_, i) => i !== index)
      },
      hasUnsavedChanges: true
    }));
  };

  const value = {
    techPacks,
    loading,
    pagination,
    state,
    loadTechPacks,
    createTechPack,
    updateTechPack,
    deleteTechPack,
    getTechPack,
    setCurrentTab,
    saveTechPack,
    exportToPDF,
    addMeasurement,
    updateMeasurement,
    deleteMeasurement,
    addHowToMeasure,
    updateHowToMeasure,
    deleteHowToMeasure,
    addBomItem,
    updateBomItem,
    deleteBomItem,
    addColorway,
    updateColorway,
    deleteColorway,
  };

  return <TechPackContext.Provider value={value}>{children}</TechPackContext.Provider>;
};

export const useTechPack = () => {
  const context = useContext(TechPackContext);
  if (!context) {
    throw new Error('useTechPack must be used within a TechPackProvider');
  }
  return context;
};
