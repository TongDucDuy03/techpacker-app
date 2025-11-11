import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import { ApiTechPack, CreateTechPackInput, TechPackListResponse, TechPackFormState, MeasurementPoint, HowToMeasure, BomItem, Colorway, ColorwayPart } from '../types/techpack';
import { api } from '../lib/api';
import { showPromise, showError } from '../lib/toast';
import { exportTechPackToPDF as clientExportToPDF } from '../utils/pdfExport';

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
  revertToRevision: (techPackId: string, revisionId: string) => Promise<string | undefined>;
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
  updateHowToMeasureById: (id: string, howToMeasure: HowToMeasure) => void;
  deleteHowToMeasure: (index: number) => void;
  deleteHowToMeasureById: (id: string) => void;
  insertHowToMeasureAt: (index: number, howToMeasure: HowToMeasure) => void;
  addBomItem: (bomItem: BomItem) => void;
  updateBomItem: (index: number, bomItem: BomItem) => void;
  updateBomItemById: (id: string, bomItem: BomItem) => void;
  deleteBomItem: (index: number) => void;
  deleteBomItemById: (id: string) => void;
  insertBomItemAt: (index: number, bomItem: BomItem) => void;
  addColorway: (colorway: Colorway) => void;
  updateColorway: (index: number, colorway: Colorway) => void;
  updateColorwayById: (id: string, colorway: Colorway) => void;
  deleteColorway: (index: number) => void;
  deleteColorwayById: (id: string) => void;
}

const TechPackContext = createContext<TechPackContextType | undefined>(undefined);

const TECHPACK_DRAFT_STORAGE_PREFIX = 'techpack:draft:';
const TECHPACK_DRAFT_VERSION = 1;
const TECHPACK_LIST_CACHE_KEY = 'techpack:list:cache';
const TECHPACK_LIST_PAGINATION_CACHE_KEY = 'techpack:list:pagination';

type PartialColorway = Partial<Colorway> & { parts?: Array<Partial<ColorwayPart>> };

const getDraftStorageKey = (techpackId?: string) => `${TECHPACK_DRAFT_STORAGE_PREFIX}${techpackId && techpackId.trim() ? techpackId : 'new'}`;

const safeString = (value?: string | null): string => (typeof value === 'string' ? value.trim() : '');

const normalizeHexColor = (value?: string | null): string => {
  const raw = safeString(value);
  if (!raw) return '';
  const normalized = raw.startsWith('#')
    ? raw.toUpperCase()
    : `#${raw.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6).toUpperCase()}`;
  return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : '';
};

const hexToRgb = (hex: string | undefined) => {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return undefined;
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return { r, g, b };
};

const allowedColorTypes: ColorwayPart['colorType'][] = ['Solid', 'Print', 'Embroidery', 'Applique'];

const sanitizeColorwayPart = (
  part: Partial<ColorwayPart> | undefined,
  colorwayIndex: number,
  partIndex: number,
  fallbackColorName: string,
  fallbackHex: string
): ColorwayPart => {
  const resolvedHex = normalizeHexColor(part?.hexCode) || fallbackHex || '#000000';
  const resolvedColorType = allowedColorTypes.includes((part?.colorType as any))
    ? (part?.colorType as ColorwayPart['colorType'])
    : 'Solid';

  return {
    id: safeString((part as any)?.id) || safeString((part as any)?._id) || `part_${colorwayIndex}_${partIndex}`,
    partName: safeString(part?.partName) || `Part ${partIndex + 1}`,
    colorName: safeString(part?.colorName) || fallbackColorName || `Color ${partIndex + 1}`,
    pantoneCode: safeString(part?.pantoneCode) || undefined,
    hexCode: resolvedHex,
    rgbCode: safeString(part?.rgbCode) || undefined,
    imageUrl: safeString((part as any)?.imageUrl) || undefined,
    supplier: safeString(part?.supplier) || undefined,
    colorType: resolvedColorType,
  } as ColorwayPart;
};

const sanitizeColorway = (rawColorway: PartialColorway, index: number): Colorway => {
  const rawName = safeString(rawColorway.name) || safeString((rawColorway as any).colorwayName);
  const rawCode = safeString(rawColorway.code) || safeString((rawColorway as any).colorwayCode);
  const sanitizedName = rawName || rawCode || `Colorway ${index + 1}`;
  const sanitizedCode = rawCode
    || sanitizedName.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toUpperCase()
    || `CW-${String(index + 1).padStart(2, '0')}`;

  const normalizedHex = normalizeHexColor(rawColorway.hexColor);
  const rawId = safeString(rawColorway.id as string) || safeString((rawColorway as any)._id);

  const rawApproval = safeString(rawColorway.approvalStatus as string).replace(/\s+/g, ' ');
  const normalizedApproval = ['Pending', 'Approved', 'Rejected'].includes(rawApproval)
    ? (rawApproval as Colorway['approvalStatus'])
    : undefined;
  const approvedFlag = (rawColorway as any).approved;
  const resolvedApprovalStatus: Colorway['approvalStatus'] = normalizedApproval
    || (approvedFlag === true ? 'Approved' : 'Pending');

  const rawProduction = safeString(rawColorway.productionStatus as string);
  const resolvedProductionStatus: Colorway['productionStatus'] = ['Lab Dip', 'Bulk Fabric', 'Finished'].includes(rawProduction)
    ? (rawProduction as Colorway['productionStatus'])
    : 'Lab Dip';

  const sanitizedParts: ColorwayPart[] = Array.isArray(rawColorway.parts)
    ? rawColorway.parts.map((part, partIndex) =>
        sanitizeColorwayPart(part, index, partIndex, sanitizedName, normalizedHex)
      )
    : [];

  const primaryPart = sanitizedParts[0];
  const sanitizedPlacement = safeString(rawColorway.placement) || primaryPart?.partName || 'Main Body';
  const materialFromPart = primaryPart?.colorType && primaryPart.colorType !== 'Solid'
    ? primaryPart.colorType
    : undefined;
  const sanitizedMaterialType = safeString(rawColorway.materialType) || materialFromPart || 'General';
  const resolvedHex = normalizedHex || primaryPart?.hexCode || '#000000';
  const sanitizedPantone = safeString(rawColorway.pantoneCode) || primaryPart?.pantoneCode || '';

  return {
    id: rawId || `colorway_${Date.now()}_${index}`,
    _id: typeof rawColorway._id === 'string' ? rawColorway._id : undefined,
    name: sanitizedName,
    code: sanitizedCode,
    placement: sanitizedPlacement,
    materialType: sanitizedMaterialType,
    season: safeString(rawColorway.season) || safeString((rawColorway as any).season) || undefined,
    isDefault: !!rawColorway.isDefault,
    approvalStatus: resolvedApprovalStatus,
    productionStatus: resolvedProductionStatus,
    pantoneCode: sanitizedPantone || undefined,
    hexColor: resolvedHex,
    rgbColor: hexToRgb(resolvedHex),
    supplier: safeString(rawColorway.supplier) || safeString((rawColorway as any).supplier) || undefined,
    notes: safeString(rawColorway.notes) || safeString((rawColorway as any).notes) || undefined,
    collectionName: safeString(rawColorway.collectionName) || safeString((rawColorway as any).collectionName) || undefined,
    parts: sanitizedParts,
  };
};

const sanitizeColorwayList = (colorways?: Array<PartialColorway>): Colorway[] => {
  if (!Array.isArray(colorways)) return [];
  return colorways.map((colorway, index) => sanitizeColorway(colorway, index));
};

const createEmptyTechpack = (): TechPackFormState['techpack'] => ({
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
});

const createInitialFormState = (): TechPackFormState => ({
  techpack: createEmptyTechpack(),
  currentTab: 0,
  tabStates: {},
  isLoading: false,
  isSaving: false,
  hasUnsavedChanges: false,
});

const loadDraftFromStorage = (techpackId?: string): Partial<TechPackFormState> | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getDraftStorageKey(techpackId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TechPackFormState> & { version?: number };
    if (parsed.version !== undefined && parsed.version !== TECHPACK_DRAFT_VERSION) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('Failed to read tech pack draft from storage', error);
    return null;
  }
};

const mergeDraftWithState = (base: TechPackFormState, draft?: Partial<TechPackFormState> | null): TechPackFormState => {
  if (!draft || !draft.techpack) return base;

  const mergedTechpack = {
    ...base.techpack,
    ...draft.techpack,
    articleInfo: {
      ...base.techpack.articleInfo,
      ...(draft.techpack as any).articleInfo,
    },
    bom: (draft.techpack as any).bom ?? base.techpack.bom,
    measurements: (draft.techpack as any).measurements ?? base.techpack.measurements,
    howToMeasures: (draft.techpack as any).howToMeasures ?? base.techpack.howToMeasures,
    colorways: sanitizeColorwayList((draft.techpack as any).colorways ?? []),
  } as TechPackFormState['techpack'];

  return {
    ...base,
    ...draft,
    techpack: mergedTechpack,
    isLoading: false,
    isSaving: false,
  };
};

const clearDraftFromStorage = (techpackId?: string) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getDraftStorageKey(techpackId));
  } catch (error) {
    // Failed to clear draft from storage
  }
};

const loadCachedTechPacks = (): ApiTechPack[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TECHPACK_LIST_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to load cached techpacks from storage', error);
    return [];
  }
};

const loadCachedPagination = (): Omit<TechPackListResponse, 'data'> => {
  if (typeof window === 'undefined') return { total: 0, page: 1, totalPages: 1 };
  try {
    const raw = localStorage.getItem(TECHPACK_LIST_PAGINATION_CACHE_KEY);
    if (!raw) return { total: 0, page: 1, totalPages: 1 };
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      const { total = 0, page = 1, totalPages = 1 } = parsed as any;
      return { total, page, totalPages };
    }
    return { total: 0, page: 1, totalPages: 1 };
  } catch (error) {
    console.warn('Failed to load cached pagination from storage', error);
    return { total: 0, page: 1, totalPages: 1 };
  }
};

export const TechPackProvider = ({ children }: { children: ReactNode }) => {
  // Access auth state to decide when to load protected data
  const auth = useAuth();
  const [techPacks, setTechPacks] = useState<ApiTechPack[]>(() => loadCachedTechPacks());
  const [loading, setLoading] = useState<boolean>(true);
  const [pagination, setPagination] = useState<Omit<TechPackListResponse, 'data'>>(() => loadCachedPagination());
  const [revisions, setRevisions] = useState<any[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState<boolean>(false);
  const [revisionPagination, setRevisionPagination] = useState<any>({ total: 0, page: 1, totalPages: 1 });

  // Initialize default TechPack state (including draft recovery)
  const [state, setState] = useState<TechPackFormState>(() => {
    const baseState = createInitialFormState();
    const storedDraft = loadDraftFromStorage();
    return mergeDraftWithState(baseState, storedDraft);
  });
  const draftKeyRef = useRef(getDraftStorageKey(state.techpack.id));
  const lastPersistedDraftRef = useRef<string>('');

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

  useEffect(() => {
    draftKeyRef.current = getDraftStorageKey(state.techpack.id);
  }, [state.techpack.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const payload = {
      version: TECHPACK_DRAFT_VERSION,
      savedAt: new Date().toISOString(),
      techpack: state.techpack,
      currentTab: state.currentTab,
      tabStates: state.tabStates,
      hasUnsavedChanges: state.hasUnsavedChanges,
      lastSaved: state.lastSaved,
    };

    const serialized = JSON.stringify(payload);
    if (serialized === lastPersistedDraftRef.current) {
      return;
    }

    lastPersistedDraftRef.current = serialized;

    try {
      localStorage.setItem(draftKeyRef.current, serialized);
    } catch (error) {
      // Failed to persist draft
    }
  }, [state.techpack, state.currentTab, state.tabStates, state.hasUnsavedChanges, state.lastSaved]);


  const loadTechPacks = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const response = await api.listTechPacks(params);
      // Ensure response.data is always an array
      const techPacksData = Array.isArray(response.data) ? response.data : [];
      setTechPacks(techPacksData);
      setPagination({ total: response.total, page: response.page, totalPages: response.totalPages });
    } catch (error: any) {
      showError(error.message || 'Failed to load tech packs');
      // On error, fallback to cached data (if available) without clearing current state
      if (techPacks.length === 0) {
        setTechPacks(loadCachedTechPacks());
        setPagination(loadCachedPagination());
      }
    } finally {
      setLoading(false);
    }
  }, [techPacks.length]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(TECHPACK_LIST_CACHE_KEY, JSON.stringify(techPacks));
    } catch (error) {
      console.warn('Failed to cache techpacks list', error);
    }
  }, [techPacks]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(TECHPACK_LIST_PAGINATION_CACHE_KEY, JSON.stringify(pagination));
    } catch (error) {
      console.warn('Failed to cache techpack pagination', error);
    }
  }, [pagination]);

  useEffect(() => {
    // Only attempt to load tech packs after auth initialization.
    // If user is not authenticated we skip loading to avoid triggering protected API calls
    // that return "Access denied. No token provided." on first render.
    if (auth && !auth.isLoading && auth.isAuthenticated) {
      loadTechPacks();
    }
  }, [loadTechPacks, auth.isLoading, auth.isAuthenticated]);

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

  const updateFormState = useCallback((updates: Partial<ApiTechPack>, skipUnsavedFlag = false) => {
    setState(prev => {
      // Xử lý colorways đặc biệt
      const incomingColorways = (updates as any).colorways;
      const nextColorways = incomingColorways !== undefined
        ? sanitizeColorwayList(incomingColorways as Array<PartialColorway>)
        : prev.techpack.colorways;

      // Xử lý các mảng khác: chỉ ghi đè nếu updates có giá trị (không phải undefined)
      // Nếu updates có field (kể cả mảng rỗng []), thì dùng giá trị đó
      // Nếu updates không có field (undefined), thì giữ giá trị cũ
      const incomingBom = (updates as any).bom;
      const nextBom = incomingBom !== undefined ? (Array.isArray(incomingBom) ? incomingBom : []) : prev.techpack.bom;

      const incomingMeasurements = (updates as any).measurements;
      const nextMeasurements = incomingMeasurements !== undefined 
        ? (Array.isArray(incomingMeasurements) ? incomingMeasurements : [])
        : prev.techpack.measurements;

      const incomingHowToMeasures = (updates as any).howToMeasures;
      const nextHowToMeasures = incomingHowToMeasures !== undefined 
        ? (Array.isArray(incomingHowToMeasures) ? incomingHowToMeasures : [])
        : prev.techpack.howToMeasures;

      // Tách riêng các field cần xử lý đặc biệt để tránh bị ghi đè
      const { bom: _bom, measurements: _measurements, howToMeasures: _howToMeasures, colorways: _colorways, articleInfo: _articleInfo, ...restUpdates } = updates as any;

      const newState = {
        ...prev,
        techpack: {
          ...prev.techpack,
          ...restUpdates, // Spread các field khác (không phải mảng)
          // Đảm bảo các mảng được merge đúng cách - đặt sau để không bị ghi đè
          bom: nextBom,
          measurements: nextMeasurements,
          howToMeasures: nextHowToMeasures,
          colorways: nextColorways,
          articleInfo: {
            ...(prev.techpack as any).articleInfo,
            ...(_articleInfo || {}),
          }
        },
        // Nếu skipUnsavedFlag = true (load từ server), set hasUnsavedChanges = false
        // Nếu skipUnsavedFlag = false (user edit), set hasUnsavedChanges = true
        hasUnsavedChanges: skipUnsavedFlag ? false : true
      };


      return newState;
    });
  }, []);

  const resetFormState = useCallback(() => {
    clearDraftFromStorage(state.techpack.id);
    clearDraftFromStorage();
    setState(prev => ({
      ...prev,
      techpack: createEmptyTechpack(),
      currentTab: 0,
      hasUnsavedChanges: false,
      lastSaved: undefined,
    }));
  }, [state.techpack.id]);

  const saveTechPack = async () => {
    setState(prev => ({ ...prev, isSaving: true }));
    try {
      const techpackData = state.techpack;

      const measurementsPayload = (techpackData.measurements || []).map((measurement: any) => {
        const {
          minusTolerance,
          plusTolerance,
          toleranceMinus,
          tolerancePlus,
          ...rest
        } = measurement || {};

        const resolvedMinus = toleranceMinus ?? minusTolerance ?? 0;
        const resolvedPlus = tolerancePlus ?? plusTolerance ?? 0;

        return {
          ...rest,
          toleranceMinus: resolvedMinus,
          tolerancePlus: resolvedPlus,
        };
      });

      const measurementNameMap = new Map((techpackData.measurements || []).map((measurement: any) => [
        measurement?.pomCode,
        measurement?.pomName || '',
      ]));

      const objectIdPattern = /^[0-9a-fA-F]{24}$/;

      const howToMeasuresPayload = (techpackData.howToMeasures || []).map((howToMeasure: any, index: number) => {
        const steps = Array.isArray(howToMeasure?.steps) && howToMeasure.steps.length > 0
          ? howToMeasure.steps
          : (howToMeasure?.instructions || []);

        const mapped: any = {
          pomCode: howToMeasure?.pomCode || '',
          pomName: howToMeasure?.pomName || measurementNameMap.get(howToMeasure?.pomCode) || '',
          description: howToMeasure?.description || '',
          imageUrl: howToMeasure?.imageUrl || '',
          stepNumber: typeof howToMeasure?.stepNumber === 'number' ? howToMeasure.stepNumber : index + 1,
          instructions: steps,
          tips: howToMeasure?.tips || [],
          commonMistakes: howToMeasure?.commonMistakes || [],
          relatedMeasurements: howToMeasure?.relatedMeasurements || [],
          language: howToMeasure?.language || 'en-US',
          videoUrl: howToMeasure?.videoUrl || '',
        };

        const existingId = (howToMeasure as any)._id || howToMeasure?.id;
        if (existingId && typeof existingId === 'string' && objectIdPattern.test(existingId)) {
          mapped._id = existingId;
        }

        return mapped;
      });

      const colorwaysForSave = sanitizeColorwayList(techpackData.colorways as Array<PartialColorway>);

      if (JSON.stringify(colorwaysForSave) !== JSON.stringify(techpackData.colorways)) {
        setState(prev => ({
          ...prev,
          techpack: {
            ...prev.techpack,
            colorways: colorwaysForSave,
          },
        }));
      }

      const colorwaysPayload = colorwaysForSave.map(colorway => ({
        ...(colorway?._id && typeof colorway._id === 'string' && objectIdPattern.test(colorway._id) ? { _id: colorway._id } : {}),
        name: colorway.name.trim(),
        code: colorway.code.trim(),
        placement: colorway.placement.trim(),
        materialType: colorway.materialType.trim(),
        pantoneCode: colorway.pantoneCode?.trim() || undefined,
        hexColor: colorway.hexColor?.trim() || undefined,
        rgbColor: hexToRgb(colorway.hexColor),
        supplier: colorway.supplier?.trim() || undefined,
        notes: colorway.notes?.trim() || undefined,
        season: colorway.season?.trim() || undefined,
        collectionName: colorway.collectionName?.trim() || undefined,
        approved: colorway.approvalStatus === 'Approved',
        isDefault: !!colorway.isDefault,
      }));

      const incompleteColorway = colorwaysPayload.find(cw => !cw.name || !cw.code || !cw.placement || !cw.materialType);
      if (incompleteColorway) {
        setState(prev => ({ ...prev, isSaving: false }));
        showError('Please complete all required colorway fields (name, code, placement, material type).');
        return;
      }

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
          measurements: measurementsPayload,
          colorways: colorwaysPayload,
          howToMeasure: howToMeasuresPayload,
        };
        const updatedTP = await updateTechPack(techpackData.id, updatePayload);

        // After a successful save, reload the revisions and refresh current form state from server
        if (updatedTP) {
          await loadRevisions(techpackData.id);

          // Fetch latest detail to avoid stale local state and ensure Product Class is shown
          try {
            const fresh = await getTechPack(techpackData.id);
            if (fresh) {
              const resolvedProductClass =
                (fresh as any).productClass ??
                (fresh as any).articleInfo?.productClass ??
                (fresh as any).category ??
                (fresh as any).metadata?.category ?? '';

              const freshMeasurementNameMap = new Map(
                (((fresh as any).measurements) || []).map((measurement: any) => [
                  measurement?.pomCode,
                  measurement?.pomName || '',
                ])
              );

              const freshHowToMeasures = (((fresh as any).howToMeasure || []) as any[]).map((htm: any, index: number) => {
                const steps = Array.isArray(htm.steps) && htm.steps.length > 0 ? htm.steps : (htm.instructions || []);
                return {
                  id: htm._id || htm.id || `htm_${index}`,
                  pomCode: htm.pomCode || '',
                  pomName: htm.pomName || freshMeasurementNameMap.get(htm.pomCode) || '',
                  description: htm.description || '',
                  imageUrl: htm.imageUrl || '',
                  steps,
                  instructions: steps,
                  videoUrl: htm.videoUrl || '',
                  language: htm.language || 'en-US',
                  stepNumber: typeof htm.stepNumber === 'number' ? htm.stepNumber : index + 1,
                  tips: htm.tips || [],
                  commonMistakes: htm.commonMistakes || [],
                  relatedMeasurements: htm.relatedMeasurements || [],
                };
              });

              // Refresh data từ server - không set hasUnsavedChanges
              updateFormState({
                id: (fresh as any)._id || techpackData.id,
                articleInfo: {
                  ...(state.techpack.articleInfo as any),
                  productClass: resolvedProductClass,
                  supplier: (fresh as any).supplier ?? state.techpack.articleInfo.supplier,
                  season: (fresh as any).season ?? state.techpack.articleInfo.season,
                  fabricDescription: (fresh as any).fabricDescription ?? state.techpack.articleInfo.fabricDescription,
                  productDescription: (fresh as any).productDescription ?? state.techpack.articleInfo.productDescription,
                  designSketchUrl: (fresh as any).designSketchUrl ?? state.techpack.articleInfo.designSketchUrl,
                  gender: (fresh as any).gender ?? state.techpack.articleInfo.gender,
                  lifecycleStage: (fresh as any).lifecycleStage ?? state.techpack.articleInfo.lifecycleStage,
                  brand: (fresh as any).brand ?? state.techpack.articleInfo.brand,
                  collection: (fresh as any).collectionName ?? (fresh as any).collection ?? state.techpack.articleInfo.collection,
                  targetMarket: (fresh as any).targetMarket ?? state.techpack.articleInfo.targetMarket,
                  pricePoint: (fresh as any).pricePoint ?? state.techpack.articleInfo.pricePoint,
                  currency: (fresh as any).currency ?? state.techpack.articleInfo.currency,
                  retailPrice: (fresh as any).retailPrice ?? state.techpack.articleInfo.retailPrice,
                  status: (fresh as any).status ?? (state.techpack as any).status,
                } as any,
                status: (fresh as any).status ?? (state.techpack as any).status,
                howToMeasures: freshHowToMeasures,
              } as any, true);
            }
          } catch (e) {
            // Silently handle refresh error
          }
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
          measurements: measurementsPayload,
          colorways: colorwaysPayload,
          howToMeasures: howToMeasuresPayload,
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
            await loadRevisions(techPackId);
          }
        }
      }

      clearDraftFromStorage(techpackData.id);
      if (!techpackData.id) {
        clearDraftFromStorage();
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
    // If the techpack has been saved to the server, request server-generated PDF
    const techpackId = state.techpack?.id || state.techpack?.articleInfo?.articleCode;
    // Prefer server PDF when we have an id
    if (techpackId) {
      const useLandscape = true;
      (async () => {
        try {
          // Use api client to request binary PDF
          const response = await api.get(`/techpacks/${techpackId}/pdf`, { responseType: 'arraybuffer', params: { landscape: useLandscape ? 'true' : 'false' } });
          const arrayBuffer = response.data as ArrayBuffer;
          const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);

          // Open in new tab (user gesture already triggered by click) or download
          const win = window.open(url, '_blank');
          if (!win) {
            // If popup blocked, trigger download instead
            const link = document.createElement('a');
            link.href = url;
            const filename = `${state.techpack.articleInfo.articleCode || 'techpack'}_v${state.techpack.articleInfo.version || 1}.pdf`;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }

          // Revoke object URL after a short delay to allow browser to load it
          setTimeout(() => window.URL.revokeObjectURL(url), 60 * 1000);
        } catch (err: any) {
          showError(err?.message || 'Failed to export PDF from server. Falling back to client export.');
          // Fallback to client-side export (HTML print)
          try {
            clientExportToPDF(state.techpack as any);
          } catch (e) {
            showError('Client-side export failed as well.');
          }
        }
      })();
      return;
    }

    // If not saved on server, fall back to client-side HTML export/print
    clientExportToPDF(state.techpack as any);
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

  const updateHowToMeasureById = (id: string, howToMeasure: HowToMeasure) => {
    setState(prev => ({
      ...prev,
      techpack: {
        ...prev.techpack,
        howToMeasures: prev.techpack.howToMeasures.map(htm => htm.id === id ? howToMeasure : htm)
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

  const deleteHowToMeasureById = (id: string) => {
    setState(prev => ({
      ...prev,
      techpack: {
        ...prev.techpack,
        howToMeasures: prev.techpack.howToMeasures.filter(htm => htm.id !== id)
      },
      hasUnsavedChanges: true
    }));
  };

  const insertHowToMeasureAt = (index: number, howToMeasure: HowToMeasure) => {
    setState(prev => {
      const newHowToMeasures = [...prev.techpack.howToMeasures];
      newHowToMeasures.splice(index, 0, howToMeasure);
      return {
        ...prev,
        techpack: {
          ...prev.techpack,
          howToMeasures: newHowToMeasures
        },
        hasUnsavedChanges: true
      };
    });
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
    // Legacy: support index-based for backward compatibility
    setState(prev => ({
      ...prev,
      techpack: {
        ...prev.techpack,
        bom: prev.techpack.bom.map((item, i) => i === index ? bomItem : item)
      },
      hasUnsavedChanges: true
    }));
  };

  const updateBomItemById = (id: string, bomItem: BomItem) => {
    setState(prev => ({
      ...prev,
      techpack: {
        ...prev.techpack,
        bom: prev.techpack.bom.map(item => item.id === id ? bomItem : item)
      },
      hasUnsavedChanges: true
    }));
  };

  const deleteBomItem = (index: number) => {
    // Legacy: support index-based for backward compatibility
    setState(prev => ({
      ...prev,
      techpack: {
        ...prev.techpack,
        bom: prev.techpack.bom.filter((_, i) => i !== index)
      },
      hasUnsavedChanges: true
    }));
  };

  const deleteBomItemById = (id: string) => {
    setState(prev => ({
      ...prev,
      techpack: {
        ...prev.techpack,
        bom: prev.techpack.bom.filter(item => item.id !== id)
      },
      hasUnsavedChanges: true
    }));
  };

  const insertBomItemAt = (index: number, bomItem: BomItem) => {
    setState(prev => {
      const newBom = [...prev.techpack.bom];
      newBom.splice(index, 0, bomItem);
      return {
        ...prev,
        techpack: {
          ...prev.techpack,
          bom: newBom
        },
        hasUnsavedChanges: true
      };
    });
  };

  const addColorway = (colorway: Colorway) => {
    setState(prev => {
      const nextColorways = sanitizeColorwayList([...prev.techpack.colorways, colorway]);
      return {
        ...prev,
        techpack: {
          ...prev.techpack,
          colorways: nextColorways,
        },
        hasUnsavedChanges: true,
      };
    });
  };

  const updateColorway = (index: number, colorway: Colorway) => {
    // Legacy: support index-based for backward compatibility
    setState(prev => {
      const updatedColorways = prev.techpack.colorways.map((item, i) => (i === index ? colorway : item));
      return {
        ...prev,
        techpack: {
          ...prev.techpack,
          colorways: sanitizeColorwayList(updatedColorways),
        },
        hasUnsavedChanges: true,
      };
    });
  };

  const updateColorwayById = (id: string, colorway: Colorway) => {
    setState(prev => {
      const updatedColorways = prev.techpack.colorways.map(item => (item.id === id ? colorway : item));
      return {
        ...prev,
        techpack: {
          ...prev.techpack,
          colorways: sanitizeColorwayList(updatedColorways),
        },
        hasUnsavedChanges: true,
      };
    });
  };

  const deleteColorway = (index: number) => {
    // Legacy: support index-based for backward compatibility
    setState(prev => {
      const filtered = prev.techpack.colorways.filter((_, i) => i !== index);
      return {
        ...prev,
        techpack: {
          ...prev.techpack,
          colorways: sanitizeColorwayList(filtered),
        },
        hasUnsavedChanges: true,
      };
    });
  };

  const deleteColorwayById = (id: string) => {
    setState(prev => {
      const filtered = prev.techpack.colorways.filter(item => item.id !== id);
      return {
        ...prev,
        techpack: {
          ...prev.techpack,
          colorways: sanitizeColorwayList(filtered),
        },
        hasUnsavedChanges: true,
      };
    });
  };

  // Revision management functions
  const loadRevisions = useCallback(async (techPackId: string, params = {}) => {
    setRevisionsLoading(true);
    try {
      const response = await api.getRevisions(techPackId, params);
      
      // Handle possible shapes:
      // 1) AxiosResponse<{ success, data: { revisions, pagination } }>
      // 2) { revisions, pagination }
      // 3) { data: { revisions, pagination } }
      // 4) AxiosResponse<{ success, data }> where data is already the payload
      const root = (response as any)?.data ?? response;
      const payload = root?.data ?? root;
      const revisions = payload?.revisions ?? [];
      const pagination = payload?.pagination ?? { total: 0, page: 1, totalPages: 1 };

      setRevisions(Array.isArray(revisions) ? revisions : []);
      setRevisionPagination(pagination);
    } catch (error: any) {
      showError(error.message || 'Failed to load revisions');
    } finally {
      setRevisionsLoading(false);
    }
  }, []);

  const revertToRevision = async (techPackId: string, revisionId: string): Promise<string | undefined> => {
    try {
      const response = await showPromise(
        api.revertToRevision(techPackId, revisionId),
        {
          loading: 'Reverting TechPack...',
          success: 'TechPack reverted successfully!',
          error: (err) => err.message || 'Failed to revert TechPack',
        }
      );

      // Reload the current techpack data after revert - không set hasUnsavedChanges
      const updatedTechPack = await getTechPack(techPackId);
      if (updatedTechPack) {
        updateFormState(updatedTechPack, true);
        // Cập nhật luôn danh sách techpacks để list phản ánh thay đổi ngay lập tức
        setTechPacks(prev =>
          Array.isArray(prev)
            ? prev.map(tp => (tp._id === techPackId ? { ...tp, ...updatedTechPack } as any : tp))
            : prev
        );
      }

      // Reload revisions to show the new rollback revision
      await loadRevisions(techPackId);

      // Return the new revision ID for highlighting
      return response?.data?.newRevision?._id || response?.data?.newRevision?.id;
    } catch (error) {
      // Error is already handled by showPromise
      return undefined;
    }
  };

  const value = useMemo(() => ({
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
    revertToRevision,
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
    updateHowToMeasureById,
    deleteHowToMeasure,
    deleteHowToMeasureById,
    insertHowToMeasureAt,
    addBomItem,
    updateBomItem,
    updateBomItemById,
    deleteBomItem,
    deleteBomItemById,
    insertBomItemAt,
    addColorway,
    updateColorway,
    updateColorwayById,
    deleteColorway,
    deleteColorwayById,
  }), [
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
    revertToRevision,
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
    updateHowToMeasureById,
    deleteHowToMeasure,
    deleteHowToMeasureById,
    insertHowToMeasureAt,
    addBomItem,
    updateBomItem,
    updateBomItemById,
    deleteBomItem,
    deleteBomItemById,
    insertBomItemAt,
    addColorway,
    updateColorway,
    updateColorwayById,
    deleteColorway,
    deleteColorwayById,
  ]);

  return <TechPackContext.Provider value={value}>{children}</TechPackContext.Provider>;
};

export const useTechPack = () => {
  const context = useContext(TechPackContext);
  if (!context) {
    throw new Error('useTechPack must be used within a TechPackProvider');
  }
  return context;
};
