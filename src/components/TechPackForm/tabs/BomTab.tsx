import React, { useState, useMemo, useCallback, memo, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useTechPack } from '../../../contexts/TechPackContext';
import { BomItem, Colorway, ColorwayPart, UNITS_OF_MEASURE, COMMON_MATERIALS, TechPackRole } from '../../../types/techpack';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { bomItemValidationSchema } from '../../../utils/validationSchemas';
import { useDebounce } from '../../../hooks/useDebounce';
import { useAuth } from '../../../contexts/AuthContext';
import DataTable from '../shared/DataTable';
import Input from '../shared/Input';
import Select from '../shared/Select';
import Textarea from '../shared/Textarea';
import Modal from '../shared/Modal';
import ZoomableImage from '../../common/ZoomableImage';
import { Plus, Upload, Download, Search, Filter, Package, AlertCircle, X, Copy, RotateCcw, Edit, ChevronLeft, ChevronRight, CheckSquare, Square } from 'lucide-react';
import { showSuccess, showError, showWarning, showUndoToast } from '../../../lib/toast';
import { api } from '../../../lib/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1';
const API_UPLOAD_BASE = API_BASE_URL.replace(/\/api\/v1$/, '');

// Generate UUID v4
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const getMaterialImageUrl = (url?: string | null): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:image/')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return `${API_UPLOAD_BASE}${trimmed}`;
  }
  return `${API_UPLOAD_BASE}/${trimmed.replace(/^\/+/, '')}`;
};

const validateMaterialImageFile = (file: File): string | null => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml'];
  if (!allowedTypes.includes(file.type)) {
    return 'Chỉ hỗ trợ ảnh JPEG, PNG, GIF hoặc SVG.';
  }
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return 'Dung lượng ảnh tối đa 5MB.';
  }
  return null;
};

// CSV Import/Export utilities
const getCSVHeaders = (includePrice: boolean = false): string[] => {
  const baseHeaders = [
    'Part',
    'MaterialCode',
    'MaterialName',
    'Placement',
    'Size/Width/Usage',
    'Quantity',
    'UOM',
    'Supplier',
    'ColorCode',
    'MaterialComposition',
    'ImageUrl',
    'Comments'
  ];
  if (includePrice) {
    return [...baseHeaders, 'UnitPrice', 'TotalPrice'];
  }
  return baseHeaders;
};

const exportToCSV = (items: BomItem[], includePrice: boolean = false): string => {
  const headers = getCSVHeaders(includePrice);
  const rows = items.map(item => {
    const baseRow = [
      item.part || '',
      item.supplierCode || '',
      item.materialName || '',
      item.placement || '',
      item.size || '',
      item.quantity !== undefined && item.quantity !== null ? item.quantity.toString() : '',
      item.uom || '',
      item.supplier || '',
      item.colorCode || '',
      item.materialComposition || '',
      item.imageUrl || '',
      item.comments || ''
    ];
    if (includePrice) {
      const totalPrice = item.totalPrice ?? (item.quantity && item.unitPrice ? item.quantity * item.unitPrice : undefined);
      baseRow.push(
        item.unitPrice?.toString() || '',
        totalPrice?.toString() || ''
      );
    }
    return baseRow;
  });
  
  const csvContent = [
    headers.join(','),
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

// Validate BOM item
const validateBomItem = (item: Partial<BomItem>, index?: number): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Validate using schema
  Object.keys(bomItemValidationSchema).forEach(field => {

    if (field==='size') return;

    const rule = bomItemValidationSchema[field as keyof typeof bomItemValidationSchema];
    const value = item[field as keyof BomItem];
    
    if (rule.required && (!value || (typeof value === 'string' && value.trim().length === 0))) {
      errors[field] = rule.custom ? rule.custom(value as any, item) || `${field} is required` : `${field} is required`;
    } else if (rule.custom) {
      const error = rule.custom(value as any, item);
      if (error) errors[field] = error;
    } else if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
      errors[field] = `${field} must be at least ${rule.minLength} characters`;
    } else if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
      errors[field] = `${field} must not exceed ${rule.maxLength} characters`;
    } else if (rule.min !== undefined && typeof value === 'number' && value < rule.min) {
      errors[field] = `${field} must be at least ${rule.min}`;
    } else if (rule.max !== undefined && typeof value === 'number' && value > rule.max) {
      errors[field] = `${field} must not exceed ${rule.max}`;
    }
  });
  
  return { isValid: Object.keys(errors).length === 0, errors };
};

export interface BomTabRef {
  validateAll: () => { isValid: boolean; errors: Array<{ id: string; item: BomItem; errors: Record<string, string> }> };
}

interface ColumnMapping {
  csvColumn: string;
  bomField: keyof BomItem | '';
}

type ColumnType = {
  key: keyof BomItem | string;
  header: string;
  width?: string;
  render?: (value: any, item: BomItem, index: number) => React.ReactNode;
  sortable?: boolean;
};

const BomTabComponent = forwardRef<BomTabRef>((props, ref) => {
  const context = useTechPack();
  const {
    state,
    addBomItem,
    updateBomItem,
    updateBomItemById,
    deleteBomItem,
    deleteBomItemById,
    insertBomItemAt,
    updateFormState,
    assignColorwayToBomItem,
    removeColorwayAssignment
  } = context ?? {};
  const techpack = state?.techpack;
  const bom = techpack?.bom ?? [];
  const colorways = techpack?.colorways ?? [];
  const { user } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterByPart, setFilterByPart] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<Array<{ row: number; column?: string; errors: Record<string, string> }>>([]);
  const [rawCsvData, setRawCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, keyof BomItem | ''>>({});
  const [deletedItem, setDeletedItem] = useState<{ item: BomItem; index: number; timeoutId?: NodeJS.Timeout } | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, Record<string, string>>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [visibleColorwayIds, setVisibleColorwayIds] = useState<string[]>(() =>
    colorways.map(colorway => colorway.id).filter((id): id is string => Boolean(id))
  );
  const [colorAssignmentModal, setColorAssignmentModal] = useState<{
    colorway: Colorway;
    bomItem: BomItem;
    bomItemId: string;
  } | null>(null);
  const [assignmentMode, setAssignmentMode] = useState<'existing' | 'new'>('existing');
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  // Multi-select state for bulk actions
  const [selectedBomIds, setSelectedBomIds] = useState<Set<string>>(new Set());
  
  const [newAssignmentForm, setNewAssignmentForm] = useState<{
    colorName: string;
    hexCode: string;
    pantoneCode: string;
    colorType: ColorwayPart['colorType'];
  }>({
    colorName: '',
    hexCode: '#000000',
    pantoneCode: '',
    colorType: 'Solid',
  });
  const colorTypeOptions = [
    { value: 'Solid', label: 'Solid' },
    { value: 'Print', label: 'Print' },
    { value: 'Embroidery', label: 'Embroidery' },
    { value: 'Applique', label: 'Applique' },
  ];

  const resolveBomItemIdentifiers = useCallback((item: BomItem): string[] => {
    const ids: string[] = [];
    if ((item as any)?.id) ids.push(String((item as any).id));
    if ((item as any)?._id) ids.push(String((item as any)._id));
    return ids;
  }, []);

  const findAssignmentForBom = useCallback((colorway: Colorway, item: BomItem): ColorwayPart | undefined => {
    if (!colorway?.parts || colorway.parts.length === 0) return undefined;
    const candidateIds = resolveBomItemIdentifiers(item);
    const byId = colorway.parts.find(part => part.bomItemId && candidateIds.includes(part.bomItemId));
    if (byId) return byId;
    const normalizedPart = (item.part || '').trim().toLowerCase();
    if (!normalizedPart) return undefined;
    return colorway.parts.find(part => (part.partName || '').trim().toLowerCase() === normalizedPart);
  }, [resolveBomItemIdentifiers]);

  useEffect(() => {
    if (!colorways.length) {
      setVisibleColorwayIds([]);
      return;
    }
    setVisibleColorwayIds(prev => {
      if (!prev.length) {
        return colorways.map(colorway => colorway.id).filter((id): id is string => Boolean(id));
      }
      const currentSet = new Set(prev);
      const next = colorways
        .map(colorway => colorway.id)
        .filter((id): id is string => Boolean(id))
        .filter(id => currentSet.has(id));
      return next.length
        ? next
        : colorways.map(colorway => colorway.id).filter((id): id is string => Boolean(id));
    });
  }, [colorways]);

  useEffect(() => {
    if (!colorAssignmentModal) return;
    const assignment = findAssignmentForBom(colorAssignmentModal.colorway, colorAssignmentModal.bomItem);
    const hasExistingParts = (colorAssignmentModal.colorway.parts || []).length > 0;
    if (assignment) {
      setAssignmentMode('existing');
      setSelectedPartId(assignment.id);
    } else if (hasExistingParts) {
      setAssignmentMode('existing');
      setSelectedPartId(colorAssignmentModal.colorway.parts?.[0]?.id || '');
    } else {
      setAssignmentMode('new');
      setSelectedPartId('');
    }
    setNewAssignmentForm({
      colorName: assignment?.colorName || colorAssignmentModal.bomItem.materialName || colorAssignmentModal.bomItem.part || '',
      hexCode: assignment?.hexCode || colorAssignmentModal.colorway.hexColor || '#000000',
      pantoneCode: assignment?.pantoneCode || colorAssignmentModal.colorway.pantoneCode || '',
      colorType: assignment?.colorType || 'Solid',
    });
  }, [colorAssignmentModal, findAssignmentForBom]);
  
  const firstErrorFieldRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Initialize validation for the form
  const validation = useFormValidation(bomItemValidationSchema);
  
  const [formData, setFormData] = useState<Partial<BomItem>>({
    part: '',
    materialName: '',
    placement: '',
    size: '',
    quantity: undefined,
    uom: 'm',
    supplier: '',
    comments: '',
    materialComposition: '',
    colorCode: '',
    supplierCode: '',
    unitPrice: undefined,
    totalPrice: undefined,
    imageUrl: '',
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (formData.imageUrl) {
      setImagePreview(getMaterialImageUrl(formData.imageUrl));
    } else {
      setImagePreview(null);
    }
  }, [formData.imageUrl]);

  // Filter and search BOM items
  const filteredBom = useMemo(() => {
    return bom.filter(item => {
      const matchesSearch = debouncedSearchTerm === '' ||
        item.part.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        item.materialName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        item.supplier.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (item.supplierCode && item.supplierCode.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));

      const matchesFilter = filterByPart === '' || item.part === filterByPart;

      return matchesSearch && matchesFilter;
    });
  }, [bom, debouncedSearchTerm, filterByPart]);

  const toggleColorwayVisibility = useCallback((colorwayId: string) => {
    setVisibleColorwayIds(prev => {
      if (prev.includes(colorwayId)) {
        return prev.filter(id => id !== colorwayId);
      }
      return [...prev, colorwayId];
    });
  }, []);

  const openColorAssignment = useCallback((colorway: Colorway, item: BomItem) => {
    const bomId = (item as any)?.id || (item as any)?._id;
    if (!bomId) {
      showWarning('Please save this BOM item before assigning colors.');
      return;
    }
    setColorAssignmentModal({ colorway, bomItem: item, bomItemId: String(bomId) });
  }, []);

  const renderColorwayCell = useCallback((colorway: Colorway, item: BomItem) => {
    const assignment = findAssignmentForBom(colorway, item);
    const swatchColor = assignment?.hexCode || colorway.hexColor || '#f3f4f6';
    return (
      <button
        type="button"
        onClick={() => openColorAssignment(colorway, item)}
        className={`w-full text-left px-3 py-2 rounded-lg border transition ${
          assignment ? 'border-gray-200 hover:border-blue-400' : 'border-dashed border-gray-300 text-gray-400 hover:text-blue-600'
        }`}
      >
        {assignment ? (
          <>
            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 rounded border border-gray-200" style={{ backgroundColor: swatchColor }} />
              <span className="text-sm font-medium text-gray-900 truncate">{assignment.colorName || 'Unnamed'}</span>
            </div>
            <div className="text-xs text-gray-500 flex items-center justify-between mt-1">
              <span>{assignment.pantoneCode || 'No Pantone'}</span>
              <span>{assignment.colorType || 'Solid'}</span>
            </div>
          </>
        ) : (
          <div className="text-xs font-medium">Assign color</div>
        )}
      </button>
    );
  }, [findAssignmentForBom, openColorAssignment]);

  const activeAssignment = colorAssignmentModal
    ? findAssignmentForBom(colorAssignmentModal.colorway, colorAssignmentModal.bomItem)
    : undefined;

  const countColorwayAssignments = useCallback((item: BomItem) => {
    if (!colorways.length) return 0;
    const ids = resolveBomItemIdentifiers(item);
    let count = 0;
    colorways.forEach(colorway => {
      if (colorway.parts?.some(part => part.bomItemId && ids.includes(part.bomItemId))) {
        count += 1;
      }
    });
    return count;
  }, [colorways, resolveBomItemIdentifiers]);

  // Get unique parts for filter
  const uniqueParts = useMemo(() => {
    return Array.from(new Set(bom.map(item => item.part))).sort();
  }, [bom]);

  // Calculate totals with per-unit breakdown
  const totals = useMemo(() => {
    const totalItems = bom.length;
    const uniqueSuppliers = new Set(bom.map(item => item.supplier)).size;
    return { totalItems, uniqueSuppliers };
  }, [bom]);

  // Check for duplicates
  const checkDuplicates = useCallback((item: Partial<BomItem>, excludeIndex?: number): BomItem[] => {
    return bom.filter((existing, idx) => 
      idx !== excludeIndex &&
      existing.part === item.part &&
      existing.materialName === item.materialName
    );
  }, [bom]);

  const handleInputChange = useCallback((field: keyof BomItem) => (value: string | number) => {
    const updatedFormData = { ...formData, [field]: value };
    
    // Auto-calculate totalPrice when quantity or unitPrice changes
    if (field === 'quantity' || field === 'unitPrice') {
      // Helper to parse value, preserving string if it's a transitional state like "0."
      const parseNumericValue = (val: string | number | undefined | null): number | null | undefined => {
        if (val === undefined || val === null || val === '') return null;
        // If it's already a number, return it
        if (typeof val === 'number') return val;
        // If it's a string ending with dot (transitional state), don't parse yet
        const strVal = String(val);
        if (strVal.endsWith('.') && !strVal.endsWith('..')) {
          return undefined; // Return undefined for transitional states, don't calculate yet
        }
        const parsed = Number(strVal);
        return Number.isNaN(parsed) ? null : parsed;
      };
      
      const quantity = field === 'quantity' 
        ? parseNumericValue(value)
        : parseNumericValue(updatedFormData.quantity);
      const unitPrice = field === 'unitPrice' 
        ? parseNumericValue(value)
        : parseNumericValue(updatedFormData.unitPrice);
      
      // Only calculate if both quantity > 0 and unitPrice are provided and not undefined (undefined means transitional state)
      if (quantity !== null && quantity !== undefined && quantity > 0 && 
          unitPrice !== undefined && unitPrice !== null && unitPrice > 0) {
        updatedFormData.totalPrice = quantity * unitPrice;
      } else {
        updatedFormData.totalPrice = undefined;
      }
    }
    
    setFormData(updatedFormData);

    // Validate the field in real-time (only if value is not a transitional state)
    if (typeof value === 'string' && value.endsWith('.') && !value.endsWith('..')) {
      // Skip validation for transitional states to avoid false errors
    } else {
      validation.validateField(field, value);
    }
  }, [formData, validation]);

  const handleMaterialImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const input = event.target;
      const file = input.files?.[0];
      if (!file) return;

      const validationMessage = validateMaterialImageFile(file);
      if (validationMessage) {
        setImageUploadError(validationMessage);
        input.value = '';
        return;
      }

      setIsUploadingImage(true);
      setImageUploadError(null);

      const formDataObj = new FormData();
      formDataObj.append('bomImage', file);

      try {
        const response = await api.post('/techpacks/upload-bom-image', formDataObj, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const uploadedUrl = response.data?.data?.url || '';
        handleInputChange('imageUrl')(uploadedUrl);
        validation.validateField('imageUrl', uploadedUrl);
        setImagePreview(uploadedUrl ? getMaterialImageUrl(uploadedUrl) : null);
        showSuccess('Tải ảnh vật tư thành công.');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'Không thể tải ảnh vật tư.';
        setImageUploadError(errorMessage);
        showError(errorMessage);
      } finally {
        setIsUploadingImage(false);
        input.value = '';
      }
    },
    [handleInputChange, validation]
  );

  const handleRemoveMaterialImage = useCallback(() => {
    setFormData(prev => ({ ...prev, imageUrl: '' }));
    setImagePreview(null);
    setImageUploadError(null);
    validation.validateField('imageUrl', '');
  }, [validation]);

  const handleSubmit = () => {
    // Validate the entire form before submission
    const validationResult = validation.validateForm(formData);
    const isValid = validationResult.isValid;

    if (!isValid) {
      // Mark all fields as touched to show validation errors
      Object.keys(bomItemValidationSchema).forEach(field => {
        validation.setFieldTouched(field, true);
      });
      
      // Show error message
      showError('Vui lòng điền đầy đủ các trường bắt buộc và sửa các lỗi validation.');
      
      // Focus on first error field
      setTimeout(() => {
        const firstErrorField = formRef.current?.querySelector('[data-error="true"]') as HTMLElement;
        if (firstErrorField) {
          firstErrorField.focus();
          firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      
      return;
    }

    // Check for duplicates
    const duplicates = checkDuplicates(formData, editingIndex ?? undefined);
    if (duplicates.length > 0) {
      const shouldMerge = window.confirm(
        `Found ${duplicates.length} duplicate item(s) with same Part and Material Name. Do you want to merge quantities instead?`
      );
      
      if (shouldMerge) {
        // Merge with first duplicate
        const duplicateIndex = bom.findIndex(item => 
          item.part === formData.part && item.materialName === formData.materialName
        );
        if (duplicateIndex !== -1) {
          const existing = bom[duplicateIndex];
          const existingQty = existing.quantity !== undefined && existing.quantity !== null ? existing.quantity : 0;
          const formQty = formData.quantity !== undefined && formData.quantity !== null && formData.quantity !== '' 
            ? Number(formData.quantity) 
            : 0;
          const mergedItem: BomItem = {
            ...existing,
            quantity: existingQty + formQty,
          };
          updateBomItem(duplicateIndex, mergedItem);
          showSuccess('Quantities merged successfully');
          resetForm();
          return;
        }
      }
    }

    // Calculate totalPrice if quantity and unitPrice are provided
    const quantity = formData.quantity !== undefined && formData.quantity !== null && formData.quantity !== '' 
      ? Number(formData.quantity) 
      : null;
    const hasUnitPrice = formData.unitPrice !== undefined && formData.unitPrice !== null && formData.unitPrice !== '';
    const unitPrice = hasUnitPrice ? Number(formData.unitPrice) : undefined;
    // Only calculate totalPrice if both quantity > 0 and unitPrice are provided
    const totalPrice = quantity !== null && quantity > 0 && unitPrice !== undefined ? quantity * unitPrice : undefined;
    
    const normalizedImageUrl = formData.imageUrl?.trim();
    const bomItem: BomItem = {
      id: editingIndex !== null ? bom[editingIndex].id : generateUUID(),
      part: formData.part!,
      materialName: formData.materialName!,
      placement: formData.placement || '',
      size: formData.size || '',
      quantity: quantity,
      uom: formData.uom as any || 'm',
      supplier: formData.supplier || '',
      comments: formData.comments || '',
      materialComposition: formData.materialComposition || '',
      colorCode: formData.colorCode || '',
      supplierCode: formData.supplierCode || '',
      imageUrl: normalizedImageUrl ? normalizedImageUrl : undefined,
      unitPrice: unitPrice,
      totalPrice: totalPrice,
    };

    if (editingId) {
      // Use ID-based update for better reliability
      updateBomItemById(editingId, bomItem);
      showSuccess('Material updated successfully');
    } else if (editingIndex !== null) {
      // Fallback to index-based for backward compatibility
      updateBomItem(editingIndex, bomItem);
      showSuccess('Material updated successfully');
    } else {
      addBomItem(bomItem);
      showSuccess('Material added successfully');
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      part: '',
      materialName: '',
      placement: '',
      size: '',
      quantity: undefined,
      uom: 'm',
      unitPrice: undefined,
      totalPrice: undefined,
      supplier: '',
      comments: '',
      materialComposition: '',
      colorCode: '',
      supplierCode: '',
      imageUrl: '',
    });
    setImagePreview(null);
    setImageUploadError(null);
    setIsUploadingImage(false);
    setShowModal(false);
    setEditingIndex(null);
    setEditingId(null);
    validation.reset();
    setValidationErrors({});
  };

  const handleEdit = (item: BomItem, index: number) => {
    setFormData({ ...item, imageUrl: item.imageUrl || '' });
    setImagePreview(item.imageUrl ? getMaterialImageUrl(item.imageUrl) : null);
    setImageUploadError(null);
    setEditingIndex(index);
    setEditingId(item.id);
    setShowModal(true);
  };

  // Multi-select handlers
  const toggleBomSelection = (itemId: string) => {
    setSelectedBomIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const toggleSelectAllBom = () => {
    if (selectedBomIds.size === filteredBom.length) {
      setSelectedBomIds(new Set());
    } else {
      setSelectedBomIds(new Set(filteredBom.map(item => item.id).filter((id): id is string => Boolean(id))));
    }
  };

  const clearBomSelection = () => {
    setSelectedBomIds(new Set());
  };

  // Bulk duplicate BOM items
  const handleBulkDuplicateBom = () => {
    if (selectedBomIds.size === 0) return;
    
    const selectedItems = filteredBom.filter(item => item.id && selectedBomIds.has(item.id));
    if (selectedItems.length === 0) return;

    const duplicatedItems: BomItem[] = [];
    selectedItems.forEach((item, idx) => {
      const originalIndex = bom.findIndex(b => b.id === item.id);
      const duplicated: BomItem = {
        ...item,
        id: generateUUID(),
        supplierCode: item.supplierCode ? `${item.supplierCode}-COPY${idx > 0 ? `-${idx + 1}` : ''}` : item.supplierCode,
      };
      duplicatedItems.push(duplicated);
      
      // Insert after original item
      if (insertBomItemAt && originalIndex >= 0) {
        insertBomItemAt(originalIndex + 1 + idx, duplicated);
      } else {
        addBomItem(duplicated);
      }
    });

    showSuccess(`Duplicated ${selectedItems.length} material(s)`);
    clearBomSelection();
  };

  // Bulk delete BOM items
  const handleBulkDeleteBom = () => {
    if (selectedBomIds.size === 0) return;
    
    const selectedItems = filteredBom.filter(item => item.id && selectedBomIds.has(item.id));
    if (selectedItems.length === 0) return;

    // Count total impacted colorways
    let totalImpactedColorways = 0;
    selectedItems.forEach(item => {
      totalImpactedColorways += countColorwayAssignments(item);
    });

    const confirmationMessage = totalImpactedColorways > 0
      ? `${selectedItems.length} material(s) selected. ${totalImpactedColorways} colorway assignment(s) will be removed. Continue?`
      : `Are you sure you want to delete ${selectedItems.length} selected material(s)?`;

    if (window.confirm(confirmationMessage)) {
      // Clear previous undo timeout if exists
      if (deletedItem?.timeoutId) {
        clearTimeout(deletedItem.timeoutId);
      }

      // Delete all selected items
      selectedItems.forEach(item => {
        const resolvedBomItemId = item.id || (item as any)?._id;
        if (resolvedBomItemId) {
          deleteBomItemById(resolvedBomItemId);
          
          // Remove colorway assignments
          if (removeColorwayAssignment && countColorwayAssignments(item) > 0) {
            colorways.forEach(colorway => {
              const hasAssignment = colorway.parts?.some(part => part.bomItemId === resolvedBomItemId);
              if (hasAssignment) {
                removeColorwayAssignment(colorway.id, resolvedBomItemId);
              }
            });
          }
        } else {
          // Fallback to index-based
          const originalIndex = bom.findIndex(b => b.id === item.id);
          if (originalIndex >= 0) {
            deleteBomItem(originalIndex);
          }
        }
      });

      showSuccess(`Deleted ${selectedItems.length} material(s)`);
      clearBomSelection();
    }
  };

  const handleDuplicateBomItem = (item: BomItem, index: number) => {
    const duplicated: BomItem = {
      ...item,
      id: generateUUID(),
      supplierCode: item.supplierCode ? `${item.supplierCode}-COPY` : item.supplierCode,
    };
    if (insertBomItemAt) {
      insertBomItemAt(index + 1, duplicated);
    } else {
      addBomItem(duplicated);
    }
    showSuccess(`Duplicated "${item.part} - ${item.materialName}"`);
  };

  const closeColorAssignmentModal = () => {
    setColorAssignmentModal(null);
    setSelectedPartId('');
  };

  const handleSaveColorAssignment = () => {
    if (!colorAssignmentModal || !assignColorwayToBomItem) return;
    const { colorway, bomItemId, bomItem } = colorAssignmentModal;
    if (assignmentMode === 'existing') {
      const targetPart = colorway.parts?.find(part => part.id === selectedPartId);
      if (!targetPart) {
        showError('Please select an existing colorway part.');
        return;
      }
      assignColorwayToBomItem(colorway.id, bomItemId, {
        ...targetPart,
        partName: targetPart.partName || bomItem.part || 'Unnamed Part',
      });
    } else {
      if (!newAssignmentForm.colorName.trim() || !newAssignmentForm.hexCode.trim()) {
        showError('Color name and hex code are required.');
        return;
      }
      assignColorwayToBomItem(colorway.id, bomItemId, {
        partName: bomItem.part || newAssignmentForm.colorName,
        colorName: newAssignmentForm.colorName.trim(),
        hexCode: newAssignmentForm.hexCode.trim(),
        pantoneCode: newAssignmentForm.pantoneCode.trim() || undefined,
        colorType: newAssignmentForm.colorType,
      });
    }
    showSuccess('Color assignment saved.');
    closeColorAssignmentModal();
  };

  const handleClearAssignment = () => {
    if (!colorAssignmentModal || !removeColorwayAssignment) return;
    removeColorwayAssignment(colorAssignmentModal.colorway.id, colorAssignmentModal.bomItemId);
    showSuccess('Color assignment removed.');
    closeColorAssignmentModal();
  };

  const handleDelete = (item: BomItem, index: number) => {
    const impactedColorways = countColorwayAssignments(item);
    const confirmationMessage = impactedColorways > 0
      ? `Material "${item.part} - ${item.materialName}" is linked to ${impactedColorways} colorway${impactedColorways > 1 ? 's' : ''}. Deleting it will remove those color assignments. Continue?`
      : `Are you sure you want to delete "${item.part} - ${item.materialName}"?`;
    if (window.confirm(confirmationMessage)) {
      // Clear previous undo timeout if exists
      if (deletedItem?.timeoutId) {
        clearTimeout(deletedItem.timeoutId);
      }

      // Use ID-based delete for better reliability
      if (item.id) {
        deleteBomItemById(item.id);
      } else {
        // Fallback to index-based for backward compatibility
        deleteBomItem(index);
      }

      const resolvedBomItemId = (item as any)?.id || (item as any)?._id;
      if (resolvedBomItemId && removeColorwayAssignment && impactedColorways > 0) {
        colorways.forEach(colorway => {
          const hasAssignment = colorway.parts?.some(part => part.bomItemId === resolvedBomItemId);
          if (hasAssignment) {
            removeColorwayAssignment(colorway.id, resolvedBomItemId);
          }
        });
      }
      
      // Set up undo with timeout
      const timeoutId = setTimeout(() => {
        setDeletedItem(null);
      }, 5000);

      const deletedItemData = { item, index, timeoutId };
      setDeletedItem(deletedItemData);
      
      // Show undo toast
      showUndoToast(
        `Material "${item.part} - ${item.materialName}" deleted`,
        () => {
          // Restore item at original index using context method
          if (deletedItemData && insertBomItemAt) {
            insertBomItemAt(deletedItemData.index, deletedItemData.item);
            if (deletedItemData.timeoutId) {
              clearTimeout(deletedItemData.timeoutId);
            }
            setDeletedItem(null);
            showSuccess('Material restored');
          }
        },
        5000
      );
    }
  };

  const handleAddTemplate = (templateType: string) => {
    const templates = {
      shirt: [
        { part: 'Main Fabric', materialName: 'Cotton Oxford', placement: 'Body, Sleeves', quantity: 1.5, uom: 'm' as const, supplier: '', supplierCode: '' },
        { part: 'Button', materialName: 'Plastic Button', placement: 'Center Front', quantity: 8, uom: 'pcs' as const, supplier: '', supplierCode: '' },
        { part: 'Thread', materialName: 'Polyester Thread', placement: 'All Over', quantity: 200, uom: 'g' as const, supplier: '', supplierCode: '' },
        { part: 'Label - Main', materialName: 'Woven Label', placement: 'Center Back Neck', quantity: 1, uom: 'pcs' as const, supplier: '', supplierCode: '' },
        { part: 'Label - Care', materialName: 'Printed Label', placement: 'Left Side Seam', quantity: 1, uom: 'pcs' as const, supplier: '', supplierCode: '' },
      ],
      pants: [
        { part: 'Main Fabric', materialName: 'Cotton Twill', placement: 'Body', quantity: 1.2, uom: 'm' as const, supplier: '', supplierCode: '' },
        { part: 'Zipper', materialName: 'Metal Zipper', placement: 'Center Front', quantity: 1, uom: 'pcs' as const, supplier: '', supplierCode: '' },
        { part: 'Button', materialName: 'Metal Button', placement: 'Waistband', quantity: 1, uom: 'pcs' as const, supplier: '', supplierCode: '' },
        { part: 'Thread', materialName: 'Polyester Thread', placement: 'All Over', quantity: 150, uom: 'g' as const, supplier: '', supplierCode: '' },
      ]
    };

    const template = templates[templateType as keyof typeof templates];
    if (template) {
      const newItems: BomItem[] = [];
      template.forEach(item => {
        const bomItem: BomItem = {
          id: generateUUID(),
          ...item,
          comments: '',
          colorCode: '',
          materialComposition: '',
          imageUrl: '',
        };
        addBomItem(bomItem);
        newItems.push(bomItem);
      });
      showSuccess(`Template "${templateType}" added. Please fill supplier and codes.`);
      
      // Auto-open first item for editing
      if (newItems.length > 0) {
        // Find the newly added item's index after state updates
        setTimeout(() => {
          const idx = bom.findIndex(b => b.id === newItems[0].id);
          const editIndex = idx !== -1 ? idx : bom.length; // fallback
          handleEdit(newItems[0], editIndex);
        }, 100);
      }
    }
  };

  const handleExport = () => {
    if (bom.length === 0) {
      showWarning('No materials to export');
      return;
    }
    
    const csvContent = exportToCSV(bom, canViewPrice);
    downloadCSV(csvContent, `bom_export_${new Date().toISOString().split('T')[0]}.csv`);
    showSuccess('BOM exported successfully');
  };

  const handleExportSample = () => {
    const sampleData: BomItem[] = [
      {
        id: 'sample1',
        part: 'Main Fabric',
        materialName: 'Cotton Oxford',
        placement: 'Body, Sleeves',
        size: '',
        quantity: 1.5,
        uom: 'm',
        supplier: 'Supplier Name',
        supplierCode: 'MAT-001',
        colorCode: '#000000',
        materialComposition: '100% Cotton',
        comments: 'Sample comment',
        imageUrl: 'https://via.placeholder.com/300x300.png?text=Material+Sample'
      }
    ];
    const csvContent = exportToCSV(sampleData, canViewPrice);
    downloadCSV(csvContent, 'bom_sample.csv');
    showSuccess('Sample CSV downloaded');
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
      const autoMapping: Record<string, keyof BomItem | ''> = {};
      const bomFields: (keyof BomItem)[] = [
        'part',
        'materialName',
        'placement',
        'size',
        'quantity',
        'uom',
        'supplier',
        'supplierCode',
        'colorCode',
        'materialComposition',
        'imageUrl',
        'comments',
        'unitPrice',
        'totalPrice'
      ];
      
      headers.forEach(header => {
        const lowerHeader = header.toLowerCase().trim();
        // Try to match common patterns
        if (lowerHeader.includes('part')) autoMapping[header] = 'part';
        else if (lowerHeader.includes('material') && lowerHeader.includes('name')) autoMapping[header] = 'materialName';
        else if (lowerHeader.includes('material') && (lowerHeader.includes('code') || lowerHeader.includes('code'))) autoMapping[header] = 'supplierCode';
        else if (lowerHeader.includes('placement')) autoMapping[header] = 'placement';
        else if (lowerHeader.includes('size')) autoMapping[header] = 'size';
        else if (lowerHeader.includes('quantity') || lowerHeader.includes('qty')) autoMapping[header] = 'quantity';
        else if (lowerHeader.includes('uom') || lowerHeader.includes('unit') && !lowerHeader.includes('price')) autoMapping[header] = 'uom';
        else if (lowerHeader.includes('supplier') && !lowerHeader.includes('code')) autoMapping[header] = 'supplier';
        else if (lowerHeader.includes('color')) autoMapping[header] = 'colorCode';
        else if (lowerHeader.includes('composition')) autoMapping[header] = 'materialComposition';
        else if (lowerHeader.includes('image') || lowerHeader.includes('photo') || lowerHeader.includes('picture')) autoMapping[header] = 'imageUrl';
        else if (lowerHeader.includes('comment') || lowerHeader.includes('note')) autoMapping[header] = 'comments';
        else if (lowerHeader.includes('unitprice') || (lowerHeader.includes('unit') && lowerHeader.includes('price'))) autoMapping[header] = 'unitPrice';
        else if (lowerHeader.includes('totalprice') || (lowerHeader.includes('total') && lowerHeader.includes('price'))) autoMapping[header] = 'totalPrice';
        else autoMapping[header] = '';
      });
      
      setColumnMapping(autoMapping);
      
      // Show mapping modal first
      setShowMappingModal(true);
    };
    reader.readAsText(file);
  };

  const handleConfirmMapping = () => {
    // Map CSV columns to BOM fields using user mapping
    const mappedRows = rawCsvData.map((row, idx) => {
      const item: Partial<BomItem> = {};
      
      Object.entries(columnMapping).forEach(([csvColumn, bomField]) => {
        if (bomField && bomField !== '') {
          const value = row[csvColumn];
          if (bomField === 'quantity') {
            item[bomField] = parseFloat(value || '0') || 0;
          } else if (bomField === 'uom') {
            item[bomField] = (value || 'm') as any;
          } else if (bomField === 'unitPrice' || bomField === 'totalPrice') {
            item[bomField] = value ? parseFloat(value) : undefined;
          } else {
            item[bomField] = value || '';
          }
        }
      });
      
      return { item, rowIndex: idx + 2 }; // +2 because CSV has header and 1-based index
    });
    
    // Validate each row
    const errors: Array<{ row: number; column?: string; errors: Record<string, string> }> = [];
    mappedRows.forEach(({ item, rowIndex }) => {
      const validation = validateBomItem(item);
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
      const validation = validateBomItem(item);
      if (validation.isValid) {
        const quantity = item.quantity !== undefined && item.quantity !== null && item.quantity !== '' 
          ? Number(item.quantity) 
          : null;
        const hasUnitPrice = item.unitPrice !== undefined && item.unitPrice !== null && item.unitPrice !== '';
        const unitPrice = hasUnitPrice ? Number(item.unitPrice) : undefined;
        const totalPrice = item.totalPrice ?? (quantity !== null && quantity > 0 && unitPrice !== undefined ? quantity * unitPrice : undefined);
        const trimmedImageUrl = typeof item.imageUrl === 'string' ? item.imageUrl.trim() : '';
        
        const bomItem: BomItem = {
          id: generateUUID(),
          part: item.part!,
          materialName: item.materialName!,
          placement: item.placement || '',
          size: item.size || '',
          quantity: quantity,
          uom: (item.uom || 'm') as any,
          supplier: item.supplier || '',
          supplierCode: item.supplierCode || '',
          colorCode: item.colorCode || '',
          materialComposition: item.materialComposition || '',
          comments: item.comments || '',
          imageUrl: trimmedImageUrl ? trimmedImageUrl : undefined,
          unitPrice: unitPrice,
          totalPrice: totalPrice,
        };
        addBomItem(bomItem);
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

  // Validate all BOM items (for save TechPack) - ID-based
  const validateAllBomItems = useCallback((): { isValid: boolean; errors: Array<{ id: string; item: BomItem; errors: Record<string, string> }> } => {
    const errors: Array<{ id: string; item: BomItem; errors: Record<string, string> }> = [];
    
    bom.forEach((item) => {
      const validation = validateBomItem(item);
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
  }, [bom]);

  // Expose validate function via ref (for parent component)
  useImperativeHandle(ref, () => ({
    validateAll: validateAllBomItems
  }), [validateAllBomItems]);

  // Check if user can view price columns (Admin or role > viewer)
  const canViewPrice = useMemo(() => {
    if (!user) return false;
    
    // Global Admin can always view
    if (user.role?.toLowerCase() === 'admin') return true;
    
    // If no techpack (e.g., create mode), allow admin/designer to view prices
    if (!techpack) {
      return user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'designer';
    }
    
    // Check if user is owner
    const createdByRaw: any = (techpack as any).createdBy;
    const createdById = createdByRaw && typeof createdByRaw === 'object' ? createdByRaw._id : createdByRaw;
    if (createdById && String(createdById) === String(user._id)) return true;
    
    // Check shared access role
    const sharedWith = (techpack as any).sharedWith || [];
    const sharedAccess = sharedWith.find((share: any) => {
      const shareUserId = share.userId?._id || share.userId;
      return String(shareUserId) === String(user._id);
    });
    
    if (sharedAccess) {
      const role = sharedAccess.role;
      // Factory and Viewer cannot see prices
      return role !== TechPackRole.Viewer && role !== TechPackRole.Factory;
    }
    
    return false;
  }, [user, techpack]);

  // Table columns configuration with error highlighting
  const columns = useMemo<ColumnType[]>(() => {
    const baseColumns: ColumnType[] = [
    {
      key: 'part' as keyof BomItem,
      header: 'Part',
      width: '15%',
      sortable: true,
    },
    {
      key: 'materialName' as keyof BomItem,
      header: 'Material Name',
      width: '20%',
      sortable: true,
    },
    {
      key: 'imageUrl' as keyof BomItem,
      header: 'Image',
      width: '120px',
      render: (value: string, item: BomItem) => {
        const resolvedSrc = getMaterialImageUrl(value);
        return (
          <ZoomableImage
            src={resolvedSrc}
            alt={`${item.materialName || item.part} preview`}
            fit="contain"
            containerClassName="w-20 h-20 rounded-md border border-gray-200 overflow-hidden bg-white flex items-center justify-center text-[10px] text-gray-400"
            className="object-contain"
            fallback={<span className="px-2 text-center leading-tight">No Image</span>}
          />
        );
      },
    },
    {
      key: 'placement' as keyof BomItem,
      header: 'Placement',
      width: '15%',
    },
    {
      key: 'size' as keyof BomItem,
      header: 'Size/Width/Usage',
      width: '8%',
    },
    {
      key: 'quantity' as keyof BomItem,
      header: 'Qty',
      width: '8%',
      render: (value: number | null | undefined) => (value !== undefined && value !== null) ? value.toFixed(2) : '-',
    },
    {
      key: 'uom' as keyof BomItem,
      header: 'UOM',
      width: '8%',
    },
    {
      key: 'supplier' as keyof BomItem,
      header: 'Supplier',
      width: '15%',
    },
    {
      key: 'comments' as keyof BomItem,
      header: 'Comments',
      width: '11%',
      render: (value: string) => (
        <span className="text-xs text-gray-600 truncate" title={value}>
          {value || '-'}
        </span>
      ),
    },
    ];
    
    // Add price columns if user has permission
    if (canViewPrice) {
      baseColumns.push(
        {
          key: 'unitPrice' as keyof BomItem,
          header: 'Unit Price',
          width: '10%',
          render: (value: number) =>
            value !== undefined && value !== null
              ? Number(value).toLocaleString('vi-VN')
              : '-',
        },
        {
          key: 'totalPrice' as keyof BomItem,
          header: 'Total Price',
          width: '10%',
          render: (value: number) => {
            // totalPrice is already calculated in tableDataWithErrors
            return value !== undefined && value !== null
              ? Number(value).toLocaleString('vi-VN')
              : '-';
          },
        }
      );
    }
    
    const colorwayColumns = colorways
      .filter(colorway => visibleColorwayIds.includes(colorway.id))
      .map(colorway => ({
        key: `colorway_${colorway.id}` as keyof BomItem,
        header: `${colorway.name} (${colorway.code})`,
        width: '220px',
        render: (_value: any, item: BomItem) => renderColorwayCell(colorway, item),
      }));
    
    return [...baseColumns, ...colorwayColumns];
  }, [canViewPrice, colorways, visibleColorwayIds, renderColorwayCell]);

  // Pagination
  const paginatedBom = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredBom.slice(start, end);
  }, [filteredBom, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredBom.length / itemsPerPage);

  // Enhanced table data with error highlighting - ID-based
  const tableDataWithErrors = useMemo(() => {
    return paginatedBom.map((item) => {
      const hasErrors = validationErrors[item.id] && Object.keys(validationErrors[item.id]).length > 0;
      const quantity = item.quantity !== undefined && item.quantity !== null 
        ? Number(item.quantity) 
        : null;
      const hasUnitPrice = item.unitPrice !== undefined && item.unitPrice !== null && item.unitPrice !== '';
      const normalizedUnitPrice = hasUnitPrice ? Number(item.unitPrice) : undefined;
      const calculatedTotalPrice = item.totalPrice ??
        (quantity !== null && quantity > 0 && normalizedUnitPrice !== undefined ? quantity * normalizedUnitPrice : undefined);
      return {
        ...item,
        totalPrice: calculatedTotalPrice,
        _hasErrors: hasErrors,
        _errors: validationErrors[item.id] || {}
      };
    });
  }, [paginatedBom, validationErrors]);

  const totalMaterialCost = useMemo(() => {
    if (!canViewPrice) return 0;
    return filteredBom.reduce((sum, item) => {
      const quantity = item.quantity !== undefined && item.quantity !== null 
        ? Number(item.quantity) 
        : null;
      const hasUnitPrice = item.unitPrice !== undefined && item.unitPrice !== null && item.unitPrice !== '';
      const unitPrice = hasUnitPrice ? Number(item.unitPrice) : undefined;
      const explicitTotal =
        item.totalPrice !== undefined && item.totalPrice !== null && item.totalPrice !== ''
          ? Number(item.totalPrice)
          : undefined;
      const rowTotal =
        explicitTotal ??
        (quantity !== null && quantity > 0 && unitPrice !== undefined ? quantity * unitPrice : 0);
      return sum + (rowTotal || 0);
    }, 0);
  }, [filteredBom, canViewPrice]);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bill of Materials</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage materials and components for this tech pack
            </p>
          </div>
          
          {/* Summary Stats */}
          <div className="flex items-center space-x-6 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totals.totalItems}</div>
              <div className="text-gray-500">Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{totals.uniqueSuppliers}</div>
              <div className="text-gray-500">Suppliers</div>
            </div>
          </div>
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
                placeholder="Search materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={filterByPart}
                onChange={(e) => setFilterByPart(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Parts</option>
                {uniqueParts.map(part => (
                  <option key={part} value={part}>{part}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Template Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleAddTemplate('shirt')}
                className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Package className="w-3 h-3 mr-1 inline" />
                Shirt Template
              </button>
              <button
                onClick={() => handleAddTemplate('pants')}
                className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Package className="w-3 h-3 mr-1 inline" />
                Pants Template
              </button>
            </div>

            {/* Import/Export */}
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImport(file);
                  e.target.value = ''; // Reset input
                }}
                className="hidden"
                id="bom-import-input"
              />
              <label
                htmlFor="bom-import-input"
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
            <button
              onClick={handleExportSample}
              className="flex items-center px-2 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              title="Download sample CSV template"
            >
              <Download className="w-3 h-3 mr-1" />
              Sample
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
              Add Material
            </button>
          </div>
        </div>

        {colorways.length > 0 && (
          <div className="mt-6 border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Colorway Columns</p>
                <p className="text-xs text-gray-500">Toggle which colorways appear in the BOM grid for quick color checks.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setVisibleColorwayIds(colorways.map(cw => cw.id).filter((id): id is string => Boolean(id)))
                  }
                  className="px-3 py-1 text-xs border border-gray-300 rounded-full text-gray-600 hover:bg-gray-50"
                >
                  Show all
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleColorwayIds([])}
                  className="px-3 py-1 text-xs border border-gray-300 rounded-full text-gray-600 hover:bg-gray-50"
                >
                  Hide all
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {colorways.map(colorway => (
                <button
                  key={colorway.id}
                  type="button"
                  onClick={() => toggleColorwayVisibility(colorway.id)}
                  className={`px-3 py-1 rounded-full text-xs transition border ${
                    visibleColorwayIds.includes(colorway.id)
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-500'
                  }`}
                >
                  {colorway.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={resetForm}
        title={editingIndex !== null ? 'Edit Material' : 'Add New Material'}
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
              onClick={handleSubmit}
              className={`px-4 py-2 text-sm font-medium border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                validation.isValid
                  ? 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                  : 'text-gray-700 bg-gray-100'
              }`}
            >
              {editingIndex !== null ? 'Update' : 'Add'} Material
            </button>
          </>
        }
      >
        <div ref={formRef} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Part"
              value={formData.part || ''}
              onChange={handleInputChange('part')}
              onBlur={() => validation.setFieldTouched('part')}
              options={COMMON_MATERIALS}
              required
              error={validation.getFieldProps('part').error}
              helperText={validation.getFieldProps('part').helperText}
              data-error={validation.getFieldProps('part').error ? 'true' : 'false'}
            />

            <Input
              label="Material Name"
              value={formData.materialName || ''}
              onChange={handleInputChange('materialName')}
              onBlur={() => validation.setFieldTouched('materialName')}
              placeholder="e.g., Cotton Oxford"
              required
              error={validation.getFieldProps('materialName').error}
              helperText={validation.getFieldProps('materialName').helperText}
              data-error={validation.getFieldProps('materialName').error ? 'true' : 'false'}
            />

            <Input
              label="Placement"
              value={formData.placement || ''}
              onChange={handleInputChange('placement')}
              onBlur={() => validation.setFieldTouched('placement')}
              placeholder="e.g., Body, Sleeve, Collar"
              error={validation.getFieldProps('placement').error}
              helperText={validation.getFieldProps('placement').helperText}
            />

            <Input
              label="Size/Width/Usage"
              value={formData.size || ''}
              onChange={handleInputChange('size')}
              onBlur={() => validation.setFieldTouched('size')}
              placeholder="e.g., 14mm, L, etc."
              error={validation.getFieldProps('size').error}
              helperText={validation.getFieldProps('size').helperText}
            />

            <Input
              label="Quantity"
              value={formData.quantity !== undefined && formData.quantity !== null ? formData.quantity : ''}
              onChange={handleInputChange('quantity')}
              onBlur={() => validation.setFieldTouched('quantity')}
              type="number"
              min={0}
              step={0.0000001}
              placeholder="e.g., 1.50"
              error={validation.getFieldProps('quantity').error}
              helperText={validation.getFieldProps('quantity').helperText}
              data-error={validation.getFieldProps('quantity').error ? 'true' : 'false'}
            />

            <Select
              label="Unit of Measure"
              value={formData.uom || 'm'}
              onChange={handleInputChange('uom')}
              onBlur={() => validation.setFieldTouched('uom')}
              options={UNITS_OF_MEASURE}
              required
              error={validation.getFieldProps('uom').error}
              helperText={validation.getFieldProps('uom').helperText}
              data-error={validation.getFieldProps('uom').error ? 'true' : 'false'}
            />
            
            {canViewPrice && (
              <>
                <Input
                  label="Unit Price"
                  value={formData.unitPrice ?? ''}
                  onChange={handleInputChange('unitPrice')}
                  onBlur={() => validation.setFieldTouched('unitPrice')}
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="e.g., 100000"
                  error={validation.getFieldProps('unitPrice').error}
                  helperText={validation.getFieldProps('unitPrice').helperText}
                />
                
                <Input
                  label="Total Price"
                  value={formData.totalPrice ?? ''}
                  type="number"
                  disabled
                  placeholder="Auto-calculated"
                  helperText="Quantity × Unit Price"
                />
              </>
            )}
            
            <Input
              label="Supplier"
              value={formData.supplier || ''}
              onChange={handleInputChange('supplier')}
              onBlur={() => validation.setFieldTouched('supplier')}
              placeholder="Supplier name"
              required
              error={validation.getFieldProps('supplier').error}
              helperText={validation.getFieldProps('supplier').helperText}
              data-error={validation.getFieldProps('supplier').error ? 'true' : 'false'}
            />

            <Input
              label="Supplier Code"
              value={formData.supplierCode || ''}
              onChange={handleInputChange('supplierCode')}
              onBlur={() => validation.setFieldTouched('supplierCode')}
              placeholder="Enter supplier code"
              required
              error={validation.getFieldProps('supplierCode').error}
              helperText={validation.getFieldProps('supplierCode').helperText}
              data-error={validation.getFieldProps('supplierCode').error ? 'true' : 'false'}
            />

            <Input
              label="Color Code"
              value={formData.colorCode || ''}
              onChange={handleInputChange('colorCode')}
              onBlur={() => validation.setFieldTouched('colorCode')}
              placeholder="e.g., #FF0000 or PANTONE 19-4052 TCX"
              error={validation.getFieldProps('colorCode').error}
              helperText={validation.getFieldProps('colorCode').helperText}
            />

            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-gray-700 mb-2">Ảnh vật tư (upload)</p>
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor={`bom-image-upload-${editingId ?? 'new'}`}
                    className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {isUploadingImage ? 'Đang tải...' : 'Upload ảnh'}
                  </label>
                  <input
                    id={`bom-image-upload-${editingId ?? 'new'}`}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/svg+xml"
                    className="hidden"
                    onChange={handleMaterialImageUpload}
                    disabled={isUploadingImage}
                  />
                  {formData.imageUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveMaterialImage}
                      className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                    >
                      <X className="w-3 h-3" />
                      Xoá ảnh
                    </button>
                  )}
                </div>
                {imageUploadError && (
                  <p className="mt-1 text-xs text-red-600">{imageUploadError}</p>
                )}
                {validation.getFieldProps('imageUrl').error && (
                  <p className="mt-1 text-xs text-red-600">{validation.getFieldProps('imageUrl').error}</p>
                )}
                {validation.getFieldProps('imageUrl').helperText && (
                  <p className="mt-1 text-xs text-gray-500">{validation.getFieldProps('imageUrl').helperText}</p>
                )}
                {formData.imageUrl && (
                  <p className="mt-2 text-[11px] text-gray-500 break-all">
                    Đường dẫn: {getMaterialImageUrl(formData.imageUrl)}
                  </p>
                )}
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Preview</span>
                <div className="relative mt-1 h-32 rounded-md border border-gray-200 bg-white flex items-center justify-center overflow-hidden">
                  <ZoomableImage
                    src={imagePreview || getMaterialImageUrl(formData.imageUrl)}
                    alt={`${formData.materialName || formData.part || 'Material'} preview`}
                    fit="contain"
                    containerClassName="w-full h-full flex items-center justify-center text-xs text-gray-400 bg-white"
                    className="object-contain"
                    fallback={<span className="text-[11px] text-gray-400 px-2 text-center leading-tight">Chưa có ảnh</span>}
                  />
                  {isUploadingImage && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-xs font-medium text-gray-700">
                      Đang tải ảnh...
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <Input
                label="Material Composition"
                value={formData.materialComposition || ''}
                onChange={handleInputChange('materialComposition')}
                onBlur={() => validation.setFieldTouched('materialComposition')}
                placeholder="e.g., 100% Cotton, 65% Cotton 35% Polyester"
                error={validation.getFieldProps('materialComposition').error}
                helperText={validation.getFieldProps('materialComposition').helperText}
              />
            </div>

            <div className="md:col-span-3">
              <Textarea
                label="Comments"
                value={formData.comments || ''}
                onChange={handleInputChange('comments')}
                onBlur={() => validation.setFieldTouched('comments')}
                placeholder="Additional notes or specifications..."
                rows={2}
                error={validation.getFieldProps('comments').error}
                helperText={validation.getFieldProps('comments').helperText}
              />
            </div>
          </div>

          {/* Validation Summary */}
          {!validation.isValid && Object.keys(validation.errors).some(key => validation.touched[key]) && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Vui lòng sửa các lỗi sau:
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <ul className="list-disc pl-5 space-y-1">
                      {Object.entries(validation.errors).map(([field, error]) =>
                        validation.touched[field] && error ? (
                          <li key={field}>
                            <strong>{field}:</strong> {error}
                          </li>
                        ) : null
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {colorAssignmentModal && (
        <Modal
          isOpen={!!colorAssignmentModal}
          onClose={closeColorAssignmentModal}
          title={`Assign Color • ${colorAssignmentModal.bomItem.part}`}
          size="lg"
          footer={
            <>
              {activeAssignment && (
                <button
                  type="button"
                  onClick={handleClearAssignment}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={closeColorAssignmentModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveColorAssignment}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                Save
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-md p-4 text-sm flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{colorAssignmentModal.bomItem.part}</p>
                <p className="text-gray-500">{colorAssignmentModal.bomItem.materialName}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase text-gray-500">Colorway</p>
                <p className="text-sm font-semibold text-gray-800">{colorAssignmentModal.colorway.name}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <label className="inline-flex items-center space-x-2 text-sm text-gray-700">
                <input
                  type="radio"
                  className="rounded text-blue-600"
                  value="existing"
                  checked={assignmentMode === 'existing'}
                  onChange={() => setAssignmentMode('existing')}
                  disabled={!colorAssignmentModal.colorway.parts || colorAssignmentModal.colorway.parts.length === 0}
                />
                <span>Use existing color</span>
              </label>
              <label className="inline-flex items-center space-x-2 text-sm text-gray-700">
                <input
                  type="radio"
                  className="rounded text-blue-600"
                  value="new"
                  checked={assignmentMode === 'new'}
                  onChange={() => setAssignmentMode('new')}
                />
                <span>Create new color</span>
              </label>
            </div>

            {assignmentMode === 'existing' ? (
              colorAssignmentModal.colorway.parts && colorAssignmentModal.colorway.parts.length > 0 ? (
                <div className="space-y-3">
                  <Select
                    label="Colorway Parts"
                    value={selectedPartId}
                    onChange={setSelectedPartId}
                    options={colorAssignmentModal.colorway.parts.map(part => ({
                      value: part.id,
                      label: `${part.partName} • ${part.colorName}`,
                    }))}
                    placeholder="Select a colorway part..."
                  />
                  {selectedPartId && (
                    <div className="p-3 border border-gray-200 rounded-md text-sm flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span
                          className="w-6 h-6 rounded border border-gray-200"
                          style={{
                            backgroundColor:
                              colorAssignmentModal.colorway.parts.find(part => part.id === selectedPartId)?.hexCode ||
                              colorAssignmentModal.colorway.hexColor ||
                              '#f3f4f6',
                          }}
                        />
                        <div>
                          <p className="font-medium text-gray-900">
                            {colorAssignmentModal.colorway.parts.find(part => part.id === selectedPartId)?.colorName}
                          </p>
                          <p className="text-xs text-gray-500">
                            Pantone:{' '}
                            {colorAssignmentModal.colorway.parts.find(part => part.id === selectedPartId)?.pantoneCode ||
                              '—'}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 uppercase">
                        {colorAssignmentModal.colorway.parts.find(part => part.id === selectedPartId)?.colorType || 'Solid'}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No colorway parts available. Switch to “Create new color” to define one for this BOM item.
                </p>
              )
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Color Name"
                    value={newAssignmentForm.colorName}
                    onChange={(value) => setNewAssignmentForm(prev => ({ ...prev, colorName: String(value) }))}
                    placeholder="e.g., Navy Blazer"
                  />
                  <Input
                    label="Pantone Code"
                    value={newAssignmentForm.pantoneCode}
                    onChange={(value) => setNewAssignmentForm(prev => ({ ...prev, pantoneCode: String(value) }))}
                    placeholder="19-4052 TPX"
                  />
                  <div>
                    <label className="text-sm font-medium text-gray-700">Hex Color</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <input
                        type="color"
                        value={newAssignmentForm.hexCode}
                        onChange={(e) => setNewAssignmentForm(prev => ({ ...prev, hexCode: e.target.value }))}
                        className="w-12 h-10 border rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={newAssignmentForm.hexCode}
                        onChange={(e) => setNewAssignmentForm(prev => ({ ...prev, hexCode: e.target.value }))}
                        className="flex-1 px-3 py-2 border rounded-md text-sm font-mono"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                  <Select
                    label="Color Type"
                    value={newAssignmentForm.colorType}
                    onChange={(value) =>
                      setNewAssignmentForm(prev => ({ ...prev, colorType: value as ColorwayPart['colorType'] }))
                    }
                    options={colorTypeOptions}
                  />
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

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
              <ul className="text-sm text-red-700 space-y-1">
                {importErrors.map(({ row, errors }) => (
                  <li key={row}>
                    Row {row}: {Object.values(errors).join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Row</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Part</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Material Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Quantity</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">UOM</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Supplier</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {importPreview.map((item, idx) => {
                  const rowErrors = importErrors.find(e => e.row === idx + 2);
                  const isValid = !rowErrors;
                  // Try to create a stable key from available fields; fall back to index
                  const rowKey = item.supplierCode || item.supplier || item.part || `row-${idx}`;
                  return (
                    <tr key={rowKey} className={isValid ? '' : 'bg-red-50'}>
                      <td className="px-4 py-2 text-sm">{idx + 2}</td>
                      <td className="px-4 py-2 text-sm">{item.part || '-'}</td>
                      <td className="px-4 py-2 text-sm">{item.materialName || '-'}</td>
                      <td className="px-4 py-2 text-sm">{item.quantity || '-'}</td>
                      <td className="px-4 py-2 text-sm">{item.uom || '-'}</td>
                      <td className="px-4 py-2 text-sm">{item.supplier || '-'}</td>
                      <td className="px-4 py-2 text-sm">
                        {isValid ? (
                          <span className="text-green-600">✓ Valid</span>
                        ) : (
                          <span className="text-red-600">✗ Error</span>
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

      {/* Data Table with Error Highlighting */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Materials List</h3>
          {Object.keys(validationErrors).length > 0 && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <span className="text-sm text-red-800">
                  {Object.keys(validationErrors).length} item(s) have validation errors. Please fix them before saving.
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Bulk Actions Bar */}
        {selectedBomIds.size > 0 && (
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-blue-900">
                Selected: {selectedBomIds.size} item(s)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkDuplicateBom}
                className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Copy className="w-4 h-4 inline mr-1.5" />
                Duplicate
              </button>
              <button
                onClick={handleBulkDeleteBom}
                className="px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <X className="w-4 h-4 inline mr-1.5" />
                Delete
              </button>
              <button
                onClick={clearBomSelection}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 w-12">
                  <button
                    onClick={toggleSelectAllBom}
                    className="flex items-center justify-center w-5 h-5 text-gray-400 hover:text-gray-600 focus:outline-none"
                    title={selectedBomIds.size === filteredBom.length && filteredBom.length > 0 ? 'Deselect all' : 'Select all'}
                  >
                    {selectedBomIds.size === filteredBom.length && filteredBom.length > 0 ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                </th>
                {columns.map((column) => (
                  <th
                    key={column.key as string}
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{ width: column.width }}
                  >
                    {column.header}
                  </th>
                ))}
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBom.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="px-6 py-12 text-center text-sm text-gray-500">
                    No materials added yet. Click 'Add Material' to get started or use a template.
                  </td>
                </tr>
              ) : (
                tableDataWithErrors.map((item, mapIndex) => {
                  const originalIndex = bom.findIndex(b => b.id === item.id);
                  const hasErrors = item._hasErrors;
                  const errors = item._errors;
                  
                  // Đảm bảo key luôn unique: ưu tiên item.id, nếu không có thì dùng mapIndex
                  const uniqueKey = item.id || `bom-item-${mapIndex}`;
                  
                  const isSelected = item.id ? selectedBomIds.has(item.id) : false;
                  
                  return (
                    <tr
                      key={uniqueKey}
                      className={`hover:bg-gray-50 ${hasErrors ? 'bg-red-50 border-l-4 border-red-500' : ''} ${isSelected ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-4 py-4">
                        <button
                          onClick={() => item.id && toggleBomSelection(item.id)}
                          className="flex items-center justify-center w-5 h-5 text-gray-400 hover:text-gray-600 focus:outline-none"
                          title={isSelected ? 'Deselect' : 'Select'}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                      {columns.map((column) => {
                        const value = item[column.key];
                        return (
                          <td
                            key={column.key as string}
                            className={`px-6 py-4 whitespace-nowrap text-sm ${
                              hasErrors && errors[column.key as string] ? 'text-red-600' : 'text-gray-700'
                            }`}
                            title={hasErrors && errors[column.key as string] ? errors[column.key as string] : undefined}
                          >
                            {column.render ? column.render(value, item, mapIndex) : (value || '-')}
                            {hasErrors && errors[column.key as string] && (
                              <div className="mt-1">
                                <AlertCircle className="w-4 h-4 text-red-400 inline" />
                                <span className="ml-1 text-xs text-red-600">{errors[column.key as string]}</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-3">
                          <button
                            onClick={() => handleEdit(item, originalIndex)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicateBomItem(item, originalIndex)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Duplicate"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item, originalIndex)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {canViewPrice && filteredBom.length > 0 && (
              <tfoot className="bg-gray-50">
                <tr>
                  {columns.map((column) => {
                    const isTotalPriceColumn = column.key === ('totalPrice' as keyof BomItem);
                    return (
                      <td
                        key={`total-row-${column.key as string}`}
                        className="px-6 py-3 text-sm font-semibold text-gray-900 text-right"
                        style={{ width: column.width }}
                      >
                        {isTotalPriceColumn
                          ? totalMaterialCost.toLocaleString('vi-VN', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            })
                          : ''}
                      </td>
                    );
                  })}
                  <td className="px-6 py-3" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredBom.length)} of {filteredBom.length} items
              </span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="ml-4 px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
                <option value={200}>200 per page</option>
              </select>
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
        title="Map CSV Columns to BOM Fields"
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
            Map each CSV column to a BOM field. Leave unmapped if not needed.
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
                        [header]: e.target.value as keyof BomItem | ''
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">-- Not mapped --</option>
                    <option value="part">Part</option>
                    <option value="materialName">Material Name</option>
                    <option value="supplierCode">Supplier Code</option>
                    <option value="placement">Placement</option>
                    <option value="size">Size/Width/Usage</option>
                    <option value="quantity">Quantity</option>
                    <option value="uom">Unit of Measure</option>
                    <option value="supplier">Supplier</option>
                    <option value="colorCode">Color Code</option>
                    <option value="materialComposition">Material Composition</option>
                    <option value="imageUrl">Material Image URL</option>
                    <option value="comments">Comments</option>
                    <option value="unitPrice">Unit Price</option>
                    <option value="totalPrice">Total Price</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Import Preview Modal - Enhanced with error download */}
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
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Part</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Material Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Quantity</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">UOM</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Supplier</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {importPreview.map((item, idx) => {
                  const rowErrors = importErrors.find(e => e.row === idx + 2);
                  const isValid = !rowErrors;
                  const rowKey = item.supplierCode || item.supplier || item.part || `row-${idx}`;
                  return (
                    <tr key={rowKey} className={isValid ? '' : 'bg-red-50'}>
                      <td className="px-4 py-2 text-sm">{idx + 2}</td>
                      <td className="px-4 py-2 text-sm">{item.part || '-'}</td>
                      <td className="px-4 py-2 text-sm">{item.materialName || '-'}</td>
                      <td className="px-4 py-2 text-sm">{item.quantity || '-'}</td>
                      <td className="px-4 py-2 text-sm">{item.uom || '-'}</td>
                      <td className="px-4 py-2 text-sm">{item.supplier || '-'}</td>
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

// Export validate function for use in parent component - ID-based
export const validateBomForSave = (bom: BomItem[]): { isValid: boolean; errors: Array<{ id: string; item: BomItem; errors: Record<string, string> }> } => {
  const errors: Array<{ id: string; item: BomItem; errors: Record<string, string> }> = [];
  
  bom.forEach((item) => {
    const validation = validateBomItem(item);
    if (!validation.isValid) {
      errors.push({ id: item.id, item, errors: validation.errors });
    }
  });
  
  return { isValid: errors.length === 0, errors };
};

BomTabComponent.displayName = 'BomTab';

export const BomTab = memo(BomTabComponent);
export default BomTab;
