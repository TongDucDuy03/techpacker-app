import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { articleInfoValidationSchema } from '../../../utils/validationSchemas';
import { api } from '../../../lib/api';
import { useDebounce } from '../../../hooks/useDebounce';
import { showError, showWarning } from '../../../lib/toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1';
import { TechPack, PRODUCT_CLASSES, ArticleInfo, TechPackStatus } from '../../../types/techpack';
import Input from '../shared/Input';
import Select from '../shared/Select';
import Textarea from '../shared/Textarea';
import { Save, RotateCcw, ArrowRight, Calendar, User, UploadCloud, XCircle, CheckCircle, AlertCircle, Lock } from 'lucide-react';

interface ArticleInfoTabProps {
  techPack?: TechPack;
  mode?: 'create' | 'edit' | 'view';
  onUpdate?: (updates: Partial<TechPack>) => void;
  setCurrentTab?: (tab: number) => void;
}

export interface ArticleInfoTabRef {
  validateAndSave: () => boolean;
}

const ArticleInfoTab = forwardRef<ArticleInfoTabRef, ArticleInfoTabProps>((props, ref) => {
  const { techPack, mode = 'create', onUpdate, setCurrentTab } = props;
  const validation = useFormValidation(articleInfoValidationSchema);
  const { articleInfo } = techPack ?? {};
  const [designers, setDesigners] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingDesigners, setLoadingDesigners] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);

  // Fallback if no techPack is passed
  const safeArticleInfo = articleInfo ?? {
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
  };

  // Fetch designers on component mount
  useEffect(() => {
    const fetchDesigners = async () => {
      setLoadingDesigners(true);
      try {
        const response = await api.getAllUsers({ role: 'designer' });
        const designerOptions = response.users.map(user => ({
          value: user._id,
          label: `${user.firstName} ${user.lastName}`
        }));
        setDesigners(designerOptions);
      } catch (error) {
        // Failed to fetch designers - handle silently
      } finally {
        setLoadingDesigners(false);
      }
    };

    fetchDesigners();
  }, []);

  // Debounce articleCode for duplicate check
  const debouncedArticleCode = useDebounce(safeArticleInfo.articleCode, 500);

  // Check for duplicate articleCode (only in create mode)
  useEffect(() => {
    const checkDuplicate = async () => {
      if (mode !== 'create' || !debouncedArticleCode || debouncedArticleCode.length < 3) {
        setIsDuplicate(false);
        return;
      }

      // Validate format first - must match validation schema exactly
      if (!/^[A-Z0-9-]+$/.test(debouncedArticleCode)) {
        setIsDuplicate(false);
        return;
      }

      setCheckingDuplicate(true);
      setIsDuplicate(false);

      try {
        // Check if articleCode exists
        const response = await api.get(`/techpacks/check-article-code/${encodeURIComponent(debouncedArticleCode.toUpperCase())}`);
        const exists = response.data?.exists || response.data?.data?.exists || false;
        setIsDuplicate(exists);
        
        if (exists) {
          showWarning('This article code already exists. Please use a different code.');
        }
      } catch (error: any) {
        // If 404, articleCode doesn't exist (good)
        if (error.response?.status === 404) {
          setIsDuplicate(false);
        } else {
          // Other errors - don't block user, just log
          console.error('Error checking article code:', error);
        }
      } finally {
        setCheckingDuplicate(false);
      }
    };

    checkDuplicate();
  }, [debouncedArticleCode, mode]);

  // Gender options
  const genderOptions = [
    { value: 'Men', label: 'Men' },
    { value: 'Women', label: 'Women' },
    { value: 'Unisex', label: 'Unisex' },
    { value: 'Kids', label: 'Kids' }
  ];

  // Fit type options
  const fitTypeOptions = [
    { value: 'Regular', label: 'Regular Fit' },
    { value: 'Slim', label: 'Slim Fit' },
    { value: 'Loose', label: 'Loose Fit' },
    { value: 'Relaxed', label: 'Relaxed Fit' },
    { value: 'Oversized', label: 'Oversized' }
  ];

  // Season options
  const seasonOptions = [
    { value: 'Spring', label: 'Spring' },
    { value: 'Summer', label: 'Summer' },
    { value: 'Autumn', label: 'Autumn' },
    { value: 'Winter', label: 'Winter' },
    { value: 'SS25', label: 'Spring/Summer 2025' },
    { value: 'FW25', label: 'Fall/Winter 2025' },
    { value: 'SS26', label: 'Spring/Summer 2026' },
    { value: 'FW26', label: 'Fall/Winter 2026' }
  ];

  // Lifecycle stage options
  const lifecycleOptions = [
    { value: 'Concept', label: 'Concept' },
    { value: 'Design', label: 'Design' },
    { value: 'Development', label: 'Development' },
    { value: 'Pre-production', label: 'Pre-production' },
    { value: 'Production', label: 'Production' },
    { value: 'Shipped', label: 'Shipped' }
  ];

  // Product class options
  const productClassOptions = PRODUCT_CLASSES.map(cls => ({ value: cls, label: cls }));

  // Price point options
  const pricePointOptions = [
    { value: 'Value', label: 'Value' },
    { value: 'Mid-range', label: 'Mid-range' },
    { value: 'Premium', label: 'Premium' },
    { value: 'Luxury', label: 'Luxury' }
  ];

  // Status options (matching backend enum)
  const statusOptions: Array<{ value: TechPackStatus; label: string }> = [
    { value: 'Draft', label: 'Draft' },
    { value: 'In Review', label: 'In Review' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Rejected', label: 'Rejected' },
    { value: 'Archived', label: 'Archived' }
  ];

  // Currency options
  const currencyOptions = [
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'GBP', label: 'GBP - British Pound' },
    { value: 'JPY', label: 'JPY - Japanese Yen' },
    { value: 'CNY', label: 'CNY - Chinese Yuan' },
    { value: 'VND', label: 'VND - Vietnamese Dong' }
  ];

  const handleInputChange = (field: keyof ArticleInfo) => (value: string | number) => {
    // Update the form data
    const updatedArticleInfo = { ...safeArticleInfo, [field]: value };
    onUpdate?.({ articleInfo: updatedArticleInfo });

    // Validate the field in real-time
    validation.validateField(field, value);
  };

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

    const formData = new FormData();
    formData.append('designSketch', file);

    try {
      const response = await api.post('/techpacks/upload-sketch', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const imageUrl = response.data.data.url;
        handleInputChange('designSketchUrl')(imageUrl);
        validation.validateField('designSketchUrl', imageUrl);
        setUploadError(null);
      } else {
        setUploadError(response.data.message || 'Failed to upload image.');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred.';
      setUploadError(errorMessage);
      showError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  // Handle drag and drop for design sketch
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
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

    const formData = new FormData();
    formData.append('designSketch', file);

    try {
      const response = await api.post('/techpacks/upload-sketch', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const imageUrl = response.data.data.url;
        handleInputChange('designSketchUrl')(imageUrl);
        validation.validateField('designSketchUrl', imageUrl);
        setUploadError(null);
      } else {
        setUploadError(response.data.message || 'Failed to upload image.');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred.';
      setUploadError(errorMessage);
      showError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  // Helper to get image URL - handles both relative and absolute URLs
  const getImageUrl = (url: string | undefined): string => {
    if (!url) return '';
    // If URL is already absolute (starts with http:// or https://), return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // If URL starts with /, it's already a path, just prepend API base
    if (url.startsWith('/')) {
      return `${API_BASE_URL}${url}`;
    }
    // Otherwise, assume it's a relative path
    return `${API_BASE_URL}/${url}`;
  };

  const handleReset = () => {
    const confirmed = window.confirm('Are you sure you want to reset all fields? This action cannot be undone.');
    if (confirmed) {
      onUpdate?.({
        articleInfo: {
          ...safeArticleInfo, // Keep id and other fields
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
          season: 'Spring',
          lifecycleStage: 'Concept',
          brand: '',
          collection: '',
          targetMarket: '',
          pricePoint: undefined,
          notes: ''
        }
      });
    }
  };

    const scrollToFirstError = (errors: Record<string, string>) => {
    const firstErrorField = Object.keys(errors)[0];
    if (firstErrorField) {
      // Try multiple selector strategies for better compatibility
      let element: Element | null = null;
      
      // Strategy 1: Try by field name in id attribute
      element = document.querySelector(`[id*="${firstErrorField}"]`);
      
      // Strategy 2: Try by name attribute
      if (!element) {
        element = document.querySelector(`[name="${firstErrorField}"]`);
      }
      
      // Strategy 3: Try by data-field attribute (if components use it)
      if (!element) {
        element = document.querySelector(`[data-field="${firstErrorField}"]`);
      }
      
      // Strategy 4: Try by label text (fallback)
      if (!element) {
        const labels = Array.from(document.querySelectorAll('label'));
        const matchingLabel = labels.find(label => 
          label.textContent?.toLowerCase().includes(firstErrorField.toLowerCase())
        );
        if (matchingLabel) {
          const labelFor = matchingLabel.getAttribute('for');
          if (labelFor) {
            element = document.getElementById(labelFor);
          }
        }
      }
      
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Focus the element if it's focusable
        if (element instanceof HTMLElement && 'focus' in element) {
          (element as HTMLElement).focus();
        }
      }
    }
  };

  const isArticleInfoChanged = (): boolean => {
    const current = (techPack || {}) as any;
    const currentInfo = (current.articleInfo || {}) as any;
    const nextInfo = safeArticleInfo as any;
    // Shallow compare relevant fields of Article Info and status
    const fieldsToCompare = [
      'articleCode','productName','version','gender','productClass','fitType','supplier','technicalDesignerId',
      'fabricDescription','productDescription','designSketchUrl','season','lifecycleStage','brand','collection',
      'targetMarket','pricePoint','currency','retailPrice','notes'
    ];
    for (const key of fieldsToCompare) {
      if ((currentInfo as any)?.[key] !== (nextInfo as any)?.[key]) {
        return true;
      }
    }
    // status can be on root or inside articleInfo safe
    const nextStatus = nextInfo.status || current.status || 'Draft';
    if (current.status !== nextStatus) {
      return true;
    }
    return false;
  };

  const handleSave = () => {
    // Check for duplicate articleCode before saving
    if (mode === 'create' && isDuplicate) {
      showError('Cannot save: Article code already exists. Please use a different code.');
      return;
    }

    const { isValid, errors } = validation.validateForm(safeArticleInfo);

    if (!isValid) {
      Object.keys(articleInfoValidationSchema).forEach(field => {
        validation.setFieldTouched(field, true);
      });
      // Show user-friendly alert for the first error field
      const firstField = Object.keys(errors)[0];
      const fieldLabelMap: Record<string, string> = {
        articleCode: 'Article Code',
        productName: 'Product Name',
        version: 'Version',
        gender: 'Gender',
        productClass: 'Product Class',
        fitType: 'Fit Type',
        supplier: 'Supplier',
        technicalDesignerId: 'Technical Designer',
        fabricDescription: 'Fabric Description',
        productDescription: 'Product Description',
        designSketchUrl: 'Design Sketch',
        season: 'Season',
        lifecycleStage: 'Lifecycle Stage'
      };
      const fieldLabel = firstField ? (fieldLabelMap[firstField] || firstField) : 'Một trường bắt buộc';
      showError(`Trường ${fieldLabel}, thuộc tab Article Info chưa được điền. Vui lòng điền đầy đủ thông tin.`);
      scrollToFirstError(errors);
      return;
    }

    // Only propagate updates if actually changed to avoid toggling unsaved state
    if (isArticleInfoChanged()) {
      onUpdate?.({
        ...(techPack || {}),
        articleInfo: safeArticleInfo,
        status: safeArticleInfo.status || techPack?.status || 'Draft'
      });
    }
  };

  // Expose validateAndSave for parent via ref
  useImperativeHandle(ref, () => ({
    validateAndSave: () => {
      // Check for duplicate articleCode before saving
      if (mode === 'create' && isDuplicate) {
        showError('Cannot save: Article code already exists. Please use a different code.');
        return false;
      }

      const { isValid, errors } = validation.validateForm(safeArticleInfo);
      if (!isValid) {
        Object.keys(articleInfoValidationSchema).forEach(field => {
          validation.setFieldTouched(field, true);
        });
        const firstField = Object.keys(errors)[0];
        const fieldLabelMap: Record<string, string> = {
          articleCode: 'Article Code',
          productName: 'Product Name',
          version: 'Version',
          gender: 'Gender',
          productClass: 'Product Class',
          fitType: 'Fit Type',
          supplier: 'Supplier',
          technicalDesignerId: 'Technical Designer',
          fabricDescription: 'Fabric Description',
          productDescription: 'Product Description',
          designSketchUrl: 'Design Sketch',
          season: 'Season',
          lifecycleStage: 'Lifecycle Stage'
        };
        const fieldLabel = firstField ? (fieldLabelMap[firstField] || firstField) : 'Một trường bắt buộc';
        showError(`Trường ${fieldLabel}, thuộc tab Article Info chưa được điền. Vui lòng điền đầy đủ thông tin.`);
        scrollToFirstError(errors);
        return false;
      }

      // Only update if changed; still return true to pass validation
      if (isArticleInfoChanged()) {
        onUpdate?.({
          ...(techPack || {}),
          articleInfo: safeArticleInfo,
          status: safeArticleInfo.status || techPack?.status || 'Draft'
        });
      }
      return true;
    }
  }));

  const handleNextTab = () => {
    const { isValid, errors } = validation.validateForm(safeArticleInfo);

    if (!isValid) {
      Object.keys(articleInfoValidationSchema).forEach(field => {
        validation.setFieldTouched(field, true);
      });
      scrollToFirstError(errors);
      return;
    }

    onUpdate?.({
      ...(techPack || {}),
      articleInfo: safeArticleInfo
    });

    setCurrentTab?.(1);
  };

  // Calculate form completion percentage
  const completionPercentage = useMemo(() => {
    const requiredFields = ['articleCode', 'productName', 'fabricDescription', 'productDescription', 'supplier', 'season', 'technicalDesignerId', 'gender', 'productClass', 'fitType'];
    const optionalFields = ['brand', 'collection', 'targetMarket', 'pricePoint', 'notes'];

    let totalRequired = requiredFields.length;
    let totalCompleted = 0;

    // Count completed required fields
    requiredFields.forEach(field => {
      if (safeArticleInfo[field as keyof typeof safeArticleInfo]) {
        totalCompleted++;
      }
    });

    // Handle conditionally required designSketchUrl (only for Concept/Design stages)
    const isDesignSketchRequired = ['Concept', 'Design'].includes(safeArticleInfo.lifecycleStage || '');
    if (isDesignSketchRequired) {
      totalRequired++;
      if (safeArticleInfo.designSketchUrl) {
        totalCompleted++;
      }
    }

    // Count completed optional fields
    const optionalCompleted = optionalFields.filter(field =>
      safeArticleInfo[field as keyof typeof safeArticleInfo]
    ).length;

    const totalFieldsWeight = (totalRequired * 2) + optionalFields.length;
    if (totalFieldsWeight === 0) return 0; // Avoid division by zero

    const completedWeight = (totalCompleted * 2) + optionalCompleted;

    return Math.round((completedWeight / totalFieldsWeight) * 100);
  }, [safeArticleInfo]);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Article Information</h1>
            <p className="text-sm text-gray-600 mt-1">
              Basic product information and technical specifications
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-sm text-gray-500">
              Completion: <span className="font-medium text-blue-600">{completionPercentage}%</span>
            </div>
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Required Fields */}
              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                  Required Information
                </h3>
              </div>

              <div>
                <Input
                  label="Article Code"
                  value={safeArticleInfo.articleCode}
                  onChange={(value) => {
                    // Auto-uppercase articleCode
                    const upperValue = String(value).toUpperCase();
                    handleInputChange('articleCode')(upperValue);
                  }}
                  onBlur={() => validation.setFieldTouched('articleCode')}
                  placeholder="e.g., SHRT-001-SS25"
                  required
                  maxLength={50}
                  disabled={mode !== 'create'}
                  error={validation.getFieldProps('articleCode').error || (isDuplicate ? 'This article code already exists' : undefined)}
                  helperText={
                    checkingDuplicate 
                      ? 'Checking availability...' 
                      : isDuplicate 
                        ? 'This article code is already in use' 
                        : validation.getFieldProps('articleCode').helperText || 'Article code must be unique'
                  }
                />
                {checkingDuplicate && (
                  <div className="flex items-center text-xs text-blue-600 mt-1">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                    Checking availability...
                  </div>
                )}
                {!checkingDuplicate && isDuplicate && (
                  <div className="flex items-center text-xs text-red-600 mt-1">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    This article code already exists
                  </div>
                )}
                {!checkingDuplicate && !isDuplicate && debouncedArticleCode && debouncedArticleCode.length >= 3 && (
                  <div className="flex items-center text-xs text-green-600 mt-1">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Article code is available
                  </div>
                )}
              </div>

              <Input
                label="Product Name"
                value={safeArticleInfo.productName}
                onChange={handleInputChange('productName')}
                onBlur={() => validation.setFieldTouched('productName')}
                placeholder="e.g., Men's Oxford Button-Down Shirt"
                required
                maxLength={255}
                disabled={mode === 'view'}
                error={validation.getFieldProps('productName').error}
                helperText={validation.getFieldProps('productName').helperText}
              />

              {/* Version - Readonly when editing/viewing */}
              <div className="relative">
                <Input
                  label="Version"
                  value={safeArticleInfo.version}
                  onChange={handleInputChange('version')}
                  onBlur={() => validation.setFieldTouched('version')}
                  type="number"
                  min={1}
                  max={999}
                  disabled={mode === 'view' || mode === 'edit'}
                  error={validation.getFieldProps('version').error}
                  helperText={
                    (mode === 'edit' || mode === 'view') 
                      ? 'Version is automatically managed by the system' 
                      : validation.getFieldProps('version').helperText
                  }
                />
                {(mode === 'edit' || mode === 'view') && (
                  <div className="absolute right-3 top-8 text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                )}
              </div>

              <Select
                label="Gender"
                value={safeArticleInfo.gender}
                onChange={handleInputChange('gender')}
                onBlur={() => validation.setFieldTouched('gender')}
                options={genderOptions}
                required
                disabled={mode === 'view'}
                error={validation.getFieldProps('gender').error}
                helperText={validation.getFieldProps('gender').helperText}
              />

              <Select
                label="Product Class"
                value={safeArticleInfo.productClass}
                onChange={handleInputChange('productClass')}
                onBlur={() => validation.setFieldTouched('productClass')}
                options={productClassOptions}
                placeholder="Select product category..."
                required
                disabled={mode === 'view'}
                error={validation.getFieldProps('productClass').error}
                helperText={validation.getFieldProps('productClass').helperText}
              />

              <Select
                label="Fit Type"
                value={safeArticleInfo.fitType}
                onChange={handleInputChange('fitType')}
                onBlur={() => validation.setFieldTouched('fitType')}
                options={fitTypeOptions}
                required
                disabled={mode === 'view'}
                error={validation.getFieldProps('fitType').error}
                helperText={validation.getFieldProps('fitType').helperText}
              />

              {/* Product Details */}
              <div className="md:col-span-2 mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Product Details
                </h3>
              </div>

              <Input
                label="Supplier"
                value={safeArticleInfo.supplier}
                onChange={handleInputChange('supplier')}
                onBlur={() => validation.setFieldTouched('supplier')}
                placeholder="Supplier name or code"
                required
                maxLength={255}
                disabled={mode === 'view'}
                error={validation.getFieldProps('supplier').error}
                helperText={validation.getFieldProps('supplier').helperText}
              />

              <Select
                label="Technical Designer"
                value={safeArticleInfo.technicalDesignerId}
                onChange={handleInputChange('technicalDesignerId')}
                onBlur={() => validation.setFieldTouched('technicalDesignerId')}
                options={designers}
                placeholder={loadingDesigners ? 'Loading...' : 'Select a designer'}
                required
                disabled={mode === 'view' || loadingDesigners}
                error={validation.getFieldProps('technicalDesignerId').error}
                helperText={validation.getFieldProps('technicalDesignerId').helperText}
              />

              <Select
                label="Season"
                value={safeArticleInfo.season}
                onChange={handleInputChange('season')}
                onBlur={() => validation.setFieldTouched('season')}
                options={seasonOptions}
                required
                disabled={mode === 'view'}
                error={validation.getFieldProps('season').error}
                helperText={validation.getFieldProps('season').helperText}
              />

              <Select
                label="Lifecycle Stage"
                value={safeArticleInfo.lifecycleStage}
                onChange={handleInputChange('lifecycleStage')}
                onBlur={() => validation.setFieldTouched('lifecycleStage')}
                options={lifecycleOptions}
                required
                disabled={mode === 'view'}
                error={validation.getFieldProps('lifecycleStage').error}
                helperText={validation.getFieldProps('lifecycleStage').helperText}
              />

              {/* Status field - only editable by Admin/Merchandiser */}
              <Select
                label="Status"
                value={safeArticleInfo.status || techPack?.status || 'Draft'}
                onChange={(value) => {
                  const updatedArticleInfo = { ...safeArticleInfo, status: value as TechPackStatus };
                  onUpdate?.({ articleInfo: updatedArticleInfo, status: value as TechPackStatus });
                  validation.validateField('status', value);
                }}
                onBlur={() => validation.setFieldTouched('status')}
                options={statusOptions}
                disabled={mode === 'view'}
                error={validation.getFieldProps('status').error}
                helperText={validation.getFieldProps('status').helperText || 'Current status of this TechPack'}
              />

              {/* Optional Fields */}
              <div className="md:col-span-2 mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                  Additional Information
                </h3>
              </div>

              <Input
                label="Brand"
                value={safeArticleInfo.brand || ''}
                onChange={handleInputChange('brand')}
                onBlur={() => validation.setFieldTouched('brand')}
                placeholder="Brand name"
                maxLength={255}
                disabled={mode === 'view'}
                error={validation.getFieldProps('brand').error}
                helperText={validation.getFieldProps('brand').helperText}
              />

              <Input
                label="Collection"
                value={safeArticleInfo.collection || ''}
                onChange={handleInputChange('collection')}
                onBlur={() => validation.setFieldTouched('collection')}
                placeholder="Collection name"
                maxLength={255}
                disabled={mode === 'view'}
                error={validation.getFieldProps('collection').error}
                helperText={validation.getFieldProps('collection').helperText}
              />

              <Input
                label="Target Market"
                value={safeArticleInfo.targetMarket || ''}
                onChange={handleInputChange('targetMarket')}
                onBlur={() => validation.setFieldTouched('targetMarket')}
                placeholder="e.g., US, EU, Asia"
                maxLength={255}
                disabled={mode === 'view'}
                error={validation.getFieldProps('targetMarket').error}
                helperText={validation.getFieldProps('targetMarket').helperText}
              />

              <Select
                label="Price Point"
                value={safeArticleInfo.pricePoint || ''}
                onChange={handleInputChange('pricePoint')}
                onBlur={() => validation.setFieldTouched('pricePoint')}
                options={pricePointOptions}
                placeholder="Select price range..."
                disabled={mode === 'view'}
                error={validation.getFieldProps('pricePoint').error}
                helperText={validation.getFieldProps('pricePoint').helperText}
              />

              {/* Currency and Retail Price */}
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Currency"
                  value={safeArticleInfo.currency || 'USD'}
                  onChange={handleInputChange('currency')}
                  onBlur={() => validation.setFieldTouched('currency')}
                  options={currencyOptions}
                  disabled={mode === 'view'}
                  error={validation.getFieldProps('currency').error}
                  helperText={validation.getFieldProps('currency').helperText}
                />
                <Input
                  label="Retail Price"
                  value={safeArticleInfo.retailPrice || ''}
                  onChange={handleInputChange('retailPrice')}
                  onBlur={() => validation.setFieldTouched('retailPrice')}
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  disabled={mode === 'view'}
                  error={validation.getFieldProps('retailPrice').error}
                  helperText={validation.getFieldProps('retailPrice').helperText}
                />
              </div>

              <div className="md:col-span-2">
                <Textarea
                  label="Fabric Description"
                  value={safeArticleInfo.fabricDescription}
                  onChange={handleInputChange('fabricDescription')}
                  onBlur={() => validation.setFieldTouched('fabricDescription')}
                  placeholder="Detailed fabric composition, weight, and specifications..."
                  required
                  rows={4}
                  maxLength={1000}
                  disabled={mode === 'view'}
                  error={validation.getFieldProps('fabricDescription').error}
                  helperText={validation.getFieldProps('fabricDescription').helperText}
                />
              </div>

              <div className="md:col-span-2">
                <Textarea
                  label="Product Description"
                  value={safeArticleInfo.productDescription}
                  onChange={handleInputChange('productDescription')}
                  onBlur={() => validation.setFieldTouched('productDescription')}
                  placeholder="Detailed product description including design, functionality, materials, and style..."
                  required
                  rows={4}
                  maxLength={1000}
                  disabled={mode === 'view'}
                  error={validation.getFieldProps('productDescription').error}
                  helperText={validation.getFieldProps('productDescription').helperText}
                />
              </div>

              {/* Design Sketch Upload */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Design Sketch
                  <span className="text-red-500 ml-1">*</span>
                </label>

                {mode !== 'view' && (
                  <div
                    className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
                      isDragging
                        ? 'border-blue-500 bg-blue-50'
                        : safeArticleInfo.designSketchUrl
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="space-y-2 text-center w-full">
                      {safeArticleInfo.designSketchUrl ? (
                        <>
                          <div className="relative inline-block">
                            <img
                              src={getImageUrl(safeArticleInfo.designSketchUrl)}
                              alt="Design Sketch Preview"
                              className="max-w-full h-auto max-h-48 rounded-lg shadow-sm border border-gray-200"
                              onError={(e) => {
                                // Fallback if image fails to load
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <button
                              onClick={() => {
                                handleInputChange('designSketchUrl')('');
                                validation.validateField('designSketchUrl', '');
                              }}
                              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                              title="Remove image"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs text-green-600 flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Design sketch uploaded successfully
                          </p>
                          <label
                            htmlFor="design-sketch-upload"
                            className="text-sm text-blue-600 hover:text-blue-500 cursor-pointer underline"
                          >
                            Replace image
                          </label>
                          {/* Always-present hidden input to support Replace image */}
                          <input
                            id="design-sketch-upload"
                            name="design-sketch-upload"
                            type="file"
                            className="sr-only"
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/svg+xml"
                            onChange={handleImageUpload}
                            disabled={uploading}
                          />
                        </>
                      ) : (
                        <>
                          <UploadCloud className={`mx-auto h-12 w-12 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                          <div className="flex text-sm text-gray-600 justify-center">
                            <label
                              htmlFor="design-sketch-upload"
                              className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                            >
                              <span>Upload a design sketch</span>
                              <input
                                id="design-sketch-upload"
                                name="design-sketch-upload"
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
                )}

                {/* Image Preview for view mode */}
                {mode === 'view' && safeArticleInfo.designSketchUrl && (
                  <div className="mt-4 relative">
                    <img
                      src={getImageUrl(safeArticleInfo.designSketchUrl)}
                      alt="Design Sketch"
                      className="max-w-full h-auto max-h-64 rounded-lg shadow-sm border border-gray-200"
                      onError={(e) => {
                        // Fallback if image fails to load
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Validation error display */}
                {validation.getFieldProps('designSketchUrl').error && (
                  <p className="mt-1 text-xs text-red-600 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {validation.getFieldProps('designSketchUrl').error}
                  </p>
                )}
                {!validation.getFieldProps('designSketchUrl').error && (
                  <p className="mt-1 text-xs text-gray-500">
                    {validation.getFieldProps('designSketchUrl').helperText || 'Upload a design sketch image (required)'}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <Textarea
                  label="Notes"
                  value={safeArticleInfo.notes || ''}
                  onChange={handleInputChange('notes')}
                  onBlur={() => validation.setFieldTouched('notes')}
                  placeholder="Additional notes or special instructions..."
                  rows={3}
                  maxLength={500}
                  disabled={mode === 'view'}
                  error={validation.getFieldProps('notes').error}
                  helperText={validation.getFieldProps('notes').helperText}
                />
              </div>

              {/* Readonly Information Section */}
              {(mode === 'edit' || mode === 'view') && (
                <>
                  <div className="md:col-span-2 mt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <Lock className="w-4 h-4 mr-2 text-gray-500" />
                      System Information (Read-only)
                    </h3>
                  </div>

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Created</label>
                        <div className="mt-1 flex items-center text-sm text-gray-900">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {safeArticleInfo.createdAt 
                            ? new Date(safeArticleInfo.createdAt).toLocaleString()
                            : safeArticleInfo.createdDate 
                            ? new Date(safeArticleInfo.createdDate).toLocaleString()
                            : 'N/A'}
                        </div>
                        {safeArticleInfo.createdByName && (
                          <div className="mt-1 flex items-center text-xs text-gray-600">
                            <User className="w-3 h-3 mr-1 text-gray-400" />
                            by {safeArticleInfo.createdByName}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Modified</label>
                        <div className="mt-1 flex items-center text-sm text-gray-900">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {safeArticleInfo.updatedAt 
                            ? new Date(safeArticleInfo.updatedAt).toLocaleString()
                            : safeArticleInfo.lastModified 
                            ? new Date(safeArticleInfo.lastModified).toLocaleString()
                            : 'N/A'}
                        </div>
                        {safeArticleInfo.updatedByName && (
                          <div className="mt-1 flex items-center text-xs text-gray-600">
                            <User className="w-3 h-3 mr-1 text-gray-400" />
                            by {safeArticleInfo.updatedByName}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>



            {/* Action Buttons */}
            {mode !== 'view' && (
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleReset}
                    className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </button>

                  <button
                    onClick={handleSave}
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Draft
                  </button>
                </div>

                <button
                  onClick={handleNextTab}
                  className="flex items-center px-6 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Next: Bill of Materials
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Preview Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Preview</h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">
                  {safeArticleInfo.productName || 'Product Name'}
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  {safeArticleInfo.articleCode || 'Article Code'}
                </p>
                <div className="flex items-center text-xs text-gray-500 space-x-2">
                  <span>v{safeArticleInfo.version}</span>
                  <span>•</span>
                  <span>{safeArticleInfo.gender}</span>
                  <span>•</span>
                  <span>{safeArticleInfo.season}</span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Class:</span>
                  <span className="font-medium">{safeArticleInfo.productClass || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fit:</span>
                  <span className="font-medium">{safeArticleInfo.fitType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Stage:</span>
                  <span className="font-medium">{safeArticleInfo.lifecycleStage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Supplier:</span>
                  <span className="font-medium">{safeArticleInfo.supplier || '-'}</span>
                </div>
              </div>

              {safeArticleInfo.fabricDescription && (
                <div className="pt-4 border-t border-gray-200">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Fabric</h5>
                  <p className="text-xs text-gray-600 line-clamp-3">
                    {safeArticleInfo.fabricDescription}
                  </p>
                </div>
              )}

              {safeArticleInfo.productDescription && (
                <div className="pt-4 border-t border-gray-200">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Description</h5>
                  <p className="text-xs text-gray-600 line-clamp-3">
                    {safeArticleInfo.productDescription}
                  </p>
                </div>
              )}

              {safeArticleInfo.designSketchUrl && (
                <div className="pt-4 border-t border-gray-200">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Design Sketch</h5>
                  <img
                    src={getImageUrl(safeArticleInfo.designSketchUrl)}
                    alt="Design Sketch Preview"
                    className="w-full h-auto max-h-32 rounded border border-gray-200 object-cover"
                    onError={(e) => {
                      // Fallback if image fails to load
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div className="pt-4 border-t border-gray-200 space-y-2 text-xs text-gray-500">
                <div className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  Created: {new Date(safeArticleInfo.createdDate).toLocaleDateString()}
                </div>
                <div className="flex items-center">
                  <User className="w-3 h-3 mr-1" />
                  Designer: {designers.find(d => d.value === safeArticleInfo.technicalDesignerId)?.label || 'Not assigned'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ArticleInfoTab;
