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
import { Plus, Upload, Download, Ruler, AlertTriangle, Info, AlertCircle, X, Save, CheckCircle, Copy } from 'lucide-react';
import { showSuccess, showWarning, showError } from '../../../lib/toast';
import SampleMeasurementsTable from './SampleMeasurementsTable';
import { SampleMeasurementRow } from '../../../types/measurements';
import { parseTolerance, formatTolerance, parseStepValue, formatStepValue, formatMeasurementValue } from './measurementHelpers';
import { SIZE_PRESET_OPTIONS, getPresetById } from '../../../constants/sizePresets';
import ConfirmationDialog from '../../ConfirmationDialog';
import { DEFAULT_MEASUREMENT_BASE_HIGHLIGHT_COLOR, DEFAULT_MEASUREMENT_ROW_STRIPE_COLOR } from '../../../constants/measurementDisplay';
import { normalizeMeasurementBaseSizes } from '../../../utils/measurements';

// Progression validation result
interface ProgressionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

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
    ['link'],
    ['clean'],
  ],
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
  const [newSizeLabel, setNewSizeLabel] = useState('');
  const [pendingPresetId, setPendingPresetId] = useState(() => SIZE_PRESET_OPTIONS[0]?.id || 'standard_us_alpha');
  const [baseSizeSelectorValue, setBaseSizeSelectorValue] = useState('');
  const [pendingBaseSize, setPendingBaseSize] = useState<string | null>(null);
  const [showBaseSizeConfirm, setShowBaseSizeConfirm] = useState(false);

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
      let nextBaseSize = measurementBaseSize && selectedSizes.includes(measurementBaseSize)
        ? measurementBaseSize
        : prev.baseSize;
      if (!nextBaseSize || !selectedSizes.includes(nextBaseSize)) {
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
    if (!saveTechPack) return;
    
    try {
      // Lưu toàn bộ TechPack (bao gồm sample measurement rounds)
      // Logic hiện tại đã đảm bảo: các sizes không được điền sẽ giữ nguyên giá trị requested
      await saveTechPack();
      showSuccess('Sample measurement round saved successfully');
    } catch (error: any) {
      showError(error.message || 'Failed to save sample measurement round');
    }
  }, [saveTechPack]);

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
    const normalized = value.replace(',', '.');
    if (normalized.trim() === '') {
      updateSizesWithBase({ baseValue: undefined });
      return;
    }
    const parsed = parseFloat(normalized);
    if (Number.isNaN(parsed)) {
      return;
    }
    updateSizesWithBase({ baseValue: parsed });
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
  const validateProgression = useCallback((sizes: Record<string, number>, sizeOrder: string[]): ProgressionValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
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
        warnings.push(`Very small progression between ${sizeEntries[i - 1].size} and ${sizeEntries[i].size} (${diff.toFixed(2)}cm)`);
      }
    }

    if (progressionIssues.length > 0) {
      const issueDetails = progressionIssues
        .map(issue => `${issue.from} → ${issue.to}: decreased by ${issue.diff.toFixed(2)}cm`)
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
    const progressionValidation = validateProgression(sizes, selectedSizes);
    
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
      pomCode: formData.pomCode!,
      pomName: formData.pomName!,
      minusTolerance: formData.minusTolerance ?? 1.0,
      plusTolerance: formData.plusTolerance ?? 1.0,
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
    const resolvedBaseSize =
      measurement.baseSize ||
      measurementSizes[0] ||
      formData.baseSize ||
      selectedSizes[0];

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

  const handleDuplicateMeasurement = (measurement: MeasurementPoint, index: number) => {
    if (!insertMeasurementAt) return;
    const duplicate: MeasurementPoint = {
      ...measurement,
      id: `measurement_${Date.now()}`,
      pomCode: `${measurement.pomCode}_COPY`,
      pomName: `${measurement.pomName} (Copy)`,
      sizes: measurement.sizes ? { ...measurement.sizes } : {},
    };
    insertMeasurementAt(index, duplicate);
    showSuccess('Measurement duplicated');
  };

  // Enhanced validation for display in table
  const validateMeasurement = (measurement: MeasurementPoint): ProgressionValidation => {
    const measurementSizes = measurement.sizes ? Object.keys(measurement.sizes) : [];
    const order = selectedSizes.length > 0 ? selectedSizes : measurementSizes;
    return validateProgression(measurement.sizes || {}, order);
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
              <h3 className="text-lg font-semibold text-gray-800">Size Range Configuration</h3>
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

            <Input
              label="Minus Tolerance (cm) *"
              value={formData.minusTolerance ?? ''}
              onChange={(value) => handleInputChange('minusTolerance')(typeof value === 'string' ? parseFloat(value) || 0 : value)}
              onBlur={() => validation.setFieldTouched('minusTolerance')}
              type="number"
              step="0.0000001"
              min="0"
              max="50"
              placeholder="e.g., 1.0"
              required
              error={validation.getFieldProps('minusTolerance').error}
              helperText={validation.getFieldProps('minusTolerance').helperText || 'Tolerance in centimeters'}
            />

            <Input
              label="Plus Tolerance (cm) *"
              value={formData.plusTolerance ?? ''}
              onChange={(value) => handleInputChange('plusTolerance')(typeof value === 'string' ? parseFloat(value) || 0 : value)}
              onBlur={() => validation.setFieldTouched('plusTolerance')}
              type="number"
              step="0.0000001"
              min="0"
              max="50"
              placeholder="e.g., 1.0"
              required
              error={validation.getFieldProps('plusTolerance').error}
              helperText={validation.getFieldProps('plusTolerance').helperText || 'Tolerance in centimeters'}
            />

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
            <h4 className="text-md font-medium text-gray-800 mb-3">Base Size & Jump (cm)</h4>
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
                <label className="text-sm font-medium text-gray-700 mb-1 block">Base Measurement (cm)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={baseValue ?? ''}
                  onChange={(e) => handleBaseValueChange(e.target.value)}
                  onBlur={() => validation.setFieldTouched('measurement')}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validation.getFieldProps('measurement').error ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., 30"
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
                      <div className="text-xs uppercase font-semibold text-blue-600">Base</div>
                      <div className="text-lg font-semibold text-blue-900">{size}</div>
                      <div className="text-sm text-blue-800 mt-1">
                        {baseValue !== undefined && !Number.isNaN(baseValue)
                          ? `${formatMeasurementValue(baseValue)} cm`
                          : 'Enter a base value'}
                      </div>
                    </div>
                  );
                }

                const adjustmentValue = sizeAdjustments[size] || '';
                const displayActual = formatMeasurementValue(actualValue);

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
                      Actual: <span className="font-medium text-gray-700">{displayActual !== '-' ? `${displayActual} cm` : '--'}</span>
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
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
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
                  <td colSpan={selectedSizes.length + 4} className="px-6 py-12 text-center text-sm text-gray-500">
                    No measurement points defined. Add measurements to get started.
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
                  const toleranceDisplay = minusTol === plusTol 
                    ? formatTolerance(minusTol)
                    : `-${minusTol.toFixed(1)}cm / +${plusTol.toFixed(1)}cm`;
                  const rowBackgroundColor = validationResult.errors.length > 0
                    ? '#fee2e2'
                    : validationResult.warnings.length > 0
                      ? '#fef3c7'
                      : index % 2 === 0
                        ? '#ffffff'
                        : rowStripeColor;
                  
                  return (
                    <tr 
                      key={measurement.id || `measurement-${index}`} 
                      className="transition-colors duration-150 hover:brightness-95"
                      style={{ backgroundColor: rowBackgroundColor }}
                    >
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0"
                        style={{ backgroundColor: rowBackgroundColor }}
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
                        const displayValue = formatMeasurementValue(value);
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
              <li>All measurements should be in centimeters</li>
              <li>Ensure size progression is logical (each size should be larger than or equal to the previous)</li>
              <li>Tolerance values are in centimeters (e.g., 1.0 means ±1.0cm)</li>
              <li>Use consistent tolerance values across similar measurement points</li>
              <li>Zero values are preserved - use empty field to indicate "not measured"</li>
              <li>Complete all measurements in a round before creating a new round</li>
            </ul>
          </div>
        </div>
      </div>

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
