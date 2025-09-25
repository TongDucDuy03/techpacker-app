import React, { useState, useEffect } from 'react';
import { X, Plus, Save, AlertCircle, Calculator, TrendingUp } from 'lucide-react';
import { GradingRule, POMSpecification, FitType, SizeRegion, GradingCurve } from '../types';
import { useI18n } from '../lib/i18n';

interface GradingRuleFormProps {
  rule?: GradingRule | null;
  pomSpecs: POMSpecification[];
  onSave: (rule: Omit<GradingRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const fitTypes: FitType[] = ['Regular', 'Tall', 'Big & Tall', 'Petite', 'Plus'];
const regions: SizeRegion[] = ['US', 'EU', 'UK', 'JP', 'AU'];
const curves: GradingCurve[] = ['Linear', 'Exponential', 'Custom'];
const sizeRanges = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XLT', '2XL', '3XL', '4XL', '5XL'];

export const GradingRuleForm: React.FC<GradingRuleFormProps> = ({ rule, pomSpecs, onSave, onCancel }) => {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    name: '',
    baseSize: 'M',
    sizeRanges: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    fitType: 'Regular' as FitType,
    region: 'US' as SizeRegion,
    increments: [] as Array<{
      measurement: string;
      increment: number;
      curve: GradingCurve;
      customCurve?: number[];
    }>
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name,
        baseSize: rule.baseSize,
        sizeRanges: rule.sizeRanges,
        fitType: rule.fitType,
        region: rule.region,
        increments: rule.increments
      });
    } else {
      // Initialize with available POM specs
      const initialIncrements = pomSpecs.map(spec => ({
        measurement: spec.pomCode,
        increment: 0.25,
        curve: 'Linear' as GradingCurve
      }));
      setFormData(prev => ({ ...prev, increments: initialIncrements }));
    }
  }, [rule, pomSpecs]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Rule name is required';
    }

    if (!formData.baseSize.trim()) {
      newErrors.baseSize = 'Base size is required';
    }

    if (formData.sizeRanges.length === 0) {
      newErrors.sizeRanges = 'At least one size range is required';
    }

    if (formData.increments.length === 0) {
      newErrors.increments = 'At least one increment is required';
    }

    formData.increments.forEach((increment, index) => {
      if (!increment.measurement.trim()) {
        newErrors[`increment_${index}_measurement`] = 'Measurement is required';
      }
      if (increment.increment <= 0) {
        newErrors[`increment_${index}_increment`] = 'Increment must be greater than 0';
      }
    });

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
      console.error('Error saving grading rule:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIncrementChange = (index: number, field: string, value: any) => {
    const newIncrements = [...formData.increments];
    newIncrements[index] = { ...newIncrements[index], [field]: value };
    setFormData(prev => ({ ...prev, increments: newIncrements }));
  };

  const addIncrement = () => {
    setFormData(prev => ({
      ...prev,
      increments: [...prev.increments, {
        measurement: '',
        increment: 0.25,
        curve: 'Linear'
      }]
    }));
  };

  const removeIncrement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      increments: prev.increments.filter((_, i) => i !== index)
    }));
  };

  const handleSizeRangeToggle = (size: string) => {
    setFormData(prev => ({
      ...prev,
      sizeRanges: prev.sizeRanges.includes(size)
        ? prev.sizeRanges.filter(s => s !== size)
        : [...prev.sizeRanges, size]
    }));
  };

  const getFitTypeColor = (fitType: FitType) => {
    switch (fitType) {
      case 'Regular': return 'bg-blue-100 text-blue-800';
      case 'Tall': return 'bg-green-100 text-green-800';
      case 'Big & Tall': return 'bg-purple-100 text-purple-800';
      case 'Petite': return 'bg-pink-100 text-pink-800';
      case 'Plus': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRegionFlag = (region: SizeRegion) => {
    switch (region) {
      case 'US': return '🇺🇸';
      case 'EU': return '🇪🇺';
      case 'UK': return '🇬🇧';
      case 'JP': return '🇯🇵';
      case 'AU': return '🇦🇺';
      default: return '🌍';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {rule ? t('grading.editRule') : t('grading.createRule')}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Basic Info */}
              <div className="space-y-6">
                {/* Rule Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rule Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Standard Shirt Grading"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Base Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('grading.baseSize')} *
                  </label>
                  <select
                    value={formData.baseSize}
                    onChange={(e) => setFormData(prev => ({ ...prev, baseSize: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.baseSize ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    {sizeRanges.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                  {errors.baseSize && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.baseSize}
                    </p>
                  )}
                </div>

                {/* Fit Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('grading.fitTypes')} *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {fitTypes.map(fitType => (
                      <button
                        key={fitType}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, fitType }))}
                        className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                          formData.fitType === fitType
                            ? `${getFitTypeColor(fitType)} border-current`
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {t(`grading.${fitType.toLowerCase().replace(' & ', '')}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Region */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('grading.regions')} *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {regions.map(region => (
                      <button
                        key={region}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, region }))}
                        className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                          formData.region === region
                            ? 'bg-teal-100 text-teal-800 border-teal-300'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {getRegionFlag(region)} {t(`grading.${region.toLowerCase()}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Size Ranges */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Size Ranges *
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {sizeRanges.map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleSizeRangeToggle(size)}
                        className={`p-2 rounded border text-sm font-medium transition-colors ${
                          formData.sizeRanges.includes(size)
                            ? 'bg-teal-100 text-teal-800 border-teal-300'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                  {errors.sizeRanges && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.sizeRanges}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Column - Grading Increments */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Grading Increments</h3>
                  <button
                    type="button"
                    onClick={addIncrement}
                    className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Increment
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.increments.map((increment, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Measurement
                          </label>
                          <select
                            value={increment.measurement}
                            onChange={(e) => handleIncrementChange(index, 'measurement', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                              errors[`increment_${index}_measurement`] ? 'border-red-300' : 'border-gray-300'
                            }`}
                          >
                            <option value="">Select measurement</option>
                            {pomSpecs.map(spec => (
                              <option key={spec.pomCode} value={spec.pomCode}>
                                {spec.pomCode} - {spec.pomName}
                              </option>
                            ))}
                          </select>
                          {errors[`increment_${index}_measurement`] && (
                            <p className="mt-1 text-sm text-red-600 flex items-center">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              {errors[`increment_${index}_measurement`]}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('grading.increment')}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={increment.increment}
                            onChange={(e) => handleIncrementChange(index, 'increment', parseFloat(e.target.value) || 0)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                              errors[`increment_${index}_increment`] ? 'border-red-300' : 'border-gray-300'
                            }`}
                          />
                          {errors[`increment_${index}_increment`] && (
                            <p className="mt-1 text-sm text-red-600 flex items-center">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              {errors[`increment_${index}_increment`]}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('grading.curve')}
                          </label>
                          <select
                            value={increment.curve}
                            onChange={(e) => handleIncrementChange(index, 'curve', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          >
                            {curves.map(curve => (
                              <option key={curve} value={curve}>{t(`grading.${curve.toLowerCase()}`)}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeIncrement(index)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {errors.increments && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.increments}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('grading.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Saving...' : t('grading.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
