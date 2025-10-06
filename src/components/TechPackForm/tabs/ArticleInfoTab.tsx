import React, { useMemo } from 'react';
import { useTechPack } from '../../../contexts/TechPackContext';
import { PRODUCT_CLASSES } from '../../../types/techpack';
import Input from '../shared/Input';
import Select from '../shared/Select';
import Textarea from '../shared/Textarea';
import { Save, RotateCcw, ArrowRight, Calendar, User } from 'lucide-react';

const ArticleInfoTab: React.FC = () => {
  const { state, updateArticleInfo, saveTechPack, setCurrentTab } = useTechPack();
  const { articleInfo } = state.techpack;

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

  const handleInputChange = (field: keyof typeof articleInfo) => (value: string | number) => {
    updateArticleInfo({ [field]: value });
  };

  const handleReset = () => {
    const confirmed = window.confirm('Are you sure you want to reset all fields? This action cannot be undone.');
    if (confirmed) {
      updateArticleInfo({
        articleCode: '',
        productName: '',
        version: 1,
        gender: 'Unisex',
        productClass: '',
        fitType: 'Regular',
        supplier: '',
        technicalDesigner: '',
        fabricDescription: '',
        season: 'Spring',
        lifecycleStage: 'Concept',
        brand: '',
        collection: '',
        targetMarket: '',
        pricePoint: undefined,
        notes: ''
      });
    }
  };

  const handleSave = async () => {
    await saveTechPack();
  };

  const handleNextTab = () => {
    setCurrentTab(1); // Go to BOM tab
  };

  // Calculate form completion percentage
  const completionPercentage = useMemo(() => {
    const requiredFields = ['articleCode', 'productName', 'fabricDescription'];
    const optionalFields = ['supplier', 'technicalDesigner', 'productClass'];
    
    const requiredCompleted = requiredFields.filter(field => 
      articleInfo[field as keyof typeof articleInfo]
    ).length;
    
    const optionalCompleted = optionalFields.filter(field => 
      articleInfo[field as keyof typeof articleInfo]
    ).length;
    
    return Math.round(((requiredCompleted * 2 + optionalCompleted) / (requiredFields.length * 2 + optionalFields.length)) * 100);
  }, [articleInfo]);

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
                value={articleInfo.articleCode}
                onChange={handleInputChange('articleCode')}
                placeholder="e.g., SHRT-001-SS25"
                required
                maxLength={50}
              />

              <Input
                label="Product Name"
                value={articleInfo.productName}
                onChange={handleInputChange('productName')}
                placeholder="e.g., Men's Oxford Button-Down Shirt"
                required
                maxLength={255}
              />

              <Input
                label="Version"
                value={articleInfo.version}
                onChange={handleInputChange('version')}
                type="number"
                min={1}
                max={999}
              />

              <Select
                label="Gender"
                value={articleInfo.gender}
                onChange={handleInputChange('gender')}
                options={genderOptions}
                required
              />

              <Select
                label="Product Class"
                value={articleInfo.productClass}
                onChange={handleInputChange('productClass')}
                options={productClassOptions}
                placeholder="Select product category..."
                required
              />

              <Select
                label="Fit Type"
                value={articleInfo.fitType}
                onChange={handleInputChange('fitType')}
                options={fitTypeOptions}
                required
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
                value={articleInfo.supplier}
                onChange={handleInputChange('supplier')}
                placeholder="Supplier name or code"
                maxLength={255}
              />

              <Input
                label="Technical Designer"
                value={articleInfo.technicalDesigner}
                onChange={handleInputChange('technicalDesigner')}
                placeholder="Designer name"
                maxLength={255}
              />

              <Select
                label="Season"
                value={articleInfo.season}
                onChange={handleInputChange('season')}
                options={seasonOptions}
                required
              />

              <Select
                label="Lifecycle Stage"
                value={articleInfo.lifecycleStage}
                onChange={handleInputChange('lifecycleStage')}
                options={lifecycleOptions}
                required
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
                value={articleInfo.brand || ''}
                onChange={handleInputChange('brand')}
                placeholder="Brand name"
                maxLength={255}
              />

              <Input
                label="Collection"
                value={articleInfo.collection || ''}
                onChange={handleInputChange('collection')}
                placeholder="Collection name"
                maxLength={255}
              />

              <Input
                label="Target Market"
                value={articleInfo.targetMarket || ''}
                onChange={handleInputChange('targetMarket')}
                placeholder="e.g., US, EU, Asia"
                maxLength={255}
              />

              <Select
                label="Price Point"
                value={articleInfo.pricePoint || ''}
                onChange={handleInputChange('pricePoint')}
                options={pricePointOptions}
                placeholder="Select price range..."
              />

              <div className="md:col-span-2">
                <Textarea
                  label="Fabric Description"
                  value={articleInfo.fabricDescription}
                  onChange={handleInputChange('fabricDescription')}
                  placeholder="Detailed fabric composition, weight, and specifications..."
                  required
                  rows={4}
                  maxLength={1000}
                />
              </div>

              <div className="md:col-span-2">
                <Textarea
                  label="Notes"
                  value={articleInfo.notes || ''}
                  onChange={handleInputChange('notes')}
                  placeholder="Additional notes or special instructions..."
                  rows={3}
                  maxLength={500}
                />
              </div>
            </div>

            {/* Action Buttons */}
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
                  disabled={state.isSaving}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {state.isSaving ? 'Saving...' : 'Save Draft'}
                </button>
              </div>

              <button
                onClick={handleNextTab}
                className="flex items-center px-6 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Next: Bill of Materials
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        </div>

        {/* Preview Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Preview</h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">
                  {articleInfo.productName || 'Product Name'}
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  {articleInfo.articleCode || 'Article Code'}
                </p>
                <div className="flex items-center text-xs text-gray-500 space-x-2">
                  <span>v{articleInfo.version}</span>
                  <span>•</span>
                  <span>{articleInfo.gender}</span>
                  <span>•</span>
                  <span>{articleInfo.season}</span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Class:</span>
                  <span className="font-medium">{articleInfo.productClass || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fit:</span>
                  <span className="font-medium">{articleInfo.fitType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Stage:</span>
                  <span className="font-medium">{articleInfo.lifecycleStage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Supplier:</span>
                  <span className="font-medium">{articleInfo.supplier || '-'}</span>
                </div>
              </div>

              {articleInfo.fabricDescription && (
                <div className="pt-4 border-t border-gray-200">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Fabric</h5>
                  <p className="text-xs text-gray-600 line-clamp-3">
                    {articleInfo.fabricDescription}
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200 space-y-2 text-xs text-gray-500">
                <div className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  Created: {new Date(articleInfo.createdDate).toLocaleDateString()}
                </div>
                <div className="flex items-center">
                  <User className="w-3 h-3 mr-1" />
                  Designer: {articleInfo.technicalDesigner || 'Not assigned'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleInfoTab;
