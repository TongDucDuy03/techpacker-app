import React, { useState, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useTechPack } from '../../../contexts/TechPackContext';
import { HowToMeasure, MeasurementPoint } from '../../../types/techpack';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { howToMeasureValidationSchema } from '../../../utils/validationSchemas';
import Input from '../shared/Input';
import Select from '../shared/Select';
import Textarea from '../shared/Textarea';
import Modal from '../shared/Modal';
import { Plus, Upload, Download, Search, Filter, AlertCircle, X, Copy, RotateCcw, Edit, ChevronLeft, ChevronRight, Save, CheckCircle, Eye, Trash2, FileText } from 'lucide-react';
import ZoomableImage from '../../common/ZoomableImage';
import { showSuccess, showError, showWarning, showUndoToast } from '../../../lib/toast';
import { api } from '../../../lib/api';

// Generate UUID v4
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Construction status type (using existing fields creatively)
type ConstructionStatus = 'Draft' | 'Requested' | 'Approved';

// Extended HowToMeasure interface for Construction (using existing fields)
interface Construction extends HowToMeasure {
  status?: ConstructionStatus;
  assignedTo?: string;
  comments?: string;
}

// Helper functions to encode/decode metadata into videoUrl
const encodeMetadata = (videoUrl: string, status: ConstructionStatus, comments: string): string => {
  // Always encode metadata to ensure status and comments are preserved
  // Even if status is Draft, we need to store it for consistency
  const metadata = { 
    status: status || 'Draft', 
    comments: comments || '', 
    originalVideoUrl: videoUrl || '' 
  };
  return `__METADATA__${JSON.stringify(metadata)}`;
};

const decodeMetadata = (videoUrl: string): { videoUrl: string; status?: ConstructionStatus; comments?: string } => {
  if (videoUrl && videoUrl.startsWith('__METADATA__')) {
    try {
      const metadata = JSON.parse(videoUrl.replace('__METADATA__', ''));
      return {
        videoUrl: metadata.originalVideoUrl || '',
        status: metadata.status,
        comments: metadata.comments
      };
    } catch {
      return { videoUrl };
    }
  }
  return { videoUrl };
};

export interface ConstructionTabRef {
  validateAll: () => { isValid: boolean; errors: Array<{ id: string; item: Construction; errors: Record<string, string> }> };
}

// CSV Import/Export utilities
const CSV_HEADERS = ['POM Code', 'Description', 'Steps', 'Image URL', 'Video URL', 'Language', 'Comments'];

const exportToCSV = (items: Construction[]): string => {
  const rows = items.map(item => {
    // Items are already decoded in constructions array
    return [
      item.pomCode || '',
      item.description || '',
      (item.steps || []).join('; '),
      item.imageUrl || '',
      item.videoUrl || '', // This is the decoded videoUrl (without metadata)
      item.language || 'en-US',
      (item as any).comments || ''
    ];
  });
  
  const csvContent = [
    CSV_HEADERS.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  
  return csvContent;
};

const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const parseCSV = (csvText: string): any[] => {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: any[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
    const row: any = {};
    headers.forEach((header, idx) => {
      let value = values[idx] || '';
      value = value.trim().replace(/^"|"$/g, '').replace(/""/g, '"');
      row[header] = value;
    });
    rows.push(row);
  }
  
  return rows;
};

// Validate Construction item
const validateConstructionItem = (item: Partial<Construction>, measurements: MeasurementPoint[] = []): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Use howToMeasureValidationSchema validation
  const schema = howToMeasureValidationSchema;
  
  // Validate pomCode
  if (schema.pomCode?.required && (!item.pomCode || item.pomCode.trim().length === 0)) {
    errors.pomCode = 'Vui lòng chọn điểm đo hợp lệ.';
  } else if (item.pomCode && measurements.length > 0) {
    const exists = measurements.some(m => m.pomCode === item.pomCode);
    if (!exists) {
      errors.pomCode = 'POM Code không tồn tại trong measurements.';
    }
  }
  
  // Validate description (instructions)
  if (schema.description?.required) {
    const description = item.description || '';
    const steps = item.steps || [];
    if (description.trim().length < 10 && steps.length === 0) {
      errors.description = 'Thêm mô tả chi tiết (ít nhất 1 bước hoặc mô tả 10 ký tự).';
    }
  }
  
  // Validate steps
  if (schema.steps?.custom) {
    const steps = item.steps || [];
    const description = item.description || '';
    if (steps.length === 0 && description.trim().length < 10) {
      errors.steps = 'Thêm ít nhất 1 bước hoặc mô tả chi tiết.';
    }
    steps.forEach((step, idx) => {
      if (!step || step.trim().length === 0) {
        errors[`steps.${idx}`] = `Bước ${idx + 1} không được để trống.`;
      }
    });
  }
  
  // Validate imageUrl
  if (item.imageUrl && schema.imageUrl?.custom) {
    const isUrl = /^https?:\/\//.test(item.imageUrl);
    const isDataUrl = /^data:image\/(jpeg|jpg|png|gif|svg\+xml);base64,/.test(item.imageUrl);
    const isRelative = item.imageUrl.startsWith('/') || !item.imageUrl.includes('://');
    if (!isUrl && !isDataUrl && !isRelative) {
      errors.imageUrl = 'URL ảnh không hợp lệ.';
    }
  }
  
  // Validate language
  if (schema.language?.required) {
    const validLanguages = ['en-US', 'vi-VN', 'zh-CN', 'es-ES'];
    if (!item.language || !validLanguages.includes(item.language)) {
      errors.language = 'Vui lòng chọn ngôn ngữ hợp lệ.';
    }
  }
  
  // Approval/status flow disabled
  
  return { isValid: Object.keys(errors).length === 0, errors };
};

const ConstructionTabComponent = forwardRef<ConstructionTabRef>((props, ref) => {
  const context = useTechPack();
  const { state, addHowToMeasure, updateHowToMeasureById, deleteHowToMeasureById, insertHowToMeasureAt, updateFormState } = context ?? {};
  const { howToMeasures = [], measurements = [] } = state?.techpack ?? {};

  const measurementNameMap = useMemo(() => {
    return new Map((measurements as MeasurementPoint[]).map(m => [m.pomCode, m.pomName || '']));
  }, [measurements]);
  
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1';
  const FILE_BASE_URL = (() => {
    const stripped = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    return stripped || API_BASE_URL;
  })();
  
  const buildPublicUrl = (origin: string, path: string, search = '', hash = '') => {
    const sanitizedPath = path.replace(/^\/api\/v1/, '');
    return `${origin}${sanitizedPath.startsWith('/') ? sanitizedPath : `/${sanitizedPath}`}${search}${hash}`;
  };
  
  // Helper to get image URL - handles absolute URLs and local uploads without /api/v1 prefix issues
  const getImageUrl = (url: string | undefined): string => {
    if (!url) return '';
    const trimmed = url.trim();
    
    if (/^https?:\/\//i.test(trimmed)) {
      try {
        const parsed = new URL(trimmed);
        return buildPublicUrl(parsed.origin, parsed.pathname, parsed.search, parsed.hash);
      } catch {
        return trimmed;
      }
    }
    
    const sanitizedPath = trimmed.replace(/^\/api\/v1/, '');
    if (sanitizedPath.startsWith('/')) {
      return `${FILE_BASE_URL}${sanitizedPath}`;
    }
    return `${FILE_BASE_URL}/${sanitizedPath}`;
  };
  
  // Cast to Construction array - decode metadata from videoUrl
  const constructions = useMemo(() => {
    return (howToMeasures as Construction[]).map((item, index) => {
      const decoded = decodeMetadata(item.videoUrl || '');
      const steps = item.steps && item.steps.length > 0 ? item.steps : (item.instructions || []);
      return {
        ...item,
        pomName: item.pomName || measurementNameMap.get(item.pomCode) || '',
        stepNumber: typeof item.stepNumber === 'number' ? item.stepNumber : index + 1,
        steps,
        instructions: steps,
        videoUrl: decoded.videoUrl,
        status: decoded.status || (item as any).status || 'Draft' as ConstructionStatus,
        assignedTo: (item as any).assignedTo || '',
        comments: decoded.comments || (item as any).comments || '',
        tips: item.tips || [],
        commonMistakes: item.commonMistakes || [],
        relatedMeasurements: item.relatedMeasurements || [],
      };
    });
  }, [howToMeasures, measurementNameMap]);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  // const [filterByStatus, setFilterByStatus] = useState<ConstructionStatus | ''>('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<Array<{ row: number; errors: Record<string, string> }>>([]);
  const [rawCsvData, setRawCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, keyof Construction | ''>>({});
  const [deletedItem, setDeletedItem] = useState<{ item: Construction; index: number; timeoutId?: NodeJS.Timeout } | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, Record<string, string>>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const validation = useFormValidation(howToMeasureValidationSchema);
  
  const [formData, setFormData] = useState<Partial<Construction>>({
    pomCode: '',
    pomName: '',
    description: '',
    imageUrl: '',
    steps: [],
    videoUrl: '',
    language: 'en-US',
    status: 'Draft' as ConstructionStatus,
    comments: '',
    note: '',
    stepNumber: constructions.length + 1,
    tips: [],
    commonMistakes: [],
    relatedMeasurements: [],
  });


  // Language options
  const languageOptions = [
    { value: 'en-US', label: 'English (US)' },
    { value: 'vi-VN', label: 'Tiếng Việt' },
    { value: 'zh-CN', label: '中文 (简体)' },
    { value: 'es-ES', label: 'Español' },
  ];

  // Status options
  // const statusOptions = [];

  // Get available POM codes from measurements
  const availablePomCodes = useMemo(() => {
    return measurements.map((m: MeasurementPoint) => ({ value: m.pomCode, label: `${m.pomCode} - ${m.pomName}` }));
  }, [measurements]);

  // Filter constructions
  const filteredConstructions = useMemo(() => {
    return constructions.filter(item => {
      const matchesSearch = searchTerm === '' ||
        item.pomCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ((item as any).comments && (item as any).comments.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesSearch;
    });
  }, [constructions, searchTerm]);

  // Pagination
  const paginatedConstructions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredConstructions.slice(start, end);
  }, [filteredConstructions, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredConstructions.length / itemsPerPage);

  // Validate all constructions (for save TechPack) - ID-based
  const validateAllConstructions = useCallback((): { isValid: boolean; errors: Array<{ id: string; item: Construction; errors: Record<string, string> }> } => {
    const errors: Array<{ id: string; item: Construction; errors: Record<string, string> }> = [];
    
    constructions.forEach((item) => {
      const validation = validateConstructionItem(item, measurements);
      if (!validation.isValid) {
        errors.push({ id: item.id, item, errors: validation.errors });
      }
    });
    
    // Update validation errors state for highlighting - ID-based
    const errorMap: Record<string, Record<string, string>> = {};
    errors.forEach(({ id, errors: itemErrors }) => {
      errorMap[id] = itemErrors;
    });
    setValidationErrors(errorMap);
    
    return { isValid: errors.length === 0, errors };
  }, [constructions, measurements]);

  // Expose validate function via ref (for parent component)
  useImperativeHandle(ref, () => ({
    validateAll: validateAllConstructions
  }), [validateAllConstructions]);

  const handleInputChange = useCallback((field: keyof Construction) => (value: string | string[] | number) => {
    let nextValue: any = value;
    if (typeof value === 'number') {
      nextValue = value.toString();
    }

    if (field === 'pomCode') {
      const pomName = measurementNameMap.get(String(value)) || '';
      const updatedFormData = {
        ...formData,
        pomCode: String(value),
        pomName,
        stepNumber: formData.stepNumber ?? constructions.length + 1,
      };
      setFormData(updatedFormData);
      validation.validateField(field, value);
      return;
    }

    const updatedFormData = { ...formData, [field]: nextValue };
    setFormData(updatedFormData);
    validation.validateField(field, value);
  }, [formData, validation, measurementNameMap, constructions.length]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Invalid file type. Please upload JPEG, PNG, GIF, or SVG image.');
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setUploadError('File size exceeds 5MB limit. Please upload a smaller image.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    // Preview image locally first
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);

    // Upload to server
    const formDataObj = new FormData();
    formDataObj.append('constructionImage', file);

    try {
      const response = await api.post('/techpacks/upload-construction-image', formDataObj, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const imageUrl = response.data.data.url;
        const fullImageUrl = getImageUrl(imageUrl);
        setFormData(prev => ({ ...prev, imageUrl: fullImageUrl }));
        setImagePreview(fullImageUrl);
        validation.validateField('imageUrl', fullImageUrl);
        setUploadError(null);
        showSuccess('Image uploaded successfully');
      } else {
        setUploadError(response.data.message || 'Failed to upload image.');
        setImagePreview(null);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred.';
      setUploadError(errorMessage);
      setImagePreview(null);
      showError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    // Create a minimal synthetic event matching the shape expected by handleImageUpload
    const syntheticEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
    await handleImageUpload(syntheticEvent);
  };

  const handleSubmit = (saveAsRequested: boolean = false) => {
    // Validate the entire form before submission
    const validationResult = validation.validateForm(formData);
    const itemValidation = validateConstructionItem(formData, measurements);

    if (!validationResult.isValid || !itemValidation.isValid) {
      // Mark all fields as touched to show validation errors
      Object.keys(howToMeasureValidationSchema).forEach(field => {
        validation.setFieldTouched(field, true);
      });
      
      // Focus on first error field
      setTimeout(() => {
        const firstErrorField = document.querySelector('[data-error="true"]') as HTMLElement;
        if (firstErrorField) {
          firstErrorField.focus();
          firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      
      return;
    }

    // Validate status transitions
    // Approval disabled

    const status = saveAsRequested ? 'Requested' : ((formData as any).status || 'Draft');
    const comments = (formData as any).comments || '';
    const videoUrl = formData.videoUrl || '';

    const pomName = formData.pomName || measurementNameMap.get(formData.pomCode || '') || '';
    const stepNumber = typeof formData.stepNumber === 'number'
      ? formData.stepNumber
      : Number((formData as any).stepNumber) || constructions.length + 1;
 
    // Encode metadata into videoUrl field
    const encodedVideoUrl = encodeMetadata(videoUrl, status, comments);
 
    const construction: HowToMeasure = {
      id: editingId || generateUUID(),
      pomCode: formData.pomCode!,
      description: formData.description!,
      imageUrl: formData.imageUrl || '',
      steps: formData.steps || [],
      videoUrl: encodedVideoUrl,
      language: formData.language || 'en-US',
      pomName,
      stepNumber,
      instructions: formData.steps || [],
      tips: formData.tips || [],
      commonMistakes: formData.commonMistakes || [],
      relatedMeasurements: formData.relatedMeasurements || [],
      note: formData.note || '',
    };

    if (editingId) {
      // Check if item is approved
      // Approved lock removed
      
      updateHowToMeasureById(editingId, construction);
      showSuccess('Construction updated successfully');
    } else {
      addHowToMeasure(construction);
      showSuccess('Construction added successfully');
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      pomCode: '',
      pomName: '',
      description: '',
      imageUrl: '',
      steps: [],
      videoUrl: '',
      language: 'en-US',
      status: 'Draft' as ConstructionStatus,
      comments: '',
      note: '',
      stepNumber: constructions.length + 1,
      tips: [],
      commonMistakes: [],
      relatedMeasurements: [],
    });
    setShowModal(false);
    setEditingId(null);
    setImagePreview(null);
    validation.reset();
    setValidationErrors({});
  };

  const handleEdit = (item: Construction) => {
    // Check if item is approved
    // Approved lock removed
    
    // Decode metadata when editing
    const decoded = decodeMetadata(item.videoUrl || '');
    const formDataWithMetadata = {
      ...item,
      steps: item.steps && item.steps.length > 0 ? item.steps : (item.instructions || []),
      videoUrl: decoded.videoUrl,
      status: decoded.status || (item as any).status || 'Draft' as ConstructionStatus,
      comments: decoded.comments || (item as any).comments || '',
      note: (item as any).note || '',
      pomName: item.pomName || measurementNameMap.get(item.pomCode) || '',
      stepNumber: item.stepNumber || constructions.length + 1,
      tips: item.tips || [],
      commonMistakes: item.commonMistakes || [],
      relatedMeasurements: item.relatedMeasurements || [],
    };
    
    setFormData(formDataWithMetadata);
    setEditingId(item.id);
    setImagePreview(item.imageUrl ? getImageUrl(item.imageUrl) : null);
    setShowModal(true);
  };

  const handleDelete = (item: Construction) => {
    const index = constructions.findIndex(c => c.id === item.id);
    if (index === -1) return;

    if (window.confirm(`Are you sure you want to delete construction for "${item.pomCode}"?`)) {
      // Clear previous undo timeout if exists
      if (deletedItem?.timeoutId) {
        clearTimeout(deletedItem.timeoutId);
      }

      deleteHowToMeasureById(item.id);
      
      // Set up undo with timeout
      const timeoutId = setTimeout(() => {
        setDeletedItem(null);
      }, 5000);

      const deletedItemData = { item, index, timeoutId };
      setDeletedItem(deletedItemData);
      
      // Show undo toast
      showUndoToast(
        `Construction "${item.pomCode}" deleted`,
        () => {
          // Restore item at original index using context method
          if (deletedItemData && insertHowToMeasureAt) {
            insertHowToMeasureAt(deletedItemData.index, deletedItemData.item);
            if (deletedItemData.timeoutId) {
              clearTimeout(deletedItemData.timeoutId);
            }
            setDeletedItem(null);
            showSuccess('Construction restored');
          }
        },
        5000
      );
    }
  };

  const handleDuplicate = (item: Construction) => {
    const decoded = decodeMetadata(item.videoUrl || '');
    const duplicated: Partial<Construction> = {
      ...item,
      id: undefined,
      videoUrl: decoded.videoUrl,
      status: 'Draft' as ConstructionStatus,
      comments: decoded.comments || '',
      pomName: item.pomName || measurementNameMap.get(item.pomCode) || '',
      stepNumber: constructions.length + 1,
      tips: item.tips || [],
      commonMistakes: item.commonMistakes || [],
      relatedMeasurements: item.relatedMeasurements || [],
    };
    setFormData(duplicated);
    setEditingId(null);
    setImagePreview(duplicated.imageUrl ? getImageUrl(duplicated.imageUrl) : null);
    setShowModal(true);
    showSuccess('Duplicated construction. Please edit and save.');
  };

  const handleExport = () => {
    if (constructions.length === 0) {
      showWarning('No constructions to export');
      return;
    }
    
    const csvContent = exportToCSV(constructions);
    downloadCSV(csvContent, `constructions_export_${new Date().toISOString().split('T')[0]}.csv`);
    showSuccess('Constructions exported successfully');
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      
      if (rows.length === 0) {
        showError('No data found in CSV file');
        return;
      }
      
      // Extract headers from first row
      const headers = Object.keys(rows[0] || {});
      setCsvHeaders(headers);
      setRawCsvData(rows);
      
      // Auto-detect column mapping
      const autoMapping: Record<string, keyof Construction | ''> = {};
      const constructionFields: (keyof Construction)[] = ['pomCode', 'description', 'steps', 'imageUrl', 'videoUrl', 'language', 'status', 'comments'];
      
      headers.forEach(header => {
        const lowerHeader = header.toLowerCase().trim();
        if (lowerHeader.includes('pom') && lowerHeader.includes('code')) autoMapping[header] = 'pomCode';
        else if (lowerHeader.includes('description')) autoMapping[header] = 'description';
        else if (lowerHeader.includes('step')) autoMapping[header] = 'steps';
        else if (lowerHeader.includes('image')) autoMapping[header] = 'imageUrl';
        else if (lowerHeader.includes('video')) autoMapping[header] = 'videoUrl';
        else if (lowerHeader.includes('language')) autoMapping[header] = 'language';
        else if (lowerHeader.includes('status')) autoMapping[header] = 'status';
        else if (lowerHeader.includes('comment')) autoMapping[header] = 'comments';
        else autoMapping[header] = '';
      });
      
      setColumnMapping(autoMapping);
      
      // Show mapping modal first
      setShowMappingModal(true);
    };
    reader.readAsText(file);
  };

  const handleConfirmMapping = () => {
    // Map CSV columns to Construction fields using user mapping
    const mappedRows = rawCsvData.map((row, idx) => {
      const item: Partial<Construction> = {};
      
      Object.entries(columnMapping).forEach(([csvColumn, constructionField]) => {
        if (constructionField && constructionField !== '') {
          const value = row[csvColumn];
          if (constructionField === 'steps') {
            item[constructionField] = value ? value.split(';').map(s => s.trim()) : [];
          } else {
            (item as any)[constructionField] = value || '';
          }
        }
      });
      
      return { item, rowIndex: idx + 2 }; // +2 because CSV has header and 1-based index
    });
    
    // Validate each row
    const errors: Array<{ row: number; errors: Record<string, string> }> = [];
    mappedRows.forEach(({ item, rowIndex }) => {
      const validation = validateConstructionItem(item, measurements);
      if (!validation.isValid) {
        errors.push({ row: rowIndex, errors: validation.errors });
      }
    });
    
    setImportErrors(errors);
    setImportPreview(mappedRows.map(m => m.item));
    setShowMappingModal(false);
    setShowImportModal(true);
  };

  const handleConfirmImport = () => {
    if (importPreview.length === 0) return;
    
    let successCount = 0;
    let errorCount = 0;
    
    importPreview.forEach((item, idx) => {
      const validation = validateConstructionItem(item, measurements);
      if (validation.isValid) {
        const status = ((item as any).status || 'Draft') as ConstructionStatus;
        const comments = (item as any).comments || '';
        const videoUrl = item.videoUrl || '';
        const encodedVideoUrl = encodeMetadata(videoUrl, status, comments);
        
        const construction: HowToMeasure = {
          id: generateUUID(),
          pomCode: item.pomCode!,
          description: item.description!,
          imageUrl: item.imageUrl || '',
          steps: item.steps || [],
          videoUrl: encodedVideoUrl,
          language: (item.language || 'en-US') as any
        };
        addHowToMeasure(construction);
        successCount++;
      } else {
        errorCount++;
      }
    });
    
    if (errorCount > 0) {
      showWarning(`${successCount} items imported, ${errorCount} items skipped due to errors`);
    } else {
      showSuccess(`${successCount} items imported successfully`);
    }
    
    setShowImportModal(false);
    setImportPreview([]);
    setImportErrors([]);
  };

  const handleRequestApproval = (item: Construction) => {
    if ((item as any).status === 'Approved') {
      showError('Item is already approved');
      return;
    }
    
    const decoded = decodeMetadata(item.videoUrl || '');
    const updated: HowToMeasure = {
      ...item,
      videoUrl: encodeMetadata(decoded.videoUrl, 'Requested', decoded.comments || (item as any).comments || '')
    };
    updateHowToMeasureById(item.id, updated);
    showSuccess('Approval requested successfully');
  };

  const handleApprove = (item: Construction) => {
    const decoded = decodeMetadata(item.videoUrl || '');
    const updated: HowToMeasure = {
      ...item,
      videoUrl: encodeMetadata(decoded.videoUrl, 'Approved', decoded.comments || (item as any).comments || '')
    };
    updateHowToMeasureById(item.id, updated);
    showSuccess('Construction approved');
  };

  const handleRequestChanges = (item: Construction) => {
    const decoded = decodeMetadata(item.videoUrl || '');
    const updated: HowToMeasure = {
      ...item,
      videoUrl: encodeMetadata(decoded.videoUrl, 'Draft', decoded.comments || (item as any).comments || '')
    };
    updateHowToMeasureById(item.id, updated);
    showSuccess('Changes requested');
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Construction</h1>
            <p className="text-sm text-gray-600 mt-1">
              Construction instructions and details
            </p>
          </div>
          
          {/* Summary Stats */}
          <div className="flex items-center space-x-6 text-sm"></div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search constructions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Filter */}
            {/* Status filter removed */}
          </div>

          <div className="flex items-center space-x-3">
            {/* Import/Export */}
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImport(file);
                  e.target.value = '';
                }}
                className="hidden"
                id="construction-import-input"
              />
              <label
                htmlFor="construction-import-input"
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import
              </label>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>

            {/* Add Button */}
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Construction
            </button>
          </div>
        </div>
      </div>

      {/* Validation Errors Banner */}
      {Object.keys(validationErrors).length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-sm text-red-800">
              Có {Object.keys(validationErrors).length} construction(s) có lỗi validation. Vui lòng kiểm tra và sửa trước khi lưu.
            </span>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={resetForm}
        title={editingId ? 'Edit Construction' : 'Detail Construction'}
        size="lg"
        footer={
          <>
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSubmit(false)}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-600 border border-transparent rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Save Draft
            </button>
            {/* Approval button removed */}
          </>
        }
      >
        <div className="space-y-6">
          {/* Image Upload */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Illustration Image
            </label>
            <div
              className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
                imagePreview
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="space-y-2 text-center w-full">
                {imagePreview ? (
                  <>
                    <div className="relative inline-block">
                      <ZoomableImage
                        src={imagePreview}
                        alt="Preview"
                        containerClassName="max-w-full h-auto max-h-48 rounded-lg shadow-sm border border-gray-200 bg-white"
                        className="max-h-48"
                        fallback={
                          <div className="flex flex-col items-center justify-center text-gray-400 py-12">
                            <Upload className="w-10 h-10 mb-2" />
                            <p className="text-sm">Không thể hiển thị ảnh</p>
                          </div>
                        }
                      />
                      <button
                        onClick={() => {
                          setImagePreview(null);
                          setFormData(prev => ({ ...prev, imageUrl: '' }));
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-green-600 flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Image uploaded successfully
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600 justify-center">
                      <label
                        htmlFor={`construction-image-upload-${editingId || 'new'}`}
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500"
                      >
                        <span>Upload an image</span>
                        <input
                          id={`construction-image-upload-${editingId || 'new'}`}
                          type="file"
                          className="sr-only"
                          accept="image/jpeg,image/jpg,image/png,image/gif,image/svg+xml"
                          onChange={handleImageUpload}
                          disabled={uploading}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF, SVG up to 5MB</p>
                  </>
                )}
                {uploading && (
                  <div className="flex items-center justify-center text-xs text-blue-600">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                    Uploading...
                  </div>
                )}
                {uploadError && (
                  <p className="text-xs text-red-600 flex items-center justify-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {uploadError}
                  </p>
                )}
              </div>
            </div>
            {validation.getFieldProps('imageUrl').error && (
              <p className="mt-1 text-xs text-red-600">{validation.getFieldProps('imageUrl').error}</p>
            )}
          </div>

          <Textarea
            label="Note"
            value={(formData as any).note || ''}
            onChange={handleInputChange('note')}
            placeholder="Ghi chú thêm..."
            rows={2}
          />
        </div>
      </Modal>

      {/* Constructions List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Constructions List</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Note</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedConstructions.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-sm text-gray-500">
                    No constructions added yet. Click 'Add Construction' to get started.
                  </td>
                </tr>
              ) : (
                paginatedConstructions.map((item) => {
                  const hasErrors = validationErrors[item.id] && Object.keys(validationErrors[item.id]).length > 0;
                  const errors = validationErrors[item.id] || {};
                  const isApproved = false;
                  
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-gray-50 ${hasErrors ? 'bg-red-50 border-l-4 border-red-500' : ''}`}
                    >
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div className="w-32 h-32 border border-gray-200 rounded-md bg-gray-50 flex items-center justify-center overflow-hidden">
                          <ZoomableImage
                            src={getImageUrl(item.imageUrl || '')}
                            alt={item.pomCode ? `Construction ${item.pomCode}` : 'Construction image'}
                            containerClassName="w-full h-full flex items-center justify-center"
                            className="object-contain"
                            fallback={
                              <span className="text-xs text-gray-400 px-2 text-center leading-tight">
                                No image
                              </span>
                            }
                          />
                        </div>
                        {hasErrors && errors.imageUrl && (
                          <div className="mt-1 text-xs text-red-600">{errors.imageUrl}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {(item as any).note ? (
                          <p className="whitespace-pre-wrap">{(item as any).note}</p>
                        ) : (
                          <span className="text-gray-400 italic">Chưa có ghi chú</span>
                        )}
                        {hasErrors && errors.comments && (
                          <div className="mt-1 text-xs text-red-600">{errors.comments}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(item)}
                            className="text-purple-600 hover:text-purple-900"
                            title="Duplicate"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredConstructions.length)} of {filteredConstructions.length} items
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Column Mapping Modal */}
      <Modal
        isOpen={showMappingModal}
        onClose={() => {
          setShowMappingModal(false);
          setRawCsvData([]);
          setCsvHeaders([]);
          setColumnMapping({});
        }}
        title="Map CSV Columns to Construction Fields"
        size="lg"
        footer={
          <>
            <button
              onClick={() => {
                setShowMappingModal(false);
                setRawCsvData([]);
                setCsvHeaders([]);
                setColumnMapping({});
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmMapping}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              Continue to Preview
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Map each CSV column to a Construction field. Leave unmapped if not needed.
          </p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {csvHeaders.map(header => (
              <div key={header} className="flex items-center space-x-4 p-2 hover:bg-gray-50 rounded">
                <div className="w-1/3 text-sm font-medium text-gray-700">{header}</div>
                <div className="w-2/3">
                  <select
                    value={columnMapping[header] || ''}
                    onChange={(e) => {
                      setColumnMapping(prev => ({
                        ...prev,
                        [header]: e.target.value as keyof Construction | ''
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">-- Not mapped --</option>
                    <option value="pomCode">POM Code</option>
                    <option value="description">Description</option>
                    <option value="steps">Steps</option>
                    <option value="imageUrl">Image URL</option>
                    <option value="videoUrl">Video URL</option>
                    <option value="language">Language</option>
                    {/* Status mapping removed */}
                    <option value="comments">Comments</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Import Preview Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setImportPreview([]);
          setImportErrors([]);
        }}
        title="Import Preview"
        size="xl"
        footer={
          <>
            {importErrors.length > 0 && (
              <button
                onClick={() => {
                  // Export errors to CSV
                  const errorRows = importErrors.map(({ row, errors }) => ({
                    Row: row,
                    Errors: Object.entries(errors).map(([field, msg]) => `${field}: ${msg}`).join('; ')
                  }));
                  const errorCsv = [
                    'Row,Errors',
                    ...errorRows.map(r => `"${r.Row}","${r.Errors.replace(/"/g, '""')}"`)
                  ].join('\n');
                  downloadCSV(errorCsv, `import_errors_${new Date().toISOString().split('T')[0]}.csv`);
                  showSuccess('Error report downloaded');
                }}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100"
              >
                <Download className="w-4 h-4 mr-2 inline" />
                Download Errors
              </button>
            )}
            <button
              onClick={() => {
                setShowImportModal(false);
                setImportPreview([]);
                setImportErrors([]);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmImport}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              Import {importPreview.length - importErrors.length} Valid Items
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {importErrors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <h4 className="text-sm font-medium text-red-800 mb-2">
                {importErrors.length} row(s) have errors:
              </h4>
              <div className="max-h-40 overflow-y-auto">
                <ul className="text-sm text-red-700 space-y-1">
                  {importErrors.map(({ row, errors }) => (
                    <li key={row} className="flex items-start">
                      <span className="font-medium mr-2">Row {row}:</span>
                      <div className="flex-1">
                        {Object.entries(errors).map(([field, msg]) => (
                          <div key={field} className="text-xs">
                            <strong>{field}:</strong> {msg}
                          </div>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          <div className="max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Row</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">POM Code</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Steps</th>
                  {/* Status column removed */}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {importPreview.map((item, idx) => {
                  const rowErrors = importErrors.find(e => e.row === idx + 2);
                  const isValid = !rowErrors;
                  return (
                    <tr key={idx} className={isValid ? '' : 'bg-red-50'}>
                      <td className="px-4 py-2 text-sm">{idx + 2}</td>
                      <td className="px-4 py-2 text-sm">{item.pomCode || '-'}</td>
                      <td className="px-4 py-2 text-sm">{item.description || '-'}</td>
                      <td className="px-4 py-2 text-sm">{(item.steps || []).length} step(s)</td>
                      <td className="px-4 py-2 text-sm">
                        {isValid ? (
                          <span className="text-green-600">✓ Valid</span>
                        ) : (
                          <span className="text-red-600" title={Object.values(rowErrors.errors).join(', ')}>✗ Error</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
});

ConstructionTabComponent.displayName = 'ConstructionTab';

export const ConstructionTab = React.memo(ConstructionTabComponent);
export default ConstructionTab;

