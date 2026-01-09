import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { articleInfoValidationSchema } from '../../../utils/validationSchemas';
import { api } from '../../../lib/api';
import { useDebounce } from '../../../hooks/useDebounce';
import { showError, showWarning } from '../../../lib/toast';
import { useSeasonSuggestions } from '../../../hooks/useSeasonSuggestions';
import { useI18n } from '../../../lib/i18n';
import { useAuth } from '../../../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1';
const API_UPLOAD_BASE = API_BASE_URL.replace(/\/api\/v1$/, '');
import { TechPack, PRODUCT_CLASSES, ArticleInfo, TechPackStatus } from '../../../types/techpack';
import Input from '../shared/Input';
import Select from '../shared/Select';
import Textarea from '../shared/Textarea';
import { Save, RotateCcw, ArrowRight, Calendar, User, UploadCloud, XCircle, CheckCircle, AlertCircle, Lock } from 'lucide-react';
import ZoomableImage from '../../common/ZoomableImage';

interface ArticleInfoTabProps {
  techPack?: TechPack;
  mode?: 'create' | 'edit' | 'view';
  onUpdate?: (updates: Partial<TechPack>) => void;
  setCurrentTab?: (tab: number) => void;
  canEdit?: boolean;
  isReadOnly?: boolean;
}

export interface ArticleInfoTabRef {
  validateAndSave: () => boolean;
}

const ArticleInfoTab = forwardRef<ArticleInfoTabRef>((props: ArticleInfoTabProps, ref) => {
  const { techPack, mode = 'create', onUpdate, setCurrentTab, canEdit: propCanEdit, isReadOnly: propIsReadOnly } = props;
  
  // Use canEdit from props if provided, otherwise fallback to mode check
  const canEdit = propCanEdit !== undefined ? propCanEdit : (mode !== 'view');
  const isReadOnly = propIsReadOnly !== undefined ? propIsReadOnly : (mode === 'view');
  const validation = useFormValidation(articleInfoValidationSchema);
  const { articleInfo } = techPack ?? {};
  const { t } = useI18n();
  const { user } = useAuth();
  
  // Check if user can view Additional Information section (Admin or Merchandiser only)
  const canViewAdditionalInfo = user?.role === 'admin' || user?.role?.toLowerCase() === 'merchandiser';
  const [designers, setDesigners] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingDesigners, setLoadingDesigners] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);

  // Fallback if no techPack is passed
  // Support both old field names (productName, version) and new field names (articleName, sampleType) for backward compatibility
  const safeArticleInfo = articleInfo ?? {
    articleCode: '',
    articleName: '',
    sampleType: '',
    gender: 'Unisex',
    productClass: '',
    fitType: 'Regular',
    supplier: '',
    technicalDesignerId: '',
    fabricDescription: '',
    productDescription: '',
    designSketchUrl: '',
    companyLogoUrl: '',
    season: 'SS25',
    lifecycleStage: 'Concept',
    createdDate: new Date().toISOString(),
    lastModified: new Date().toISOString(),
  };

  // Fetch designers on component mount (only for preview display)
  // Note: technicalDesignerId is now a free text field, so this is optional
  // Only fetch if user has admin role to avoid 403 errors
  useEffect(() => {
    const fetchDesigners = async () => {
      // Skip fetching if user is not admin (to avoid 403 errors)
      // technicalDesignerId is now free text, so designers list is only for preview
      if (user?.role !== 'admin') {
        setDesigners([]);
        setLoadingDesigners(false);
        return;
      }
      
      setLoadingDesigners(true);
      try {
        const response = await api.getAllUsers({ role: 'designer' });
        const designerOptions = response.users.map(user => ({
          value: user._id,
          label: `${user.firstName} ${user.lastName}`
        }));
        setDesigners(designerOptions);
      } catch (error: any) {
        // Failed to fetch designers - handle silently
        // This is expected for non-admin users since technicalDesignerId is now free text
        console.log('[ArticleInfoTab] Could not fetch designers:', error.message);
        setDesigners([]); // Set empty array instead of leaving undefined
      } finally {
        setLoadingDesigners(false);
      }
    };

    fetchDesigners();
  }, [user?.role]);

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
          showWarning(t('validation.articleCodeExists'));
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
    { value: 'Men', label: t('option.gender.men') },
    { value: 'Women', label: t('option.gender.women') },
    { value: 'Unisex', label: t('option.gender.unisex') },
    { value: 'Kids', label: t('option.gender.kids') }
  ];

  // Fit type options
  const fitTypeOptions = [
    { value: 'Regular', label: t('option.fitType.regular') },
    { value: 'Slim', label: t('option.fitType.slim') },
    { value: 'Loose', label: t('option.fitType.loose') },
    { value: 'Relaxed', label: t('option.fitType.relaxed') },
    { value: 'Oversized', label: t('option.fitType.oversized') }
  ];

  const { seasonSuggestions, addSeasonSuggestion } = useSeasonSuggestions();
  useEffect(() => {
    if (safeArticleInfo.season) {
      addSeasonSuggestion(safeArticleInfo.season);
    }
  }, [safeArticleInfo.season, addSeasonSuggestion]);
  const seasonDatalistOptions = useMemo(
    () => seasonSuggestions.map((season) => ({ value: season, label: season })),
    [seasonSuggestions]
  );

  // Lifecycle stage options
  const lifecycleOptions = [
    { value: 'Concept', label: t('option.lifecycle.concept') },
    { value: 'Design', label: t('option.lifecycle.design') },
    { value: 'Development', label: t('option.lifecycle.development') },
    { value: 'Pre-production', label: t('option.lifecycle.preProduction') },
    { value: 'Production', label: t('option.lifecycle.production') },
    { value: 'Shipped', label: t('option.lifecycle.shipped') }
  ];

  // Product class options
  const productClassOptions = PRODUCT_CLASSES.map(cls => ({ value: cls, label: cls }));

  // Price point options
  const pricePointOptions = [
    { value: 'Value', label: t('option.pricePoint.value') },
    { value: 'Mid-range', label: t('option.pricePoint.midRange') },
    { value: 'Premium', label: t('option.pricePoint.premium') },
    { value: 'Luxury', label: t('option.pricePoint.luxury') }
  ];

  // Status options (matching backend enum)
  const statusOptions: Array<{ value: TechPackStatus; label: string }> = [
    { value: 'Draft', label: t('option.status.draft') },
    { value: 'In Review', label: t('option.status.inReview') },
    { value: 'Approved', label: t('option.status.approved') },
    { value: 'Rejected', label: t('option.status.rejected') },
    { value: 'Archived', label: t('option.status.archived') }
  ];

  // Currency options
  const currencyOptions = [
    { value: 'USD', label: t('option.currency.usd') },
    { value: 'EUR', label: t('option.currency.eur') },
    { value: 'GBP', label: t('option.currency.gbp') },
    { value: 'JPY', label: t('option.currency.jpy') },
    { value: 'CNY', label: t('option.currency.cny') },
    { value: 'VND', label: t('option.currency.vnd') }
  ];

  const handleInputChange = (field: keyof ArticleInfo) => (value: string | number) => {
    // Update the form data
    const updatedArticleInfo = { ...safeArticleInfo, [field]: value };
    onUpdate?.({ articleInfo: updatedArticleInfo });

    // Validate the field in real-time
    validation.validateField(field, value);
  };

  const handleSeasonChange = (value: string | number) => {
    const nextValue = typeof value === 'number' ? String(value) : value;
    handleInputChange('season')(nextValue);
    addSeasonSuggestion(nextValue);
  };

  const validateImageFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Please upload JPEG, PNG, GIF, or SVG image.';
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return 'File size exceeds 5MB limit. Please upload a smaller image.';
    }

    return null;
  };

  const uploadDesignSketchFile = async (file: File) => {
    const validationMessage = validateImageFile(file);
    if (validationMessage) {
      setUploadError(validationMessage);
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadDesignSketchFile(file);
  };

  // Handle drag and drop for design sketch
  const [isDragging, setIsDragging] = useState(false);
  const [isLogoDragging, setIsLogoDragging] = useState(false);

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
    await uploadDesignSketchFile(file);
  };

  const uploadCompanyLogoFile = async (file: File) => {
    const validationMessage = validateImageFile(file);
    if (validationMessage) {
      setLogoUploadError(validationMessage);
      return;
    }

    setLogoUploading(true);
    setLogoUploadError(null);

    const formData = new FormData();
    formData.append('companyLogo', file);

    try {
      const response = await api.post('/techpacks/upload-company-logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const imageUrl = response.data.data.url;
        handleInputChange('companyLogoUrl')(imageUrl);
        validation.validateField('companyLogoUrl', imageUrl);
        setLogoUploadError(null);
      } else {
        setLogoUploadError(response.data.message || 'Failed to upload logo.');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred.';
      setLogoUploadError(errorMessage);
      showError(errorMessage);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadCompanyLogoFile(file);
  };

  const handleLogoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsLogoDragging(true);
  };

  const handleLogoDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsLogoDragging(false);
  };

  const handleLogoDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsLogoDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await uploadCompanyLogoFile(file);
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
      return `${API_UPLOAD_BASE}${url}`;
    }
    // Otherwise, assume it's a relative path
    return `${API_UPLOAD_BASE}/${url}`;
  };

  const handleReset = () => {
    const confirmed = window.confirm(t('form.resetConfirm'));
    if (confirmed) {
      onUpdate?.({
        articleInfo: {
          ...safeArticleInfo, // Keep id and other fields
          articleCode: '',
          articleName: '',
          sampleType: '',
          gender: 'Unisex',
          productClass: '',
          fitType: 'Regular',
          supplier: '',
          technicalDesignerId: '',
          fabricDescription: '',
          productDescription: '',
          designSketchUrl: '',
          companyLogoUrl: '',
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
      'articleCode','articleName','sampleType','gender','productClass','fitType','supplier','technicalDesignerId',
      'fabricDescription','productDescription','designSketchUrl','companyLogoUrl','season','lifecycleStage','brand','collection',
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
      showError(t('validation.articleCodeExists'));
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
        articleName: 'Article Name',
        sampleType: 'Sample Type',
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
      const fieldLabel = firstField ? (fieldLabelMap[firstField] || firstField) : t('form.requiredField');
      showError(t('form.fieldRequiredInTab').replace('{field}', fieldLabel).replace('{tab}', t('form.tab.articleInfo')));
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
        showError(t('validation.articleCodeExists'));
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
          articleName: 'Article Name',
          sampleType: 'Sample Type',
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
        const fieldLabel = firstField ? (fieldLabelMap[firstField] || firstField) : t('form.requiredField');
        showError(t('form.fieldRequiredInTab').replace('{field}', fieldLabel).replace('{tab}', t('form.tab.articleInfo')));
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
    const requiredFields = ['articleCode', 'articleName', 'fabricDescription', 'productDescription', 'supplier', 'season', 'technicalDesignerId', 'gender', 'productClass', 'fitType'];
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
            <h1 className="text-2xl font-bold text-gray-900">{t('form.tab.articleInfo')}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {t('form.tab.articleInfo.description')}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-sm text-gray-500">
              {t('form.completion')}: <span className="font-medium text-blue-600">{completionPercentage}%</span>
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
                  {t('form.requiredInformation')}
                </h3>
              </div>

              <div>
                <Input
                  label={t('form.articleInfo.articleCode')}
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
                  disabled={!canEdit}
                  error={validation.getFieldProps('articleCode').error || (isDuplicate ? t('validation.articleCodeExists') : undefined)}
                  helperText={
                    checkingDuplicate 
                      ? t('form.checkingAvailability') 
                      : isDuplicate 
                        ? t('validation.articleCodeExists') 
                        : validation.getFieldProps('articleCode').helperText || t('form.articleCodeMustBeUnique')
                  }
                />
                {checkingDuplicate && (
                  <div className="flex items-center text-xs text-blue-600 mt-1">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                    {t('form.checkingAvailability')}
                  </div>
                )}
                {!checkingDuplicate && isDuplicate && (
                  <div className="flex items-center text-xs text-red-600 mt-1">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {t('validation.articleCodeExists')}
                  </div>
                )}
                {!checkingDuplicate && !isDuplicate && debouncedArticleCode && debouncedArticleCode.length >= 3 && (
                  <div className="flex items-center text-xs text-green-600 mt-1">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {t('form.articleCodeAvailable')}
                  </div>
                )}
              </div>

              <Input
                label={t('form.articleInfo.articleName')}
                value={safeArticleInfo.articleName || (safeArticleInfo as any).productName || ''}
                onChange={handleInputChange('articleName')}
                onBlur={() => validation.setFieldTouched('articleName')}
                placeholder="e.g., Men's Oxford Button-Down Shirt"
                required
                maxLength={255}
                disabled={!canEdit}
                error={validation.getFieldProps('articleName').error}
                helperText={validation.getFieldProps('articleName').helperText}
              />

              {/* Sample Type - Text input */}
              <div className="relative">
                <Input
                  label={t('form.articleInfo.sampleType')}
                  value={safeArticleInfo.sampleType || (safeArticleInfo as any).version || ''}
                  onChange={handleInputChange('sampleType')}
                  onBlur={() => validation.setFieldTouched('sampleType')}
                  type="text"
                  placeholder={t('form.articleInfo.sampleTypePlaceholder')}
                  maxLength={120}
                  disabled={!canEdit}
                  error={validation.getFieldProps('sampleType').error}
                  helperText={validation.getFieldProps('sampleType').helperText}
                />
                {(mode === 'edit' || mode === 'view') && (
                  <div className="absolute right-3 top-8 text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                )}
              </div>

              <Select
                label={t('form.articleInfo.gender')}
                value={safeArticleInfo.gender}
                onChange={handleInputChange('gender')}
                onBlur={() => validation.setFieldTouched('gender')}
                options={genderOptions}
                required
                disabled={!canEdit}
                error={validation.getFieldProps('gender').error}
                helperText={validation.getFieldProps('gender').helperText}
              />

              <Select
                label={t('form.articleInfo.category')}
                value={safeArticleInfo.productClass}
                onChange={handleInputChange('productClass')}
                onBlur={() => validation.setFieldTouched('productClass')}
                options={productClassOptions}
                placeholder="Select product category..."
                required
                disabled={!canEdit}
                error={validation.getFieldProps('productClass').error}
                helperText={validation.getFieldProps('productClass').helperText}
              />

              <Select
                label={t('form.articleInfo.fitType')}
                value={safeArticleInfo.fitType}
                onChange={handleInputChange('fitType')}
                onBlur={() => validation.setFieldTouched('fitType')}
                options={fitTypeOptions}
                required
                disabled={!canEdit}
                error={validation.getFieldProps('fitType').error}
                helperText={validation.getFieldProps('fitType').helperText}
              />

              {/* Product Details */}
              <div className="md:col-span-2 mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  {t('form.productDetails')}
                </h3>
              </div>

              <Input
                label={t('form.articleInfo.supplier')}
                value={safeArticleInfo.supplier}
                onChange={handleInputChange('supplier')}
                onBlur={() => validation.setFieldTouched('supplier')}
                placeholder={t('materials.placeholder.supplier')}
                required
                maxLength={255}
                disabled={!canEdit}
                error={validation.getFieldProps('supplier').error}
                helperText={validation.getFieldProps('supplier').helperText}
              />

              <Input
                label={t('form.articleInfo.technicalDesigner')}
                value={safeArticleInfo.technicalDesignerId}
                onChange={handleInputChange('technicalDesignerId')}
                onBlur={() => validation.setFieldTouched('technicalDesignerId')}
                placeholder={t('form.articleInfo.technicalDesignerPlaceholder')}
                required
                maxLength={100}
                disabled={!canEdit}
                error={validation.getFieldProps('technicalDesignerId').error}
                helperText={validation.getFieldProps('technicalDesignerId').helperText}
              />

              <Input
                label={t('form.articleInfo.season')}
                value={safeArticleInfo.season}
                onChange={handleSeasonChange}
                onBlur={() => validation.setFieldTouched('season')}
                placeholder={t('form.season.placeholder')}
                required
                disabled={!canEdit}
                error={validation.getFieldProps('season').error}
                helperText={validation.getFieldProps('season').helperText}
                datalistOptions={seasonDatalistOptions}
                listId="article-season-options"
              />

              <Select
                label={t('form.articleInfo.lifecycleStage')}
                value={safeArticleInfo.lifecycleStage}
                onChange={handleInputChange('lifecycleStage')}
                onBlur={() => validation.setFieldTouched('lifecycleStage')}
                options={lifecycleOptions}
                required
                disabled={!canEdit}
                error={validation.getFieldProps('lifecycleStage').error}
                helperText={validation.getFieldProps('lifecycleStage').helperText}
              />

              {/* Status field - only editable by Admin/Merchandiser */}
              <Select
                label={t('form.articleInfo.status')}
                value={safeArticleInfo.status || techPack?.status || 'Draft'}
                onChange={(value) => {
                  const updatedArticleInfo = { ...safeArticleInfo, status: value as TechPackStatus };
                  onUpdate?.({ articleInfo: updatedArticleInfo, status: value as TechPackStatus });
                  validation.validateField('status', value);
                }}
                onBlur={() => validation.setFieldTouched('status')}
                options={statusOptions}
                disabled={!canEdit}
                error={validation.getFieldProps('status').error}
                helperText={validation.getFieldProps('status').helperText || t('form.articleInfo.statusHelper')}
              />

              {/* Optional Fields - Only visible to Admin and Merchandiser */}
              {canViewAdditionalInfo && (
                <>
                  <div className="md:col-span-2 mt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                      {t('form.additionalInformation')}
                    </h3>
                    <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-gray-600">
                      {t('form.additionalInformation.restricted')}
                    </div>
                  </div>

                  <Input
                    label={t('form.articleInfo.brand')}
                    value={safeArticleInfo.brand || ''}
                    onChange={handleInputChange('brand')}
                    onBlur={() => validation.setFieldTouched('brand')}
                    placeholder={t('form.articleInfo.brandPlaceholder')}
                    maxLength={255}
                    disabled={!canEdit}
                    error={validation.getFieldProps('brand').error}
                    helperText={validation.getFieldProps('brand').helperText}
                  />

                  <Input
                    label={t('form.articleInfo.collection')}
                    value={safeArticleInfo.collection || ''}
                    onChange={handleInputChange('collection')}
                    onBlur={() => validation.setFieldTouched('collection')}
                    placeholder={t('form.articleInfo.collectionPlaceholder')}
                    maxLength={255}
                    disabled={!canEdit}
                    error={validation.getFieldProps('collection').error}
                    helperText={validation.getFieldProps('collection').helperText}
                  />

                  <Input
                    label={t('form.articleInfo.targetMarket')}
                    value={safeArticleInfo.targetMarket || ''}
                    onChange={handleInputChange('targetMarket')}
                    onBlur={() => validation.setFieldTouched('targetMarket')}
                    placeholder="e.g., US, EU, Asia"
                    maxLength={255}
                    disabled={!canEdit}
                    error={validation.getFieldProps('targetMarket').error}
                    helperText={validation.getFieldProps('targetMarket').helperText}
                  />

                  <Select
                    label={t('form.articleInfo.pricePoint')}
                    value={safeArticleInfo.pricePoint || ''}
                    onChange={handleInputChange('pricePoint')}
                    onBlur={() => validation.setFieldTouched('pricePoint')}
                    options={pricePointOptions}
                    placeholder={t('form.articleInfo.pricePointPlaceholder')}
                    disabled={!canEdit}
                    error={validation.getFieldProps('pricePoint').error}
                    helperText={validation.getFieldProps('pricePoint').helperText}
                  />

                  {/* Currency and Retail Price */}
                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      label={t('form.articleInfo.currency')}
                      value={safeArticleInfo.currency || 'USD'}
                      onChange={handleInputChange('currency')}
                      onBlur={() => validation.setFieldTouched('currency')}
                      options={currencyOptions}
                      disabled={!canEdit}
                      error={validation.getFieldProps('currency').error}
                      helperText={validation.getFieldProps('currency').helperText}
                    />
                    <Input
                      label={t('form.articleInfo.retailPrice')}
                      value={safeArticleInfo.retailPrice || ''}
                      onChange={handleInputChange('retailPrice')}
                      onBlur={() => validation.setFieldTouched('retailPrice')}
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      disabled={!canEdit}
                      error={validation.getFieldProps('retailPrice').error}
                      helperText={validation.getFieldProps('retailPrice').helperText}
                    />
                  </div>
                </>
              )}

              <div className="md:col-span-2">
                <Textarea
                  label={t('form.articleInfo.fabricDescription')}
                  value={safeArticleInfo.fabricDescription}
                  onChange={handleInputChange('fabricDescription')}
                  onBlur={() => validation.setFieldTouched('fabricDescription')}
                  placeholder={t('form.articleInfo.fabricDescriptionPlaceholder')}
                  required
                  rows={4}
                  maxLength={1000}
                  disabled={!canEdit}
                  error={validation.getFieldProps('fabricDescription').error}
                  helperText={validation.getFieldProps('fabricDescription').helperText}
                />
              </div>

              <div className="md:col-span-2">
                <Textarea
                  label={t('form.articleInfo.productDescription')}
                  value={safeArticleInfo.productDescription}
                  onChange={handleInputChange('productDescription')}
                  onBlur={() => validation.setFieldTouched('productDescription')}
                  placeholder={t('form.articleInfo.productDescriptionPlaceholder')}
                  required
                  rows={4}
                  maxLength={1000}
                  disabled={!canEdit}
                  error={validation.getFieldProps('productDescription').error}
                  helperText={validation.getFieldProps('productDescription').helperText}
                />
              </div>

              {/* Design Sketch Upload */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('form.articleInfo.designSketch')}
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
                          <div className="relative inline-block w-full">
                            <ZoomableImage
                              src={getImageUrl(safeArticleInfo.designSketchUrl)}
                              alt="Design Sketch Preview"
                              containerClassName="max-w-full h-auto max-h-48 rounded-lg shadow-sm border border-gray-200 bg-white"
                              className="max-h-48"
                              fallback={
                                <div className="flex flex-col items-center justify-center text-gray-400 py-10">
                                  <UploadCloud className="w-10 h-10 mb-2" />
                                  <p className="text-sm">{t('form.cannotDisplayImage')}</p>
                                </div>
                              }
                            />
                            <button
                              onClick={() => {
                                handleInputChange('designSketchUrl')('');
                                validation.validateField('designSketchUrl', '');
                              }}
                              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                              title={t('form.removeImage')}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs text-green-600 flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {t('form.designSketchUploaded')}
                          </p>
                          <label
                            htmlFor="design-sketch-upload"
                            className="text-sm text-blue-600 hover:text-blue-500 cursor-pointer underline"
                          >
                            {t('form.replaceImage')}
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
                              <span>{t('form.uploadDesignSketch')}</span>
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
                            <p className="pl-1">{t('form.orDragAndDrop')}</p>
                          </div>
                          <p className="text-xs text-gray-500">{t('form.imageUploadHint')}</p>
                        </>
                      )}
                      {uploading && (
                        <div className="flex items-center justify-center text-xs text-blue-600">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                          {t('form.uploading')}
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
                    <ZoomableImage
                      src={getImageUrl(safeArticleInfo.designSketchUrl)}
                      alt="Design Sketch"
                      containerClassName="w-full h-auto max-h-64 rounded-lg shadow-sm border border-gray-200 bg-white"
                      className="max-h-64"
                      fallback={null}
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
                    {validation.getFieldProps('designSketchUrl').helperText || t('form.uploadDesignSketchRequired')}
                  </p>
                )}
              </div>

              {/* Company Logo Upload */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('form.articleInfo.companyLogo')}
                  <span className="text-gray-400 text-xs ml-2">({t('common.optional')} • {t('form.companyLogoHint')})</span>
                </label>

                {mode !== 'view' && (
                  <div
                    className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
                      isLogoDragging
                        ? 'border-blue-500 bg-blue-50'
                        : safeArticleInfo.companyLogoUrl
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragOver={handleLogoDragOver}
                    onDragLeave={handleLogoDragLeave}
                    onDrop={handleLogoDrop}
                  >
                    <div className="space-y-2 text-center w-full">
                      {safeArticleInfo.companyLogoUrl ? (
                        <>
                          <div className="relative inline-block w-full">
                            <ZoomableImage
                              src={getImageUrl(safeArticleInfo.companyLogoUrl)}
                              alt="Company Logo Preview"
                              containerClassName="max-w-full h-32 rounded-lg shadow-sm border border-gray-200 bg-white flex items-center justify-center"
                              className="max-h-16 object-contain"
                              fallback={
                                <div className="flex flex-col items-center justify-center text-gray-400 py-8">
                                  <UploadCloud className="w-8 h-8 mb-2" />
                                  <p className="text-sm">{t('form.cannotDisplayLogo')}</p>
                                </div>
                              }
                            />
                            <button
                              onClick={() => {
                                handleInputChange('companyLogoUrl')('');
                                validation.validateField('companyLogoUrl', '');
                              }}
                              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                              title={t('form.removeLogo')}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs text-green-600 flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {t('form.logoUploaded')}
                          </p>
                          <label
                            htmlFor="company-logo-upload"
                            className="text-sm text-blue-600 hover:text-blue-500 cursor-pointer underline"
                          >
                            {t('form.replaceLogo')}
                          </label>
                          <input
                            id="company-logo-upload"
                            name="company-logo-upload"
                            type="file"
                            className="sr-only"
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/svg+xml"
                            onChange={handleLogoUpload}
                            disabled={logoUploading}
                          />
                        </>
                      ) : (
                        <>
                          <UploadCloud className={`mx-auto h-10 w-10 ${isLogoDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                          <div className="flex text-sm text-gray-600 justify-center">
                            <label
                              htmlFor="company-logo-upload"
                              className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                            >
                              <span>{t('form.uploadCompanyLogo')}</span>
                              <input
                                id="company-logo-upload"
                                name="company-logo-upload"
                                type="file"
                                className="sr-only"
                                accept="image/jpeg,image/jpg,image/png,image/gif,image/svg+xml"
                                onChange={handleLogoUpload}
                                disabled={logoUploading}
                              />
                            </label>
                            <p className="pl-1">{t('form.orDragAndDrop')}</p>
                          </div>
                          <p className="text-xs text-gray-500">
                            {t('form.companyLogoUploadHint')}
                          </p>
                        </>
                      )}

                      {logoUploading && (
                        <div className="flex items-center justify-center text-xs text-blue-600">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                          {t('form.uploadingLogo')}
                        </div>
                      )}
                      {logoUploadError && (
                        <p className="text-xs text-red-600 flex items-center justify-center">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {logoUploadError}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {mode === 'view' && safeArticleInfo.companyLogoUrl && (
                  <div className="mt-4 flex items-center justify-center rounded-lg border border-gray-200 bg-white p-4">
                    <img
                      src={getImageUrl(safeArticleInfo.companyLogoUrl)}
                      alt="Company Logo"
                      className="max-h-16 object-contain"
                    />
                  </div>
                )}

                <p className="mt-1 text-xs text-gray-500">
                  {t('form.companyLogoRecommendation')}
                </p>
              </div>

              <div className="md:col-span-2">
                <Textarea
                  label={t('form.articleInfo.notes')}
                  value={safeArticleInfo.notes || ''}
                  onChange={handleInputChange('notes')}
                  onBlur={() => validation.setFieldTouched('notes')}
                  placeholder={t('form.articleInfo.notesPlaceholder')}
                  rows={3}
                  maxLength={500}
                  disabled={!canEdit}
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
                      {t('form.systemInformation')}
                    </h3>
                  </div>

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('form.created')}</label>
                        <div className="mt-1 flex items-center text-sm text-gray-900">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {safeArticleInfo.createdAt 
                            ? new Date(safeArticleInfo.createdAt).toLocaleString()
                            : safeArticleInfo.createdDate 
                            ? new Date(safeArticleInfo.createdDate).toLocaleString()
                            : t('common.n/a')}
                        </div>
                        {safeArticleInfo.createdByName && (
                          <div className="mt-1 flex items-center text-xs text-gray-600">
                            <User className="w-3 h-3 mr-1 text-gray-400" />
                            {t('form.by')} {safeArticleInfo.createdByName}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('form.lastModified')}</label>
                        <div className="mt-1 flex items-center text-sm text-gray-900">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {safeArticleInfo.updatedAt 
                            ? new Date(safeArticleInfo.updatedAt).toLocaleString()
                            : safeArticleInfo.lastModified 
                            ? new Date(safeArticleInfo.lastModified).toLocaleString()
                            : t('common.n/a')}
                        </div>
                        {safeArticleInfo.updatedByName && (
                          <div className="mt-1 flex items-center text-xs text-gray-600">
                            <User className="w-3 h-3 mr-1 text-gray-400" />
                            {t('form.by')} {safeArticleInfo.updatedByName}
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
                  {/* Hidden: Reset button */}
                  {/* <button
                    onClick={handleReset}
                    className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    {t('common.reset')}
                  </button> */}

                  <button
                    onClick={handleSave}
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {t('form.saveDraft')}
                  </button>
                </div>

                <button
                  onClick={handleNextTab}
                  className="flex items-center px-6 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  {t('form.next')}: {t('form.tab.bom')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Preview Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('form.preview')}</h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">
                  {safeArticleInfo.articleName || (safeArticleInfo as any).productName || t('form.articleInfo.articleName')}
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  {safeArticleInfo.articleCode || t('form.articleInfo.articleCode')}
                </p>
                <div className="flex items-center text-xs text-gray-500 space-x-2">
                  <span>{safeArticleInfo.sampleType || t('common.n/a')}</span>
                  <span>•</span>
                  <span>{safeArticleInfo.gender}</span>
                  <span>•</span>
                  <span>{safeArticleInfo.season}</span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('form.preview.class')}:</span>
                  <span className="font-medium">{safeArticleInfo.productClass || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('form.preview.fit')}:</span>
                  <span className="font-medium">{safeArticleInfo.fitType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('form.preview.stage')}:</span>
                  <span className="font-medium">{safeArticleInfo.lifecycleStage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('form.preview.supplier')}:</span>
                  <span className="font-medium">{safeArticleInfo.supplier || '-'}</span>
                </div>
              </div>

              {safeArticleInfo.fabricDescription && (
                <div className="pt-4 border-t border-gray-200">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">{t('form.preview.fabric')}</h5>
                  <p className="text-xs text-gray-600 line-clamp-3">
                    {safeArticleInfo.fabricDescription}
                  </p>
                </div>
              )}

              {safeArticleInfo.productDescription && (
                <div className="pt-4 border-t border-gray-200">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">{t('form.preview.description')}</h5>
                  <p className="text-xs text-gray-600 line-clamp-3">
                    {safeArticleInfo.productDescription}
                  </p>
                </div>
              )}

              {safeArticleInfo.designSketchUrl && (
                <div className="pt-4 border-t border-gray-200">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">{t('form.articleInfo.designSketch')}</h5>
                  <ZoomableImage
                    src={getImageUrl(safeArticleInfo.designSketchUrl)}
                    alt={t('form.articleInfo.designSketch')}
                    containerClassName="w-full h-auto max-h-32 rounded border border-gray-200 bg-white"
                    className="max-h-32"
                    fallback={null}
                  />
                </div>
              )}

              {safeArticleInfo.companyLogoUrl && (
                <div className="pt-4 border-t border-gray-200">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">{t('form.articleInfo.companyLogo')}</h5>
                  <div className="w-full h-20 flex items-center justify-center border border-gray-200 bg-white rounded">
                    <img
                      src={getImageUrl(safeArticleInfo.companyLogoUrl)}
                      alt={t('form.articleInfo.companyLogo')}
                      className="max-h-16 object-contain"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200 space-y-2 text-xs text-gray-500">
                <div className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {t('form.created')}: {safeArticleInfo.createdDate ? new Date(safeArticleInfo.createdDate).toLocaleDateString() : t('common.n/a')}
                </div>
                {/* Hidden: Designer info */}
                {/* <div className="flex items-center">
                  <User className="w-3 h-3 mr-1" />
                  {t('form.preview.designer')}: {designers.find(d => d.value === safeArticleInfo.technicalDesignerId)?.label || t('form.preview.notAssigned')}
                </div> */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

ArticleInfoTab.displayName = 'ArticleInfoTab';

export default ArticleInfoTab;
