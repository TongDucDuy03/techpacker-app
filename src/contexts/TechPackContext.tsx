import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ApiTechPack, CreateTechPackInput, TechPackListResponse, TechPackFormState, MeasurementPoint, HowToMeasure, BomItem, Colorway } from '../types/techpack';
import { api } from '../lib/api';
import { showPromise, showError } from '../lib/toast';

interface TechPackContextType {
  techPacks: ApiTechPack[];
  loading: boolean;
  pagination: Omit<TechPackListResponse, 'data'>;
  state: TechPackFormState;
  revisions: any[];
  revisionsLoading: boolean;
  revisionPagination: any;
  loadTechPacks: (params?: { page?: number; limit?: number; q?: string; status?: string }) => Promise<void>;
  createTechPack: (data: CreateTechPackInput) => Promise<ApiTechPack | undefined>;
  updateTechPack: (id: string, data: Partial<ApiTechPack>) => Promise<ApiTechPack | undefined>;
  deleteTechPack: (id: string) => Promise<void>;
  getTechPack: (id: string) => Promise<ApiTechPack | undefined>;
  loadRevisions: (techPackId: string, params?: any) => Promise<void>;
  restoreTechPackToRevision: (techPackId: string, revisionId: string) => Promise<void>;
  setCurrentTab: (tab: number) => void;
  updateFormState: (updates: Partial<ApiTechPack>) => void;
  resetFormState: () => void;
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
  const [techPacks, setTechPacks] = useState<ApiTechPack[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pagination, setPagination] = useState<Omit<TechPackListResponse, 'data'>>({ total: 0, page: 1, totalPages: 1 });
  const [revisions, setRevisions] = useState<any[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState<boolean>(false);
  const [revisionPagination, setRevisionPagination] = useState<any>({ total: 0, page: 1, totalPages: 1 });

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
        technicalDesignerId: '',
        fabricDescription: '',
        productDescription: '',
        designSketchUrl: '',
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

  // Exit warning system - prevent accidental data loss
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Bạn có thay đổi chưa được lưu. Bạn có muốn lưu trước khi thoát không?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [state.hasUnsavedChanges]);


  const loadTechPacks = useCallback(async (params = {}) => {
    console.log('🔄 Loading tech packs...', params);
    setLoading(true);
    try {
      const response = await api.listTechPacks(params);
      console.log('✅ Tech packs loaded:', response);
      setTechPacks(response.data);
      setPagination({ total: response.total, page: response.page, totalPages: response.totalPages });
    } catch (error: any) {
      console.error('❌ Failed to load tech packs:', error);
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

  const updateTechPack = async (id: string, data: Partial<ApiTechPack>) => {
    try {
      const updatedTechPack = await showPromise(
        api.updateTechPack(id, data), // Sử dụng PUT thay vì PATCH để đảm bảo tạo revision
        {
          loading: 'Updating tech pack...',
          success: 'Tech pack updated successfully!',
          error: (err) => err.message || 'Failed to update tech pack',
        }
      );
      // Optimistically update the local state instead of refetching the whole list
      setTechPacks(prev =>
        prev.map(tp => (tp._id === id ? { ...tp, ...updatedTechPack } : tp))
      );
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
      // Update local state to remove the deleted tech pack immediately
      setTechPacks(prev => prev.filter(tp => tp._id !== id));
      // Update pagination count
      setPagination(prev => ({ ...prev, total: prev.total - 1 }));
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

  const updateFormState = useCallback((updates: Partial<ApiTechPack>) => {
    setState(prev => ({
      ...prev,
      techpack: {
        ...prev.techpack,
        ...(updates as any),
        articleInfo: {
          ...(prev.techpack as any).articleInfo,
          ...(updates as any).articleInfo,
        }
      },
      hasUnsavedChanges: true
    }));
  }, []);

  const resetFormState = useCallback(() => {
    setState(prev => ({
      ...prev,
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
          technicalDesignerId: '',
          fabricDescription: '',
          productDescription: '',
          designSketchUrl: '',
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
      hasUnsavedChanges: false
    }));
  }, []);

  const saveTechPack = async () => {
    setState(prev => ({ ...prev, isSaving: true }));
    try {
      const techpackData = state.techpack;

      // If techpack has an ID, update existing; otherwise create new
      if (techpackData.id && techpackData.id !== '') {
        // For updates, use PATCH with flat fields expected by backend patch handler
        const updatePayload = {
          productName: techpackData.articleInfo.productName,
          articleCode: techpackData.articleInfo.articleCode,
          version: techpackData.articleInfo.version.toString(),
          supplier: techpackData.articleInfo.supplier || '',
          season: techpackData.articleInfo.season,
          fabricDescription: techpackData.articleInfo.fabricDescription || '',
          productDescription: (techpackData.articleInfo as any).productDescription || '',
          designSketchUrl: (techpackData.articleInfo as any).designSketchUrl || '',
          status: techpackData.status,
          category: techpackData.articleInfo.productClass,
          gender: techpackData.articleInfo.gender,
          technicalDesignerId: techpackData.articleInfo.technicalDesignerId,
          lifecycleStage: techpackData.articleInfo.lifecycleStage as any,
          collectionName: (techpackData.articleInfo as any).collection,
          targetMarket: (techpackData.articleInfo as any).targetMarket,
          pricePoint: (techpackData.articleInfo as any).pricePoint,
          description: techpackData.articleInfo.notes,
          notes: techpackData.articleInfo.notes,
          brand: techpackData.articleInfo.brand,
          retailPrice: (techpackData as any).retailPrice,
          currency: (techpackData as any).currency,
          bom: techpackData.bom,
          measurements: techpackData.measurements,
          colorways: techpackData.colorways,
          howToMeasure: techpackData.howToMeasures,
        };
        const updatedTP = await updateTechPack(techpackData.id, updatePayload);

        // After a successful save, reload the revisions to show the new one
        if (updatedTP) {
          console.log('🔄 Reloading revisions after update for TechPack ID:', techpackData.id);
          await loadRevisions(techpackData.id);
        }
      } else {
        // For create, send nested articleInfo to satisfy route validation
        const createPayload: CreateTechPackInput = {
          articleInfo: {
            productName: techpackData.articleInfo.productName,
            articleCode: techpackData.articleInfo.articleCode,
            version: techpackData.articleInfo.version,
            supplier: techpackData.articleInfo.supplier || '',
            season: techpackData.articleInfo.season,
            fabricDescription: techpackData.articleInfo.fabricDescription || '',
            productDescription: (techpackData.articleInfo as any).productDescription || '',
            designSketchUrl: (techpackData.articleInfo as any).designSketchUrl || '',
            productClass: techpackData.articleInfo.productClass,
            gender: techpackData.articleInfo.gender,
            technicalDesignerId: techpackData.articleInfo.technicalDesignerId,
            lifecycleStage: techpackData.articleInfo.lifecycleStage as any,
            collection: (techpackData.articleInfo as any).collection,
            targetMarket: (techpackData.articleInfo as any).targetMarket,
            pricePoint: (techpackData.articleInfo as any).pricePoint,
            notes: techpackData.articleInfo.notes,
          },
          bom: techpackData.bom,
          measurements: techpackData.measurements,
          colorways: techpackData.colorways,
          howToMeasures: techpackData.howToMeasures,
          status: techpackData.status as any,
        } as unknown as CreateTechPackInput;

        const newTechPack = await createTechPack(createPayload);

        // Update the state with the new ID
        setState(prev => ({
          ...prev,
          techpack: { ...prev.techpack, id: newTechPack?._id || newTechPack?.id || '' }
        }));

        // After creating a new TechPack, load revisions to show the initial revision
        if (newTechPack) {
          const techPackId = newTechPack._id || newTechPack.id;
          if (techPackId) {
            console.log('🔄 Loading revisions after create for TechPack ID:', techPackId);
            await loadRevisions(techPackId);
          }
        }
      }

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

  // Revision management functions
  const loadRevisions = useCallback(async (techPackId: string, params = {}) => {
    console.log('🔄 Attempting to load revisions for TechPack ID:', techPackId);
    setRevisionsLoading(true);
    try {
      const response = await api.getRevisions(techPackId, params);
      console.log('✅ API response for revisions:', response);
      
      // Handle possible shapes:
      // 1) AxiosResponse<{ success, data: { revisions, pagination } }>
      // 2) { revisions, pagination }
      // 3) { data: { revisions, pagination } }
      // 4) AxiosResponse<{ success, data }> where data is already the payload
      const root = (response as any)?.data ?? response;
      const payload = root?.data ?? root;
      const revisions = payload?.revisions ?? [];
      const pagination = payload?.pagination ?? { total: 0, page: 1, totalPages: 1 };

      console.log('📊 Revisions parsing debug:', {
        hasAxiosData: !!(response as any)?.data,
        hasRootData: !!root,
        keysAtRoot: root ? Object.keys(root) : [],
        keysAtPayload: payload ? Object.keys(payload) : [],
        parsedCount: revisions.length
      });
      
      console.log('📊 Revisions count:', revisions.length);
      setRevisions(Array.isArray(revisions) ? revisions : []);
      setRevisionPagination(pagination);
      console.log('✅ Revisions state updated with', Array.isArray(revisions) ? revisions.length : 0, 'revisions');
    } catch (error: any) {
      console.error('❌ Failed to load revisions:', error);
      showError(error.message || 'Failed to load revisions');
    } finally {
      setRevisionsLoading(false);
    }
  }, []);

  const restoreTechPackToRevision = async (techPackId: string, revisionId: string) => {
    try {
      await showPromise(
        api.restoreRevision(techPackId, revisionId),
        {
          loading: 'Restoring TechPack...',
          success: 'TechPack restored successfully!',
          error: (err) => err.message || 'Failed to restore TechPack',
        }
      );
      // Reload the current techpack data after restoration
      const updatedTechPack = await getTechPack(techPackId);
      if (updatedTechPack) {
        updateFormState(updatedTechPack);
      }
      // Reload revisions to show the new rollback revision
      await loadRevisions(techPackId);
    } catch (error) {
      // Error is already handled by showPromise
    }
  };

  const value = {
    techPacks,
    loading,
    pagination,
    state,
    revisions,
    revisionsLoading,
    revisionPagination,
    loadTechPacks,
    createTechPack,
    updateTechPack,
    deleteTechPack,
    getTechPack,
    loadRevisions,
    restoreTechPackToRevision,
    setCurrentTab,
    updateFormState,
    resetFormState,
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
