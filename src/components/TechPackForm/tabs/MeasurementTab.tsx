import React, { useState, useMemo, useCallback } from 'react';
import { useTechPack } from '../../../contexts/TechPackContext';
import { MeasurementPoint, SIZE_RANGES } from '../../../types/techpack';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { measurementValidationSchema } from '../../../utils/validationSchemas';
import Input from '../shared/Input';
import { Plus, Upload, Download, Ruler, AlertTriangle, Info, AlertCircle, X } from 'lucide-react';
import { showSuccess, showWarning, showError } from '../../../lib/toast';

// Helper to parse tolerance from string format (for backward compatibility)
const parseTolerance = (value: string | number | undefined): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const match = value.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 1.0;
  }
  return 1.0; // Default tolerance
};

// Helper to format tolerance for display
const formatTolerance = (value: number): string => {
  return `±${value.toFixed(1)}cm`;
};

// Progression validation result
interface ProgressionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const MeasurementTab: React.FC = () => {
  const context = useTechPack();
  const { state, addMeasurement, updateMeasurement, deleteMeasurement } = context ?? {};
  const { measurements = [], articleInfo } = state?.techpack ?? {};

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [progressionMode, setProgressionMode] = useState<'strict' | 'warn'>('strict'); // strict = block, warn = allow with warning

  // Initialize validation for the form
  const validation = useFormValidation(measurementValidationSchema);
  
  const [formData, setFormData] = useState<Partial<MeasurementPoint>>({
    pomCode: '',
    pomName: '',
    minusTolerance: 1.0, // Changed to number
    plusTolerance: 1.0, // Changed to number
    sizes: {},
    notes: '',
    measurementMethod: '',
    isActive: true,
  });

  // Get size range based on gender
  const availableSizes = useMemo(() => {
    return SIZE_RANGES[articleInfo?.gender] || SIZE_RANGES['Unisex'];
  }, [articleInfo?.gender]);

  // Initialize selected sizes if empty
  React.useEffect(() => {
    if (selectedSizes.length === 0 && availableSizes.length > 0) {
      setSelectedSizes(availableSizes.slice(0, 6)); // Default to first 6 sizes
    }
  }, [availableSizes, selectedSizes.length]);

  const handleInputChange = (field: keyof MeasurementPoint) => (value: string | number | boolean) => {
    const updatedFormData = { ...formData, [field]: value };
    setFormData(updatedFormData);

    // Validate the field in real-time
    validation.validateField(field, value);
  };

  // Fixed: Properly handle 0 vs empty for size values
  const handleSizeValueChange = (size: string, value: string) => {
    // Use null/undefined to represent empty, preserve 0 as valid value
    const numValue = value === '' || value === null || value === undefined 
      ? undefined 
      : (isNaN(parseFloat(value)) ? undefined : parseFloat(value));
    
    const updatedSizes = { ...formData.sizes };
    if (numValue === undefined) {
      delete updatedSizes[size]; // Remove key if empty
    } else {
      updatedSizes[size] = numValue;
    }
    
    const updatedFormData = {
      ...formData,
      sizes: updatedSizes
    };
    setFormData(updatedFormData);

    // Validate if at least one size has a value
    const hasAnyValue = Object.values(updatedSizes).some(v => v !== undefined && v !== null && v > 0);
    if (hasAnyValue) {
      const minValue = Math.min(...Object.values(updatedSizes).filter(v => v !== undefined && v !== null && v > 0) as number[]);
      validation.validateField('measurement', minValue);
    }
  };

  const handleSizeToggle = (size: string) => {
    setSelectedSizes(prev => {
      if (prev.includes(size)) {
        const newSizes = prev.filter(s => s !== size);
        // Remove size from formData.sizes when unselected
        const updatedSizes = { ...formData.sizes };
        delete updatedSizes[size];
        setFormData({ ...formData, sizes: updatedSizes });
        return newSizes;
      } else {
        return [...prev, size].sort((a, b) => 
          availableSizes.indexOf(a) - availableSizes.indexOf(b)
        );
      }
    });
  };

  // Enhanced progression validation
  const validateProgression = useCallback((sizes: Record<string, number>, sizeOrder: string[]): ProgressionValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Filter sizes that have values
    const sizeEntries = sizeOrder
      .map(size => ({ size, value: sizes[size] }))
      .filter(entry => entry.value !== undefined && entry.value !== null);
    
    if (sizeEntries.length < 2) {
      return { isValid: true, errors: [], warnings: [] }; // Need at least 2 sizes to check progression
    }

    // Check for zero or negative values
    const hasInvalidValues = sizeEntries.some(entry => entry.value! <= 0);
    if (hasInvalidValues) {
      errors.push('All measurements must be greater than 0');
    }

    // Check progression: each size should be >= previous size (for most measurements)
    // Allow some flexibility: if difference is less than 5%, treat as warning
    const progressionIssues: Array<{ from: string; to: string; diff: number }> = [];
    
    for (let i = 1; i < sizeEntries.length; i++) {
      const prevValue = sizeEntries[i - 1].value!;
      const currValue = sizeEntries[i].value!;
      const diff = currValue - prevValue;
      const percentDiff = (diff / prevValue) * 100;
      
      if (diff < 0) {
        // Decreasing progression - always an issue
        progressionIssues.push({
          from: sizeEntries[i - 1].size,
          to: sizeEntries[i].size,
          diff: Math.abs(diff)
        });
      } else if (diff === 0) {
        // Same value - warning (might be intentional for some measurements)
        warnings.push(`${sizeEntries[i - 1].size} and ${sizeEntries[i].size} have the same value`);
      } else if (percentDiff < 1) {
        // Very small increase (< 1%) - warning
        warnings.push(`Very small progression between ${sizeEntries[i - 1].size} and ${sizeEntries[i].size} (${diff.toFixed(2)}cm)`);
      }
    }

    if (progressionIssues.length > 0) {
      const issueDetails = progressionIssues
        .map(issue => `${issue.from} → ${issue.to}: decreased by ${issue.diff.toFixed(2)}cm`)
        .join('; ');
      
      if (progressionMode === 'strict') {
        errors.push(`Size progression error: ${issueDetails}`);
      } else {
        warnings.push(`Size progression warning: ${issueDetails}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, [progressionMode]);

  const handleSubmit = () => {
    // Validate pomCode and pomName separately
    const pomCodeValid = validation.validateField('pomCode', formData.pomCode);
    const pomNameValid = validation.validateField('pomName', formData.pomName);
    const minusToleranceValid = validation.validateField('minusTolerance', formData.minusTolerance);
    const plusToleranceValid = validation.validateField('plusTolerance', formData.plusTolerance);

    if (!pomCodeValid || !pomNameValid || !minusToleranceValid || !plusToleranceValid) {
      Object.keys(measurementValidationSchema).forEach(field => {
        validation.setFieldTouched(field, true);
      });
      return;
    }

    // Build sizes object with only selected sizes, preserving 0 values
    const sizes: Record<string, number> = {};
    selectedSizes.forEach(size => {
      const value = formData.sizes?.[size];
      // Only include if value is defined (including 0)
      if (value !== undefined && value !== null) {
        sizes[size] = value;
      }
    });

    // Validate that at least one size has a value > 0
    const sizeValues = Object.values(sizes);
    const hasValidMeasurements = sizeValues.some(v => v > 0);
    
    if (!hasValidMeasurements) {
      validation.setFieldError('measurement', 'At least one size measurement must be greater than 0');
      return;
    }

    // Validate progression
    const progressionValidation = validateProgression(sizes, selectedSizes);
    
    if (!progressionValidation.isValid && progressionMode === 'strict') {
      // Block submission if strict mode and has errors
      showError(`Cannot save: ${progressionValidation.errors.join('; ')}`);
      return;
    }

    // Show warnings if any
    if (progressionValidation.warnings.length > 0) {
      showWarning(`Warning: ${progressionValidation.warnings.join('; ')}`);
    }

    const measurement: MeasurementPoint = {
      id: editingIndex !== null ? measurements[editingIndex].id : `measurement_${Date.now()}`,
      pomCode: formData.pomCode!,
      pomName: formData.pomName!,
      minusTolerance: formData.minusTolerance ?? 1.0,
      plusTolerance: formData.plusTolerance ?? 1.0,
      sizes,
      notes: formData.notes || '',
      measurementMethod: formData.measurementMethod || '',
      isActive: formData.isActive !== false,
    };

    if (editingIndex !== null) {
      updateMeasurement(editingIndex, measurement);
      showSuccess('Measurement updated successfully');
    } else {
      addMeasurement(measurement);
      showSuccess('Measurement added successfully');
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      pomCode: '',
      pomName: '',
      minusTolerance: 1.0,
      plusTolerance: 1.0,
      sizes: {},
      notes: '',
      measurementMethod: '',
      isActive: true,
    });
    setShowAddForm(false);
    setEditingIndex(null);
    validation.reset();
  };

  const handleEdit = (measurement: MeasurementPoint, index: number) => {
    // Convert tolerance from string to number if needed (backward compatibility)
    const minusTol = typeof measurement.minusTolerance === 'string' 
      ? parseTolerance(measurement.minusTolerance) 
      : (measurement.minusTolerance ?? 1.0);
    const plusTol = typeof measurement.plusTolerance === 'string'
      ? parseTolerance(measurement.plusTolerance)
      : (measurement.plusTolerance ?? 1.0);

    setFormData({
      ...measurement,
      minusTolerance: minusTol,
      plusTolerance: plusTol,
    });
    setEditingIndex(index);
    setShowAddForm(true);
    
    // Set selected sizes based on measurement data
    const measurementSizes = Object.keys(measurement.sizes);
    if (measurementSizes.length > 0) {
      setSelectedSizes(measurementSizes);
    }
  };

  const handleDelete = (measurement: MeasurementPoint, index: number) => {
    if (window.confirm(`Are you sure you want to delete "${measurement.pomCode} - ${measurement.pomName}"?`)) {
      deleteMeasurement(index);
      showSuccess('Measurement deleted');
    }
  };

  // Enhanced validation for display in table
  const validateMeasurement = (measurement: MeasurementPoint): ProgressionValidation => {
    return validateProgression(measurement.sizes, selectedSizes);
  };

  const addCommonMeasurements = () => {
    const commonMeasurements = [
      { pomCode: 'CHEST', pomName: 'Chest 1" below armhole', method: 'Measure across chest 1 inch below armhole' },
      { pomCode: 'LENGTH', pomName: 'Center Back Length', method: 'Measure from center back neck to hem' },
      { pomCode: 'SLEEVE', pomName: 'Sleeve Length', method: 'Measure from shoulder point to cuff' },
      { pomCode: 'SHOULDER', pomName: 'Shoulder Width', method: 'Measure from shoulder point to shoulder point' },
      { pomCode: 'WAIST', pomName: 'Waist', method: 'Measure at natural waistline' },
    ];

    commonMeasurements.forEach((measurement, index) => {
      const sizes: Record<string, number> = {};
      selectedSizes.forEach((size, sizeIndex) => {
        // Generate sample measurements with logical progression
        sizes[size] = 50 + (sizeIndex * 2.5) + (index * 5);
      });

      const measurementPoint: MeasurementPoint = {
        id: `measurement_${Date.now()}_${index}`,
        pomCode: measurement.pomCode,
        pomName: measurement.pomName,
        minusTolerance: 1.0,
        plusTolerance: 1.0,
        sizes,
        measurementMethod: measurement.method,
        notes: '',
        isActive: true,
      };

      addMeasurement(measurementPoint);
    });
    showSuccess('Common measurements added');
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Measurement Chart</h1>
            <p className="text-sm text-gray-600 mt-1">
              Define measurement points and size specifications
            </p>
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{measurements.length}</div>
              <div className="text-gray-500">Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{selectedSizes.length}</div>
              <div className="text-gray-500">Sizes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Size Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Size Range Configuration</h3>
          <span className="text-sm text-gray-500">Gender: {articleInfo?.gender || 'Unisex'}</span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {availableSizes.map(size => (
            <button
              key={size}
              onClick={() => handleSizeToggle(size)}
              className={`px-3 py-1 text-sm font-medium rounded-md border transition-colors ${
                selectedSizes.includes(size)
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={addCommonMeasurements}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Ruler className="w-4 h-4 mr-2" />
              Add Common Points
            </button>
            
            {/* Progression Mode Toggle */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-700">Progression:</label>
              <select
                value={progressionMode}
                onChange={(e) => setProgressionMode(e.target.value as 'strict' | 'warn')}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="strict">Strict (Block errors)</option>
                <option value="warn">Warn only</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              <Upload className="w-4 h-4 mr-2" />
              Import Excel
            </button>
            <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Measurement
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {editingIndex !== null ? 'Edit Measurement Point' : 'Add New Measurement Point'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Input
              label="POM Code *"
              value={formData.pomCode || ''}
              onChange={handleInputChange('pomCode')}
              onBlur={() => validation.setFieldTouched('pomCode')}
              placeholder="e.g., CHEST, LENGTH"
              required
              error={validation.getFieldProps('pomCode').error}
              helperText={validation.getFieldProps('pomCode').helperText || 'Uppercase letters, numbers, hyphens, underscores'}
            />

            <Input
              label="POM Name *"
              value={formData.pomName || ''}
              onChange={handleInputChange('pomName')}
              onBlur={() => validation.setFieldTouched('pomName')}
              placeholder="e.g., Chest 1 inch below armhole"
              required
              error={validation.getFieldProps('pomName').error}
              helperText={validation.getFieldProps('pomName').helperText}
            />

            <Input
              label="Minus Tolerance (cm) *"
              value={formData.minusTolerance ?? ''}
              onChange={(value) => handleInputChange('minusTolerance')(typeof value === 'string' ? parseFloat(value) || 0 : value)}
              onBlur={() => validation.setFieldTouched('minusTolerance')}
              type="number"
              step="0.1"
              min="0"
              max="50"
              placeholder="e.g., 1.0"
              required
              error={validation.getFieldProps('minusTolerance').error}
              helperText={validation.getFieldProps('minusTolerance').helperText || 'Tolerance in centimeters'}
            />

            <Input
              label="Plus Tolerance (cm) *"
              value={formData.plusTolerance ?? ''}
              onChange={(value) => handleInputChange('plusTolerance')(typeof value === 'string' ? parseFloat(value) || 0 : value)}
              onBlur={() => validation.setFieldTouched('plusTolerance')}
              type="number"
              step="0.1"
              min="0"
              max="50"
              placeholder="e.g., 1.0"
              required
              error={validation.getFieldProps('plusTolerance').error}
              helperText={validation.getFieldProps('plusTolerance').helperText || 'Tolerance in centimeters'}
            />

            <div className="md:col-span-2">
              <Input
                label="Measurement Method"
                value={formData.measurementMethod || ''}
                onChange={handleInputChange('measurementMethod')}
                placeholder="Brief description of how to measure"
                error={validation.getFieldProps('notes').error}
                helperText={validation.getFieldProps('notes').helperText}
              />
            </div>
          </div>

          {/* Size Measurements Grid */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-800 mb-3">Size Measurements (cm)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {selectedSizes.map(size => {
                // Fixed: Properly handle 0 vs empty - use undefined for empty, preserve 0
                const value = formData.sizes?.[size];
                const displayValue = value === undefined || value === null ? '' : value.toString();
                
                return (
                  <div key={size} className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">{size}</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={displayValue}
                      onChange={(e) => handleSizeValueChange(size, e.target.value)}
                      onBlur={() => {
                        const hasAnyValue = Object.values(formData.sizes || {}).some(v => v !== undefined && v !== null && v > 0);
                        if (hasAnyValue) {
                          validation.setFieldTouched('measurement');
                        }
                      }}
                      className={`px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validation.getFieldProps('measurement').error ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0.0"
                    />
                  </div>
                );
              })}
            </div>
            {validation.getFieldProps('measurement').error && (
              <p className="mt-2 text-sm text-red-600">{validation.getFieldProps('measurement').error}</p>
            )}
            
            {/* Progression validation preview */}
            {Object.keys(formData.sizes || {}).length >= 2 && (
              (() => {
                const progValidation = validateProgression(formData.sizes || {}, selectedSizes);
                if (progValidation.errors.length > 0 || progValidation.warnings.length > 0) {
                  return (
                    <div className={`mt-3 p-3 rounded-md ${
                      progValidation.errors.length > 0 ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
                    }`}>
                      <div className="flex items-start">
                        <AlertTriangle className={`w-5 h-5 mt-0.5 mr-2 ${
                          progValidation.errors.length > 0 ? 'text-red-400' : 'text-yellow-400'
                        }`} />
                        <div className="text-sm">
                          {progValidation.errors.length > 0 && (
                            <div className="text-red-800 font-medium mb-1">Errors:</div>
                          )}
                          {progValidation.errors.map((err, idx) => (
                            <div key={idx} className="text-red-700">{err}</div>
                          ))}
                          {progValidation.warnings.length > 0 && (
                            <div className="text-yellow-800 font-medium mt-2 mb-1">Warnings:</div>
                          )}
                          {progValidation.warnings.map((warn, idx) => (
                            <div key={idx} className="text-yellow-700">{warn}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()
            )}
          </div>

          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes')(e.target.value)}
              onBlur={() => validation.setFieldTouched('notes')}
              placeholder="Additional notes or special instructions..."
              rows={2}
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validation.getFieldProps('notes').error ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {validation.getFieldProps('notes').error && (
              <p className="mt-1 text-sm text-red-600">{validation.getFieldProps('notes').helperText}</p>
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
              className={`px-4 py-2 text-sm font-medium border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                validation.isValid
                  ? 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                  : 'text-gray-400 bg-gray-200 cursor-not-allowed'
              }`}
            >
              {editingIndex !== null ? 'Update' : 'Add'} Measurement
            </button>
          </div>
        </div>
      )}

      {/* Measurements Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                  POM Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-48">
                  POM Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tolerance
                </th>
                {selectedSizes.map(size => (
                  <th key={size} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {size}
                  </th>
                ))}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {measurements.length === 0 ? (
                <tr>
                  <td colSpan={selectedSizes.length + 4} className="px-6 py-12 text-center text-sm text-gray-500">
                    No measurement points defined. Add measurements to get started.
                  </td>
                </tr>
              ) : (
                measurements.map((measurement, index) => {
                  const validationResult = validateMeasurement(measurement);
                  const hasIssues = validationResult.errors.length > 0 || validationResult.warnings.length > 0;
                  
                  // Format tolerance for display
                  const minusTol = typeof measurement.minusTolerance === 'string' 
                    ? parseTolerance(measurement.minusTolerance) 
                    : (measurement.minusTolerance ?? 1.0);
                  const plusTol = typeof measurement.plusTolerance === 'string'
                    ? parseTolerance(measurement.plusTolerance)
                    : (measurement.plusTolerance ?? 1.0);
                  const toleranceDisplay = minusTol === plusTol 
                    ? formatTolerance(minusTol)
                    : `-${minusTol.toFixed(1)}cm / +${plusTol.toFixed(1)}cm`;
                  
                  return (
                    <tr 
                      key={measurement.id} 
                      className={`hover:bg-gray-50 ${
                        validationResult.errors.length > 0 ? 'bg-red-50' : 
                        validationResult.warnings.length > 0 ? 'bg-yellow-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
                        <div className="flex items-center">
                          {measurement.pomCode}
                          {hasIssues && (
                            <AlertTriangle 
                              className={`w-4 h-4 ml-2 ${
                                validationResult.errors.length > 0 ? 'text-red-500' : 'text-yellow-500'
                              }`} 
                              title={[...validationResult.errors, ...validationResult.warnings].join('; ')} 
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div>
                          <div className="font-medium">{measurement.pomName}</div>
                          {measurement.notes && (
                            <div className="text-xs text-gray-500 mt-1">{measurement.notes}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {toleranceDisplay}
                      </td>
                      {selectedSizes.map(size => {
                        const value = measurement.sizes[size];
                        return (
                          <td 
                            key={size} 
                            className={`px-4 py-4 whitespace-nowrap text-sm text-center ${
                              value === undefined || value === null 
                                ? 'text-gray-400' 
                                : value <= 0 
                                  ? 'text-red-600 font-medium' 
                                  : 'text-gray-700'
                            }`}
                          >
                            {value === undefined || value === null ? '-' : value.toFixed(1)}
                          </td>
                        );
                      })}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleEdit(measurement, index)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(measurement, index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
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
      </div>

      {/* Info Panel */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Measurement Guidelines:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>All measurements should be in centimeters</li>
              <li>Ensure size progression is logical (each size should be larger than or equal to the previous)</li>
              <li>Tolerance values are in centimeters (e.g., 1.0 means ±1.0cm)</li>
              <li>Use consistent tolerance values across similar measurement points</li>
              <li>Zero values are preserved - use empty field to indicate "not measured"</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeasurementTab;
