import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Upload,
  Clock,
  Scissors,
  Wrench,
  Tag,
  Image as ImageIcon,
  FileText
} from 'lucide-react';
import { 
  ConstructionDetail, 
  ConstructionCategory, 
  SeamSpecification, 
  ThreadSpecification,
  SeamType
} from '../types';
import { useI18n } from '../lib/i18n';

interface ConstructionDetailFormProps {
  detail?: ConstructionDetail | null;
  onSave: (detail: Omit<ConstructionDetail, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const categories: ConstructionCategory[] = ['Seams', 'Pockets', 'Collar', 'Sleeves', 'Closures', 'Hems', 'Pleats', 'Darts', 'Other'];
const seamTypes: SeamType[] = ['Flat Fell', 'French Seam', 'Overlock', 'Straight Stitch', 'Zigzag', 'Blind Stitch', 'Topstitch', 'Basting'];
const difficulties = ['Easy', 'Medium', 'Hard', 'Expert'];

export const ConstructionDetailForm: React.FC<ConstructionDetailFormProps> = ({ 
  detail, 
  onSave, 
  onCancel 
}) => {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    category: 'Seams' as ConstructionCategory,
    name: '',
    description: '',
    specifications: [] as SeamSpecification[],
    sequence: 1,
    qualityCheckpoints: [] as string[],
    specialInstructions: [] as string[],
    materials: [] as string[],
    tools: [] as string[],
    estimatedTime: 0,
    difficulty: 'Easy' as 'Easy' | 'Medium' | 'Hard' | 'Expert',
    photos: [] as string[],
    tags: [] as string[]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'specifications' | 'instructions' | 'materials'>('basic');

  useEffect(() => {
    if (detail) {
      setFormData({
        category: detail.category,
        name: detail.name,
        description: detail.description,
        specifications: detail.specifications,
        sequence: detail.sequence,
        qualityCheckpoints: detail.qualityCheckpoints,
        specialInstructions: detail.specialInstructions,
        materials: detail.materials,
        tools: detail.tools,
        estimatedTime: detail.estimatedTime,
        difficulty: detail.difficulty,
        photos: detail.photos,
        tags: detail.tags
      });
    }
  }, [detail]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.specifications.length === 0) {
      newErrors.specifications = 'At least one specification is required';
    }

    if (formData.estimatedTime <= 0) {
      newErrors.estimatedTime = 'Estimated time must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      onSave(formData);
    } catch (error) {
      console.error('Error saving construction detail:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSpecificationChange = (index: number, field: string, value: any) => {
    const newSpecifications = [...formData.specifications];
    newSpecifications[index] = { ...newSpecifications[index], [field]: value };
    setFormData(prev => ({ ...prev, specifications: newSpecifications }));
  };

  const addSpecification = () => {
    const newSpec: SeamSpecification = {
      id: Date.now().toString(),
      seamType: 'Straight Stitch',
      spi: 8,
      threadSpec: {
        id: Date.now().toString(),
        color: '',
        weight: '',
        type: 'Polyester'
      },
      needleSize: '14',
      presserFoot: 'Standard',
      tension: '4'
    };
    setFormData(prev => ({
      ...prev,
      specifications: [...prev.specifications, newSpec]
    }));
  };

  const removeSpecification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== index)
    }));
  };

  const handleArrayFieldChange = (field: 'qualityCheckpoints' | 'specialInstructions' | 'materials' | 'tools' | 'tags', value: string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addArrayItem = (field: 'qualityCheckpoints' | 'specialInstructions' | 'materials' | 'tools' | 'tags') => {
    const currentValue = formData[field];
    setFormData(prev => ({
      ...prev,
      [field]: [...currentValue, '']
    }));
  };

  const updateArrayItem = (field: 'qualityCheckpoints' | 'specialInstructions' | 'materials' | 'tools' | 'tags', index: number, value: string) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData(prev => ({ ...prev, [field]: newArray }));
  };

  const removeArrayItem = (field: 'qualityCheckpoints' | 'specialInstructions' | 'materials' | 'tools' | 'tags', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const getCategoryColor = (category: ConstructionCategory) => {
    switch (category) {
      case 'Seams': return 'bg-blue-100 text-blue-800';
      case 'Pockets': return 'bg-green-100 text-green-800';
      case 'Collar': return 'bg-purple-100 text-purple-800';
      case 'Sleeves': return 'bg-orange-100 text-orange-800';
      case 'Closures': return 'bg-pink-100 text-pink-800';
      case 'Hems': return 'bg-yellow-100 text-yellow-800';
      case 'Pleats': return 'bg-indigo-100 text-indigo-800';
      case 'Darts': return 'bg-red-100 text-red-800';
      case 'Other': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Hard': return 'bg-orange-100 text-orange-800';
      case 'Expert': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const tabs = [
    { id: 'basic', label: t('construction.form.basicInfo'), icon: FileText },
    { id: 'specifications', label: t('construction.specifications'), icon: Wrench },
    { id: 'instructions', label: t('construction.instructions'), icon: Scissors },
    { id: 'materials', label: t('construction.form.materialsTools'), icon: Tag }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {detail ? t('construction.editDetail') : t('construction.createDetail')}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center ${
                      isActive
                        ? 'border-teal-500 text-teal-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'basic' && (
              <div className="space-y-6">
                {/* Category Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('construction.category')} *</label>
                  <div className="grid grid-cols-3 gap-3">
                    {categories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, category }))}
                        className={`p-3 rounded-lg border text-center transition-colors ${
                          formData.category === category
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className={`text-sm font-medium ${getCategoryColor(category)}`}>
                          {t(`construction.${category.toLowerCase()}`)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('construction.name')} *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder={t('construction.placeholders.name')}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {t('construction.validation.nameRequired')}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('construction.description')} *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.description ? 'border-red-300' : 'border-gray-300'
                    }`}
                    rows={3}
                    placeholder={t('construction.placeholders.description')}
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {t('construction.validation.descriptionRequired')}
                    </p>
                  )}
                </div>

                {/* Sequence and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('construction.sequence')}</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.sequence}
                      onChange={(e) => setFormData(prev => ({ ...prev, sequence: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('construction.estimatedTime')} ({t('construction.minutes')}) *</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.estimatedTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, estimatedTime: parseInt(e.target.value) || 0 }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                        errors.estimatedTime ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.estimatedTime && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {t('construction.validation.estimatedTimeRequired')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('construction.difficulty')}</label>
                  <div className="grid grid-cols-4 gap-3">
                    {difficulties.map((difficulty) => (
                      <button
                        key={difficulty}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, difficulty: difficulty as any }))}
                        className={`p-3 rounded-lg border text-center transition-colors ${
                          formData.difficulty === difficulty
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className={`text-sm font-medium ${getDifficultyColor(difficulty)}`}>
                          {t(`construction.difficulty.${difficulty.toLowerCase()}`)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'specifications' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">{t('construction.seamSpecifications')}</h3>
                  <button
                    type="button"
                    onClick={addSpecification}
                    className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('construction.actions.addSpecification')}
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.specifications.map((spec, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium text-gray-900">{t('construction.specification')} {index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeSpecification(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('construction.seamTypeLabel')}</label>
                          <select
                            value={spec.seamType}
                            onChange={(e) => handleSpecificationChange(index, 'seamType', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          >
                            {seamTypes.map(type => (
                              <option key={type} value={type}>{t(`construction.seamType.${type.replace(' ', '')}`)}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('construction.spi')}
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={spec.spi}
                            onChange={(e) => handleSpecificationChange(index, 'spi', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('construction.needleSize')}
                          </label>
                          <input
                            type="text"
                            value={spec.needleSize}
                            onChange={(e) => handleSpecificationChange(index, 'needleSize', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('construction.presserFoot')}
                          </label>
                          <input
                            type="text"
                            value={spec.presserFoot}
                            onChange={(e) => handleSpecificationChange(index, 'presserFoot', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('construction.tension')}
                          </label>
                          <input
                            type="text"
                            value={spec.tension}
                            onChange={(e) => handleSpecificationChange(index, 'tension', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('construction.threadColor')}</label>
                          <input
                            type="text"
                            value={spec.threadSpec.color}
                            onChange={(e) => handleSpecificationChange(index, 'threadSpec', { ...spec.threadSpec, color: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      {spec.specialInstructions && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('construction.specialInstructions')}
                          </label>
                          <textarea
                            value={spec.specialInstructions}
                            onChange={(e) => handleSpecificationChange(index, 'specialInstructions', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {errors.specifications && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {t('construction.validation.specificationsRequired')}
                  </p>
                )}
              </div>
            )}

            {activeTab === 'instructions' && (
              <div className="space-y-6">
                {/* Quality Checkpoints */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">{t('construction.qualityCheckpoints')}</h3>
                    <button
                      type="button"
                      onClick={() => addArrayItem('qualityCheckpoints')}
                      className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('construction.actions.addCheckpoint')}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.qualityCheckpoints.map((checkpoint, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={checkpoint}
                          onChange={(e) => updateArrayItem('qualityCheckpoints', index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          placeholder={t('construction.placeholders.qualityCheckpoint')}
                        />
                        <button
                          type="button"
                          onClick={() => removeArrayItem('qualityCheckpoints', index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Special Instructions */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">{t('construction.specialInstructions')}</h3>
                    <button
                      type="button"
                      onClick={() => addArrayItem('specialInstructions')}
                      className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('construction.actions.addInstruction')}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.specialInstructions.map((instruction, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={instruction}
                          onChange={(e) => updateArrayItem('specialInstructions', index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          placeholder={t('construction.placeholders.specialInstruction')}
                        />
                        <button
                          type="button"
                          onClick={() => removeArrayItem('specialInstructions', index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'materials' && (
              <div className="space-y-6">
                {/* Materials */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">{t('construction.materials')}</h3>
                    <button
                      type="button"
                      onClick={() => addArrayItem('materials')}
                      className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('construction.actions.addMaterial')}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.materials.map((material, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={material}
                          onChange={(e) => updateArrayItem('materials', index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          placeholder={t('construction.placeholders.materialName')}
                        />
                        <button
                          type="button"
                          onClick={() => removeArrayItem('materials', index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tools */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">{t('construction.tools')}</h3>
                    <button
                      type="button"
                      onClick={() => addArrayItem('tools')}
                      className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('construction.actions.addTool')}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.tools.map((tool, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={tool}
                          onChange={(e) => updateArrayItem('tools', index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          placeholder={t('construction.placeholders.toolName')}
                        />
                        <button
                          type="button"
                          onClick={() => removeArrayItem('tools', index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">{t('construction.tags')}</h3>
                    <button
                      type="button"
                      onClick={() => addArrayItem('tags')}
                      className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('construction.actions.addTag')}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.tags.map((tag, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={tag}
                          onChange={(e) => updateArrayItem('tags', index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          placeholder={t('construction.placeholders.tagName')}
                        />
                        <button
                          type="button"
                          onClick={() => removeArrayItem('tags', index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('construction.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? t('common.loading') : t('construction.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
