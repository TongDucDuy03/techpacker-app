import React, { useState, useMemo, useCallback, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useTechPack } from '../../../contexts/TechPackContext';
import {
  MeasurementPoint,
  MeasurementSampleRound,
  MeasurementSampleEntry,
  MeasurementSampleValueMap,
  MeasurementRequestedSource,
  SIZE_RANGES,
} from '../../../types/techpack';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { measurementValidationSchema } from '../../../utils/validationSchemas';
import Input from '../shared/Input';
import Select from '../shared/Select';
import { Plus, Upload, Download, Ruler, AlertTriangle, Info, AlertCircle, X, Save, CheckCircle, Copy, CheckSquare, Square } from 'lucide-react';
import { showSuccess, showWarning, showError } from '../../../lib/toast';
import SampleMeasurementsTable from './SampleMeasurementsTable';
import { SampleMeasurementRow } from '../../../types/measurements';
import { parseTolerance, formatToleranceNoUnit, parseStepValue, formatStepValue, formatMeasurementValue, parseMeasurementValue, formatMeasurementValueAsFraction } from './measurementHelpers';
import { MEASUREMENT_UNITS, DEFAULT_MEASUREMENT_UNIT, MeasurementUnit, getMeasurementUnitSuffix, getMeasurementUnitMeta } from '../../../types/techpack';
import { SIZE_PRESET_OPTIONS, getPresetById } from '../../../constants/sizePresets';
import ConfirmationDialog from '../../ConfirmationDialog';
import { DEFAULT_MEASUREMENT_BASE_HIGHLIGHT_COLOR, DEFAULT_MEASUREMENT_ROW_STRIPE_COLOR } from '../../../constants/measurementDisplay';
import { normalizeMeasurementBaseSizes } from '../../../utils/measurements';
import Quill from 'quill';
import ImageUploader from 'quill-image-uploader';
import { api } from '../../../lib/api';

// Progression validation result
interface ProgressionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
Quill.register('modules/imageUploader', ImageUploader);

// Helper to resolve image URL for Quill editor (needs full URL)
// Use same pattern as other tabs (ConstructionTab, ColorwayTab, etc.)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1';
const FILE_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

const resolveImageUrlForQuill = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  
  // Already absolute URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  
  // Relative path: /uploads/image.jpg
  if (trimmed.startsWith('/')) {
    return `${FILE_BASE_URL}${trimmed}`;
  }
  
  // Fallback: prepend FILE_BASE_URL
  return `${FILE_BASE_URL}/${trimmed}`;
};

const sampleRoundQuillModules = {
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, false] }],
    [{ font: [] }],
    [{ size: [] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ script: 'sub' }, { script: 'super' }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    [{ align: [] }],
    ['link', 'image'],
    ['clean'],
  ],
  imageUploader: {
    upload: async (file: File) => {
      const formData = new FormData();
      // Backend expects 'constructionImage' field name for /techpacks/upload-construction-image
      formData.append('constructionImage', file);
      
      try {
        // Use api client (axios) with proper baseURL configured in src/lib/api.ts
        // This ensures correct URL resolution: /techpacks/upload-construction-image
        // Will resolve to: http://host:4001/api/v1/techpacks/upload-construction-image
        const response = await api.post('/techpacks/upload-construction-image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        if (response.data.success) {
          // Backend returns { success: true, data: { url: '/uploads/...' } }
          const imageUrl = response.data.data.url;
          
          if (!imageUrl) {
            throw new Error('No image URL returned from server');
          }
          
          // Convert relative URL to full URL for Quill imageUploader
          // Quill needs absolute URL to display images in the editor
          return resolveImageUrlForQuill(imageUrl);
        } else {
          throw new Error(response.data.message || 'Upload failed');
        }
      } catch (error: any) {
        console.error('Image upload error:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Upload failed';
        throw new Error(errorMessage);
      }
    }
  },
  clipboard: {
    matchVisual: false,
  },
  history: {
    delay: 500,
    maxStack: 100,
    userOnly: true,
  },
};

const sampleRoundQuillFormats = [
  'header',
  'font',
  'size',
  'bold',
  'italic',
  'underline',
  'strike',
  'color',
  'background',
  'script',
  'list',
  'bullet',
  'indent',
  'align',
  'link',
  'image',
];

const MeasurementTab: React.FC = () => {
  const context = useTechPack();
  const {
    state,
    addMeasurement,
    insertMeasurementAt,
    updateMeasurement,
    deleteMeasurement,
    addSampleMeasurementRound,
    updateSampleMeasurementRound,
    deleteSampleMeasurementRound,
    updateSampleMeasurementEntry,
    saveTechPack,
    updateMeasurementSizeRange,
    updateMeasurementBaseSize,
    updateMeasurementDisplaySettings,
  } = context ?? {};
  const { measurements = [], articleInfo, sampleMeasurementRounds = [] } = state?.techpack ?? {};
  const hasUnsavedChanges = state?.hasUnsavedChanges ?? false;
  const tableUnit = (state?.techpack?.measurementUnit as MeasurementUnit) || DEFAULT_MEASUREMENT_UNIT;

  // Multi-select state for bulk actions
  const [selectedMeasurementIds, setSelectedMeasurementIds] = useState<Set<string>>(new Set());
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [progressionMode, setProgressionMode] = useState<'strict' | 'warn'>('strict'); // strict = block, warn = allow with warning
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [roundForm, setRoundForm] = useState<RoundModalFormState>(() => ({
    name: '',
    date: new Date().toISOString().slice(0, 10),
    reviewer: '',
    requestedSource: 'original',
  }));

  // Initialize validation for the form
  const validation = useFormValidation(measurementValidationSchema);
  
  const [formData, setFormData] = useState<Partial<MeasurementPoint>>({
    pomCode: '',
    pomName: '',
    minusTolerance: 1.0, // Changed to number
    plusTolerance: 1.0, // Changed to number
    sizes: {},
    baseSize: undefined,
    notes: '',
    measurementMethod: '',
    isActive: true,
  });
  const [sizeAdjustments, setSizeAdjustments] = useState<Record<string, string>>({});
  const [baseValueInput, setBaseValueInput] = useState<string>(''); // Raw input for base measurement (to allow typing fractions)
  const [isBaseInputFocused, setIsBaseInputFocused] = useState<boolean>(false);
  const [minusToleranceInput, setMinusToleranceInput] = useState<string>(''); // Raw input for minus tolerance
  const [isMinusToleranceFocused, setIsMinusToleranceFocused] = useState<boolean>(false);
  const [plusToleranceInput, setPlusToleranceInput] = useState<string>(''); // Raw input for plus tolerance
  const [isPlusToleranceFocused, setIsPlusToleranceFocused] = useState<boolean>(false);
  const [newSizeLabel, setNewSizeLabel] = useState('');
  const [pendingPresetId, setPendingPresetId] = useState(() => SIZE_PRESET_OPTIONS[0]?.id || 'standard_us_alpha');
  const [baseSizeSelectorValue, setBaseSizeSelectorValue] = useState('');
  const [pendingBaseSize, setPendingBaseSize] = useState<string | null>(null);
  const [showBaseSizeConfirm, setShowBaseSizeConfirm] = useState(false);
  const [showUnitChangeConfirm, setShowUnitChangeConfirm] = useState(false);
  const [pendingNewUnit, setPendingNewUnit] = useState<MeasurementUnit | null>(null);
  const measurementUnitOptions = useMemo(
    () => MEASUREMENT_UNITS.map(unit => ({ value: unit.value, label: unit.label })),
    []
  );

  const configuredSizeRange = state?.techpack?.measurementSizeRange;
  const defaultGenderSizes = useMemo(
    () => SIZE_RANGES[articleInfo?.gender as keyof typeof SIZE_RANGES] || SIZE_RANGES['Unisex'],
    [articleInfo?.gender]
  );
  const selectedSizes = configuredSizeRange && configuredSizeRange.length > 0
    ? configuredSizeRange
    : defaultGenderSizes;

  const measurementBaseSize = useMemo(() => {
    if (!selectedSizes.length) return undefined;
    const configuredBase = state?.techpack?.measurementBaseSize;
    if (configuredBase && selectedSizes.includes(configuredBase)) {
      return configuredBase;
    }
    const measurementFallback = measurements.find(
      measurement => measurement.baseSize && selectedSizes.includes(measurement.baseSize)
    )?.baseSize;
    const defaultBase = selectedSizes.includes('L') ? 'L' : selectedSizes[0];
    return measurementFallback || defaultBase;
  }, [measurements, selectedSizes, state?.techpack?.measurementBaseSize]);

  const baseHighlightColor = DEFAULT_MEASUREMENT_BASE_HIGHLIGHT_COLOR; // Always use default color
  const rowStripeColor = state?.techpack?.measurementRowStripeColor || DEFAULT_MEASUREMENT_ROW_STRIPE_COLOR;

  useEffect(() => {
    if (!updateMeasurementSizeRange) return;
    if (!configuredSizeRange || configuredSizeRange.length === 0) {
      updateMeasurementSizeRange(defaultGenderSizes);
    }
  }, [configuredSizeRange, defaultGenderSizes, updateMeasurementSizeRange]);

  useEffect(() => {
    if (!selectedSizes.length) return;
    setFormData(prev => {
      let changed = false;
      // Always prioritize measurementBaseSize (global base size) when it changes
      let nextBaseSize: string;
      if (measurementBaseSize && selectedSizes.includes(measurementBaseSize)) {
        nextBaseSize = measurementBaseSize;
      } else if (prev.baseSize && selectedSizes.includes(prev.baseSize)) {
        nextBaseSize = prev.baseSize;
      } else {
        nextBaseSize = selectedSizes[0];
      }
      
      if (nextBaseSize !== prev.baseSize) {
        changed = true;
      }

      const nextSizes = prev.sizes ? { ...prev.sizes } : {};
      if (prev.sizes) {
        Object.keys(prev.sizes).forEach(size => {
          if (!selectedSizes.includes(size)) {
            delete nextSizes[size];
            changed = true;
          }
        });
      }

      if (!changed) {
        return prev;
      }

      return {
        ...prev,
        baseSize: nextBaseSize,
        sizes: nextSizes,
      };
    });
  }, [measurementBaseSize, selectedSizes]);

  useEffect(() => {
    setBaseSizeSelectorValue(measurementBaseSize || '');
  }, [measurementBaseSize]);

  const baseValue = formData.baseSize && formData.sizes
    ? formData.sizes[formData.baseSize]
    : undefined;
  
  // Check if unit supports fraction input (inch-10, inch-16, inch-32)
  const supportsFractionInput = tableUnit === 'inch-10' || tableUnit === 'inch-16' || tableUnit === 'inch-32';

  const deriveAdjustmentsFromSizes = useCallback(
    (sizes: Record<string, number> | undefined, baseSize?: string): Record<string, string> => {
      if (!sizes || !baseSize || sizes[baseSize] === undefined) return {};
      const base = sizes[baseSize];
      const entries = Object.entries(sizes).reduce<Record<string, string>>((acc, [size, value]) => {
        if (size === baseSize || value === undefined || value === null) return acc;
        acc[size] = formatStepValue(value - base);
        return acc;
      }, {});
      return entries;
    },
    []
  );

  const recalcSizesFromBase = useCallback(
    (
      activeBaseSize: string | undefined,
      nextBaseValue: number | undefined,
      adjustments: Record<string, string>,
      sizeList: string[]
    ): Record<string, number> => {
      if (!activeBaseSize || nextBaseValue === undefined || Number.isNaN(nextBaseValue)) {
        return {};
      }

      const nextSizes: Record<string, number> = {
        [activeBaseSize]: nextBaseValue,
      };

      sizeList.forEach(size => {
        if (size === activeBaseSize) return;
        const delta = parseStepValue(adjustments[size]);
        if (delta === undefined) return;
        nextSizes[size] = parseFloat((nextBaseValue + delta).toFixed(4));
      });

      return nextSizes;
    },
    []
  );

  const buildAdjustmentMap = useCallback(
    (sizes: Record<string, number> | undefined, baseSize: string | undefined, sizeList: string[]): Record<string, string> => {
      if (!baseSize) return {};
      const derived = deriveAdjustmentsFromSizes(sizes, baseSize);
      return sizeList.reduce<Record<string, string>>((acc, size) => {
        if (size === baseSize) return acc;
        acc[size] = derived[size] || '';
        return acc;
      }, {});
    },
    [deriveAdjustmentsFromSizes]
  );

  const mergeRecalculatedSizes = useCallback(
    (
      prevSizes: Record<string, number> | undefined,
      baseSize: string | undefined,
      nextBaseValue: number | undefined,
      adjustments: Record<string, string>,
      sizeList: string[]
    ): Record<string, number> => {
      if (!baseSize) {
        const sanitized = { ...(prevSizes || {}) };
        sizeList.forEach(size => delete sanitized[size]);
        return sanitized;
      }
      const recalculated = recalcSizesFromBase(baseSize, nextBaseValue, adjustments, sizeList);
      const merged = { ...(prevSizes || {}) };
      sizeList.forEach(size => {
        if (recalculated[size] === undefined) {
          delete merged[size];
        } else {
          merged[size] = recalculated[size];
        }
      });
      return merged;
    },
    [recalcSizesFromBase]
  );

  const updateSizesWithBase = useCallback(
    (options?: { baseValue?: number; adjustments?: Record<string, string> }) => {
      setFormData(prev => {
        const baseSize = prev.baseSize;
        if (!baseSize) return prev;
        const nextSizes = mergeRecalculatedSizes(
          prev.sizes,
          baseSize,
          options?.baseValue !== undefined ? options.baseValue : prev.sizes?.[baseSize],
          options?.adjustments || sizeAdjustments,
          selectedSizes
        );
        const positiveValues = Object.values(nextSizes).filter(
          value => value !== undefined && value !== null && value > 0
        ) as number[];
        if (positiveValues.length > 0) {
          validation.validateField('measurement', Math.min(...positiveValues));
        }
        return {
          ...prev,
          sizes: nextSizes,
        };
      });
    },
    [mergeRecalculatedSizes, selectedSizes, sizeAdjustments, validation]
  );

type MeasurementRow = SampleMeasurementRow;

type RoundModalFormState = {
  name: string;
  date: string;
  reviewer: string;
  requestedSource: MeasurementRequestedSource;
};

  const measurementRows = useMemo<MeasurementRow[]>(() => {
    if (measurements.length > 0) {
      return measurements.map(measurement => ({
        key: measurement.id || measurement.pomCode,
        measurement,
        pomCode: measurement.pomCode,
        pomName: measurement.pomName,
      }));
    }

    const fallbackMap = new Map<string, MeasurementSampleEntry>();
    sampleMeasurementRounds.forEach(round => {
      round.measurements.forEach(entry => {
        const entryKey = entry.measurementId || entry.id || `${entry.pomCode}-${entry.point}`;
        if (entryKey && !fallbackMap.has(entryKey)) {
          fallbackMap.set(entryKey, entry);
        }
      });
    });

    return Array.from(fallbackMap.entries()).map(([key, entry]) => ({
      key,
      pomCode: entry.pomCode,
      pomName: entry.pomName || entry.point,
      fallbackEntryId: entry.id,
    }));
  }, [measurements, sampleMeasurementRounds]);

  const highlightedColumn = measurementBaseSize;

  const requestedSourceLabels: Record<MeasurementRequestedSource, string> = {
    original: 'Original Spec',
    previous: 'From Previous Round',
  };

  const getRequestedKeys = useCallback((entry: MeasurementSampleEntry): string[] => {
    if (!entry?.requested) return [];
    return Object.entries(entry.requested)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([size]) => size);
  }, []);

  const isEntryComplete = useCallback((entry: MeasurementSampleEntry): boolean => {
    const requestedKeys = getRequestedKeys(entry);
    if (requestedKeys.length === 0) return false;
    return requestedKeys.every(sizeKey => {
      const measuredValue = entry.measured?.[sizeKey];
      return measuredValue !== undefined && measuredValue !== null && measuredValue !== '';
    });
  }, [getRequestedKeys]);

  const isRoundComplete = useCallback((round?: MeasurementSampleRound): boolean => {
    if (!round || !round.measurements || round.measurements.length === 0) return false;
    return round.measurements.every(isEntryComplete);
  }, [isEntryComplete]);

  const lastRound = sampleMeasurementRounds.length > 0 ? sampleMeasurementRounds[sampleMeasurementRounds.length - 1] : undefined;
  const lastRoundComplete = useMemo(() => isRoundComplete(lastRound), [isRoundComplete, lastRound]);
  // Cho phép add round mới bất cứ lúc nào - không yêu cầu round trước phải complete
  // User có thể save progress và tạo round mới mà không cần hoàn thành hết
  const canAddNewRound = true; // Luôn cho phép add round mới
  const hasPreviousRound = sampleMeasurementRounds.length > 0;
  const latestRoundId = useMemo(
    () => sampleMeasurementRounds[sampleMeasurementRounds.length - 1]?.id,
    [sampleMeasurementRounds]
  );
  const previousRoundEditWarning = 'Bạn không thể chỉnh sửa round trước đó vì sẽ ảnh hưởng đến các round tiếp theo.';

  const isEditableRound = useCallback(
    (roundId?: string) => {
      if (!roundId) return true;
      return roundId === latestRoundId;
    },
    [latestRoundId]
  );

  const getEntryForRound = useCallback((round: MeasurementSampleRound, row: MeasurementRow): MeasurementSampleEntry | undefined => {
    if (!round?.measurements) return undefined;
    
    // Ưu tiên tìm bằng measurementId (chính xác nhất)
    if (row.measurement?.id) {
      const byId = round.measurements.find(entry => entry.measurementId === row.measurement!.id);
      if (byId) return byId;
    }
    
    // Fallback: tìm bằng entryId
    if (row.fallbackEntryId) {
      const byEntryId = round.measurements.find(entry => entry.id === row.fallbackEntryId);
      if (byEntryId) return byEntryId;
    }
    
    // Fallback: tìm bằng pomCode (có thể có nhiều entries cùng pomCode nếu có vấn đề)
    if (row.pomCode) {
      const byCode = round.measurements.find(entry => entry.pomCode === row.pomCode);
      if (byCode) return byCode;
    }
    
    // Nếu không tìm thấy entry, có thể entry chưa được tạo
    // Trả về undefined - entry sẽ được tạo tự động khi user nhập dữ liệu
    return undefined;
  }, []);

  const handleRoundFieldChange = useCallback(
    (roundId: string, field: keyof MeasurementSampleRound, value: string) => {
      if (!isEditableRound(roundId)) {
        showWarning(previousRoundEditWarning);
        return;
      }
      updateSampleMeasurementRound?.(roundId, { [field]: value } as Partial<MeasurementSampleRound>);
    },
    [isEditableRound, previousRoundEditWarning, showWarning, updateSampleMeasurementRound]
  );

  const handleRoundFormFieldChange = useCallback((field: keyof RoundModalFormState, value: string) => {
    setRoundForm(prev => ({
      ...prev,
      [field]: field === 'requestedSource' ? (value as MeasurementRequestedSource) : value,
    }));
  }, []);

  const handleOpenRoundModal = useCallback(() => {
    if (sampleMeasurementRounds.length > 0 && hasUnsavedChanges) {
      window.alert('Vui lòng lưu sample round hiện tại trước khi tạo round mới.');
      return;
    }

    if (!canAddNewRound) {
      showWarning('Please complete the previous round before creating a new one.');
      return;
    }
    setRoundForm({
      name: `Sample Round ${sampleMeasurementRounds.length + 1}`,
      date: new Date().toISOString().slice(0, 10),
      reviewer: '',
      requestedSource: hasPreviousRound ? 'previous' : 'original',
    });
    setShowRoundModal(true);
  }, [canAddNewRound, hasPreviousRound, hasUnsavedChanges, sampleMeasurementRounds.length]);

  const handleCloseRoundModal = useCallback(() => {
    setShowRoundModal(false);
  }, []);

  const handleCreateRound = useCallback(() => {
    if (!addSampleMeasurementRound) return;
    const parsedDate = roundForm.date ? new Date(roundForm.date) : new Date();
    const isoDate = Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();

    addSampleMeasurementRound({
      name: roundForm.name.trim() || `Sample Round ${sampleMeasurementRounds.length + 1}`,
      date: isoDate,
      reviewer: roundForm.reviewer.trim(),
      requestedSource: roundForm.requestedSource,
      overallComments: '',
    });
    setShowRoundModal(false);
  }, [addSampleMeasurementRound, roundForm, sampleMeasurementRounds.length]);

  type EditableSampleField = 'measured' | 'diff' | 'revised' | 'comments';

  const handleEntrySizeValueChange = useCallback(
    (
      roundId: string,
      entryId: string,
      field: EditableSampleField,
      sizeKey: string,
      rawValue: string,
      measurementId?: string,
      pomCode?: string
    ) => {
      if (!updateSampleMeasurementEntry) return;

      const round = sampleMeasurementRounds.find(r => r.id === roundId);
      if (!round) return;
      if (!isEditableRound(roundId)) {
        showWarning(previousRoundEditWarning);
        return;
      }

      // Tìm entry bằng entryId trước (chính xác nhất)
      let entry = entryId ? round.measurements.find(m => m.id === entryId) : undefined;
      
      // Nếu không tìm thấy bằng entryId, tìm bằng measurementId (chính xác hơn pomCode)
      // Đảm bảo chỉ tìm entry có measurementId khớp chính xác
      if (!entry && measurementId) {
        entry = round.measurements.find(m => m.measurementId === measurementId);
      }
      
      // Fallback: tìm bằng pomCode (ít chính xác hơn, có thể có nhiều entries cùng pomCode)
      // Chỉ dùng nếu không có measurementId
      if (!entry && pomCode && !measurementId) {
        entry = round.measurements.find(m => m.pomCode === pomCode);
      }
      
      // Nếu không tìm thấy entry, tạo entry mới cho measurement point này
      if (!entry && (measurementId || pomCode)) {
        const measurement = measurements.find(m => 
          (measurementId && m.id === measurementId) || 
          (pomCode && m.pomCode === pomCode)
        );
        
        if (measurement && updateSampleMeasurementRound) {
          // Tạo entry mới
          const newEntry: MeasurementSampleEntry = {
            id: `sample-entry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            measurementId: measurement.id,
            pomCode: measurement.pomCode,
            pomName: measurement.pomName,
            requested: measurement.sizes ? Object.fromEntries(
              Object.entries(measurement.sizes).map(([size, value]) => [size, String(value)])
            ) : {},
            measured: {},
            diff: {},
            revised: {},
            comments: {},
          };
          
          // Thêm entry mới vào round
          updateSampleMeasurementRound(roundId, {
            measurements: [...round.measurements, newEntry]
          });
          
          entry = newEntry;
        } else {
          console.warn(`Cannot create entry: measurement not found for measurementId: ${measurementId}, pomCode: ${pomCode}`);
          return;
        }
      }
      
      if (!entry) {
        console.warn(`Entry not found and cannot be created for measurementId: ${measurementId}, pomCode: ${pomCode}, entryId: ${entryId}`);
        return;
      }
      
      // Đảm bảo entry này thuộc đúng measurement point
      // Nếu entry.measurementId không khớp với measurementId được truyền vào, có thể có vấn đề
      if (measurementId && entry.measurementId && entry.measurementId !== measurementId) {
        console.warn(`Entry measurementId mismatch: entry.measurementId=${entry.measurementId}, expected=${measurementId}. This may cause incorrect updates.`);
        // Không return để vẫn có thể update, nhưng có thể gây ra vấn đề
      }

      // Tìm measurement point tương ứng với entry này để lấy requested value chính xác
      // Ưu tiên dùng measurementId/pomCode được truyền vào (từ row) thay vì từ entry
      // để đảm bảo lấy đúng measurement point
      const measurement = measurementId 
        ? measurements.find(m => m.id === measurementId)
        : pomCode
          ? measurements.find(m => m.pomCode === pomCode)
          : measurements.find(m => 
              m.id === entry.measurementId || 
              m.pomCode === entry.pomCode
            );

      // Lấy requested value từ measurement point (ưu tiên) hoặc từ entry.requested (fallback)
      const requestedValueFromMeasurement = measurement?.sizes?.[sizeKey];
      const requestedValue = 
        requestedValueFromMeasurement !== undefined && requestedValueFromMeasurement !== null
          ? String(requestedValueFromMeasurement)
          : entry.requested?.[sizeKey];

      const existingMap = (entry[field] as MeasurementSampleValueMap) || {};
      const nextMap: MeasurementSampleValueMap = { ...existingMap };
      const normalizedValue =
        field === 'comments' ? rawValue : rawValue.replace(',', '.');
      const shouldDelete = normalizedValue.trim().length === 0;
      const storedValue = field === 'comments' ? normalizedValue : normalizedValue.trim();

      if (shouldDelete) {
        delete nextMap[sizeKey];
      } else {
        nextMap[sizeKey] = storedValue;
      }

      const payload: Partial<MeasurementSampleEntry> = {
        [field]: nextMap,
      } as Partial<MeasurementSampleEntry>;

      if (field === 'measured') {
        const measuredNumber = parseFloat(storedValue);
        const requestedNumber =
          requestedValue !== undefined && requestedValue !== ''
            ? parseFloat(String(requestedValue).replace(',', '.'))
            : undefined;

        if (!Number.isNaN(measuredNumber) && requestedNumber !== undefined && !Number.isNaN(requestedNumber)) {
          const nextDiff = { ...(entry.diff || {}) };
          nextDiff[sizeKey] = (measuredNumber - requestedNumber).toFixed(1);
          payload.diff = nextDiff;
        } else if (entry.diff?.[sizeKey]) {
          const nextDiff = { ...(entry.diff || {}) };
          delete nextDiff[sizeKey];
          payload.diff = nextDiff;
        }
      }

      updateSampleMeasurementEntry(roundId, entryId, payload);
    },
    [
      isEditableRound,
      measurements,
      previousRoundEditWarning,
      sampleMeasurementRounds,
      showWarning,
      updateSampleMeasurementEntry,
      updateSampleMeasurementRound
    ]
  );

  const handleDeleteSampleRound = useCallback((roundId: string) => {
    if (!deleteSampleMeasurementRound) return;
    if (window.confirm('Are you sure you want to remove this sample round?')) {
      deleteSampleMeasurementRound(roundId);
    }
  }, [deleteSampleMeasurementRound]);

  const handleSaveSampleRound = useCallback(async (roundId: string) => {
    if (!saveTechPack || !state?.techpack) return;
    
    try {
      // Tìm round đang được lưu
      const round = sampleMeasurementRounds.find(r => r.id === roundId);
      
      console.log('='.repeat(80));
      console.log('🔍 SAVING SAMPLE ROUND:', roundId);
      console.log('📦 Round:', JSON.stringify(round, null, 2));
      console.log('📏 Current measurements count:', measurements.length);
      measurements.forEach((m, idx) => {
        console.log(`  [${idx}] ${m.pomCode} (id: ${m.id}):`, m.sizes);
      });
      
      // Tạo bản sao measurements để cập nhật
      let updatedMeasurements = [...measurements];
      let hasUpdates = false;
      
      if (round && round.measurements) {
        console.log('✅ Round has measurements, processing...');
        // Duyệt qua các entries trong round
        for (const entry of round.measurements) {
          console.log('📝 Processing entry:', {
            measurementId: entry.measurementId,
            pomCode: entry.pomCode,
            revised: entry.revised
          });
          
          // Tìm measurement tương ứng chỉ bằng pomCode (vì measurementId thường là undefined)
          const measurementIndex = updatedMeasurements.findIndex(
            m => m.pomCode === entry.pomCode
          );
          
          console.log('🔎 Found measurement at index:', measurementIndex);
          
          if (measurementIndex !== -1 && entry.revised) {
            const measurement = updatedMeasurements[measurementIndex];
            
            // Lấy giá trị revised và cập nhật vào measurement.sizes
            const updatedSizes = { ...measurement.sizes };
            let hasRevised = false;
            
            // Duyệt qua các sizes trong revised
            Object.keys(entry.revised).forEach(sizeKey => {
              const revisedValue = entry.revised[sizeKey];
              console.log(`  - Size ${sizeKey}: revised value = ${revisedValue}`);
              
              // Chỉ cập nhật nếu revised có giá trị (không null, undefined, hoặc chuỗi rỗng)
              if (revisedValue !== null && revisedValue !== undefined && String(revisedValue).trim() !== '') {
                const numValue = parseFloat(String(revisedValue));
                if (!isNaN(numValue)) {
                  console.log(`    ✅ Updating size ${sizeKey}: ${measurement.sizes?.[sizeKey]} → ${numValue}`);
                  updatedSizes[sizeKey] = numValue;
                  hasRevised = true;
                }
              }
            });
            
            // Nếu có giá trị revised, cập nhật measurement trong mảng
            if (hasRevised) {
              updatedMeasurements[measurementIndex] = {
                ...measurement,
                sizes: updatedSizes
              };
              hasUpdates = true;
              console.log('✅ Updated measurement:', updatedMeasurements[measurementIndex]);
            }
          }
        }
      }
      
      console.log('📊 Has updates:', hasUpdates);
      console.log('📊 Updated measurements:', updatedMeasurements);
      
      // Nếu có cập nhật measurements, cập nhật từng measurement VÀ tính lại sizes khác
      if (hasUpdates && updateMeasurement) {
        // Cập nhật đồng bộ từng measurement
        for (let i = 0; i < updatedMeasurements.length; i++) {
          const oldMeasurement = measurements[i];
          const updatedMeasurement = updatedMeasurements[i];
          const oldSizes = oldMeasurement?.sizes || {};
          const newSizes = updatedMeasurement?.sizes || {};
          
          // Kiểm tra xem sizes có thay đổi không
          const sizesChanged = JSON.stringify(oldSizes) !== JSON.stringify(newSizes);
          
          if (sizesChanged) {
            console.log(`🔄 Updating measurement ${i}:`, {
              pomCode: updatedMeasurement.pomCode,
              old: oldSizes,
              new: newSizes
            });
            
            // Tìm baseSize cho measurement này
            const baseSize = updatedMeasurement.baseSize || measurementBaseSize;
            
            if (baseSize && newSizes[baseSize] !== undefined) {
              // Tính adjustments từ sizes CŨ (trước khi cập nhật)
              const adjustments = deriveAdjustmentsFromSizes(oldSizes, baseSize);
              console.log(`  📐 Base size: ${baseSize}, Adjustments:`, adjustments);
              
              // Tính lại TẤT CẢ sizes dựa trên base value MỚI và adjustments cũ
              const recalculatedSizes = recalcSizesFromBase(
                baseSize,
                newSizes[baseSize],
                adjustments,
                selectedSizes
              );
              
              console.log(`  ✨ Recalculated sizes:`, recalculatedSizes);
              
              // Cập nhật measurement với sizes đã được tính lại
              updateMeasurement(i, {
                ...updatedMeasurement,
                sizes: recalculatedSizes
              });
            } else {
              // Nếu không có baseSize, chỉ cập nhật sizes mới
              updateMeasurement(i, updatedMeasurement);
            }
          }
        }
        
        // Đợi một chút để state cập nhật
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Lưu toàn bộ TechPack
      await saveTechPack();
      
      if (hasUpdates) {
        showSuccess('Sample round saved and measurements updated from revised values');
      } else {
        showSuccess('Sample measurement round saved successfully');
      }
    } catch (error: any) {
      console.error('❌ Error saving sample round:', error);
      showError(error.message || 'Failed to save sample measurement round');
    }
  }, [saveTechPack, sampleMeasurementRounds, measurements, state?.techpack, updateMeasurement, measurementBaseSize, deriveAdjustmentsFromSizes, recalcSizesFromBase, selectedSizes]);

  const getDateInputValue = useCallback((value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  }, []);

  const handleAddSampleRound = useCallback(() => {
    handleOpenRoundModal();
  }, [handleOpenRoundModal]);


  React.useEffect(() => {
    if (selectedSizes.length === 0) return;
    if (!formData.baseSize || !selectedSizes.includes(formData.baseSize)) {
      // Use measurementBaseSize (global base size) if available, otherwise use first size in range
      const defaultBaseSize = measurementBaseSize && selectedSizes.includes(measurementBaseSize)
        ? measurementBaseSize
        : selectedSizes[0];
      setFormData(prev => ({
        ...prev,
        baseSize: defaultBaseSize,
      }));
    }
  }, [formData.baseSize, selectedSizes, measurementBaseSize]);

  // Sync baseValueInput with baseValue when not focused (e.g., when baseValue changes from outside)
  React.useEffect(() => {
    if (!isBaseInputFocused && baseValue !== undefined) {
      if (supportsFractionInput) {
        setBaseValueInput(formatMeasurementValueAsFraction(baseValue, tableUnit));
      } else {
        setBaseValueInput(String(baseValue));
      }
    } else if (!isBaseInputFocused && baseValue === undefined) {
      setBaseValueInput('');
    }
  }, [baseValue, isBaseInputFocused, supportsFractionInput, tableUnit]);

  // Sync minusToleranceInput with formData.minusTolerance when not focused
  React.useEffect(() => {
    if (!isMinusToleranceFocused && formData.minusTolerance !== undefined) {
      if (supportsFractionInput) {
        setMinusToleranceInput(formatMeasurementValueAsFraction(formData.minusTolerance, tableUnit));
      } else {
        setMinusToleranceInput(String(formData.minusTolerance));
      }
    } else if (!isMinusToleranceFocused && formData.minusTolerance === undefined) {
      setMinusToleranceInput('');
    }
  }, [formData.minusTolerance, isMinusToleranceFocused, supportsFractionInput, tableUnit]);

  // Sync plusToleranceInput with formData.plusTolerance when not focused
  React.useEffect(() => {
    if (!isPlusToleranceFocused && formData.plusTolerance !== undefined) {
      if (supportsFractionInput) {
        setPlusToleranceInput(formatMeasurementValueAsFraction(formData.plusTolerance, tableUnit));
      } else {
        setPlusToleranceInput(String(formData.plusTolerance));
      }
    } else if (!isPlusToleranceFocused && formData.plusTolerance === undefined) {
      setPlusToleranceInput('');
    }
  }, [formData.plusTolerance, isPlusToleranceFocused, supportsFractionInput, tableUnit]);

  React.useEffect(() => {
    if (!formData.baseSize) {
      setSizeAdjustments({});
      return;
    }

    setSizeAdjustments(prev => {
      if (Object.keys(prev).length === 0 && Object.keys(formData.sizes || {}).length > 0) {
        return buildAdjustmentMap(formData.sizes, formData.baseSize, selectedSizes);
      }

      const next = { ...prev };
      selectedSizes.forEach(size => {
        if (size === formData.baseSize) {
          delete next[size];
          return;
        }
        if (!(size in next)) {
          next[size] = '';
        }
      });
      Object.keys(next).forEach(key => {
        if (!selectedSizes.includes(key) || key === formData.baseSize) {
          delete next[key];
        }
      });
      return next;
    });
  }, [buildAdjustmentMap, formData.baseSize, formData.sizes, selectedSizes]);

  const handleInputChange = (field: keyof MeasurementPoint) => (value: string | number | boolean) => {
    const updatedFormData = { ...formData, [field]: value };
    setFormData(updatedFormData);

    // Validate the field in real-time
    validation.validateField(field, value);
  };

  const handleBaseValueChange = (value: string) => {
    // Store raw input while user is typing
    setBaseValueInput(value);
    
    if (value.trim() === '') {
      updateSizesWithBase({ baseValue: undefined });
      return;
    }
    // Use parseMeasurementValue to support fractions like "15 1/4", "15.25", "1/2"
    const parsed = parseMeasurementValue(value);
    if (parsed === undefined) {
      // Allow intermediate input states (e.g., "15 ", "15 1/")
      // Don't update if it's a valid intermediate state - but keep the raw input
      return;
    }
    updateSizesWithBase({ baseValue: parsed });
  };
  
  const handleBaseValueBlur = () => {
    setIsBaseInputFocused(false);
    // When blur, format the value properly if it was successfully parsed
    if (baseValue !== undefined && supportsFractionInput) {
      setBaseValueInput(formatMeasurementValueAsFraction(baseValue, tableUnit));
    } else if (baseValue !== undefined) {
      setBaseValueInput(String(baseValue));
    }
  };
  
  const handleBaseValueFocus = () => {
    setIsBaseInputFocused(true);
    // When focus, show the raw value or formatted value
    if (baseValue !== undefined) {
      if (supportsFractionInput) {
        // Show formatted fraction when focusing
        setBaseValueInput(formatMeasurementValueAsFraction(baseValue, tableUnit));
      } else {
        setBaseValueInput(String(baseValue));
      }
    } else {
      setBaseValueInput('');
    }
  };

  const handleUnitChange = async (newUnit: MeasurementUnit) => {
    // Update local state first
    updateMeasurementDisplaySettings({ unit: newUnit });
    // Update all existing measurements to use the new unit
    measurements.forEach((measurement, index) => {
      updateMeasurement(index, { ...measurement, unit: newUnit });
    });
    // Wait a bit for state to update, then auto-save to backend
    if (saveTechPack && state?.techpack?.id) {
      try {
        // Use setTimeout to ensure state is updated before save
        await new Promise(resolve => setTimeout(resolve, 100));
        // Get updated techpack with new unit
        const updatedTechpack = {
          ...state.techpack,
          measurementUnit: newUnit,
        };
        await saveTechPack(updatedTechpack);
        showSuccess('Measurement unit updated and saved');
      } catch (error: any) {
        console.error('Failed to save measurement unit:', error);
        showError(error?.message || 'Failed to save measurement unit');
      }
    }
  };

  const handleMinusToleranceChange = (value: string) => {
    // Store raw input while user is typing
    setMinusToleranceInput(value);
    
    if (value.trim() === '') {
      setFormData(prev => ({ ...prev, minusTolerance: undefined }));
      return;
    }
    // Use parseMeasurementValue to support fractions like "1/2", "1 1/4", "1.5", "0.5"
    const parsed = parseMeasurementValue(value);
    if (parsed === undefined) {
      // Allow intermediate input states (e.g., "1/", "1 1/", "0.")
      // Don't update if it's a valid intermediate state - but keep the raw input
      return;
    }
    handleInputChange('minusTolerance')(parsed);
  };
  
  const handleMinusToleranceBlur = () => {
    setIsMinusToleranceFocused(false);
    // When blur, format the value properly if it was successfully parsed
    if (formData.minusTolerance !== undefined && supportsFractionInput) {
      setMinusToleranceInput(formatMeasurementValueAsFraction(formData.minusTolerance, tableUnit));
    } else if (formData.minusTolerance !== undefined) {
      setMinusToleranceInput(String(formData.minusTolerance));
    }
  };
  
  const handleMinusToleranceFocus = () => {
    setIsMinusToleranceFocused(true);
    // When focus, show the raw value or formatted value
    if (formData.minusTolerance !== undefined) {
      if (supportsFractionInput) {
        // Show formatted fraction when focusing
        setMinusToleranceInput(formatMeasurementValueAsFraction(formData.minusTolerance, tableUnit));
      } else {
        setMinusToleranceInput(String(formData.minusTolerance));
      }
    } else {
      setMinusToleranceInput('');
    }
  };

  const handlePlusToleranceChange = (value: string) => {
    // Store raw input while user is typing
    setPlusToleranceInput(value);
    
    if (value.trim() === '') {
      setFormData(prev => ({ ...prev, plusTolerance: undefined }));
      return;
    }
    // Use parseMeasurementValue to support fractions like "1/2", "1 1/4", "1.5", "0.5"
    const parsed = parseMeasurementValue(value);
    if (parsed === undefined) {
      // Allow intermediate input states (e.g., "1/", "1 1/", "0.")
      // Don't update if it's a valid intermediate state - but keep the raw input
      return;
    }
    handleInputChange('plusTolerance')(parsed);
  };
  
  const handlePlusToleranceBlur = () => {
    setIsPlusToleranceFocused(false);
    // When blur, format the value properly if it was successfully parsed
    if (formData.plusTolerance !== undefined && supportsFractionInput) {
      setPlusToleranceInput(formatMeasurementValueAsFraction(formData.plusTolerance, tableUnit));
    } else if (formData.plusTolerance !== undefined) {
      setPlusToleranceInput(String(formData.plusTolerance));
    }
  };
  
  const handlePlusToleranceFocus = () => {
    setIsPlusToleranceFocused(true);
    // When focus, show the raw value or formatted value
    if (formData.plusTolerance !== undefined) {
      if (supportsFractionInput) {
        // Show formatted fraction when focusing
        setPlusToleranceInput(formatMeasurementValueAsFraction(formData.plusTolerance, tableUnit));
      } else {
        setPlusToleranceInput(String(formData.plusTolerance));
      }
    } else {
      setPlusToleranceInput('');
    }
  };

  const handleSizeAdjustmentChange = (size: string, value: string) => {
    const normalized = value.replace(',', '.');
    const nextAdjustments = { ...sizeAdjustments };
    if (!normalized.trim()) {
      delete nextAdjustments[size];
    } else {
      nextAdjustments[size] = normalized;
    }
    setSizeAdjustments(nextAdjustments);
    updateSizesWithBase({ adjustments: nextAdjustments });
  };

  const handleBaseSizeSelect = (size: string) => {
    if (size === formData.baseSize) return;
    const nextAdjustments = buildAdjustmentMap(formData.sizes, size, selectedSizes);
    setFormData(prev => ({
      ...prev,
      baseSize: size,
    }));
    setSizeAdjustments(nextAdjustments);
  };

  const handleRemoveSize = (size: string) => {
    if (!updateMeasurementSizeRange) return;
    if (selectedSizes.length <= 1) {
      showWarning('At least one size is required.');
      return;
    }
    updateMeasurementSizeRange(selectedSizes.filter(item => item !== size));
  };

  const handleAddSize = () => {
    if (!updateMeasurementSizeRange) return;
    const trimmed = newSizeLabel.trim();
    if (!trimmed) {
      showWarning('Please provide a size label before adding.');
      return;
    }
    const exists = selectedSizes.some(size => size.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      showWarning('Size already exists in this range.');
      return;
    }
    updateMeasurementSizeRange([...selectedSizes, trimmed]);
    setNewSizeLabel('');
  };

  const handleApplyPreset = () => {
    if (!updateMeasurementSizeRange) return;
    const preset = getPresetById(pendingPresetId);
    if (!preset) return;
    if (preset.sizes.length === 0) {
      if (window.confirm('Apply an empty preset and clear all configured sizes?')) {
        updateMeasurementSizeRange([]);
      }
      return;
    }
    const shouldConfirm = measurements.length > 0;
    if (shouldConfirm) {
      const confirmed = window.confirm(
        'Applying a preset will replace the current size range for this techpack. Continue?'
      );
      if (!confirmed) return;
    }
    updateMeasurementSizeRange([...preset.sizes]);
  };

  const handleBaseSizeSelectorChange = (size: string) => {
    if (!size) {
      setBaseSizeSelectorValue('');
      return;
    }
    if (size === measurementBaseSize) {
      setBaseSizeSelectorValue(size);
      return;
    }
    setBaseSizeSelectorValue(size);
    setPendingBaseSize(size);
    setShowBaseSizeConfirm(true);
  };

  const handleConfirmBaseSizeChange = () => {
    if (pendingBaseSize && updateMeasurementBaseSize) {
      updateMeasurementBaseSize(pendingBaseSize);
    }
    setPendingBaseSize(null);
    setShowBaseSizeConfirm(false);
  };

  const handleCancelBaseSizeChange = () => {
    setPendingBaseSize(null);
    setShowBaseSizeConfirm(false);
    setBaseSizeSelectorValue(measurementBaseSize || '');
  };

  const handleRowStripeColorChange = (color: string) => {
    if (!updateMeasurementDisplaySettings) return;
    updateMeasurementDisplaySettings({ rowStripeColor: color });
  };

  // Enhanced progression validation
  const validateProgression = useCallback((
    sizes: Record<string, number>,
    sizeOrder: string[],
    unit: MeasurementUnit = DEFAULT_MEASUREMENT_UNIT
  ): ProgressionValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const unitSuffix = getMeasurementUnitSuffix(unit);
    
    // Filter sizes that have values
    const sizeEntries = sizeOrder
      .map(size => ({ size, value: sizes[size] }))
      .filter(entry => entry.value !== undefined && entry.value !== null);
    
    if (sizeEntries.length < 2) {
      return { isValid: true, errors: [], warnings: [] }; // Need at least 2 sizes to check progression
    }

    // Check for zero or negative values
    const hasInvalidValues = sizeEntries.some(entry => entry.value! <= 0);
    if (hasInvalidValues) {
      errors.push('All measurements must be greater than 0');
    }

    // Check progression: each size should be >= previous size (for most measurements)
    // Allow some flexibility: if difference is less than 5%, treat as warning
    const progressionIssues: Array<{ from: string; to: string; diff: number }> = [];
    
    for (let i = 1; i < sizeEntries.length; i++) {
      const prevValue = sizeEntries[i - 1].value!;
      const currValue = sizeEntries[i].value!;
      const diff = currValue - prevValue;
      const percentDiff = (diff / prevValue) * 100;
      
      if (diff < 0) {
        // Decreasing progression - always an issue
        progressionIssues.push({
          from: sizeEntries[i - 1].size,
          to: sizeEntries[i].size,
          diff: Math.abs(diff)
        });
      } else if (diff === 0) {
        // Same value - warning (might be intentional for some measurements)
        warnings.push(`${sizeEntries[i - 1].size} and ${sizeEntries[i].size} have the same value`);
      } else if (percentDiff < 1) {
        // Very small increase (< 1%) - warning
        warnings.push(`Very small progression between ${sizeEntries[i - 1].size} and ${sizeEntries[i].size} (${diff.toFixed(2)} ${unitSuffix})`);
      }
    }

    if (progressionIssues.length > 0) {
      const issueDetails = progressionIssues
        .map(issue => `${issue.from} → ${issue.to}: decreased by ${issue.diff.toFixed(2)} ${unitSuffix}`)
        .join('; ');
      
      if (progressionMode === 'strict') {
        errors.push(`Size progression error: ${issueDetails}`);
      } else {
        warnings.push(`Size progression warning: ${issueDetails}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, [progressionMode]);

  // Helper to format validation alert message
  const formatValidationAlert = (fieldKey: string): string => {
    const FIELD_LABEL_MAP: Record<string, string> = {
      pomCode: 'POM Code',
      pomName: 'POM Name',
      minusTolerance: 'Minus Tolerance',
      plusTolerance: 'Plus Tolerance',
      sizes: 'Size Measurements', // Changed from 'measurement' to 'sizes' to match UI
    };
    
    const fieldLabel = FIELD_LABEL_MAP[fieldKey] || fieldKey;
    return `Trường ${fieldLabel}, thuộc tab Measurements chưa được điền. Vui lòng điền đầy đủ thông tin.`;
  };

  const handleSubmit = () => {
    // Validate pomCode and pomName separately
    const pomCodeValid = validation.validateField('pomCode', formData.pomCode);
    const pomNameValid = validation.validateField('pomName', formData.pomName);
    const minusToleranceValid = validation.validateField('minusTolerance', formData.minusTolerance);
    const plusToleranceValid = validation.validateField('plusTolerance', formData.plusTolerance);

    if (!pomCodeValid || !pomNameValid || !minusToleranceValid || !plusToleranceValid) {
      Object.keys(measurementValidationSchema).forEach(field => {
        validation.setFieldTouched(field, true);
      });
      // Show alert for first error field
      const errors = validation.errors;
      const firstField = Object.keys(errors).find(key => errors[key] && validation.touched[key]);
      if (firstField) {
        showError(formatValidationAlert(firstField));
      }
      return;
    }

    // Build sizes object with only selected sizes, preserving 0 values
    const sizes: Record<string, number> = {};
    selectedSizes.forEach(size => {
      const value = formData.sizes?.[size];
      // Only include if value is defined (including 0)
      if (value !== undefined && value !== null) {
        sizes[size] = value;
      }
    });

    if (!formData.baseSize) {
      validation.setFieldError('measurement', 'Please select a base size');
      showError('Please select a base size for this measurement.');
      return;
    }

    // Validate that at least one size has a value > 0
    const sizeValues = Object.values(sizes);
    const hasValidMeasurements = sizeValues.some(v => v > 0);
    
    if (!hasValidMeasurements) {
      validation.setFieldError('measurement', 'At least one size measurement must be greater than 0');
      showError(formatValidationAlert('sizes'));
      return;
    }

    const baseMeasurementValue = sizes[formData.baseSize];
    if (baseMeasurementValue === undefined) {
      validation.setFieldError('measurement', 'Enter the base measurement value');
      showError('Base size measurement is required before saving.');
      return;
    }

    // Validate progression
    const progressionValidation = validateProgression(
      sizes,
      selectedSizes,
      tableUnit
    );
    
    if (!progressionValidation.isValid && progressionMode === 'strict') {
      // Block submission if strict mode and has errors
      showError(`Cannot save: ${progressionValidation.errors.join('; ')}`);
      return;
    }

    // Show warnings if any
    if (progressionValidation.warnings.length > 0) {
      showWarning(`Warning: ${progressionValidation.warnings.join('; ')}`);
    }

    const measurement: MeasurementPoint = {
      id: editingIndex !== null ? measurements[editingIndex].id : `measurement_${Date.now()}`,
      clientKey: editingIndex !== null 
        ? measurements[editingIndex].clientKey // Keep existing clientKey when editing
        : `m_${ensureKey()}`, // New clientKey when adding
      pomCode: formData.pomCode!,
      pomName: formData.pomName!,
      minusTolerance: formData.minusTolerance ?? 1.0,
      plusTolerance: formData.plusTolerance ?? 1.0,
      unit: tableUnit, // Use table-level unit
      sizes,
      notes: formData.notes || '',
      measurementMethod: formData.measurementMethod || '',
      isActive: formData.isActive !== false,
      baseSize: formData.baseSize,
    };

    if (editingIndex !== null) {
      updateMeasurement(editingIndex, measurement);
      showSuccess('Measurement updated successfully');
    } else {
      addMeasurement(measurement);
      showSuccess('Measurement added successfully');
    }

    resetForm();
  };

  const resetForm = () => {
    // Use measurementBaseSize (global base size) if available, otherwise use first size in range
    const defaultBaseSize = measurementBaseSize && selectedSizes.includes(measurementBaseSize)
      ? measurementBaseSize
      : selectedSizes[0];
    
    setFormData({
      pomCode: '',
      pomName: '',
      minusTolerance: 1.0,
      plusTolerance: 1.0,
      sizes: {},
      baseSize: defaultBaseSize,
      notes: '',
      measurementMethod: '',
      isActive: true,
    });
    setSizeAdjustments({});
    setBaseValueInput('');
    setIsBaseInputFocused(false);
    setMinusToleranceInput('');
    setIsMinusToleranceFocused(false);
    setPlusToleranceInput('');
    setIsPlusToleranceFocused(false);
    setShowAddForm(false);
    setEditingIndex(null);
    validation.reset();
  };

  const handleEdit = (measurement: MeasurementPoint, index: number) => {
    // Handle both UI field names (minusTolerance/plusTolerance) and backend field names (toleranceMinus/tolerancePlus)
    const minusTolRaw = measurement.minusTolerance ?? (measurement as any).toleranceMinus;
    const plusTolRaw = measurement.plusTolerance ?? (measurement as any).tolerancePlus;
    
    // Convert tolerance from string to number if needed (backward compatibility)
    const minusTol = typeof minusTolRaw === 'string' 
      ? parseTolerance(minusTolRaw) 
      : (minusTolRaw !== undefined && minusTolRaw !== null ? minusTolRaw : 1.0);
    const plusTol = typeof plusTolRaw === 'string'
      ? parseTolerance(plusTolRaw)
      : (plusTolRaw !== undefined && plusTolRaw !== null ? plusTolRaw : 1.0);

    const measurementSizes = measurement.sizes ? Object.keys(measurement.sizes) : [];
    // Priority: measurementBaseSize (global) > measurement.baseSize > measurementSizes[0] > selectedSizes[0]
    const resolvedBaseSize = 
      (measurementBaseSize && selectedSizes.includes(measurementBaseSize))
        ? measurementBaseSize
        : (measurement.baseSize && selectedSizes.includes(measurement.baseSize))
          ? measurement.baseSize
          : measurementSizes[0] && selectedSizes.includes(measurementSizes[0])
            ? measurementSizes[0]
            : selectedSizes[0];

    setFormData({
      ...measurement,
      minusTolerance: minusTol,
      plusTolerance: plusTol,
      baseSize: resolvedBaseSize,
      sizes: measurement.sizes || {},
    });
    setEditingIndex(index);
    setShowAddForm(true);

    setSizeAdjustments(buildAdjustmentMap(measurement.sizes || {}, resolvedBaseSize, measurementSizes.length > 0 ? measurementSizes : selectedSizes));

    // Set selected sizes based on measurement data
    if (measurementSizes.length > 0 && updateMeasurementSizeRange) {
      const missing = measurementSizes.filter(size => !selectedSizes.includes(size));
      if (missing.length > 0) {
        updateMeasurementSizeRange([...selectedSizes, ...missing]);
      }
    }
  };

  const handleDelete = (measurement: MeasurementPoint, index: number) => {
    if (window.confirm(`Are you sure you want to delete "${measurement.pomCode} - ${measurement.pomName}"?`)) {
      deleteMeasurement(index);
      showSuccess('Measurement deleted');
    }
  };

  // Helper to generate unique client key (used when creating new measurements)
  const ensureKey = useCallback(() => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }, []);

  // Helper to get unique row key for measurement (ONLY use clientKey - never id or index)
  // clientKey is stable and unique per row, independent of backend id or array index
  const getRowKey = useCallback((m: MeasurementPoint): string => {
    if (m.clientKey) return m.clientKey;
    // Fallback only if clientKey not set (should not happen after normalization)
    if (m.id) return `id_${m.id}`;
    if ((m as any)._id) return `oid_${String((m as any)._id)}`;
    return `tmp_${ensureKey()}`;
  }, [ensureKey]);

  // Memoize rowKeys array for select all functionality
  const rowKeys = useMemo(
    () => measurements.map(getRowKey),
    [measurements, getRowKey]
  );

  // Ensure all measurements have clientKey (normalize only in getRowKey, don't trigger state update)
  // This prevents triggering unsaved changes when just viewing the tab
  // clientKey will be properly normalized when data is loaded from server or when user adds/edits

  // Cleanup selection when rowKeys change (remove invalid keys)
  useEffect(() => {
    setSelectedMeasurementIds((prev) => {
      if (prev.size === 0) return prev;
      const validKeys = new Set(rowKeys);
      const next = new Set(Array.from(prev).filter(k => validKeys.has(k)));
      return next.size === prev.size ? prev : next;
    });
  }, [rowKeys]);

  // Multi-select handlers
  const toggleMeasurementSelection = (key: string) => {
    setSelectedMeasurementIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleSelectAllMeasurements = () => {
    setSelectedMeasurementIds(prev => {
      if (prev.size === rowKeys.length && rowKeys.length > 0) {
        return new Set();
      }
      return new Set(rowKeys);
    });
  };

  const clearMeasurementSelection = () => {
    setSelectedMeasurementIds(new Set());
  };

  // Bulk duplicate Measurements with Sample Rounds mapping
  const handleBulkDuplicateMeasurements = () => {
    if (selectedMeasurementIds.size === 0 || !insertMeasurementAt) return;
    
    const selectedItems = measurements.filter((m) => {
      const key = getRowKey(m);
      return selectedMeasurementIds.has(key);
    });
    if (selectedItems.length === 0) return;

    // Create mapping: oldMeasurementKey -> newMeasurementId
    const measurementKeyMap = new Map<string, string>();
    const oldIdToNewIdMap = new Map<string, string>(); // For sample rounds lookup
    const duplicatedMeasurements: MeasurementPoint[] = [];
    
      selectedItems.forEach((measurement, idx) => {
      const originalIndex = measurements.findIndex((m) => {
        const key = getRowKey(m);
        const selectedKey = getRowKey(measurement);
        return key === selectedKey;
      });
      if (originalIndex < 0) return;
      
      const originalKey = getRowKey(measurement);
      const oldId = measurement.id || (measurement as any)._id;
      
      // Generate unique pomCode with suffix
      let newPomCode = `${measurement.pomCode}_COPY`;
      let suffixNum = 1;
      while (measurements.some(m => m.pomCode === newPomCode)) {
        newPomCode = `${measurement.pomCode}_COPY-${suffixNum}`;
        suffixNum++;
      }
      
      // Generate unique ID for duplicate (do not reuse _id)
      const newId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `measurement_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}`;
      const duplicate: MeasurementPoint = {
        ...measurement,
        id: newId,
        clientKey: `m_${ensureKey()}`, // CRITICAL: New clientKey for duplicate
        pomCode: newPomCode,
        pomName: `${measurement.pomName} (Copy)`,
        sizes: measurement.sizes ? { ...measurement.sizes } : {},
        unit: (measurement.unit as MeasurementUnit) || DEFAULT_MEASUREMENT_UNIT,
      };
      // Explicitly remove _id from duplicate to avoid conflicts
      delete (duplicate as any)._id;
      
      measurementKeyMap.set(originalKey, newId);
      if (oldId) {
        oldIdToNewIdMap.set(oldId, newId);
      }
      duplicatedMeasurements.push(duplicate);
      
      // Insert after original measurement
      if (originalIndex >= 0) {
        insertMeasurementAt(originalIndex + 1 + idx, duplicate);
      }
    });

    // Duplicate Sample Rounds entries for duplicated measurements
    if (measurementKeyMap.size > 0 && sampleMeasurementRounds.length > 0) {
      // Use context to update sample rounds with duplicated entries
      sampleMeasurementRounds.forEach(round => {
        const newEntries: MeasurementSampleEntry[] = [];
        
        // Find entries related to duplicated measurements and create copies
        round.measurements.forEach(entry => {
          const oldMeasurementId = entry.measurementId;
          if (oldMeasurementId && oldIdToNewIdMap.has(oldMeasurementId)) {
            const newMeasurementId = oldIdToNewIdMap.get(oldMeasurementId)!;
            // Find the new measurement to get its sizes for requested values
            const newMeasurement = duplicatedMeasurements.find(m => m.id === newMeasurementId);
            
            const newEntry: MeasurementSampleEntry = {
              ...entry,
              id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              measurementId: newMeasurementId,
              pomCode: newMeasurement?.pomCode || entry.pomCode,
              pomName: newMeasurement?.pomName || entry.pomName,
              // Copy user-entered data: measured, revised, comments, diff
              measured: entry.measured ? { ...entry.measured } : {},
              revised: entry.revised ? { ...entry.revised } : {},
              comments: entry.comments ? { ...entry.comments } : {},
              diff: entry.diff ? { ...entry.diff } : {},
              // requested will be rebuilt from new measurement.sizes (source-of-truth)
              requested: newMeasurement?.sizes 
                ? Object.entries(newMeasurement.sizes).reduce<MeasurementSampleValueMap>((acc, [size, value]) => {
                    acc[size] = value !== null && value !== undefined ? String(value) : '';
                    return acc;
                  }, {})
                : {},
            };
            newEntries.push(newEntry);
          }
        });
        
        // Add new entries to round
        if (newEntries.length > 0 && updateSampleMeasurementRound) {
          const currentEntries = round.measurements || [];
          updateSampleMeasurementRound(round.id, {
            measurements: [...currentEntries, ...newEntries],
          });
        }
      });
    }

    showSuccess(`Duplicated ${selectedItems.length} measurement(s) with sample rounds`);
    clearMeasurementSelection();
  };

  // Bulk delete Measurements with Sample Rounds cleanup
  const handleBulkDeleteMeasurements = () => {
    if (selectedMeasurementIds.size === 0) return;
    
    const selectedItems = measurements.filter((m) => {
      const key = getRowKey(m);
      return selectedMeasurementIds.has(key);
    });
    if (selectedItems.length === 0) return;

    const confirmationMessage = `Are you sure you want to delete ${selectedItems.length} selected measurement(s)? This will also remove related sample round entries.`;
    
    if (window.confirm(confirmationMessage)) {
      // Build set of deleted measurement ids (_id or id) for sample rounds cleanup
      const deletedIds = new Set<string>();
      selectedItems.forEach(m => {
        const id = m.id || (m as any)._id;
        if (id) deletedIds.add(id);
      });
      
      // Delete measurements (in reverse order to maintain indices)
      selectedItems.reverse().forEach(measurement => {
        const index = measurements.findIndex((m) => {
          const key = getRowKey(m);
          const selectedKey = getRowKey(measurement);
          return key === selectedKey;
        });
        if (index >= 0) {
          deleteMeasurement(index);
        }
      });

      // Clean up Sample Rounds: remove entries related to deleted measurements
      if (deletedIds.size > 0 && sampleMeasurementRounds.length > 0) {
        sampleMeasurementRounds.forEach(round => {
          if (updateSampleMeasurementRound) {
            const remainingEntries = round.measurements.filter(
              entry => !entry.measurementId || !deletedIds.has(entry.measurementId)
            );
            if (remainingEntries.length !== round.measurements.length) {
              updateSampleMeasurementRound(round.id, {
                measurements: remainingEntries,
              });
            }
          }
        });
      }

      showSuccess(`Deleted ${selectedItems.length} measurement(s)`);
      clearMeasurementSelection();
    }
  };

  const handleDuplicateMeasurement = (measurement: MeasurementPoint, index: number) => {
    if (!insertMeasurementAt) return;
    
    // Generate unique pomCode
    let newPomCode = `${measurement.pomCode}_COPY`;
    let suffixNum = 1;
    while (measurements.some(m => m.pomCode === newPomCode)) {
      newPomCode = `${measurement.pomCode}_COPY-${suffixNum}`;
      suffixNum++;
    }
    
    // Generate unique ID for duplicate (do not reuse _id)
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `measurement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const duplicate: MeasurementPoint = {
      ...measurement,
      id: newId,
      clientKey: `m_${ensureKey()}`, // CRITICAL: New clientKey for duplicate
      pomCode: newPomCode,
      pomName: `${measurement.pomName} (Copy)`,
      sizes: measurement.sizes ? { ...measurement.sizes } : {},
      unit: (measurement.unit as MeasurementUnit) || DEFAULT_MEASUREMENT_UNIT,
    };
    // Explicitly remove _id from duplicate to avoid conflicts
    delete (duplicate as any)._id;
    insertMeasurementAt(index, duplicate);
    
    // Duplicate Sample Rounds entries for this measurement
    if (measurement.id && sampleMeasurementRounds.length > 0) {
      sampleMeasurementRounds.forEach(round => {
        const relatedEntries = round.measurements.filter(
          entry => entry.measurementId === measurement.id
        );
        
        if (relatedEntries.length > 0 && updateSampleMeasurementRound) {
          const newEntries: MeasurementSampleEntry[] = relatedEntries.map(entry => ({
            ...entry,
            id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            measurementId: newId,
            // Copy user-entered data
            measured: entry.measured ? { ...entry.measured } : {},
            revised: entry.revised ? { ...entry.revised } : {},
            comments: entry.comments ? { ...entry.comments } : {},
            diff: entry.diff ? { ...entry.diff } : {},
          }));
          
          const currentEntries = round.measurements || [];
          updateSampleMeasurementRound(round.id, {
            measurements: [...currentEntries, ...newEntries],
          });
        }
      });
    }
    
    showSuccess('Measurement duplicated with sample rounds');
  };

  // Enhanced validation for display in table
  const validateMeasurement = (measurement: MeasurementPoint): ProgressionValidation => {
    const measurementSizes = measurement.sizes ? Object.keys(measurement.sizes) : [];
    const order = selectedSizes.length > 0 ? selectedSizes : measurementSizes;
    return validateProgression(
      measurement.sizes || {},
      order,
      (measurement.unit as MeasurementUnit) || DEFAULT_MEASUREMENT_UNIT
    );
  };

  const addCommonMeasurements = () => {
    const commonMeasurements = [
      { pomCode: 'CHEST', pomName: 'Chest 1" below armhole', method: 'Measure across chest 1 inch below armhole' },
      { pomCode: 'LENGTH', pomName: 'Center Back Length', method: 'Measure from center back neck to hem' },
      { pomCode: 'SLEEVE', pomName: 'Sleeve Length', method: 'Measure from shoulder point to cuff' },
      { pomCode: 'SHOULDER', pomName: 'Shoulder Width', method: 'Measure from shoulder point to shoulder point' },
      { pomCode: 'WAIST', pomName: 'Waist', method: 'Measure at natural waistline' },
    ];

    commonMeasurements.forEach((measurement, index) => {
      const sizes: Record<string, number> = {};
      selectedSizes.forEach((size, sizeIndex) => {
        // Generate sample measurements with logical progression
        sizes[size] = 50 + (sizeIndex * 2.5) + (index * 5);
      });

      const measurementPoint: MeasurementPoint = {
        id: `measurement_${Date.now()}_${index}`,
        pomCode: measurement.pomCode,
        pomName: measurement.pomName,
        minusTolerance: 1.0,
        plusTolerance: 1.0,
        unit: DEFAULT_MEASUREMENT_UNIT,
        sizes,
        measurementMethod: measurement.method,
        notes: '',
        isActive: true,
        baseSize: measurementBaseSize || selectedSizes[0] || defaultGenderSizes[0],
      };

      addMeasurement(measurementPoint);
    });
    showSuccess('Common measurements added');
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Measurement Chart</h1>
            <p className="text-sm text-gray-600 mt-1">
              Define measurement points and size specifications
            </p>
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{measurements.length}</div>
              <div className="text-gray-500">Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{selectedSizes.length}</div>
              <div className="text-gray-500">Sizes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Size Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Size Range Configuration
                {tableUnit && (
                  <span className="ml-2 text-sm font-normal text-gray-500">(Unit: {getMeasurementUnitSuffix(tableUnit)})</span>
                )}
              </h3>
              <p className="text-sm text-gray-500">
                Manage custom sizes per techpack. Gender default: {articleInfo?.gender || 'Unisex'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Preset:</label>
              <select
                value={pendingPresetId}
                onChange={(e) => setPendingPresetId(e.target.value)}
                className="px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SIZE_PRESET_OPTIONS.map(preset => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleApplyPreset}
                className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedSizes.length === 0 && (
              <span className="text-sm text-gray-500">No sizes configured yet.</span>
            )}
            {selectedSizes.map(size => {
              const isBase = measurementBaseSize === size;
              return (
                <span
                  key={size}
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium ${
                    isBase ? 'text-slate-900 font-semibold border-transparent shadow-sm' : 'border-gray-300 bg-gray-50 text-gray-700'
                  }`}
                  style={isBase ? { backgroundColor: baseHighlightColor } : undefined}
                >
                  {size}
                  <button
                    type="button"
                    onClick={() => handleRemoveSize(size)}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label={`Remove size ${size}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              );
            })}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base Size</label>
            <select
              value={baseSizeSelectorValue}
              onChange={(e) => handleBaseSizeSelectorChange(e.target.value)}
              disabled={selectedSizes.length === 0}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
            >
              {selectedSizes.length === 0 && <option value="">Add at least one size</option>}
              {selectedSizes.map(size => (
                <option key={`base-select-${size}`} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">
              Base size drives the highlighted column, measurement jumps, and PDF export. Changing it updates every measurement point.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Measurement Unit</label>
            <Select
              value={tableUnit}
              onChange={(value) => {
                const newUnit = value as MeasurementUnit;
                // Always show confirmation dialog if there are existing measurements and unit is actually changing
                if (measurements.length > 0 && newUnit !== tableUnit) {
                  setPendingNewUnit(newUnit);
                  setShowUnitChangeConfirm(true);
                } else if (measurements.length === 0) {
                  // No measurements yet, change unit directly
                  handleUnitChange(newUnit);
                }
                // If newUnit === tableUnit, do nothing (no change)
              }}
              options={measurementUnitOptions}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-2">
              Unit applies to all measurements in this techpack. Changing it updates all measurement values.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              value={newSizeLabel}
              onChange={(e) => setNewSizeLabel(e.target.value)}
              placeholder="e.g., 2, 4, 6, 4XL"
              className="flex-1 min-w-[200px] px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleAddSize}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
            >
              Add Size
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={addCommonMeasurements}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Ruler className="w-4 h-4 mr-2" />
              Add Common Points
            </button>
            
          </div>

          <div className="flex items-center space-x-3">
            <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              <Upload className="w-4 h-4 mr-2" />
              Import Excel
            </button>
            <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Measurement
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {editingIndex !== null ? 'Edit Measurement Point' : 'Add New Measurement Point'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Input
              label="POM Code *"
              value={formData.pomCode || ''}
              onChange={handleInputChange('pomCode')}
              onBlur={() => validation.setFieldTouched('pomCode')}
              placeholder="e.g., CHEST, LENGTH"
              required
              error={validation.getFieldProps('pomCode').error}
              helperText={validation.getFieldProps('pomCode').helperText || 'Uppercase letters, numbers, hyphens, underscores'}
            />

            <Input
              label="POM Name *"
              value={formData.pomName || ''}
              onChange={handleInputChange('pomName')}
              onBlur={() => validation.setFieldTouched('pomName')}
              placeholder="e.g., Chest 1 inch below armhole"
              required
              error={validation.getFieldProps('pomName').error}
              helperText={validation.getFieldProps('pomName').helperText}
            />

            <div className="flex flex-col space-y-1">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                Minus Tolerance ({getMeasurementUnitSuffix(tableUnit)}) *
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                inputMode={supportsFractionInput ? "text" : "decimal"}
                value={isMinusToleranceFocused 
                  ? minusToleranceInput 
                  : (formData.minusTolerance !== undefined 
                      ? (supportsFractionInput ? formatMeasurementValueAsFraction(formData.minusTolerance, tableUnit) : String(formData.minusTolerance))
                      : '')}
                onChange={(e) => handleMinusToleranceChange(e.target.value)}
                onFocus={handleMinusToleranceFocus}
                onBlur={() => {
                  handleMinusToleranceBlur();
                  validation.setFieldTouched('minusTolerance');
                }}
                placeholder={supportsFractionInput ? "e.g., 1/2 or 0.5" : "e.g., 1.0"}
                className={`px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  validation.getFieldProps('minusTolerance').error 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300'
                }`}
              />
              {validation.getFieldProps('minusTolerance').error && (
                <span className="text-xs text-red-600 mt-1">{validation.getFieldProps('minusTolerance').error}</span>
              )}
              {!validation.getFieldProps('minusTolerance').error && (
                <span className="text-xs text-gray-500 mt-1">
                  {validation.getFieldProps('minusTolerance').helperText
                    || (supportsFractionInput 
                      ? `Tolerance in ${getMeasurementUnitSuffix(tableUnit)} (e.g., 1/2, 0.5, or 1 1/4)`
                      : `Tolerance in ${getMeasurementUnitSuffix(tableUnit)}`)}
                </span>
              )}
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                Plus Tolerance ({getMeasurementUnitSuffix(tableUnit)}) *
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                inputMode={supportsFractionInput ? "text" : "decimal"}
                value={isPlusToleranceFocused 
                  ? plusToleranceInput 
                  : (formData.plusTolerance !== undefined 
                      ? (supportsFractionInput ? formatMeasurementValueAsFraction(formData.plusTolerance, tableUnit) : String(formData.plusTolerance))
                      : '')}
                onChange={(e) => handlePlusToleranceChange(e.target.value)}
                onFocus={handlePlusToleranceFocus}
                onBlur={() => {
                  handlePlusToleranceBlur();
                  validation.setFieldTouched('plusTolerance');
                }}
                placeholder={supportsFractionInput ? "e.g., 1/2 or 0.5" : "e.g., 1.0"}
                className={`px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  validation.getFieldProps('plusTolerance').error 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300'
                }`}
              />
              {validation.getFieldProps('plusTolerance').error && (
                <span className="text-xs text-red-600 mt-1">{validation.getFieldProps('plusTolerance').error}</span>
              )}
              {!validation.getFieldProps('plusTolerance').error && (
                <span className="text-xs text-gray-500 mt-1">
                  {validation.getFieldProps('plusTolerance').helperText
                    || (supportsFractionInput 
                      ? `Tolerance in ${getMeasurementUnitSuffix(tableUnit)} (e.g., 1/2, 0.5, or 1 1/4)`
                      : `Tolerance in ${getMeasurementUnitSuffix(tableUnit)}`)}
                </span>
              )}
            </div>

            <div className="md:col-span-2">
              <Input
                label="Measurement Method"
                value={formData.measurementMethod || ''}
                onChange={handleInputChange('measurementMethod')}
                placeholder="Brief description of how to measure"
                error={validation.getFieldProps('notes').error}
                helperText={validation.getFieldProps('notes').helperText}
              />
            </div>
          </div>

          {/* Size Measurements Grid */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-800 mb-3">
              Base Size &amp; Jump ({getMeasurementUnitSuffix(tableUnit)})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Base Size</label>
                <select
                  value={formData.baseSize || ''}
                  onChange={(e) => handleBaseSizeSelect(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 cursor-not-allowed"
                  disabled
                >
                  {selectedSizes.length === 0 && <option value="">Select at least one size</option>}
                  {selectedSizes.map(size => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">Managed in Size Range Configuration. Base size controls the highlighted column and jump calculations.</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Base Measurement ({getMeasurementUnitSuffix(tableUnit)})
                </label>
                <input
                  type={supportsFractionInput ? "text" : "number"}
                  step={supportsFractionInput ? undefined : "0.01"}
                  min={supportsFractionInput ? undefined : "0"}
                  value={isBaseInputFocused 
                    ? baseValueInput 
                    : (baseValue !== undefined 
                        ? (supportsFractionInput ? formatMeasurementValueAsFraction(baseValue, tableUnit) : String(baseValue))
                        : '')}
                  onChange={(e) => handleBaseValueChange(e.target.value)}
                  onFocus={handleBaseValueFocus}
                  onBlur={() => {
                    handleBaseValueBlur();
                    validation.setFieldTouched('measurement');
                  }}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validation.getFieldProps('measurement').error ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={supportsFractionInput ? "e.g., 15 1/4 or 15.25" : "e.g., 30"}
                />
                <p className="text-xs text-gray-500 mt-2">
                  {supportsFractionInput 
                    ? 'Enter measurement (e.g., 15 1/4, 15.25, or 1/2). Fractions are supported for inch measurements.'
                    : 'Enter the actual measurement for the base size; other sizes will follow the jumps.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              {selectedSizes.map(size => {
                const isBase = size === formData.baseSize;
                const actualValue = formData.sizes?.[size];
                if (isBase) {
                  return (
                    <div key={size} className="border border-blue-200 bg-blue-50 rounded-md p-3">
                      <div className="text-xs uppercase font-semibold text-blue-600">Base</div>
                      <div className="text-lg font-semibold text-blue-900">{size}</div>
                      <div className="text-sm text-blue-800 mt-1">
                        {baseValue !== undefined && !Number.isNaN(baseValue)
                          ? `${formatMeasurementValueAsFraction(baseValue, tableUnit)} ${getMeasurementUnitSuffix(tableUnit)}`
                          : 'Enter a base value'}
                      </div>
                    </div>
                  );
                }

                const adjustmentValue = sizeAdjustments[size] || '';
                const displayActual = formatMeasurementValueAsFraction(actualValue, tableUnit);

                return (
                  <div key={size} className="flex flex-col border rounded-md p-3">
                    <label className="text-sm font-medium text-gray-700 mb-1">{size} Jump</label>
                    <input
                      type="text"
                      value={adjustmentValue}
                      onChange={(e) => handleSizeAdjustmentChange(size, e.target.value)}
                      onBlur={() => validation.setFieldTouched('measurement')}
                      className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+0.5 / +1/2 / -0.25"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Actual:{' '}
                      <span className="font-medium text-gray-700">
                        {displayActual !== '-'
                          ? `${displayActual} ${getMeasurementUnitSuffix(tableUnit)}`
                          : '--'}
                      </span>
                    </p>
                  </div>
                );
              })}
            </div>

            {validation.getFieldProps('measurement').error && (
              <p className="mt-2 text-sm text-red-600">{validation.getFieldProps('measurement').error}</p>
            )}
            
            {/* Progression validation preview */}
            {Object.keys(formData.sizes || {}).length >= 2 && (
              (() => {
                const progValidation = validateProgression(formData.sizes || {}, selectedSizes);
                if (progValidation.errors.length > 0 || progValidation.warnings.length > 0) {
                  return (
                    <div className={`mt-3 p-3 rounded-md ${
                      progValidation.errors.length > 0 ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
                    }`}>
                      <div className="flex items-start">
                        <AlertTriangle className={`w-5 h-5 mt-0.5 mr-2 ${
                          progValidation.errors.length > 0 ? 'text-red-400' : 'text-yellow-400'
                        }`} />
                        <div className="text-sm">
                          {progValidation.errors.length > 0 && (
                            <div className="text-red-800 font-medium mb-1">Errors:</div>
                          )}
                          {progValidation.errors.map((err, idx) => (
                            <div key={`${err}-${idx}`} className="text-red-700">{err}</div>
                          ))}
                          {progValidation.warnings.length > 0 && (
                            <div className="text-yellow-800 font-medium mt-2 mb-1">Warnings:</div>
                          )}
                          {progValidation.warnings.map((warn, idx) => (
                            <div key={`${warn}-${idx}`} className="text-yellow-700">{warn}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()
            )}
          </div>

          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes')(e.target.value)}
              onBlur={() => validation.setFieldTouched('notes')}
              placeholder="Additional notes or special instructions..."
              rows={2}
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validation.getFieldProps('notes').error ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {validation.getFieldProps('notes').error && (
              <p className="mt-1 text-sm text-red-600">{validation.getFieldProps('notes').helperText}</p>
            )}
          </div>
          
          {/* Validation Summary */}
          {!validation.isValid && Object.keys(validation.errors).some(key => validation.touched[key]) && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Please fix the following errors:
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <ul className="list-disc pl-5 space-y-1">
                      {Object.entries(validation.errors).map(([field, error]) =>
                        validation.touched[field] && error ? (
                          <li key={field}>{error}</li>
                        ) : null
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 mt-6">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!validation.isValid}
              className={`px-4 py-2 text-sm font-medium border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                validation.isValid
                  ? 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                  : 'text-gray-400 bg-gray-200 cursor-not-allowed'
              }`}
            >
              {editingIndex !== null ? 'Update' : 'Add'} Measurement
            </button>
          </div>
        </div>
      )}

      {/* Measurements Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Bulk Actions Bar */}
        {selectedMeasurementIds.size > 0 && (
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-blue-900">
                Selected: {selectedMeasurementIds.size} measurement(s)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkDuplicateMeasurements}
                className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Copy className="w-4 h-4 inline mr-1.5" />
                Duplicate
              </button>
              <button
                onClick={handleBulkDeleteMeasurements}
                className="px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <X className="w-4 h-4 inline mr-1.5" />
                Delete
              </button>
              <button
                onClick={clearMeasurementSelection}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col" 
                  className="px-4 py-3 w-12 sticky left-0 bg-gray-50"
                  style={{ zIndex: 30, position: 'sticky' }}
                >
                  <input
                    type="checkbox"
                    checked={rowKeys.length > 0 && selectedMeasurementIds.size === rowKeys.length}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelectAllMeasurements();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                    title={selectedMeasurementIds.size === rowKeys.length && rowKeys.length > 0 ? 'Deselect all' : 'Select all'}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = selectedMeasurementIds.size > 0 && selectedMeasurementIds.size < rowKeys.length;
                      }
                    }}
                  />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-[48px] bg-gray-50"
                  style={{ zIndex: 20, position: 'sticky' }}
                >
                  POM Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-48">
                  POM Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tolerance
                </th>
                {selectedSizes.map(size => {
                  const isBaseHeader = highlightedColumn === size;
                  return (
                    <th
                      key={size}
                      className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                        isBaseHeader ? 'text-slate-900 font-semibold' : 'text-gray-500'
                      }`}
                      style={isBaseHeader ? { backgroundColor: baseHighlightColor } : undefined}
                    >
                      {size}
                    </th>
                  );
                })}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {measurements.length === 0 ? (
                <tr>
                  <td colSpan={selectedSizes.length + 5} className="px-6 py-12 text-center text-sm text-gray-500">
                    No measurement points defined. Add measurements to get started.
                  </td>
                </tr>
              ) : (
                measurements.map((measurement, index) => {
                  const rowKey = getRowKey(measurement);
                  const validationResult = validateMeasurement(measurement);
                  const hasIssues = validationResult.errors.length > 0 || validationResult.warnings.length > 0;
                  const isSelected = selectedMeasurementIds.has(rowKey);
                  
                  // Format tolerance for display
                  // Handle both UI field names (minusTolerance/plusTolerance) and backend field names (toleranceMinus/tolerancePlus)
                  const minusTolRaw = measurement.minusTolerance ?? (measurement as any).toleranceMinus;
                  const plusTolRaw = measurement.plusTolerance ?? (measurement as any).tolerancePlus;
                  
                  const minusTol = typeof minusTolRaw === 'string' 
                    ? parseTolerance(minusTolRaw) 
                    : (minusTolRaw !== undefined && minusTolRaw !== null ? minusTolRaw : 1.0);
                  const plusTol = typeof plusTolRaw === 'string'
                    ? parseTolerance(plusTolRaw)
                    : (plusTolRaw !== undefined && plusTolRaw !== null ? plusTolRaw : 1.0);
                  
                  // Format tolerance without unit for consistent display (keep fraction format for inch units)
                  const toleranceDisplay = formatToleranceNoUnit(minusTol, plusTol, tableUnit);
                  const rowBackgroundColor = validationResult.errors.length > 0
                    ? '#fee2e2'
                    : validationResult.warnings.length > 0
                      ? '#fef3c7'
                      : isSelected
                        ? '#dbeafe'
                        : index % 2 === 0
                          ? '#ffffff'
                          : rowStripeColor;
                  
                  return (
                    <tr 
                      key={rowKey}
                      className="transition-colors duration-150 hover:brightness-95"
                      style={{ backgroundColor: rowBackgroundColor }}
                    >
                      <td 
                        className="px-4 py-4 sticky left-0"
                        style={{ 
                          backgroundColor: rowBackgroundColor,
                          zIndex: 30,
                          position: 'sticky'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleMeasurementSelection(rowKey);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                          title={isSelected ? 'Deselect' : 'Select'}
                        />
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-[48px]"
                        style={{ 
                          backgroundColor: rowBackgroundColor,
                          zIndex: 20,
                          position: 'sticky'
                        }}
                      >
                        <div className="flex items-center">
                          {measurement.pomCode}
                          {hasIssues && (
                            <AlertTriangle 
                              className={`w-4 h-4 ml-2 ${
                                validationResult.errors.length > 0 ? 'text-red-500' : 'text-yellow-500'
                              }`} 
                              title={[...validationResult.errors, ...validationResult.warnings].join('; ')} 
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div>
                          <div className="font-medium">{measurement.pomName}</div>
                          {measurement.notes && (
                            <div className="text-xs text-gray-500 mt-1">{measurement.notes}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {toleranceDisplay}
                      </td>
                      {selectedSizes.map(size => {
                        const value = measurement.sizes ? measurement.sizes[size] : undefined;
                        const displayValue = formatMeasurementValueAsFraction(value, tableUnit);
                        const isBaseCell = highlightedColumn ? size === highlightedColumn : measurement.baseSize === size;
                        return (
                          <td 
                            key={size} 
                            className={`px-4 py-4 whitespace-nowrap text-sm text-center ${
                              value === undefined || value === null 
                                ? 'text-gray-400' 
                                : value <= 0 
                                  ? 'text-red-600 font-medium' 
                                  : 'text-gray-700'
                            } ${isBaseCell ? 'text-slate-900 font-semibold' : ''}`}
                            style={isBaseCell ? { backgroundColor: baseHighlightColor } : undefined}
                          >
                            {value === undefined || value === null ? '-' : displayValue}
                          </td>
                        );
                      })}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleEdit(measurement, index)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDuplicateMeasurement(measurement, index)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Duplicate
                          </button>
                          <button
                            onClick={() => handleDelete(measurement, index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sample Measurement Rounds */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Sample Rounds</h3>
            <p className="text-sm text-gray-500">Record requested vs measured values for each prototype round</p>
            {!canAddNewRound && sampleMeasurementRounds.length > 0 && (
              <p className="text-xs text-amber-600 mt-1">
                Please complete the current round before creating another.
              </p>
            )}
          </div>
          <button
            onClick={handleAddSampleRound}
            disabled={!canAddNewRound}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
              canAddNewRound
                ? 'text-white bg-indigo-600 hover:bg-indigo-700'
                : 'text-gray-400 bg-gray-200 cursor-not-allowed'
            }`}
            title={!canAddNewRound ? 'Please complete the previous round before creating a new one.' : ''}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Sample Round
          </button>
        </div>
        {sampleMeasurementRounds.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            {sampleMeasurementRounds.map(round => (
              <div key={`${round.id}-meta`} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <input
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={round.name}
                    onChange={(e) => handleRoundFieldChange(round.id, 'name', e.target.value)}
                    placeholder="Round name"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSaveSampleRound(round.id)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                      title="Save this round. Unfilled sizes will keep their original requested values."
                    >
                      <Save className="w-3 h-3 mr-1.5" />
                      Save
                    </button>
                    <button
                      className="text-red-500 hover:text-red-600 text-xs font-medium"
                      onClick={() => handleDeleteSampleRound(round.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                    <input
                      type="date"
                      value={getDateInputValue(round.date)}
                      onChange={(e) => handleRoundFieldChange(round.id, 'date', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Reviewer</label>
                    <input
                      value={round.reviewer || ''}
                      onChange={(e) => handleRoundFieldChange(round.id, 'reviewer', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Name"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    Requested Source: {requestedSourceLabels[round.requestedSource || 'original']}
                  </p>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Overall Comments</label>
                  <div className="rounded-md border border-gray-200 bg-white">
                    <ReactQuill
                      theme="snow"
                      value={round.overallComments || ''}
                      onChange={(content) => handleRoundFieldChange(round.id, 'overallComments', content)}
                      modules={sampleRoundQuillModules}
                      formats={sampleRoundQuillFormats}
                      placeholder="Summary of findings..."
                      readOnly={!isEditableRound(round.id)}
                      className="min-h-[120px] rounded-md bg-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {measurementRows.length === 0 ? (
          <div className="text-sm text-gray-500">
            Add measurement points to start tracking sample rounds.
          </div>
        ) : sampleMeasurementRounds.length === 0 ? (
          <div className="text-sm text-gray-500">
            No sample rounds yet. Click &ldquo;Add Sample Round&rdquo; to create the first round.
          </div>
        ) : (
          <SampleMeasurementsTable
            measurementRows={measurementRows}
            sampleRounds={sampleMeasurementRounds}
            availableSizes={selectedSizes}
            baseSize={measurementBaseSize}
            tableUnit={tableUnit}
            getEntryForRound={getEntryForRound}
            onEntrySizeValueChange={handleEntrySizeValueChange}
            onDeleteRound={handleDeleteSampleRound}
            requestedSourceLabels={requestedSourceLabels}
          />
        )}
      </div>

      {/* Add Round Modal */}
      {showRoundModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create New Sample Round</h3>
              <button
                onClick={handleCloseRoundModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Round Name
                </label>
                <input
                  type="text"
                  value={roundForm.name}
                  onChange={(e) => handleRoundFormFieldChange('name', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 1st Proto, 2nd Proto"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={roundForm.date}
                  onChange={(e) => handleRoundFormFieldChange('date', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reviewer
                </label>
                <input
                  type="text"
                  value={roundForm.reviewer}
                  onChange={(e) => handleRoundFormFieldChange('reviewer', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Reviewer name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Requested Source
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="requestedSource"
                      value="original"
                      checked={roundForm.requestedSource === 'original'}
                      onChange={(e) => handleRoundFormFieldChange('requestedSource', e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Original Spec (from Measurement Chart)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="requestedSource"
                      value="previous"
                      checked={roundForm.requestedSource === 'previous'}
                      onChange={(e) => handleRoundFormFieldChange('requestedSource', e.target.value)}
                      disabled={!hasPreviousRound}
                      className="mr-2 disabled:opacity-50"
                    />
                    <span className={`text-sm ${hasPreviousRound ? 'text-gray-700' : 'text-gray-400'}`}>
                      From Previous Round (use Revised values from last round)
                    </span>
                  </label>
                </div>
                {!hasPreviousRound && (
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    Available after creating the first round
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={handleCloseRoundModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRound}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Create Round
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Panel */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Measurement Guidelines:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>All measurements use the same unit selected at the table level</li>
              <li>Ensure size progression is logical (each size should be larger than or equal to the previous)</li>
              <li>Tolerance values follow the selected unit (e.g., 1.0 means ±1.0 {getMeasurementUnitSuffix(tableUnit)})</li>
              <li>Use consistent tolerance values across similar measurement points</li>
              <li>Zero values are preserved - use empty field to indicate "not measured"</li>
              <li>Complete all measurements in a round before creating a new round</li>
            </ul>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={showUnitChangeConfirm}
        title="Đổi đơn vị đo"
        message={pendingNewUnit 
          ? `Đơn vị hiện tại là "${getMeasurementUnitMeta(tableUnit).label}". Bạn muốn đổi sang "${getMeasurementUnitMeta(pendingNewUnit).label}".\n\n⚠️ Cảnh báo: Việc đổi đơn vị có thể gây xê dịch số liệu do làm tròn giữa các đơn vị đo. Vui lòng kiểm tra kỹ các giá trị sau khi đổi và xác nhận quyết định của bạn.`
          : ''}
        confirmText="Đổi đơn vị"
        cancelText="Hủy"
        type="warning"
        onConfirm={async () => {
          if (pendingNewUnit) {
            await handleUnitChange(pendingNewUnit);
          }
          setShowUnitChangeConfirm(false);
          setPendingNewUnit(null);
        }}
        onCancel={() => {
          setShowUnitChangeConfirm(false);
          setPendingNewUnit(null);
        }}
      />

      <ConfirmationDialog
        isOpen={showBaseSizeConfirm}
        title="Change Base Size"
        message={`Change base size to ${pendingBaseSize || 'this size'}? This will update all related measurements and PDF exports.`}
        confirmText="Change Base Size"
        cancelText="Keep Current"
        onConfirm={handleConfirmBaseSizeChange}
        onCancel={handleCancelBaseSizeChange}
        type="warning"
      />
    </div>
  );
};

// Export validate function for use in parent component
// Only validate fields that are actually displayed on the UI form
export const validateMeasurementsForSave = (
  measurements: MeasurementPoint[],
  options?: { defaultBaseSize?: string }
): { isValid: boolean; errors: Array<{ id: string; item: MeasurementPoint; errors: Record<string, string> }> } => {
  const errors: Array<{ id: string; item: MeasurementPoint; errors: Record<string, string> }> = [];
  const { normalized } = normalizeMeasurementBaseSizes(measurements, options?.defaultBaseSize);
  
  // Only validate fields that exist on the UI form
  const visibleFields = ['pomCode', 'pomName', 'minusTolerance', 'plusTolerance'];
  
  normalized.forEach((item) => {
    const itemErrors: Record<string, string> = {};
    
    // Validate only visible fields from schema
    visibleFields.forEach(fieldKey => {
      const rule = measurementValidationSchema[fieldKey as keyof typeof measurementValidationSchema];
      if (rule) {
        const value = item[fieldKey as keyof MeasurementPoint];
        let error: string | null = null;
        
        // Check required
        if (rule.required) {
          if (value === null || value === undefined || value === '') {
            error = `${fieldKey === 'pomCode' ? 'POM Code' : fieldKey === 'pomName' ? 'POM Name' : fieldKey} is required`;
          }
        }
        
        // Check custom validation if no error yet
        if (!error && rule.custom) {
          error = rule.custom(value as any);
        }
        
        // Check minLength/maxLength for strings
        if (!error && typeof value === 'string' && value) {
          if (rule.minLength && value.length < rule.minLength) {
            error = `Must be at least ${rule.minLength} characters long`;
          }
          if (rule.maxLength && value.length > rule.maxLength) {
            error = `Must be no more than ${rule.maxLength} characters long`;
          }
        }
        
        // Check min/max for numbers
        if (!error && typeof value === 'number') {
          if (rule.min !== undefined && value < rule.min) {
            error = `Must be at least ${rule.min}`;
          }
          if (rule.max !== undefined && value > rule.max) {
            error = `Must be no more than ${rule.max}`;
          }
        }
        
        if (error) {
          itemErrors[fieldKey] = error;
        }
      }
    });
    
    // Validate that at least one size has a value > 0
    // Use "sizes" as field name instead of "measurement" since that's what's on the UI
    const sizeValues = Object.values(item.sizes || {});
    const hasValidMeasurements = sizeValues.some(v => v !== undefined && v !== null && v > 0);
    if (!hasValidMeasurements) {
      itemErrors.sizes = 'At least one size measurement must be greater than 0';
    }

    const filledSizeKeys = Object.keys(item.sizes || {}).filter((size) => {
      const value = item.sizes?.[size];
      return value !== undefined && value !== null;
    });

    if (filledSizeKeys.length > 0) {
      const trimmedBase = item.baseSize?.trim();
      if (!trimmedBase) {
        itemErrors.baseSize = 'Base size is required';
      } else if (!item.sizes || item.sizes[trimmedBase] === undefined || item.sizes[trimmedBase] === null) {
        itemErrors.baseSize = 'Base size measurement value is required';
      }
    }
    
    if (Object.keys(itemErrors).length > 0) {
      errors.push({ id: item.id, item, errors: itemErrors });
    }
  });
  
  return { isValid: errors.length === 0, errors };
};

export default MeasurementTab;
