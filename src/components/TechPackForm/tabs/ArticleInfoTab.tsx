import React, { useState, useEffect, useMemo, useImperativeHandle, forwardRef } from 'react';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { articleInfoValidationSchema } from '../../../utils/validationSchemas';
import { api } from '../../../lib/api';
import { TechPack, PRODUCT_CLASSES, ArticleInfo } from '../../../types/techpack';
import Input from '../shared/Input';
import Select from '../shared/Select';
import Textarea from '../shared/Textarea';
import { Save, RotateCcw, ArrowRight, Calendar, User } from 'lucide-react';

interface ArticleInfoTabProps {
  techPack?: TechPack;
  mode?: 'create' | 'edit' | 'view';
  onUpdate?: (updates: Partial<TechPack>) => void;
  setCurrentTab?: (tab: number) => void;
}

export interface ArticleInfoTabRef {
  validateAndSave: () => boolean;
}

const ArticleInfoTab = forwardRef<ArticleInfoTabRef, ArticleInfoTabProps>(({ techPack, mode = 'create', onUpdate, setCurrentTab }, ref) => {
  const validation = useFormValidation(articleInfoValidationSchema);
  const { articleInfo } = techPack ?? {};
  const [designers, setDesigners] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingDesigners, setLoadingDesigners] = useState(false);

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
        console.error('Failed to fetch designers:', error);
      } finally {
        setLoadingDesigners(false);
      }
    };

    fetchDesigners();
  }, []);

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

  const handleInputChange = (field: keyof ArticleInfo) => (value: string | number) => {
    // Update the form data
    const updatedArticleInfo = { ...safeArticleInfo, [field]: value };
    onUpdate?.({ articleInfo: updatedArticleInfo });

    // Validate the field in real-time
    validation.validateField(field, value);
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
      const element = document.querySelector(`[id*="${firstErrorField}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleSave = () => {
    const { isValid, errors } = validation.validateForm(safeArticleInfo);

    if (!isValid) {
      Object.keys(articleInfoValidationSchema).forEach(field => {
        validation.setFieldTouched(field, true);
      });
      scrollToFirstError(errors);
      return;
    }

    onUpdate?.({
      ...techPack,
      articleInfo: safeArticleInfo
    });
  };

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
      ...techPack,
      articleInfo: safeArticleInfo
    });

    setCurrentTab?.(1);
  };

  // Calculate form completion percentage
  const completionPercentage = useMemo(() => {
    const requiredFields = ['articleCode', 'productName', 'fabricDescription'];
    const optionalFields = ['supplier', 'technicalDesignerId', 'productClass'];
    
    const requiredCompleted = requiredFields.filter(field => 
      safeArticleInfo[field as keyof typeof safeArticleInfo]
    ).length;
    
    const optionalCompleted = optionalFields.filter(field => 
      safeArticleInfo[field as keyof typeof safeArticleInfo]
    ).length;
    
    return Math.round(((requiredCompleted * 2 + optionalCompleted) / (requiredFields.length * 2 + optionalFields.length)) * 100);
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

              <Input
                label="Article Code"
                value={safeArticleInfo.articleCode}
                onChange={handleInputChange('articleCode')}
                onBlur={() => validation.setFieldTouched('articleCode')}
                placeholder="e.g., SHRT-001-SS25"
                required
                maxLength={50}
                disabled={mode === 'view'}
                error={validation.getFieldProps('articleCode').error}
                helperText={validation.getFieldProps('articleCode').helperText}
              />

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

              <Input
                label="Version"
                value={safeArticleInfo.version}
                onChange={handleInputChange('version')}
                onBlur={() => validation.setFieldTouched('version')}
                type="number"
                min={1}
                max={999}
                disabled={mode === 'view'}
                error={validation.getFieldProps('version').error}
                helperText={validation.getFieldProps('version').helperText}
              />

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
};


  useImperativeHandle(ref, () => ({
    validateAndSave: () => {
      const isValid = validation.validateForm(safeArticleInfo);
      if (!isValid) {
        Object.keys(articleInfoValidationSchema).forEach(field => {
          validation.setFieldTouched(field, true);
        });
        const firstErrorField = Object.keys(validation.errors).find(key => validation.errors[key]);
        if (firstErrorField) {
          const element = document.querySelector(`[id*="${firstErrorField}"]`);
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return isValid;
    }
  }));

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Article Code */}
        <Input
          label="Article Code"
          value={safeArticleInfo.articleCode}
          onChange={(value) => handleInputChange('articleCode', value)}
          required
          placeholder="e.g., NIKE-SHOE-001"
          error={validation.errors.articleCode}
          onBlur={() => validation.setFieldTouched('articleCode')}
          disabled={mode === 'view'}
        />

        {/* Product Name */}
        <Input
          label="Product Name"
          value={safeArticleInfo.productName}
          onChange={(value) => handleInputChange('productName', value)}
          required
          placeholder="e.g., Air Max 90"
          className="lg:col-span-2"
          error={validation.errors.productName}
          onBlur={() => validation.setFieldTouched('productName')}
          disabled={mode === 'view'}
        />

        {/* Version */}
        <Input
          label="Version"
          type="number"
          value={safeArticleInfo.version}
          onChange={(value) => handleInputChange('version', value)}
          required
          min={1}
          error={validation.errors.version}
          onBlur={() => validation.setFieldTouched('version')}
          disabled={mode === 'view'}
        />

        {/* Gender */}
        <Select
          label="Gender"
          value={safeArticleInfo.gender}
          onChange={(value) => handleInputChange('gender', value)}
          options={['Men', 'Women', 'Unisex', 'Kids']}
          required
          error={validation.errors.gender}
          onBlur={() => validation.setFieldTouched('gender')}
          disabled={mode === 'view'}
        />

        {/* Product Class */}
        <Select
          label="Product Class"
          value={safeArticleInfo.productClass}
          onChange={(value) => handleInputChange('productClass', value)}
          options={PRODUCT_CLASSES}
          required
          placeholder="Select product class..."
          error={validation.errors.productClass}
          onBlur={() => validation.setFieldTouched('productClass')}
          disabled={mode === 'view'}
        />

        {/* Fit Type */}
        <Select
          label="Fit Type"
          value={safeArticleInfo.fitType}
          onChange={(value) => handleInputChange('fitType', value)}
          options={['Regular', 'Slim', 'Loose', 'Relaxed', 'Oversized']}
          required
          error={validation.errors.fitType}
          onBlur={() => validation.setFieldTouched('fitType')}
          disabled={mode === 'view'}
        />

        {/* Supplier */}
        <Input
          label="Supplier"
          value={safeArticleInfo.supplier}
          onChange={(value) => handleInputChange('supplier', value)}
          placeholder="e.g., Global Fabrics Inc."
          error={validation.errors.supplier}
          onBlur={() => validation.setFieldTouched('supplier')}
          disabled={mode === 'view'}
        />

        {/* Technical Designer */}
        <Select
          label="Technical Designer"
          value={safeArticleInfo.technicalDesignerId}
          onChange={(value) => handleInputChange('technicalDesignerId', value)}
          options={designers}
          required
          placeholder={loadingDesigners ? 'Loading...' : 'Select a designer...'}
          error={validation.errors.technicalDesignerId}
          onBlur={() => validation.setFieldTouched('technicalDesignerId')}
          disabled={mode === 'view' || loadingDesigners}
        />

        {/* Season */}
        <Select
          label="Season"
          value={safeArticleInfo.season}
          onChange={(value) => handleInputChange('season', value)}
          options={['SS25', 'FW25', 'SS26', 'FW26', 'Core']}
          required
          error={validation.errors.season}
          onBlur={() => validation.setFieldTouched('season')}
          disabled={mode === 'view'}
        />

        {/* Lifecycle Stage */}
        <Select
          label="Lifecycle Stage"
          value={safeArticleInfo.lifecycleStage}
          onChange={(value) => handleInputChange('lifecycleStage', value)}
          options={['Concept', 'Design', 'Development', 'Pre-production', 'Production', 'Shipped']}
          required
          error={validation.errors.lifecycleStage}
          onBlur={() => validation.setFieldTouched('lifecycleStage')}
          disabled={mode === 'view'}
        />

        {/* Fabric Description */}
        <Textarea
          label="Fabric Description"
          value={safeArticleInfo.fabricDescription}
          onChange={(value) => handleInputChange('fabricDescription', value)}
          required
          placeholder="Describe the main fabric used..."
          className="lg:col-span-4"
          rows={4}
          error={validation.errors.fabricDescription}
          onBlur={() => validation.setFieldTouched('fabricDescription')}
          disabled={mode === 'view'}
        />
      </div>

      {/* Optional Fields Section */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Input
            label="Brand"
            value={safeArticleInfo.brand || ''}
            onChange={(value) => handleInputChange('brand', value)}
            placeholder="e.g., Nike Sportswear"
            error={validation.errors.brand}
            onBlur={() => validation.setFieldTouched('brand')}
            disabled={mode === 'view'}
          />
          <Input
            label="Collection"
            value={safeArticleInfo.collection || ''}
            onChange={(value) => handleInputChange('collection', value)}
            placeholder="e.g., Tech Fleece"
            error={validation.errors.collection}
            onBlur={() => validation.setFieldTouched('collection')}
            disabled={mode === 'view'}
          />
          <Input
            label="Target Market"
            value={safeArticleInfo.targetMarket || ''}
            onChange={(value) => handleInputChange('targetMarket', value)}
            placeholder="e.g., Young Adults"
            error={validation.errors.targetMarket}
            onBlur={() => validation.setFieldTouched('targetMarket')}
            disabled={mode === 'view'}
          />
          <Select
            label="Price Point"
            value={safeArticleInfo.pricePoint || ''}
            onChange={(value) => handleInputChange('pricePoint', value)}
            options={['Value', 'Mid-range', 'Premium', 'Luxury']}
            placeholder="Select a price point"
            error={validation.errors.pricePoint}
            onBlur={() => validation.setFieldTouched('pricePoint')}
            disabled={mode === 'view'}
          />
          <Textarea
            label="Notes"
            value={safeArticleInfo.notes || ''}
            onChange={(value) => handleInputChange('notes', value)}
            placeholder="Any additional notes..."
            className="lg:col-span-3"
            rows={3}
            error={validation.errors.notes}
            onBlur={() => validation.setFieldTouched('notes')}
            disabled={mode === 'view'}
          />
        </div>
      </div>

      {/* Dates and Meta */}
      <div className="mt-6 text-sm text-gray-500 flex items-center justify-between">
        <div className="flex items-center">
          <Calendar className="w-4 h-4 mr-2" />
          <span>Created: {new Date(safeArticleInfo.createdDate).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center">
          <User className="w-4 h-4 mr-2" />
          <span>Last Modified: {new Date(safeArticleInfo.lastModified).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Action Buttons */}
      {mode !== 'view' && (
        <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end space-x-4">
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

          <button
            onClick={handleNextTab}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Next: Bill of Materials
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      )}
    </div>
  );
});

export default ArticleInfoTab;
