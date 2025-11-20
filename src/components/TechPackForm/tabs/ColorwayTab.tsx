import React, { useState, useMemo, useEffect } from 'react';
import { useTechPack } from '../../../contexts/TechPackContext';
import { BomItem, Colorway, ColorwayPart } from '../../../types/techpack';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { colorwayFormValidationSchema, colorwayPartValidationSchema } from '../../../utils/validationSchemas';
import Input from '../shared/Input';
import Select from '../shared/Select';
import DataTable from '../shared/DataTable';
import { Plus, Palette, Copy, Eye, Star, Upload, Download, AlertCircle, Image as ImageIcon, X, Trash2 } from 'lucide-react';
import { validateFields } from '../../../utils/validation';
import { showError, showSuccess } from '../../../lib/toast';
import { api } from '../../../lib/api';
import { useSeasonSuggestions } from '../../../hooks/useSeasonSuggestions';
import ZoomableImage from '../../common/ZoomableImage';

const API_UPLOAD_BASE =
  (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1').replace(/\/api\/v1$/, '');

// Helper to resolve image URL (handles both absolute and relative paths)
const resolveImageUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  if (url.startsWith('/')) {
    return `${API_UPLOAD_BASE}${url}`;
  }
  return `${API_UPLOAD_BASE}/${url}`;
};

const ColorwayTab: React.FC = () => {
  const context = useTechPack();
  const { state, addColorway, updateColorway, deleteColorway } = context ?? {};
  const { colorways = [], bom = [] } = state?.techpack ?? {};

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [selectedColorway, setSelectedColorway] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Initialize validation for the form
  const validation = useFormValidation(colorwayFormValidationSchema);
  const partValidation = useFormValidation(colorwayPartValidationSchema);
  
  const [formData, setFormData] = useState<Partial<Colorway>>({
    name: '',
    code: '',
    placement: '',
    materialType: '',
    season: '',
    isDefault: false,
    parts: [],
    approvalStatus: 'Pending',
    productionStatus: 'Lab Dip',
    hexColor: '#000000',
    pantoneCode: '',
    supplier: '',
    notes: '',
    imageUrl: undefined,
  });

  const [partFormData, setPartFormData] = useState<Partial<ColorwayPart>>({
    bomItemId: undefined,
    partName: '',
    colorName: '',
    pantoneCode: '',
    hexCode: '#000000',
    rgbCode: '',
    colorType: 'Solid',
  });

  const bomSelectionData = useMemo(() => {
    const map = new Map<string, BomItem>();
    const options = bom.map((item, index) => {
      const primaryId = (item as any)?.id || (item as any)?._id || `bom-${index}`;
      const candidates = [
        (item as any)?.id,
        (item as any)?._id,
        primaryId
      ];
      candidates
        .filter(Boolean)
        .forEach(id => map.set(String(id), item));
      const labelParts = [item.part, item.materialName].filter(Boolean);
      return {
        value: primaryId,
        label: labelParts.length ? labelParts.join(' • ') : item.part || `BOM Item ${index + 1}`,
      };
    });
    return { map, options };
  }, [bom]);

  const bomById = bomSelectionData.map;
  const bomOptions = bomSelectionData.options;

  // Color type options
  const colorTypeOptions = [
    { value: 'Solid', label: 'Solid Color' },
    { value: 'Print', label: 'Print' },
    { value: 'Embroidery', label: 'Embroidery' },
    { value: 'Applique', label: 'Applique' },
  ];

  const renderImagePlaceholder = (subtitle = 'Upload an image to display') => (
    <div className="flex flex-col items-center justify-center text-gray-400">
      <ImageIcon className="w-12 h-12 mb-2" />
      <p className="text-sm">No Image</p>
      {subtitle && <p className="text-xs mt-1">{subtitle}</p>}
    </div>
  );

  // Approval status options
  const approvalStatusOptions = [
    { value: 'Pending', label: 'Pending' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Rejected', label: 'Rejected' },
  ];

  // Production status options
  const productionStatusOptions = [
    { value: 'Lab Dip', label: 'Lab Dip' },
    { value: 'Bulk Fabric', label: 'Bulk Fabric' },
    { value: 'Finished', label: 'Finished' },
  ];

  const { seasonSuggestions, addSeasonSuggestion } = useSeasonSuggestions();
  useEffect(() => {
    const uniqueSeasons = Array.from(
      new Set(colorways.map((c) => c.season).filter((season): season is string => Boolean(season)))
    );
    uniqueSeasons.forEach((season) => addSeasonSuggestion(season));
  }, [colorways, addSeasonSuggestion]);
  const seasonDatalistOptions = useMemo(
    () => seasonSuggestions.map((season) => ({ value: season, label: season })),
    [seasonSuggestions]
  );

  const handleInputChange = (field: keyof Colorway) => (value: string | boolean) => {
    let nextValue: string | boolean = value;

    if (field === 'hexColor' && typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        nextValue = '';
      } else if (!trimmed.startsWith('#')) {
        nextValue = `#${trimmed.replace(/^#+/, '')}`.toUpperCase();
      } else {
        nextValue = trimmed.toUpperCase();
      }
    }

    const updatedFormData = { ...formData, [field]: nextValue };
    setFormData(updatedFormData);

    // Validate the field in real-time
    validation.validateField(field, nextValue);
  };

  const handleSeasonChange = (value: string | number) => {
    const nextValue = typeof value === 'number' ? String(value) : value;
    handleInputChange('season')(nextValue);
    addSeasonSuggestion(nextValue);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showError('Invalid file type. Please upload JPEG, PNG, GIF, SVG, or WebP image.');
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      showError('File size exceeds 5MB limit. Please upload a smaller image.');
      return;
    }

    setUploading(true);

    // Preview image locally first
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);

    // Upload to server
    const formDataObj = new FormData();
    formDataObj.append('colorwayImage', file);

    try {
      const response = await api.post('/techpacks/upload-colorway-image', formDataObj, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const imageUrl = response.data.data.url;
        setFormData(prev => ({ ...prev, imageUrl: imageUrl || undefined }));
        // Keep local preview for immediate display, will be replaced by server URL on next render
        if (imageUrl) {
          const resolvedUrl = resolveImageUrl(imageUrl);
          // Use resolved URL for preview if available, otherwise keep local preview
          if (resolvedUrl) {
            setImagePreview(resolvedUrl);
          }
        }
        showSuccess('Image uploaded successfully');
      } else {
        showError(response.data.message || 'Failed to upload image.');
        setImagePreview(null);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred.';
      showError(errorMessage);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, imageUrl: undefined }));
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleChangeImage = () => {
    fileInputRef.current?.click();
  };

  const handlePartInputChange = (field: keyof ColorwayPart) => (value: string) => {
    const updatedPartFormData = { ...partFormData, [field]: value };
    setPartFormData(updatedPartFormData);

    // Validate the part field in real-time
    partValidation.validateField(field, value);

    // Auto-generate RGB from hex
    if (field === 'hexCode' && value.match(/^#[0-9A-Fa-f]{6}$/)) {
      const r = parseInt(value.slice(1, 3), 16);
      const g = parseInt(value.slice(3, 5), 16);
      const b = parseInt(value.slice(5, 7), 16);
      setPartFormData(prev => ({ ...prev, rgbCode: `rgb(${r}, ${g}, ${b})` }));
    }
  };

  const handleBomSelection = (value: string) => {
    if (!value) {
      setPartFormData(prev => ({ ...prev, bomItemId: undefined }));
      return;
    }
    const selectedBom = bomById.get(value);
    setPartFormData(prev => ({
      ...prev,
      bomItemId: value,
      partName: selectedBom?.part || prev.partName || '',
      colorName: prev.colorName || selectedBom?.materialName || prev.colorName || '',
      supplier: prev.supplier || selectedBom?.supplier || '',
    }));
    partValidation.setFieldTouched('partName', true);
  };

  const handleAddPart = () => {
    const { isValid } = partValidation.validateForm(partFormData as Record<string, any>);
    if (!isValid) {
      Object.keys(colorwayPartValidationSchema).forEach(field => {
        partValidation.setFieldTouched(field, true);
      });
      return;
    }

    const newPart: ColorwayPart = {
      id: `part_${Date.now()}`,
      bomItemId: partFormData.bomItemId,
      partName: partFormData.partName!,
      colorName: partFormData.colorName!,
      pantoneCode: partFormData.pantoneCode || '',
      hexCode: partFormData.hexCode || '#000000',
      rgbCode: partFormData.rgbCode || '',
      colorType: partFormData.colorType || 'Solid',
    };

    setFormData(prev => ({
      ...prev,
      parts: [...(prev.parts || []), newPart]
    }));

    // Reset part form
    setPartFormData({
      bomItemId: undefined,
      partName: '',
      colorName: '',
      pantoneCode: '',
      hexCode: '#000000',
      rgbCode: '',
      colorType: 'Solid',
    });
  };

  const handleRemovePart = (partId: string) => {
    setFormData(prev => ({
      ...prev,
      parts: (prev.parts || []).filter(part => part.id !== partId)
    }));
  };

  const handleEditPart = (part: ColorwayPart) => {
    setPartFormData(part);
    handleRemovePart(part.id);
  };

  // Helper to format validation alert message
  const formatValidationAlert = (fieldKey: string): string => {
    const FIELD_LABEL_MAP: Record<string, string> = {
      name: 'Colorway Name',
      code: 'Colorway Code',
      placement: 'Placement',
      materialType: 'Material Type',
    };
    
    const fieldLabel = FIELD_LABEL_MAP[fieldKey] || fieldKey;
    return `Trường ${fieldLabel}, thuộc tab Colorways chưa được điền. Vui lòng điền đầy đủ thông tin.`;
  };

  const handleSubmit = () => {
    const { isValid, errors } = validation.validateForm(formData as Record<string, any>);
    if (!isValid) {
      Object.keys(colorwayFormValidationSchema).forEach(field => {
        validation.setFieldTouched(field, true);
      });
      // Show alert for first error field
      const firstField = Object.keys(errors).find(key => errors[key] && validation.touched[key]);
      if (firstField) {
        showError(formatValidationAlert(firstField));
      }
      return;
    }

    const colorway: Colorway = {
      id: editingIndex !== null ? colorways[editingIndex].id : `colorway_${Date.now()}`,
      _id: editingIndex !== null ? colorways[editingIndex]._id : undefined,
      name: (formData.name || '').trim(),
      code: (formData.code || '').trim(),
      placement: (formData.placement || '').trim(),
      materialType: (formData.materialType || '').trim(),
      season: formData.season || '',
      isDefault: !!formData.isDefault,
      approvalStatus: formData.approvalStatus || 'Pending',
      productionStatus: formData.productionStatus || 'Lab Dip',
      pantoneCode: formData.pantoneCode || '',
      hexColor: formData.hexColor || '#000000',
      supplier: formData.supplier || '',
      notes: formData.notes || '',
      collectionName: formData.collectionName,
      imageUrl: formData.imageUrl || undefined,
      parts: (formData.parts || []).map(part => ({ ...part })),
    };

    if (editingIndex !== null) {
      updateColorway(editingIndex, colorway);
      setEditingIndex(null);
    } else {
      addColorway(colorway);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      placement: '',
      materialType: '',
      season: '',
      isDefault: false,
      parts: [],
      approvalStatus: 'Pending',
      productionStatus: 'Lab Dip',
      hexColor: '#000000',
      pantoneCode: '',
      supplier: '',
      notes: '',
      imageUrl: undefined,
    });
    setPartFormData({
      bomItemId: undefined,
      partName: '',
      colorName: '',
      pantoneCode: '',
      hexCode: '#000000',
      rgbCode: '',
      colorType: 'Solid',
    });
    setImagePreview(null);
    setShowAddForm(false);
    setEditingIndex(null);
    validation.reset();
    partValidation.reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEdit = (colorway: Colorway, index: number) => {
    const imageUrl = colorway.imageUrl || undefined;
    setFormData({
      ...colorway,
      hexColor: colorway.hexColor || '#000000',
      pantoneCode: colorway.pantoneCode || '',
      supplier: colorway.supplier || '',
      notes: colorway.notes || '',
      imageUrl: imageUrl,
      parts: (colorway.parts || []).map(part => ({ ...part })),
    });
    // Set preview with resolved URL if imageUrl exists
    if (imageUrl) {
      const resolvedUrl = resolveImageUrl(imageUrl);
      setImagePreview(resolvedUrl);
    } else {
      setImagePreview(null);
    }
    setEditingIndex(index);
    setShowAddForm(true);
  };

  const handleDelete = (colorway: Colorway, index: number) => {
    if (window.confirm(`Are you sure you want to delete colorway "${colorway.name}"?`)) {
      deleteColorway(index);
    }
  };

  const handleDuplicate = (colorway: Colorway) => {
    const duplicated: Colorway = {
      ...colorway,
      id: `colorway_${Date.now()}`,
      _id: undefined,
      name: `${colorway.name} Copy`,
      code: `${colorway.code}_COPY`,
      isDefault: false,
      imageUrl: colorway.imageUrl || '', // Preserve imageUrl when duplicating
      parts: colorway.parts.map(part => ({
        ...part,
        id: `part_${Date.now()}_${Math.random()}`
      }))
    };
    
    addColorway(duplicated);
  };

  const handleSetDefault = (index: number) => {
    colorways.forEach((colorway, i) => {
      updateColorway(i, { 
        ...colorway, 
        isDefault: i === index,
        imageUrl: colorway.imageUrl || '', // Preserve imageUrl
      });
    });
  };

  const validatePantoneCode = (code: string): boolean => {
    // Basic Pantone code validation
    return /^(PANTONE\s+)?[0-9]{2,3}-[0-9]{4}\s+(TPX|TCX|C|U)$/i.test(code) || code === '';
  };

  const validateHexCode = (code: string): boolean => {
    return /^#[0-9A-Fa-f]{6}$/.test(code);
  };

  // Table columns for colorway parts
  const partColumns = [
    {
      key: 'bomItemId' as keyof ColorwayPart,
      header: 'Linked BOM',
      width: '25%',
      render: (_: any, item: ColorwayPart) => {
        if (!item.bomItemId) {
          return <span className="text-xs text-gray-400">Legacy / Custom</span>;
        }
        const linked = bomById.get(item.bomItemId);
        if (!linked) {
          return <span className="text-xs text-yellow-600">Missing BOM</span>;
        }
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">{linked.part}</span>
            <span className="text-xs text-gray-500 truncate">{linked.materialName}</span>
          </div>
        );
      }
    },
    {
      key: 'partName' as keyof ColorwayPart,
      header: 'Part',
      width: '20%',
    },
    {
      key: 'colorName' as keyof ColorwayPart,
      header: 'Color Name',
      width: '20%',
    },
    {
      key: 'pantoneCode' as keyof ColorwayPart,
      header: 'Pantone Code',
      width: '15%',
    },
    {
      key: 'hexCode' as keyof ColorwayPart,
      header: 'Color',
      width: '10%',
      render: (value: string) => (
        <div className="flex items-center space-x-2">
          <div 
            className="w-6 h-6 rounded border border-gray-300"
            style={{ backgroundColor: value }}
          />
          <span className="text-xs font-mono">{value}</span>
        </div>
      ),
    },
    {
      key: 'colorType' as keyof ColorwayPart,
      header: 'Type',
      width: '15%',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Colorways</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage color variations and Pantone specifications
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-center">
              <div className="text-2xl font-bold text-blue-600">{colorways.length}</div>
              <div className="text-gray-500">Colorways</div>
            </div>
            <div className="text-sm text-center">
              <div className="text-2xl font-bold text-green-600">
                {colorways.filter(c => c.approvalStatus === 'Approved').length}
              </div>
              <div className="text-gray-500">Approved</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                showPreview
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview Mode
            </button>

            {colorways.length > 0 && (
              <Select
                label=""
                value={selectedColorway}
                onChange={setSelectedColorway}
                options={colorways.map(c => ({ value: c.id, label: c.name }))}
                placeholder="Select colorway to preview..."
                className="min-w-48"
              />
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </button>
            <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Colorway
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {editingIndex !== null ? 'Edit Colorway' : 'Add New Colorway'}
          </h3>
          
          {/* Image Upload Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Colorway Image</label>
            <div className="relative">
              {/* Image Preview */}
              <div className="w-full h-[180px] rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center relative">
                <ZoomableImage
                  src={imagePreview || (formData.imageUrl ? resolveImageUrl(formData.imageUrl) : '')}
                  alt="Colorway preview"
                  containerClassName="w-full h-full"
                  className="bg-white"
                  fallback={renderImagePlaceholder()}
                />
              </div>
              
              {/* Upload Button */}
              <div className="mt-3 flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/svg+xml,image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      {formData.imageUrl || imagePreview ? 'Change Image' : 'Upload Image'}
                    </>
                  )}
                </button>
                {(formData.imageUrl || imagePreview) && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Supported formats: JPEG, PNG, GIF, SVG, WebP (Max 5MB)</p>
            </div>
          </div>

          {/* Colorway Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Input
              label="Colorway Name"
              value={formData.name || ''}
              onChange={handleInputChange('name')}
              onBlur={validation.getFieldProps('name').onBlur}
              placeholder="e.g., Navy Blazer"
              required
              error={validation.getFieldProps('name').error}
              helperText={validation.getFieldProps('name').helperText}
            />

            <Input
              label="Colorway Code"
              value={formData.code || ''}
              onChange={handleInputChange('code')}
              onBlur={validation.getFieldProps('code').onBlur}
              placeholder="e.g., NVY001"
              required
              error={validation.getFieldProps('code').error}
              helperText={validation.getFieldProps('code').helperText}
            />

            <Input
              label="Season"
              value={formData.season || ''}
              onChange={handleSeasonChange}
              onBlur={() => validation.setFieldTouched('season')}
              placeholder="e.g., SS25, FW26, Resort 2026"
              error={validation.getFieldProps('season').error}
              helperText={validation.getFieldProps('season').helperText}
              datalistOptions={seasonDatalistOptions}
              listId="colorway-season-options"
            />

            <Input
              label="Placement"
              value={formData.placement || ''}
              onChange={handleInputChange('placement')}
              onBlur={validation.getFieldProps('placement').onBlur}
              placeholder="e.g., Body"
              required
              error={validation.getFieldProps('placement').error}
              helperText={validation.getFieldProps('placement').helperText}
            />

            <Input
              label="Material Type"
              value={formData.materialType || ''}
              onChange={handleInputChange('materialType')}
              onBlur={validation.getFieldProps('materialType').onBlur}
              placeholder="e.g., Cotton"
              required
              error={validation.getFieldProps('materialType').error}
              helperText={validation.getFieldProps('materialType').helperText}
            />

            <Input
              label="Supplier"
              value={formData.supplier || ''}
              onChange={handleInputChange('supplier')}
              onBlur={validation.getFieldProps('supplier').onBlur}
              placeholder="Optional supplier name"
              error={validation.getFieldProps('supplier').error}
              helperText={validation.getFieldProps('supplier').helperText}
            />

            <Input
              label="Pantone Code"
              value={formData.pantoneCode || ''}
              onChange={handleInputChange('pantoneCode')}
              onBlur={validation.getFieldProps('pantoneCode').onBlur}
              placeholder="19-4052 TPX"
              error={validation.getFieldProps('pantoneCode').error}
              helperText={validation.getFieldProps('pantoneCode').helperText}
            />

            <div className="flex flex-col space-y-1">
              <label className="text-sm font-medium text-gray-700">Primary Hex Color</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={formData.hexColor || '#000000'}
                  onChange={(e) => handleInputChange('hexColor')(e.target.value)}
                  onBlur={validation.getFieldProps('hexColor').onBlur}
                  className={`w-10 h-10 border rounded cursor-pointer ${validation.getFieldProps('hexColor').error ? 'border-red-500' : 'border-gray-300'}`}
                />
                <input
                  type="text"
                  value={formData.hexColor || '#000000'}
                  onChange={(e) => handleInputChange('hexColor')(e.target.value)}
                  onBlur={validation.getFieldProps('hexColor').onBlur}
                  className={`flex-1 px-3 py-2 border rounded-md text-sm font-mono ${validation.getFieldProps('hexColor').error ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="#000000"
                />
              </div>
              {validation.getFieldProps('hexColor').error && (
                <p className="mt-1 text-xs text-red-600">{validation.getFieldProps('hexColor').helperText}</p>
              )}
            </div>

            <div className="md:col-span-3">
              <label className="text-sm font-medium text-gray-700" htmlFor="colorway-notes">
                Notes
              </label>
              <textarea
                id="colorway-notes"
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes')(e.target.value)}
                onBlur={validation.getFieldProps('notes').onBlur}
                placeholder="Optional notes about this colorway"
                className={`mt-1 w-full px-3 py-2 border rounded-md text-sm min-h-[72px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${validation.getFieldProps('notes').error ? 'border-red-500' : 'border-gray-300'}`}
              />
              {validation.getFieldProps('notes').error && (
                <p className="mt-1 text-xs text-red-600">{validation.getFieldProps('notes').helperText}</p>
              )}
            </div>

            <Select
              label="Approval Status"
              value={formData.approvalStatus || 'Pending'}
              onChange={handleInputChange('approvalStatus')}
              onBlur={() => validation.setFieldTouched('approvalStatus')}
              options={approvalStatusOptions}
              error={validation.getFieldProps('approvalStatus').error}
              helperText={validation.getFieldProps('approvalStatus').helperText}
            />

            <Select
              label="Production Status"
              value={formData.productionStatus || 'Lab Dip'}
              onChange={handleInputChange('productionStatus')}
              onBlur={() => validation.setFieldTouched('productionStatus')}
              options={productionStatusOptions}
              error={validation.getFieldProps('productionStatus').error}
              helperText={validation.getFieldProps('productionStatus').helperText}
            />

            <div className="flex items-center space-x-2 mt-6">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault || false}
                onChange={(e) => handleInputChange('isDefault')(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isDefault" className="text-sm font-medium text-gray-700">
                Set as default colorway
              </label>
            </div>
          </div>

          {/* Color Parts Section */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-md font-semibold text-gray-800 mb-4">Color Parts</h4>
            
            {/* Add Part Form */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                <Select
                  label="BOM Item"
                  value={partFormData.bomItemId || ''}
                  onChange={handleBomSelection}
                  onBlur={() => partValidation.setFieldTouched('partName')}
                  options={bomOptions}
                  placeholder={bomOptions.length ? 'Select BOM item…' : 'No BOM items yet'}
                  disabled={!bomOptions.length}
                  helperText={
                    bomOptions.length
                      ? 'Liên kết dòng BOM để áp màu chính xác từng vật tư'
                      : 'Thêm BOM ở tab BOM để liên kết màu sắc từng dòng.'
                  }
                />

                <Input
                  label="Part Label"
                  value={partFormData.partName || ''}
                  onChange={handlePartInputChange('partName')}
                  onBlur={() => partValidation.setFieldTouched('partName')}
                  placeholder="Custom part label"
                  error={partValidation.getFieldProps('partName').error}
                  helperText={partValidation.getFieldProps('partName').helperText}
                />

                <Input
                  label="Color Name"
                  value={partFormData.colorName || ''}
                  onChange={handlePartInputChange('colorName')}
                  onBlur={() => partValidation.setFieldTouched('colorName')}
                  placeholder="e.g., Navy Blue"
                  error={partValidation.getFieldProps('colorName').error}
                  helperText={partValidation.getFieldProps('colorName').helperText}
                />

                <Input
                  label="Pantone Code"
                  value={partFormData.pantoneCode || ''}
                  onChange={handlePartInputChange('pantoneCode')}
                  onBlur={() => partValidation.setFieldTouched('pantoneCode')}
                  placeholder="19-4052 TPX"
                  error={partValidation.getFieldProps('pantoneCode').error}
                  helperText={partValidation.getFieldProps('pantoneCode').helperText}
                />
                
                <div className="flex flex-col space-y-1">
                  <label className="text-sm font-medium text-gray-700">Hex Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={partFormData.hexCode || '#000000'}
                      onChange={(e) => handlePartInputChange('hexCode')(e.target.value)}
                      onBlur={() => partValidation.setFieldTouched('hexCode')}
                      className={`w-10 h-10 border rounded cursor-pointer ${partValidation.getFieldProps('hexCode').error ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    <input
                      type="text"
                      value={partFormData.hexCode || '#000000'}
                      onChange={(e) => handlePartInputChange('hexCode')(e.target.value)}
                      onBlur={() => partValidation.setFieldTouched('hexCode')}
                      className={`flex-1 px-3 py-2 border rounded-md text-sm font-mono ${partValidation.getFieldProps('hexCode').error ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="#000000"
                    />
                  </div>
                  {partValidation.getFieldProps('hexCode').error && (
                    <p className="mt-1 text-xs text-red-600">{partValidation.getFieldProps('hexCode').helperText}</p>
                  )}
                </div>

                <Select
                  label="Type"
                  value={partFormData.colorType || 'Solid'}
                  onChange={handlePartInputChange('colorType')}
                  onBlur={() => partValidation.setFieldTouched('colorType')}
                  options={colorTypeOptions}
                  error={partValidation.getFieldProps('colorType').error}
                  helperText={partValidation.getFieldProps('colorType').helperText}
                />

                <button
                  onClick={handleAddPart}
                  disabled={!partValidation.isValid}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md h-10 ${!partValidation.isValid ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  Add Part
                </button>
              </div>
            </div>

            {/* Parts Table */}
            {formData.parts && formData.parts.length > 0 && (
              <DataTable
                data={formData.parts}
                columns={partColumns}
                onEdit={(part) => handleEditPart(part)}
                onDelete={(part) => handleRemovePart(part.id)}
                showActions={true}
                addButtonText=""
                emptyMessage=""
                className="mb-4"
              />
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
              className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md ${!validation.isValid ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {editingIndex !== null ? 'Update' : 'Add'} Colorway
            </button>
          </div>
        </div>
      )}

      {/* Colorways Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {colorways.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Palette className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No colorways defined</p>
            <p className="text-sm">Add colorways to define different color variations for this tech pack.</p>
          </div>
        ) : (
          colorways.map((colorway, index) => (
            <div key={colorway.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Image Section */}
              <div className="w-full h-[180px] sm:h-[200px] md:h-[180px] rounded-t-lg border-b border-gray-200 bg-gray-50 overflow-hidden relative group">
                <ZoomableImage
                  src={colorway.imageUrl ? resolveImageUrl(colorway.imageUrl) : ''}
                  alt={colorway.name}
                  containerClassName="w-full h-full bg-white"
                  fallback={renderImagePlaceholder('No image')}
                />
                <div className="absolute inset-0 pointer-events-none bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-300" />
              </div>
              
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-gray-900">{colorway.name}</h3>
                    {colorway.isDefault && (
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDuplicate(colorway)}
                      className="text-gray-600 hover:text-gray-800"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(colorway, index)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit"
                    >
                      <Palette className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-sm text-gray-600 mb-3">
                  <div>Code: <span className="font-mono">{colorway.code}</span></div>
                  <div>Placement: <span className="font-medium text-gray-700">{colorway.placement}</span></div>
                  <div>Material: <span className="font-medium text-gray-700">{colorway.materialType}</span></div>
                  {colorway.supplier && (
                    <div>Supplier: <span className="text-gray-700">{colorway.supplier}</span></div>
                  )}
                  {colorway.pantoneCode && (
                    <div>Pantone: <span className="font-mono">{colorway.pantoneCode}</span></div>
                  )}
                  {colorway.hexColor && (
                    <div className="flex items-center space-x-2">
                      <span>Hex:</span>
                      <span className="inline-flex items-center space-x-2">
                        <span
                          className="w-4 h-4 rounded border border-gray-300"
                          style={{ backgroundColor: colorway.hexColor }}
                        />
                        <span className="font-mono">{colorway.hexColor}</span>
                      </span>
                    </div>
                  )}
                  {(colorway.approvalStatus !== 'Pending' || colorway.productionStatus) && (
                    <div
                      className={`flex items-center mt-1 ${
                        colorway.approvalStatus !== 'Pending' && colorway.productionStatus
                          ? 'justify-between'
                          : colorway.approvalStatus !== 'Pending'
                            ? 'justify-start'
                            : 'justify-end'
                      }`}
                    >
                      {colorway.approvalStatus !== 'Pending' && (
                        <span>
                          Status:{' '}
                          <span
                            className={`font-medium ${
                              colorway.approvalStatus === 'Approved'
                                ? 'text-green-600'
                                : colorway.approvalStatus === 'Rejected'
                                  ? 'text-red-600'
                                  : 'text-yellow-600'
                            }`}
                          >
                            {colorway.approvalStatus}
                          </span>
                        </span>
                      )}
                      {colorway.productionStatus && (
                        <span className="text-xs text-gray-500">{colorway.productionStatus}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Color Swatches */}
                <div className="space-y-2 mb-4">
                  {colorway.parts.slice(0, 4).map((part) => (
                    <div key={part.id} className="flex items-center space-x-3">
                      <div 
                        className="w-6 h-6 rounded border border-gray-300 flex-shrink-0"
                        style={{ backgroundColor: part.hexCode }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{part.partName}</div>
                        <div className="text-xs text-gray-500 truncate">{part.colorName}</div>
                      </div>
                      {part.pantoneCode && (
                        <div className="text-xs text-gray-400 font-mono">{part.pantoneCode}</div>
                      )}
                    </div>
                  ))}
                  {colorway.parts.length > 4 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{colorway.parts.length - 4} more parts
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {!colorway.isDefault && (
                      <button
                        onClick={() => handleSetDefault(index)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Set Default
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(colorway, index)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Export validate function for use in parent component
export const validateColorwaysForSave = (colorways: Colorway[]): { isValid: boolean; errors: Array<{ id: string; item: Colorway; errors: Record<string, string> }> } => {
  const errors: Array<{ id: string; item: Colorway; errors: Record<string, string> }> = [];
  
  colorways.forEach((item) => {
    const itemErrors: Record<string, string> = {};
    
    // Convert validation schema to ValidationRule format for validateFields
    const schema: Record<string, any> = {};
    Object.entries(colorwayFormValidationSchema).forEach(([key, rule]) => {
      schema[key] = {
        required: rule.required,
        minLength: rule.minLength,
        maxLength: rule.maxLength,
        min: rule.min,
        max: rule.max,
        custom: rule.custom
      };
    });
    
    // Validate basic fields
    const validationResult = validateFields(item as Record<string, any>, schema);
    validationResult.errors.forEach(err => {
      itemErrors[err.field] = err.message;
    });
    
    if (Object.keys(itemErrors).length > 0) {
      errors.push({ id: item.id, item, errors: itemErrors });
    }
  });
  
  return { isValid: errors.length === 0, errors };
};

export default ColorwayTab;
