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
import { Plus, AlertTriangle, AlertCircle, X, Save, CheckSquare, Square, Copy } from 'lucide-react';
import { showSuccess, showWarning, showError } from '../../../lib/toast';
import SampleMeasurementsTable from './SampleMeasurementsTable';
import { SampleMeasurementRow } from '../../../types/measurements';
import { parseTolerance, formatTolerance, parseStepValue, formatStepValue, formatMeasurementValue, parseMeasurementValue, formatMeasurementValueAsFraction, formatMeasurementValueNoRound, formatStepValueNoRound } from './measurementHelpers';
import { MEASUREMENT_UNITS, DEFAULT_MEASUREMENT_UNIT, MeasurementUnit, getMeasurementUnitSuffix } from '../../../types/techpack';
import { SIZE_PRESET_OPTIONS, getPresetById } from '../../../constants/sizePresets';
import ConfirmationDialog from '../../ConfirmationDialog';
import { DEFAULT_MEASUREMENT_BASE_HIGHLIGHT_COLOR, DEFAULT_MEASUREMENT_ROW_STRIPE_COLOR } from '../../../constants/measurementDisplay';
import { useI18n } from '../../../lib/i18n';
import { normalizeMeasurementBaseSizes } from '../../../utils/measurements';
import Quill from 'quill';
import ImageUploader from 'quill-image-uploader';

// Progression validation result
interface ProgressionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
Quill.register('modules/imageUploader', ImageUploader);
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001';
const API_UPLOAD_BASE = API_BASE_URL.replace(/\/api\/v1$/, '');
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
      formData.append('file', file);
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/upload-image`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Upload failed');
        }
        
        const data = await response.json();
        const imageUrl = data.url.startsWith('/') 
          ? `${window.location.origin}${data.url}`
          : data.url;
        return imageUrl;
      } catch (error) {
        console.error('Image upload error:', error);
        throw error;
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
  const { t } = useI18n();
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

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [selectedMeasurementIds, setSelectedMeasurementIds] = useState<Set<string>>(new Set());
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
  // Store raw input strings to preserve original format (fractions, mixed numbers, decimals)
  const [baseValueRaw, setBaseValueRaw] = useState<string>('');
  const [sizeValuesRaw, setSizeValuesRaw] = useState<Record<string, string>>({});
  const [minusToleranceRaw, setMinusToleranceRaw] = useState<string>('');
  const [plusToleranceRaw, setPlusToleranceRaw] = useState<string>('');
  const [newSizeLabel, setNewSizeLabel] = useState('');
  const [pendingPresetId, setPendingPresetId] = useState(() => SIZE_PRESET_OPTIONS[0]?.id || 'standard_us_alpha');
  const [baseSizeSelectorValue, setBaseSizeSelectorValue] = useState('');
  const [pendingBaseSize, setPendingBaseSize] = useState<string | null>(null);
  const [showBaseSizeConfirm, setShowBaseSizeConfirm] = useState(false);
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

  const deriveAdjustmentsFromSizes = useCallback(
    (sizes: Record<string, number> | undefined, baseSize?: string): Record<string, string> => {
      if (!sizes || !baseSize || sizes[baseSize] === undefined) return {};
      const base = sizes[baseSize];
      const entries = Object.entries(sizes).reduce<Record<string, string>>((acc, [size, value]) => {
        if (size === baseSize || value === undefined || value === null) return acc;
        // Use formatStepValue with unit to format correctly (fraction for inch-16/32, decimal for others)
        acc[size] = formatStepValue(value - base, tableUnit);
        return acc;
      }, {});
      return entries;
    },
    [tableUnit]
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
        // Don't round - preserve precision
        nextSizes[size] = nextBaseValue + delta;
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
        // ✅ FIXED: Preserve all existing sizes, only update sizes in sizeList
        const sanitized = { ...(prevSizes || {}) };
        // Don't delete sizes outside sizeList - preserve them
        return sanitized;
      }
      const recalculated = recalcSizesFromBase(baseSize, nextBaseValue, adjustments, sizeList);
      // ✅ FIXED: Preserve all existing sizes first, then update only sizes in sizeList
      const merged = { ...(prevSizes || {}) };
      // Only update sizes that are in sizeList and have been recalculated
      sizeList.forEach(size => {
        if (recalculated[size] !== undefined) {
          merged[size] = recalculated[size];
        }
        // ✅ FIXED: Don't delete sizes that are not in sizeList - preserve them
        // This ensures non-standard sizes (like EU numeric sizes) are not lost
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
  const previousRoundEditWarning = t('form.measurement.previousRoundEditWarning');

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
      
      // For measured/revised, DO NOT trim to preserve intermediate typing states (e.g., "1.", "-", ".")
      // This allows users to type decimals naturally without being blocked
      const trimmedForDeleteCheck = normalizedValue.trim();
      const shouldDelete = trimmedForDeleteCheck.length === 0;
      
      // Store value: preserve all input for measured/revised (including intermediate states like "1.", "-", ".")
      // Only trim when it's comments or diff field
      const storedValue = field === 'comments' 
        ? normalizedValue 
        : (field === 'measured' || field === 'revised'
          ? normalizedValue // DO NOT trim - preserve all input including intermediate states
          : normalizedValue.trim()); // Trim only for diff field

      if (shouldDelete) {
        delete nextMap[sizeKey];
      } else {
        // For diff field, parse fraction to decimal for storage to ensure consistency
        // For measured/revised, preserve original format (fraction or decimal)
        if (field === 'diff') {
          const parsedValue = parseMeasurementValue(storedValue);
          if (parsedValue !== undefined && !Number.isNaN(parsedValue)) {
            nextMap[sizeKey] = String(parsedValue);
      } else {
        nextMap[sizeKey] = storedValue;
          }
        } else {
          nextMap[sizeKey] = storedValue;
        }
      }

      const payload: Partial<MeasurementSampleEntry> = {
        [field]: nextMap,
      } as Partial<MeasurementSampleEntry>;

      if (field === 'measured') {
        // Parse values for calculation, but preserve original format when storing
        const measuredNumber = parseMeasurementValue(storedValue);
        const requestedNumber =
          requestedValue !== undefined && requestedValue !== ''
            ? parseMeasurementValue(String(requestedValue).replace(',', '.'))
            : undefined;

        if (measuredNumber !== undefined && requestedNumber !== undefined) {
          const nextDiff = { ...(entry.diff || {}) };
          // Calculate difference but preserve precision - don't round
          const diffValue = measuredNumber - requestedNumber;
          // Store as string without rounding to preserve precision
          nextDiff[sizeKey] = String(diffValue);
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
                // Parse but preserve precision - don't round
                const numValue = parseMeasurementValue(String(revisedValue));
                if (numValue !== undefined) {
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
      
      // ✅ FIXED: Nếu có cập nhật measurements, merge và tính lại sizes trước khi lưu
      if (hasUpdates && updateMeasurement) {
        // Tạo final measurements với merged sizes để đảm bảo được lưu đúng
        const finalUpdatedMeasurements = updatedMeasurements.map((updatedMeasurement, i) => {
          const oldMeasurement = measurements[i];
          if (!oldMeasurement) return updatedMeasurement;
          
          const oldSizes = oldMeasurement.sizes || {};
          const newSizes = updatedMeasurement.sizes || {};
          
          // Kiểm tra xem sizes có thay đổi không
          const sizesChanged = JSON.stringify(oldSizes) !== JSON.stringify(newSizes);
          
          if (sizesChanged) {
            console.log(`🔄 Processing measurement ${i} for save:`, {
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
              
              // ✅ FIXED: Merge recalculated sizes with existing sizes to preserve non-standard sizes
              const mergedSizes = mergeRecalculatedSizes(
                oldSizes, // Preserve all existing sizes
                baseSize,
                newSizes[baseSize],
                adjustments,
                selectedSizes
              );
              
              // ✅ FIXED: Also preserve any sizes from newSizes that are not in selectedSizes
              Object.keys(newSizes).forEach(size => {
                if (!selectedSizes.includes(size) && newSizes[size] !== undefined) {
                  mergedSizes[size] = newSizes[size];
                }
              });
              
              console.log(`  ✨ Merged sizes (preserving all):`, mergedSizes);
              
              // Cập nhật measurement trong array với sizes đã được merge
              return {
                ...updatedMeasurement,
                sizes: mergedSizes
              };
            } else {
              // ✅ FIXED: When no baseSize, merge newSizes with oldSizes to preserve all data
              const mergedSizes = { ...oldSizes, ...newSizes };
              return {
                ...updatedMeasurement,
                sizes: mergedSizes
              };
            }
          }
          
          return updatedMeasurement;
        });
        
        // Cập nhật state với final measurements
        for (let i = 0; i < finalUpdatedMeasurements.length; i++) {
          const oldMeasurement = measurements[i];
          const finalMeasurement = finalUpdatedMeasurements[i];
          const oldSizes = oldMeasurement?.sizes || {};
          const finalSizes = finalMeasurement.sizes || {};
          
          if (JSON.stringify(oldSizes) !== JSON.stringify(finalSizes)) {
            updateMeasurement(i, finalMeasurement);
          }
        }
        
        // ✅ FIXED: Đợi để đảm bảo state được cập nhật
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // ✅ FIXED: Cập nhật REQUESTED values trong sample round từ measurements mới đã được cập nhật
        if (round && updateSampleMeasurementRound) {
          const updatedRound = { ...round };
          if (updatedRound.measurements) {
            updatedRound.measurements = updatedRound.measurements.map(entry => {
              // Tìm measurement tương ứng trong finalUpdatedMeasurements
              const measurement = finalUpdatedMeasurements.find(
                m => m.pomCode === entry.pomCode || m.id === entry.measurementId
              );
              
              if (measurement && measurement.sizes) {
                // Cập nhật requested từ measurements mới
                const newRequested: MeasurementSampleValueMap = {};
                Object.entries(measurement.sizes).forEach(([size, value]) => {
                  if (value !== null && value !== undefined) {
                    newRequested[size] = String(value);
                  }
                });
                
                return {
                  ...entry,
                  requested: newRequested
                };
              }
              
              return entry;
            });
            
            // Cập nhật round với requested values mới
            updateSampleMeasurementRound(roundId, {
              measurements: updatedRound.measurements
            });
          }
        }
        
        // ✅ FIXED: Đợi thêm một chút để đảm bảo round được cập nhật
        await new Promise(resolve => setTimeout(resolve, 100));
      
        // ✅ FIXED: Lưu với final measurements đã được merge
        const techpackWithUpdatedMeasurements = {
          ...state?.techpack,
          measurements: finalUpdatedMeasurements
        };
        
        await saveTechPack(techpackWithUpdatedMeasurements);
      } else {
      await saveTechPack();
      }
      
      if (hasUpdates) {
        showSuccess('Sample round saved and measurements updated from revised values');
      } else {
        showSuccess('Sample measurement round saved successfully');
      }
    } catch (error: any) {
      console.error('❌ Error saving sample round:', error);
      showError(error.message || 'Failed to save sample measurement round');
    }
  }, [saveTechPack, sampleMeasurementRounds, measurements, state?.techpack, updateMeasurement, measurementBaseSize, deriveAdjustmentsFromSizes, recalcSizesFromBase, mergeRecalculatedSizes, selectedSizes, updateSampleMeasurementRound]);

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
      setFormData(prev => ({
        ...prev,
        baseSize: selectedSizes[0],
      }));
    }
  }, [formData.baseSize, selectedSizes]);

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
    // Store raw input to preserve original format
    setBaseValueRaw(value);
    const normalized = value.replace(',', '.');
    if (normalized.trim() === '') {
      updateSizesWithBase({ baseValue: undefined });
      return;
    }
    
    // For inch-16 and inch-32, allow mixed numbers and fractions
    if (tableUnit === 'inch-16' || tableUnit === 'inch-32') {
      // Allow intermediate states while typing (e.g., "1/", "1 1/", "1 1/2 ")
      // Only parse if it's a complete value
      const parsed = parseMeasurementValue(normalized);
      if (parsed !== undefined && !Number.isNaN(parsed)) {
        updateSizesWithBase({ baseValue: parsed });
      }
      // If parsing fails (intermediate state), don't update sizes but keep raw value
    } else {
      // For other units, parse as decimal
      const parsed = parseFloat(normalized);
      if (!Number.isNaN(parsed)) {
    updateSizesWithBase({ baseValue: parsed });
      }
    }
  };

  const handleSizeAdjustmentChange = (size: string, value: string) => {
    // Store raw input to preserve original format
    setSizeValuesRaw(prev => {
      const next = { ...prev };
      if (!value.trim()) {
        delete next[size];
      } else {
        next[size] = value; // Store raw value, not normalized
      }
      return next;
    });
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
      showWarning(t('form.measurement.atLeastOneSizeRequired'));
      return;
    }
    updateMeasurementSizeRange(selectedSizes.filter(item => item !== size));
  };

  const handleAddSize = () => {
    if (!updateMeasurementSizeRange) return;
    const trimmed = newSizeLabel.trim();
    if (!trimmed) {
      showWarning(t('form.measurement.sizeLabelRequired'));
      return;
    }
    const exists = selectedSizes.some(size => size.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      showWarning(t('form.measurement.sizeAlreadyExists'));
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
      if (window.confirm(t('form.measurement.applyEmptyPresetConfirm'))) {
        updateMeasurementSizeRange([]);
      }
      return;
    }
    const shouldConfirm = measurements.length > 0;
    if (shouldConfirm) {
      const confirmed = window.confirm(
        t('form.measurement.applyPresetReplaceConfirm')
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

  // Progression validation disabled - allow any values
  const validateProgression = useCallback((
    sizes: Record<string, number>,
    sizeOrder: string[],
    unit: MeasurementUnit = DEFAULT_MEASUREMENT_UNIT
  ): ProgressionValidation => {
    // Always return valid - no validation, allow any values
    return {
      isValid: true,
      errors: [],
      warnings: []
    };
  }, []);

  // Helper to format validation alert message
  const formatValidationAlert = (fieldKey: string): string => {
    const FIELD_LABEL_MAP: Record<string, string> = {
      pomCode: t('form.measurement.field.pomCode'),
      pomName: t('form.measurement.field.pomName'),
      minusTolerance: t('form.measurement.field.minusTolerance'),
      plusTolerance: t('form.measurement.field.plusTolerance'),
      sizes: t('form.measurement.field.sizes'), // Changed from 'measurement' to 'sizes' to match UI
    };
    
    const fieldLabel = FIELD_LABEL_MAP[fieldKey] || fieldKey;
    return t('form.fieldRequiredInTab', {
      field: fieldLabel,
      tab: t('form.tab.measurements'),
    });
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
      validation.setFieldError('measurement', t('form.measurement.baseSizeRequired'));
      showError(t('form.measurement.baseSizeRequiredLong'));
      return;
    }

    // Validate that at least one size has a value > 0
    const sizeValues = Object.values(sizes);
    const hasValidMeasurements = sizeValues.some(v => v > 0);
    
    if (!hasValidMeasurements) {
      validation.setFieldError('measurement', t('form.measurement.atLeastOneMeasurement'));
      showError(formatValidationAlert('sizes'));
      return;
    }

    const baseMeasurementValue = sizes[formData.baseSize];
    if (baseMeasurementValue === undefined) {
      validation.setFieldError('measurement', t('form.measurement.enterBaseMeasurement'));
      showError(t('form.measurement.baseMeasurementRequired'));
      return;
    }

    // Progression validation disabled - allow any values

    const measurement: MeasurementPoint = {
      id: editingIndex !== null ? measurements[editingIndex].id : `measurement_${Date.now()}`,
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
      showSuccess(t('form.measurement.updated'));
    } else {
      addMeasurement(measurement);
      showSuccess(t('form.measurement.added'));
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      pomCode: '',
      pomName: '',
      minusTolerance: 1.0,
      plusTolerance: 1.0,
      sizes: {},
      baseSize: selectedSizes[0],
      notes: '',
      measurementMethod: '',
      isActive: true,
    });
    setSizeAdjustments({});
    setBaseValueRaw('');
    setSizeValuesRaw({});
    setMinusToleranceRaw('');
    setPlusToleranceRaw('');
    setShowAddForm(false);
    setEditingIndex(null);
    validation.reset();
  };

  const handleEdit = (measurement: MeasurementPoint, index: number) => {
    // Convert tolerance from string to number if needed (backward compatibility)
    const minusTol = typeof measurement.minusTolerance === 'string' 
      ? parseTolerance(measurement.minusTolerance) 
      : (measurement.minusTolerance ?? 1.0);
    const plusTol = typeof measurement.plusTolerance === 'string'
      ? parseTolerance(measurement.plusTolerance)
      : (measurement.plusTolerance ?? 1.0);

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

    const adjustments = buildAdjustmentMap(measurement.sizes || {}, resolvedBaseSize, measurementSizes.length > 0 ? measurementSizes : selectedSizes);
    setSizeAdjustments(adjustments);
    
    // Initialize raw values from existing values
    // For base value, format as fraction if unit is inch-16/32, no rounding for others
    const baseVal = measurement.sizes?.[resolvedBaseSize];
    if (baseVal !== undefined) {
      const baseRaw = (tableUnit === 'inch-16' || tableUnit === 'inch-32')
        ? formatMeasurementValueAsFraction(baseVal, tableUnit)
        : formatMeasurementValueNoRound(baseVal, tableUnit);
      setBaseValueRaw(baseRaw);
    } else {
      setBaseValueRaw('');
    }
    
    // Initialize raw values for tolerance - format as fraction if unit is inch-16/32, no rounding for others
    const minusTolRaw = (tableUnit === 'inch-16' || tableUnit === 'inch-32')
      ? formatMeasurementValueAsFraction(minusTol, tableUnit)
      : formatMeasurementValueNoRound(minusTol, tableUnit);
    setMinusToleranceRaw(minusTolRaw);
    
    const plusTolRaw = (tableUnit === 'inch-16' || tableUnit === 'inch-32')
      ? formatMeasurementValueAsFraction(plusTol, tableUnit)
      : formatMeasurementValueNoRound(plusTol, tableUnit);
    setPlusToleranceRaw(plusTolRaw);
    
    // Initialize raw values for adjustments
    const rawAdjustments: Record<string, string> = {};
    Object.entries(adjustments).forEach(([size, adjValue]) => {
      // Keep the adjustment value as is (it's already a string)
      rawAdjustments[size] = adjValue;
    });
    setSizeValuesRaw(rawAdjustments);

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

  // Selection handlers
  const toggleMeasurementSelection = (measurementId: string) => {
    setSelectedMeasurementIds(prev => {
      const next = new Set(prev);
      if (next.has(measurementId)) {
        next.delete(measurementId);
      } else {
        next.add(measurementId);
      }
      return next;
    });
  };

  const toggleSelectAllMeasurements = () => {
    if (selectedMeasurementIds.size === measurements.length) {
      setSelectedMeasurementIds(new Set());
    } else {
      // Use measurement.id if available, otherwise use index as fallback
      const allIds = measurements.map((m, idx) => m.id || `measurement-${idx}`);
      setSelectedMeasurementIds(new Set(allIds));
    }
  };

  const clearMeasurementSelection = () => {
    setSelectedMeasurementIds(new Set());
  };

  // Bulk duplicate measurements
  const handleBulkDuplicateMeasurements = () => {
    if (selectedMeasurementIds.size === 0) return;
    
    // Match by id or fallback to index-based id
    const selectedItems = measurements.filter((m, idx) => {
      const measurementId = m.id || `measurement-${idx}`;
      return selectedMeasurementIds.has(measurementId);
    });
    if (selectedItems.length === 0) return;

    selectedItems.forEach((item, idx) => {
      const originalIndex = measurements.findIndex(m => m.id === item.id);
      const duplicated: MeasurementPoint = {
        ...item,
        id: `measurement-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
        pomCode: item.pomCode ? `${item.pomCode}-COPY${idx > 0 ? `-${idx + 1}` : ''}` : item.pomCode,
      };
      
      if (insertMeasurementAt && originalIndex >= 0) {
        insertMeasurementAt(originalIndex + 1 + idx, duplicated);
      } else {
        addMeasurement(duplicated);
      }
    });

    showSuccess(t('form.measurement.duplicatedMeasurements', { count: selectedItems.length }));
    clearMeasurementSelection();
  };

  // Bulk delete measurements
  const handleBulkDeleteMeasurements = () => {
    if (selectedMeasurementIds.size === 0) return;
    
    // Match by id or fallback to index-based id
    const selectedItems = measurements.filter((m, idx) => {
      const measurementId = m.id || `measurement-${idx}`;
      return selectedMeasurementIds.has(measurementId);
    });
    if (selectedItems.length === 0) return;

    // Delete in reverse order to maintain indices
    selectedItems.reverse().forEach(item => {
      const index = measurements.findIndex((m, idx) => {
        const measurementId = m.id || `measurement-${idx}`;
        const itemId = item.id || `measurement-${measurements.indexOf(item)}`;
        return measurementId === itemId;
      });
      if (index >= 0 && deleteMeasurement) {
        deleteMeasurement(index);
      }
    });

    showSuccess(t('form.measurement.deletedMeasurements', { count: selectedItems.length }));
    clearMeasurementSelection();
  };

  const handleDuplicateMeasurement = (measurement: MeasurementPoint, index: number) => {
    if (!insertMeasurementAt) return;
    const duplicate: MeasurementPoint = {
      ...measurement,
      id: `measurement_${Date.now()}`,
      pomCode: `${measurement.pomCode}_COPY`,
      pomName: `${measurement.pomName} (Copy)`,
      sizes: measurement.sizes ? { ...measurement.sizes } : {},
      unit: (measurement.unit as MeasurementUnit) || DEFAULT_MEASUREMENT_UNIT,
    };
    insertMeasurementAt(index, duplicate);
    showSuccess('Measurement duplicated');
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
      { pomCode: 'CHEST', pomName: t('form.measurement.common.chestName'), method: t('form.measurement.common.chestMethod') },
      { pomCode: 'LENGTH', pomName: t('form.measurement.common.lengthName'), method: t('form.measurement.common.lengthMethod') },
      { pomCode: 'SLEEVE', pomName: t('form.measurement.common.sleeveName'), method: t('form.measurement.common.sleeveMethod') },
      { pomCode: 'SHOULDER', pomName: t('form.measurement.common.shoulderName'), method: t('form.measurement.common.shoulderMethod') },
      { pomCode: 'WAIST', pomName: t('form.measurement.common.waistName'), method: t('form.measurement.common.waistMethod') },
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
    showSuccess(t('form.measurement.commonAdded'));
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('form.measurement.title')}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {t('form.measurement.subtitle')}
            </p>
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{measurements.length}</div>
              <div className="text-gray-500">{t('form.measurement.points')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{selectedSizes.length}</div>
              <div className="text-gray-500">{t('form.measurement.sizes')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Size Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">{t('form.measurement.sizeRangeTitle')}</h3>
              <p className="text-sm text-gray-500">
                {t('form.measurement.sizeRangeDescription', { gender: articleInfo?.gender || t('form.measurement.unisex') })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">{t('form.measurement.preset')}</label>
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
                {t('form.measurement.applyPreset')}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedSizes.length === 0 && (
              <span className="text-sm text-gray-500">{t('form.measurement.noSizesConfigured')}</span>
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
                    aria-label={t('form.measurement.removeSizeAria', { size })}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              );
            })}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.measurement.baseSizeLabel')}</label>
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
              {t('form.measurement.baseSizeHint')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.measurement.unitLabel')}</label>
            <Select
              value={tableUnit}
              onChange={async (value) => {
                const newUnit = value as MeasurementUnit;
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
              }}
              options={measurementUnitOptions}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-2">
              {t('form.measurement.unitHint')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              value={newSizeLabel}
              onChange={(e) => setNewSizeLabel(e.target.value)}
              placeholder={t('form.measurement.newSizePlaceholder')}
              className="flex-1 min-w-[200px] px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleAddSize}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
            >
              {t('form.measurement.addSize')}
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          {/* Hidden: Add Common Points button */}
          {/* <div className="flex items-center space-x-3">
            <button
              onClick={addCommonMeasurements}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Ruler className="w-4 h-4 mr-2" />
              {t('form.measurement.addCommonPoints')}
            </button>
            
          </div> */}

          <div className="flex items-center space-x-3">
            {/* Hidden: Import Excel button */}
            {/* <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              <Upload className="w-4 h-4 mr-2" />
              {t('form.measurement.importExcel')}
            </button> */}
            {/* Hidden: Export Excel button */}
            {/* <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              <Download className="w-4 h-4 mr-2" />
              {t('form.measurement.exportExcel')}
            </button> */}
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('form.measurement.addMeasurement')}
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {editingIndex !== null ? t('form.measurement.editPoint') : t('form.measurement.addPoint')}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Input
              label={t('form.measurement.pomCodeLabel')}
              value={formData.pomCode || ''}
              onChange={handleInputChange('pomCode')}
              onBlur={() => validation.setFieldTouched('pomCode')}
              placeholder={t('form.measurement.pomCodePlaceholder')}
              required
              error={validation.getFieldProps('pomCode').error}
              helperText={validation.getFieldProps('pomCode').helperText || t('form.measurement.pomCodeHelper')}
            />

            <Input
              label={t('form.measurement.pomNameLabel')}
              value={formData.pomName || ''}
              onChange={handleInputChange('pomName')}
              onBlur={() => validation.setFieldTouched('pomName')}
              placeholder={t('form.measurement.pomNamePlaceholder')}
              required
              error={validation.getFieldProps('pomName').error}
              helperText={validation.getFieldProps('pomName').helperText}
            />

            <Input
              label={`${t('form.measurement.minusToleranceLabel')} (${getMeasurementUnitSuffix(tableUnit)}) *`}
              value={
                minusToleranceRaw || (formData.minusTolerance !== undefined && formData.minusTolerance !== null
                  ? String(formData.minusTolerance)
                  : '')
              }
              onChange={(value) => {
                // Store raw input to preserve original format for all units
                if (typeof value === 'string') {
                  setMinusToleranceRaw(value);
                  if (tableUnit === 'inch-16' || tableUnit === 'inch-32') {
                    // Allow fractions, mixed numbers, decimals, and empty string
                    // Pattern: optional sign, optional whole number, optional space, optional fraction
                    if (/^-?(\d+(\s+\d+\/\d+)?|\d*\/\d+|\d*\.?\d*)$/.test(value) || value === '' || value.trim() === '') {
                      // Parse to number for storage, but keep raw string for display
                      const normalized = value.replace(',', '.');
                      const parsed = parseMeasurementValue(normalized);
                      if (parsed !== undefined && !Number.isNaN(parsed)) {
                        handleInputChange('minusTolerance')(parsed);
                      } else if (value === '' || value.trim() === '') {
                        handleInputChange('minusTolerance')(1.0);
                      }
                    }
                  } else {
                    // For other units (inch-10, cm, mm), allow decimals with multiple decimal places
                    // Allow intermediate states while typing (e.g., "1.", "1.1", "1.12")
                    if (/^-?\d*\.?\d*$/.test(value) || value === '' || value.trim() === '') {
                      if (value === '' || value.trim() === '') {
                        handleInputChange('minusTolerance')(1.0);
                        setMinusToleranceRaw('');
                      } else {
                        // Parse but allow intermediate states
                        const normalized = value.replace(',', '.');
                        const numValue = parseFloat(normalized);
                        if (!Number.isNaN(numValue)) {
                          handleInputChange('minusTolerance')(numValue);
                        }
                        // Keep raw value even if parsing fails (intermediate state like "1.")
                      }
                    }
                  }
                } else {
                  handleInputChange('minusTolerance')(value);
                }
              }}
              onBlur={() => {
                validation.setFieldTouched('minusTolerance');
                // On blur, if raw value is empty but we have a number, format it
                if (!minusToleranceRaw && formData.minusTolerance !== undefined && formData.minusTolerance !== null) {
                  setMinusToleranceRaw(String(formData.minusTolerance));
                }
              }}
              type={tableUnit === 'inch-16' || tableUnit === 'inch-32' ? 'text' : 'text'}
              step={tableUnit === 'inch-16' || tableUnit === 'inch-32' ? undefined : undefined}
              min={tableUnit === 'inch-16' || tableUnit === 'inch-32' ? undefined : undefined}
              max={tableUnit === 'inch-16' || tableUnit === 'inch-32' ? undefined : undefined}
              placeholder={t('form.measurement.tolerancePlaceholder')}
              required
              error={validation.getFieldProps('minusTolerance').error}
              helperText={
                validation.getFieldProps('minusTolerance').helperText
                || t('form.measurement.toleranceHelper', { unit: getMeasurementUnitSuffix(formData.unit as MeasurementUnit) })
              }
            />

            <Input
              label={`${t('form.measurement.plusToleranceLabel')} (${getMeasurementUnitSuffix(tableUnit)}) *`}
              value={
                plusToleranceRaw || (formData.plusTolerance !== undefined && formData.plusTolerance !== null
                  ? String(formData.plusTolerance)
                  : '')
              }
              onChange={(value) => {
                // Store raw input to preserve original format for all units
                if (typeof value === 'string') {
                  setPlusToleranceRaw(value);
                  if (tableUnit === 'inch-16' || tableUnit === 'inch-32') {
                    // Allow fractions, mixed numbers, decimals, and empty string
                    // Pattern: optional sign, optional whole number, optional space, optional fraction
                    if (/^-?(\d+(\s+\d+\/\d+)?|\d*\/\d+|\d*\.?\d*)$/.test(value) || value === '' || value.trim() === '') {
                      // Parse to number for storage, but keep raw string for display
                      const normalized = value.replace(',', '.');
                      const parsed = parseMeasurementValue(normalized);
                      if (parsed !== undefined && !Number.isNaN(parsed)) {
                        handleInputChange('plusTolerance')(parsed);
                      } else if (value === '' || value.trim() === '') {
                        handleInputChange('plusTolerance')(1.0);
                      }
                    }
                  } else {
                    // For other units (inch-10, cm, mm), allow decimals with multiple decimal places
                    // Allow intermediate states while typing (e.g., "1.", "1.1", "1.12")
                    if (/^-?\d*\.?\d*$/.test(value) || value === '' || value.trim() === '') {
                      if (value === '' || value.trim() === '') {
                        handleInputChange('plusTolerance')(1.0);
                        setPlusToleranceRaw('');
                      } else {
                        // Parse but allow intermediate states
                        const normalized = value.replace(',', '.');
                        const numValue = parseFloat(normalized);
                        if (!Number.isNaN(numValue)) {
                          handleInputChange('plusTolerance')(numValue);
                        }
                        // Keep raw value even if parsing fails (intermediate state like "1.")
                      }
                    }
                  }
                } else {
                  handleInputChange('plusTolerance')(value);
                }
              }}
              onBlur={() => {
                validation.setFieldTouched('plusTolerance');
                // On blur, if raw value is empty but we have a number, format it
                if (!plusToleranceRaw && formData.plusTolerance !== undefined && formData.plusTolerance !== null) {
                  setPlusToleranceRaw(String(formData.plusTolerance));
                }
              }}
              type={tableUnit === 'inch-16' || tableUnit === 'inch-32' ? 'text' : 'text'}
              step={tableUnit === 'inch-16' || tableUnit === 'inch-32' ? undefined : undefined}
              min={tableUnit === 'inch-16' || tableUnit === 'inch-32' ? undefined : undefined}
              max={tableUnit === 'inch-16' || tableUnit === 'inch-32' ? undefined : undefined}
              placeholder={t('form.measurement.tolerancePlaceholder')}
              required
              error={validation.getFieldProps('plusTolerance').error}
              helperText={
                validation.getFieldProps('plusTolerance').helperText
                || t('form.measurement.toleranceHelper', { unit: getMeasurementUnitSuffix(formData.unit as MeasurementUnit) })
              }
            />

            <div className="md:col-span-2">
              <Input
                label={t('form.measurement.methodLabel')}
                value={formData.measurementMethod || ''}
                onChange={handleInputChange('measurementMethod')}
                placeholder={t('form.measurement.methodPlaceholder')}
                error={validation.getFieldProps('notes').error}
                helperText={validation.getFieldProps('notes').helperText}
              />
            </div>
          </div>

          {/* Size Measurements Grid */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-800 mb-3">
              {t('form.measurement.baseAndJumpTitle', { unit: getMeasurementUnitSuffix(tableUnit) })}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{t('form.measurement.baseSizeLabel')}</label>
                <select
                  value={formData.baseSize || ''}
                  onChange={(e) => handleBaseSizeSelect(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 cursor-not-allowed"
                  disabled
                >
                  {selectedSizes.length === 0 && <option value="">{t('form.measurement.selectAtLeastOneSize')}</option>}
                  {selectedSizes.map(size => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">{t('form.measurement.baseSizeManagedHint')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  {t('form.measurement.baseMeasurementLabel', { unit: getMeasurementUnitSuffix(tableUnit) })}
                </label>
                <input
                  type={tableUnit === 'inch-16' || tableUnit === 'inch-32' ? 'text' : 'number'}
                  step={tableUnit === 'inch-16' || tableUnit === 'inch-32' ? undefined : '0.01'}
                  min={tableUnit === 'inch-16' || tableUnit === 'inch-32' ? undefined : '0'}
                  value={
                    baseValueRaw && (tableUnit === 'inch-16' || tableUnit === 'inch-32')
                      ? baseValueRaw
                      : baseValue !== undefined && baseValue !== null
                        ? String(baseValue)
                        : ''
                  }
                  onChange={(e) => handleBaseValueChange(e.target.value)}
                  onBlur={() => validation.setFieldTouched('measurement')}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validation.getFieldProps('measurement').error ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={t('form.measurement.baseMeasurementPlaceholder')}
                />
                <p className="text-xs text-gray-500 mt-2">Enter the actual measurement for the base size; other sizes will follow the jumps.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              {selectedSizes.map(size => {
                const isBase = size === formData.baseSize;
                const actualValue = formData.sizes?.[size];
                if (isBase) {
                  return (
                    <div key={size} className="border border-blue-200 bg-blue-50 rounded-md p-3">
                      <div className="text-xs uppercase font-semibold text-blue-600">{t('form.measurement.baseBadge')}</div>
                      <div className="text-lg font-semibold text-blue-900">{size}</div>
                      <div className="text-sm text-blue-800 mt-1">
                        {baseValue !== undefined && !Number.isNaN(baseValue)
                          ? (baseValueRaw && (tableUnit === 'inch-16' || tableUnit === 'inch-32')
                              ? `${baseValueRaw} ${getMeasurementUnitSuffix(tableUnit)}`
                              : `${formatMeasurementValueNoRound(baseValue, tableUnit)} ${getMeasurementUnitSuffix(tableUnit)}`)
                          : t('form.measurement.enterBaseValue')}
                      </div>
                    </div>
                  );
                }

                // Use raw value if available, otherwise use formatted adjustment value
                const adjustmentValue = sizeValuesRaw[size] || sizeAdjustments[size] || '';
                // For inch-16/32, format as fraction to preserve original format
                // For other units, use decimal format without rounding
                const displayActual = (tableUnit === 'inch-16' || tableUnit === 'inch-32')
                  ? formatMeasurementValueAsFraction(actualValue, tableUnit)
                  : formatMeasurementValueNoRound(actualValue, tableUnit);

                return (
                  <div key={size} className="flex flex-col border rounded-md p-3">
                    <label className="text-sm font-medium text-gray-700 mb-1">
                      {t('form.measurement.sizeJumpLabel', { size })}
                    </label>
                    <input
                      type="text"
                      value={adjustmentValue}
                      onChange={(e) => handleSizeAdjustmentChange(size, e.target.value)}
                      onBlur={() => validation.setFieldTouched('measurement')}
                      className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={t('form.measurement.jumpPlaceholder')}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('form.measurement.actual')}{' '}
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
            
          </div>

          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">{t('form.measurement.notesLabel')}</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes')(e.target.value)}
              onBlur={() => validation.setFieldTouched('notes')}
              placeholder={t('form.measurement.notesPlaceholder')}
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
                    {t('form.bom.fixErrors')}
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
              {t('common.cancel')}
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
              {editingIndex !== null ? t('common.update') : t('common.add')} {t('form.measurement.measurement')}
            </button>
          </div>
        </div>
      )}

      {/* Measurements Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Selection toolbar */}
        {selectedMeasurementIds.size > 0 && (
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-blue-900">
                {t('form.bom.selected', { count: selectedMeasurementIds.size })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkDuplicateMeasurements}
                className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Copy className="w-4 h-4 inline mr-1.5" />
                {t('form.bom.duplicate')}
              </button>
              <button
                onClick={handleBulkDeleteMeasurements}
                className="px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <X className="w-4 h-4 inline mr-1.5" />
                {t('common.delete')}
              </button>
              <button
                onClick={clearMeasurementSelection}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                {t('form.bom.clearSelection')}
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 w-12">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleSelectAllMeasurements();
                    }}
                    className="flex items-center justify-center w-5 h-5 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                    title={selectedMeasurementIds.size === measurements.length && measurements.length > 0 ? t('form.bom.deselectAll') : t('form.bom.selectAll')}
                  >
                    {selectedMeasurementIds.size === measurements.length && measurements.length > 0 ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                  {t('form.measurement.pomCodeColumn')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-48">
                  {t('form.measurement.pomNameColumn')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('form.measurement.toleranceColumn')}
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
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {measurements.length === 0 ? (
                <tr>
                  <td colSpan={selectedSizes.length + 5} className="px-6 py-12 text-center text-sm text-gray-500">
                    {t('form.measurement.noPoints')}
                  </td>
                </tr>
              ) : (
                measurements.map((measurement, index) => {
                  const validationResult = validateMeasurement(measurement);
                  const hasIssues = validationResult.errors.length > 0 || validationResult.warnings.length > 0;
                  
                  // Format tolerance for display
                  const minusTol = typeof measurement.minusTolerance === 'string' 
                    ? parseTolerance(measurement.minusTolerance) 
                    : (measurement.minusTolerance ?? 1.0);
                  const plusTol = typeof measurement.plusTolerance === 'string'
                    ? parseTolerance(measurement.plusTolerance)
                    : (measurement.plusTolerance ?? 1.0);
                  // Format tolerance for display - use fraction format for inch-16/32, no rounding for others
                  const toleranceDisplay = minusTol === plusTol 
                    ? (tableUnit === 'inch-16' || tableUnit === 'inch-32')
                        ? `±${formatMeasurementValueAsFraction(minusTol, tableUnit)}`
                        : `±${formatMeasurementValueNoRound(minusTol, tableUnit)}`
                    : (tableUnit === 'inch-16' || tableUnit === 'inch-32')
                        ? `-${formatMeasurementValueAsFraction(minusTol, tableUnit)} / +${formatMeasurementValueAsFraction(plusTol, tableUnit)}`
                        : `-${formatMeasurementValueNoRound(minusTol, tableUnit)} / +${formatMeasurementValueNoRound(plusTol, tableUnit)}`;
                  const rowBackgroundColor = validationResult.errors.length > 0
                    ? '#fee2e2'
                    : validationResult.warnings.length > 0
                      ? '#fef3c7'
                      : index % 2 === 0
                        ? '#ffffff'
                        : rowStripeColor;
                  
                  // Use measurement.id if available, otherwise use index as fallback
                  const measurementId = measurement.id || `measurement-${index}`;
                  const isSelected = selectedMeasurementIds.has(measurementId);
                  
                  return (
                    <tr 
                      key={measurementId} 
                      className={`transition-colors duration-150 hover:brightness-95 ${isSelected ? 'bg-blue-50' : ''}`}
                      style={isSelected ? undefined : { backgroundColor: rowBackgroundColor }}
                    >
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleMeasurementSelection(measurementId);
                          }}
                          className="flex items-center justify-center w-5 h-5 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                          title={isSelected ? 'Deselect' : 'Select'}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0"
                        style={isSelected ? undefined : { backgroundColor: rowBackgroundColor }}
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
                        // For inch-16/32, format as fraction to preserve original format
                        // For other units, use decimal format without rounding
                        const displayValue = (tableUnit === 'inch-16' || tableUnit === 'inch-32')
                          ? formatMeasurementValueAsFraction(value, tableUnit)
                          : formatMeasurementValueNoRound(value, tableUnit);
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
                            {t('common.edit')}
                          </button>
                          <button
                            onClick={() => handleDuplicateMeasurement(measurement, index)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            {t('form.measurement.duplicate')}
                          </button>
                          <button
                            onClick={() => handleDelete(measurement, index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            {t('common.delete')}
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
            <h3 className="text-lg font-semibold text-gray-900">{t('form.measurement.sampleRoundsTitle')}</h3>
            <p className="text-sm text-gray-500">{t('form.measurement.sampleRoundsDescription')}</p>
            {!canAddNewRound && sampleMeasurementRounds.length > 0 && (
              <p className="text-xs text-amber-600 mt-1">
                {t('form.measurement.completeCurrentRound')}
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
            title={!canAddNewRound ? t('form.measurement.completePreviousRound') : ''}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('form.measurement.addSampleRound')}
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
                    placeholder={t('form.measurement.roundNamePlaceholder')}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSaveSampleRound(round.id)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                      title={t('form.measurement.saveRoundTitle')}
                    >
                      <Save className="w-3 h-3 mr-1.5" />
                      {t('common.save')}
                    </button>
                    <button
                      className="text-red-500 hover:text-red-600 text-xs font-medium"
                      onClick={() => handleDeleteSampleRound(round.id)}
                    >
                      {t('common.remove')}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t('form.measurement.date')}</label>
                    <input
                      type="date"
                      value={getDateInputValue(round.date)}
                      onChange={(e) => handleRoundFieldChange(round.id, 'date', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t('form.measurement.reviewer')}</label>
                    <input
                      value={round.reviewer || ''}
                      onChange={(e) => handleRoundFieldChange(round.id, 'reviewer', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={t('form.measurement.reviewerPlaceholder')}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    {t('form.measurement.requestedSourceLabel')}: {requestedSourceLabels[round.requestedSource || 'original']}
                  </p>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t('form.measurement.overallComments')}</label>
                  <div className="rounded-md border border-gray-200 bg-white">
                    <ReactQuill
                      theme="snow"
                      value={round.overallComments || ''}
                      onChange={(content) => handleRoundFieldChange(round.id, 'overallComments', content)}
                      modules={sampleRoundQuillModules}
                      formats={sampleRoundQuillFormats}
                      placeholder={t('form.measurement.overallCommentsPlaceholder')}
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
            {t('form.measurement.addPointsForRounds')}
          </div>
        ) : sampleMeasurementRounds.length === 0 ? (
          <div className="text-sm text-gray-500">
            {t('form.measurement.noSampleRounds')}
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
              <h3 className="text-lg font-semibold text-gray-900">{t('form.measurement.createSampleRoundTitle')}</h3>
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
                  {t('form.measurement.roundName')}
                </label>
                <input
                  type="text"
                  value={roundForm.name}
                  onChange={(e) => handleRoundFormFieldChange('name', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('form.measurement.roundNamePlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.measurement.date')}
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
                  {t('form.measurement.reviewer')}
                </label>
                <input
                  type="text"
                  value={roundForm.reviewer}
                  onChange={(e) => handleRoundFormFieldChange('reviewer', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('form.measurement.reviewerPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('form.measurement.requestedSourceLabel')}
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
                    <span className="text-sm text-gray-700">{t('form.measurement.requestedSourceOriginal')}</span>
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
                      {t('form.measurement.requestedSourcePrevious')}
                    </span>
                  </label>
                </div>
                {!hasPreviousRound && (
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    {t('form.measurement.requestedSourceHint')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={handleCloseRoundModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreateRound}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                {t('form.measurement.createRound')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden: Info Panel - Measurement Guidelines */}
      {/* <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">{t('form.measurement.guidelinesTitle')}</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>{t('form.measurement.guidelineUnit')}</li>
              <li>{t('form.measurement.guidelineTolerance', { unit: getMeasurementUnitSuffix(tableUnit) })}</li>
              <li>{t('form.measurement.guidelineConsistentTolerance')}</li>
              <li>{t('form.measurement.guidelineZeroValues')}</li>
              <li>{t('form.measurement.guidelineCompleteRound')}</li>
            </ul>
          </div>
        </div>
      </div> */}

      <ConfirmationDialog
        isOpen={showBaseSizeConfirm}
        title={t('form.measurement.changeBaseSizeTitle')}
        message={t('form.measurement.changeBaseSizeMessage', { size: pendingBaseSize || t('form.measurement.thisSize') })}
        confirmText={t('form.measurement.changeBaseSizeConfirm')}
        cancelText={t('form.measurement.changeBaseSizeCancel')}
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
  options?: { defaultBaseSize?: string; t?: (key: string, params?: Record<string, string | number>) => string }
): { isValid: boolean; errors: Array<{ id: string; item: MeasurementPoint; errors: Record<string, string> }> } => {
  const errors: Array<{ id: string; item: MeasurementPoint; errors: Record<string, string> }> = [];
  const { normalized } = normalizeMeasurementBaseSizes(measurements, options?.defaultBaseSize);
  
  // Use provided t function or fallback to key
  const t = options?.t || ((key: string) => key);
  
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
            const label =
              fieldKey === 'pomCode'
                ? t('form.measurement.pomCode')
                : fieldKey === 'pomName'
                ? t('form.measurement.pomName')
                : fieldKey;
            error = t('validation.fieldRequired', { field: label });
          }
        }
        
        // Check custom validation if no error yet
        if (!error && rule.custom) {
          error = rule.custom(value as any);
        }
        
        // Check minLength/maxLength for strings
        if (!error && typeof value === 'string' && value) {
          if (rule.minLength && value.length < rule.minLength) {
            error = t('validation.minLength', { count: rule.minLength });
          }
          if (rule.maxLength && value.length > rule.maxLength) {
            error = t('validation.maxLength', { count: rule.maxLength });
          }
        }
        
        // Check min/max for numbers
        if (!error && typeof value === 'number') {
          if (rule.min !== undefined && value < rule.min) {
            error = t('validation.min', { value: rule.min });
          }
          if (rule.max !== undefined && value > rule.max) {
            error = t('validation.max', { value: rule.max });
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
      itemErrors.sizes = t('form.measurement.atLeastOneSizeRequired');
    }

    const filledSizeKeys = Object.keys(item.sizes || {}).filter((size) => {
      const value = item.sizes?.[size];
      return value !== undefined && value !== null;
    });

    if (filledSizeKeys.length > 0) {
      const trimmedBase = item.baseSize?.trim();
      if (!trimmedBase) {
        itemErrors.baseSize = t('form.measurement.baseSizeRequiredShort');
      } else if (!item.sizes || item.sizes[trimmedBase] === undefined || item.sizes[trimmedBase] === null) {
        itemErrors.baseSize = t('form.measurement.baseMeasurementRequired');
      }
    }
    
    if (Object.keys(itemErrors).length > 0) {
      errors.push({ id: item.id, item, errors: itemErrors });
    }
  });
  
  return { isValid: errors.length === 0, errors };
};

export default MeasurementTab;
