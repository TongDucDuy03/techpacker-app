import React, { useState, useEffect } from 'react';
import { X, Plus, Save, AlertCircle, Calculator, Info } from 'lucide-react';
import { POMSpecification, POMCode, SizeChart, Tolerance } from '../types';
import { MeasurementTable } from './MeasurementTable';
import { useTranslation } from '../hooks/useTranslation';

interface POMFormProps {
  spec?: POMSpecification | null;
  pomCodes: POMCode[];
  sizeChart: SizeChart;
  onSave: (spec: Omit<POMSpecification, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const categories = ['Body', 'Sleeve', 'Collar', 'Pocket', 'Other'];

export const POMForm: React.FC<POMFormProps> = ({ spec, pomCodes, sizeChart, onSave, onCancel }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    pomCode: '',
    pomName: '',
    category: 'Body',
    unit: 'inches' as 'inches' | 'cm',
    tolerances: { minusTol: 0.25, plusTol: 0.25, unit: 'inches' as 'inches' | 'cm' },
    howToMeasure: '',
    measurements: {} as Record<string, number | 'NR'>
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPOMCode, setSelectedPOMCode] = useState<POMCode | null>(null);
  const [showGradeCalculator, setShowGradeCalculator] = useState(false);

  useEffect(() => {
    if (spec) {
      setFormData({
        pomCode: spec.pomCode,
        pomName: spec.pomName,
        category: spec.category,
        unit: spec.unit,
        tolerances: spec.tolerances,
        howToMeasure: spec.howToMeasure,
        measurements: spec.measurements
      });
      
      // Find the corresponding POM code
      const pomCode = pomCodes.find(code => code.code === spec.pomCode);
      if (pomCode) {
        setSelectedPOMCode(pomCode);
      }
    } else {
      // Initialize measurements for all sizes
      const initialMeasurements: Record<string, number | 'NR'> = {};
      sizeChart.sizes.forEach(size => {
        initialMeasurements[size] = 0;
      });
      setFormData(prev => ({ ...prev, measurements: initialMeasurements }));
    }
  }, [spec, pomCodes, sizeChart]);

  const handlePOMCodeSelect = (pomCode: POMCode) => {
    setSelectedPOMCode(pomCode);
    setFormData(prev => ({
      ...prev,
      pomCode: pomCode.code,
      pomName: pomCode.name,
      category: pomCode.category,
      unit: pomCode.unit,
      howToMeasure: pomCode.howToMeasure
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.pomCode.trim()) {
      newErrors.pomCode = t('measurements.validation.pomCodeRequired');
    }

    if (!formData.pomName.trim()) {
      newErrors.pomName = t('measurements.validation.pomNameRequired');
    }

    if (!formData.category.trim()) {
      newErrors.category = t('measurements.validation.categoryRequired');
    }

    if (formData.tolerances.minusTol < 0 || formData.tolerances.plusTol < 0) {
      newErrors.tolerances = t('measurements.validation.tolerancesRequired');
    }

    if (!formData.howToMeasure.trim()) {
      newErrors.howToMeasure = t('measurements.validation.howToMeasureRequired');
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
      const specData = {
        ...formData,
        tolerances: {
          ...formData.tolerances,
          unit: formData.unit
        }
      };
      
      onSave(specData);
    } catch (error) {
      console.error('Error saving POM specification:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMeasurementChange = (size: string, value: number | 'NR') => {
    setFormData(prev => ({
      ...prev,
      measurements: {
        ...prev.measurements,
        [size]: value
      }
    }));
  };

  const handleGradeCalculation = (baseSize: string, baseValue: number, increment: number) => {
    const sizeIndex = sizeChart.sizes.indexOf(baseSize);
    if (sizeIndex === -1) return;

    const newMeasurements = { ...formData.measurements };
    
    // Calculate measurements for sizes larger than base
    for (let i = sizeIndex + 1; i < sizeChart.sizes.length; i++) {
      const size = sizeChart.sizes[i];
      const gradeIncrement = increment * (i - sizeIndex);
      newMeasurements[size] = baseValue + gradeIncrement;
    }
    
    // Calculate measurements for sizes smaller than base
    for (let i = sizeIndex - 1; i >= 0; i--) {
      const size = sizeChart.sizes[i];
      const gradeIncrement = increment * (sizeIndex - i);
      newMeasurements[size] = baseValue - gradeIncrement;
    }

    setFormData(prev => ({ ...prev, measurements: newMeasurements }));
  };

  const filteredPOMCodes = pomCodes.filter(code => 
    code.code.toLowerCase().includes(formData.pomCode.toLowerCase()) ||
    code.name.toLowerCase().includes(formData.pomCode.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{spec ? t('measurements.form.titleEdit') : t('measurements.form.titleAdd')}</h2>
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
                {/* POM Code Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('measurements.pomCode')} *</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.pomCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, pomCode: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                        errors.pomCode ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder={t('measurements.placeholders.pomCodeSearch')}
                    />
                    {errors.pomCode && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.pomCode}
                      </p>
                    )}
                    
                    {/* POM Code Suggestions */}
                    {formData.pomCode && filteredPOMCodes.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredPOMCodes.map((pomCode) => (
                          <button
                            key={pomCode.code}
                            type="button"
                            onClick={() => handlePOMCodeSelect(pomCode)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-900">{pomCode.code}</div>
                                <div className="text-sm text-gray-600">{pomCode.name}</div>
                              </div>
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {pomCode.category}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* POM Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('measurements.pomName')} *</label>
                  <input
                    type="text"
                    value={formData.pomName}
                    onChange={(e) => setFormData(prev => ({ ...prev, pomName: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.pomName ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.pomName && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.pomName}
                    </p>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('measurements.category')} *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.category ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.category}
                    </p>
                  )}
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('measurements.unit')} *</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      unit: e.target.value as 'inches' | 'cm',
                      tolerances: { ...prev.tolerances, unit: e.target.value as 'inches' | 'cm' }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="inches">{t('measurements.units.inches')}</option>
                    <option value="cm">{t('measurements.units.cm')}</option>
                  </select>
                </div>

                {/* Tolerances */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('measurements.tolerances')} *</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('measurements.minusTol')}</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.tolerances.minusTol}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          tolerances: { ...prev.tolerances, minusTol: parseFloat(e.target.value) || 0 }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('measurements.plusTol')}</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.tolerances.plusTol}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          tolerances: { ...prev.tolerances, plusTol: parseFloat(e.target.value) || 0 }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  {errors.tolerances && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.tolerances}
                    </p>
                  )}
                </div>

                {/* How to Measure */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('measurements.howToMeasure')} *</label>
                  <textarea
                    value={formData.howToMeasure}
                    onChange={(e) => setFormData(prev => ({ ...prev, howToMeasure: e.target.value }))}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.howToMeasure ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder={t('measurements.placeholders.howToMeasure')}
                  />
                  {errors.howToMeasure && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.howToMeasure}
                    </p>
                  )}
                </div>

                {/* Grade Calculator Button */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowGradeCalculator(!showGradeCalculator)}
                    className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    {t('measurements.gradeRules')}
                  </button>
                </div>
              </div>

              {/* Right Column - Measurement Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">{t('measurements.measurements')}</h3>
                  <div className="text-sm text-gray-600">
                    {sizeChart.name} ({sizeChart.sizes.length} sizes)
                  </div>
                </div>
                
                <MeasurementTable
                  measurements={formData.measurements}
                  sizes={sizeChart.sizes}
                  unit={formData.unit}
                  tolerances={formData.tolerances}
                  onMeasurementChange={handleMeasurementChange}
                  onGradeCalculation={handleGradeCalculation}
                  showGradeCalculator={showGradeCalculator}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? t('common.loading') : (spec ? t('common.update') : t('common.create'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
