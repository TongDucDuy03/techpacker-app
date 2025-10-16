import React, { useState, useMemo } from 'react';
import { useTechPack } from '../../../contexts/TechPackContext';
import { MeasurementPoint, SIZE_RANGES } from '../../../types/techpack';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { measurementValidationSchema } from '../../../utils/validationSchemas';
import Input from '../shared/Input';
import { Plus, Upload, Download, Ruler, AlertTriangle, Info, AlertCircle } from 'lucide-react';

const MeasurementTab: React.FC = () => {
  const context = useTechPack();
  const { state, addMeasurement, updateMeasurement, deleteMeasurement } = context ?? {};
  const { measurements = [], articleInfo } = state?.techpack ?? {};

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);

  // Initialize validation for the form
  const validation = useFormValidation(measurementValidationSchema);
  
  const [formData, setFormData] = useState<Partial<MeasurementPoint>>({
    pomCode: '',
    pomName: '',
    minusTolerance: '+/- 1.0cm',
    plusTolerance: '+/- 1.0cm',
    sizes: {},
    notes: '',
    measurementMethod: '',
    isActive: true,
  });

  // Get size range based on gender
  const availableSizes = useMemo(() => {
    return SIZE_RANGES[articleInfo.gender] || SIZE_RANGES['Unisex'];
  }, [articleInfo.gender]);

  // Initialize selected sizes if empty
  React.useEffect(() => {
    if (selectedSizes.length === 0) {
      setSelectedSizes(availableSizes.slice(0, 6)); // Default to first 6 sizes
    }
  }, [availableSizes, selectedSizes.length]);

  const handleInputChange = (field: keyof MeasurementPoint) => (value: string | number | boolean) => {
    const updatedFormData = { ...formData, [field]: value };
    setFormData(updatedFormData);

    // Validate the field in real-time
    validation.validateField(field, value);
  };

  const handleSizeValueChange = (size: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const updatedFormData = {
      ...formData,
      sizes: { ...formData.sizes, [size]: numValue }
    };
    setFormData(updatedFormData);

    // Validate size measurements
    validation.validateField('measurement', numValue);
  };

  const handleSizeToggle = (size: string) => {
    setSelectedSizes(prev => {
      if (prev.includes(size)) {
        return prev.filter(s => s !== size);
      } else {
        return [...prev, size].sort((a, b) => 
          availableSizes.indexOf(a) - availableSizes.indexOf(b)
        );
      }
    });
  };

  const handleSubmit = () => {
    // Build sizes object with only selected sizes for validation
    const sizes: Record<string, number> = {};
    selectedSizes.forEach(size => {
      sizes[size] = formData.sizes?.[size] || 0;
    });

    // Create validation data object
    const validationData = {
      pointName: formData.pomName,
      measurement: Math.min(...Object.values(sizes).filter(v => v > 0)) || 0, // Use smallest non-zero measurement
      tolerance: parseFloat(formData.minusTolerance?.replace(/[^\d.]/g, '') || '0'),
      unit: 'cm',
      category: 'Length', // Default category
      notes: formData.notes
    };

    // Validate the entire form before submission
    const isValid = validation.validateForm(validationData);

    if (!isValid) {
      // Mark all fields as touched to show validation errors
      Object.keys(measurementValidationSchema).forEach(field => {
        validation.setFieldTouched(field, true);
      });
      return;
    }

    // Additional validation for sizes
    const sizeValues = Object.values(sizes);
    if (sizeValues.every(v => v <= 0)) {
      validation.setFieldError('measurement', 'At least one size measurement must be greater than 0');
      return;
    }

    const measurement: MeasurementPoint = {
      id: editingIndex !== null ? measurements[editingIndex].id : `measurement_${Date.now()}`,
      pomCode: formData.pomCode!,
      pomName: formData.pomName!,
      minusTolerance: formData.minusTolerance || '+/- 1.0cm',
      plusTolerance: formData.plusTolerance || '+/- 1.0cm',
      sizes,
      notes: formData.notes || '',
      measurementMethod: formData.measurementMethod || '',
      isActive: formData.isActive !== false,
    };

    if (editingIndex !== null) {
      updateMeasurement(editingIndex, measurement);
      setEditingIndex(null);
    } else {
      addMeasurement(measurement);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      pomCode: '',
      pomName: '',
      minusTolerance: '+/- 1.0cm',
      plusTolerance: '+/- 1.0cm',
      sizes: {},
      notes: '',
      measurementMethod: '',
      isActive: true,
    });
    setShowAddForm(false);
    setEditingIndex(null);

    // Reset validation state
    validation.reset();
  };

  const handleEdit = (measurement: MeasurementPoint, index: number) => {
    setFormData(measurement);
    setEditingIndex(index);
    setShowAddForm(true);
    
    // Set selected sizes based on measurement data
    const measurementSizes = Object.keys(measurement.sizes);
    setSelectedSizes(measurementSizes);
  };

  const handleDelete = (measurement: MeasurementPoint, index: number) => {
    if (window.confirm(`Are you sure you want to delete "${measurement.pomCode} - ${measurement.pomName}"?`)) {
      deleteMeasurement(index);
    }
  };

  const validateMeasurement = (measurement: MeasurementPoint) => {
    const issues: string[] = [];
    const sizeValues = Object.values(measurement.sizes);
    
    // Check for zero or negative values
    if (sizeValues.some(val => val <= 0)) {
      issues.push('Contains zero or negative measurements');
    }
    
    // Check for logical size progression
    const sortedSizes = selectedSizes.map(size => ({ size, value: measurement.sizes[size] || 0 }));
    for (let i = 1; i < sortedSizes.length; i++) {
      if (sortedSizes[i].value < sortedSizes[i-1].value) {
        issues.push('Size progression may be incorrect');
        break;
      }
    }
    
    return issues;
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
        minusTolerance: '+/- 1.0cm',
        plusTolerance: '+/- 1.0cm',
        sizes,
        measurementMethod: measurement.method,
        notes: '',
        isActive: true,
      };

      addMeasurement(measurementPoint);
    });
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
          <span className="text-sm text-gray-500">Gender: {articleInfo.gender}</span>
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
              label="POM Code"
              value={formData.pomCode || ''}
              onChange={handleInputChange('pomCode')}
              onBlur={() => validation.setFieldTouched('pointName')}
              placeholder="e.g., CHEST, LENGTH"
              required
              error={validation.getFieldProps('pointName').error}
              helperText={validation.getFieldProps('pointName').helperText}
            />

            <Input
              label="POM Name"
              value={formData.pomName || ''}
              onChange={handleInputChange('pomName')}
              onBlur={() => validation.setFieldTouched('pointName')}
              placeholder="e.g., Chest 1 inch below armhole"
              required
              error={validation.getFieldProps('pointName').error}
              helperText={validation.getFieldProps('pointName').helperText}
            />

            <Input
              label="Tolerance"
              value={formData.minusTolerance || ''}
              onChange={handleInputChange('minusTolerance')}
              onBlur={() => validation.setFieldTouched('tolerance')}
              placeholder="e.g., +/- 1.0cm"
              error={validation.getFieldProps('tolerance').error}
              helperText={validation.getFieldProps('tolerance').helperText}
            />

            <Input
              label="Measurement Method"
              value={formData.measurementMethod || ''}
              onChange={handleInputChange('measurementMethod')}
              onBlur={() => validation.setFieldTouched('notes')}
              placeholder="Brief description of how to measure"
              error={validation.getFieldProps('notes').error}
              helperText={validation.getFieldProps('notes').helperText}
            />
          </div>

          {/* Size Measurements Grid */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-800 mb-3">Size Measurements (cm)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {selectedSizes.map(size => (
                <div key={size} className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">{size}</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.sizes?.[size] || ''}
                    onChange={(e) => handleSizeValueChange(size, e.target.value)}
                    onBlur={() => validation.setFieldTouched('measurement')}
                    className={`px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${validation.getFieldProps('measurement').error ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="0.0"
                  />
                </div>
              ))}
            </div>
            {validation.getFieldProps('measurement').error && (
              <p className="mt-2 text-sm text-red-600">{validation.getFieldProps('measurement').helperText}</p>
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
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${validation.getFieldProps('notes').error ? 'border-red-500' : 'border-gray-300'}`}
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
                  const issues = validateMeasurement(measurement);
                  return (
                    <tr key={measurement.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
                        <div className="flex items-center">
                          {measurement.pomCode}
                          {issues.length > 0 && (
                            <AlertTriangle className="w-4 h-4 text-yellow-500 ml-2" title={issues.join(', ')} />
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
                        {measurement.minusTolerance}
                      </td>
                      {selectedSizes.map(size => (
                        <td key={size} className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-700">
                          {measurement.sizes[size]?.toFixed(1) || '-'}
                        </td>
                      ))}
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
              <li>Ensure size progression is logical (each size should be larger than the previous)</li>
              <li>Use consistent tolerance values across similar measurement points</li>
              <li>Add detailed measurement methods for complex points</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeasurementTab;
