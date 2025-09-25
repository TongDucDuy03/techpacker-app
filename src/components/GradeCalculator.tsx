import React, { useState } from 'react';
import { Calculator, TrendingUp, TrendingDown, Save, RotateCcw } from 'lucide-react';
import { POMSpecification, SizeChart, GradeRule } from '../types';

interface GradeCalculatorProps {
  pomSpecs: POMSpecification[];
  sizeChart: SizeChart;
  onUpdateSpecs: (specs: POMSpecification[]) => void;
}

export const GradeCalculator: React.FC<GradeCalculatorProps> = ({
  pomSpecs,
  sizeChart,
  onUpdateSpecs
}) => {
  const [selectedSpec, setSelectedSpec] = useState<POMSpecification | null>(null);
  const [baseSize, setBaseSize] = useState<string>('');
  const [baseValue, setBaseValue] = useState<number>(0);
  const [increment, setIncrement] = useState<number>(0.25);
  const [gradeRules, setGradeRules] = useState<GradeRule[]>([]);
  const [previewMeasurements, setPreviewMeasurements] = useState<Record<string, number | 'NR'>>({});

  const handleSpecSelect = (spec: POMSpecification) => {
    setSelectedSpec(spec);
    setBaseSize('');
    setBaseValue(0);
    setIncrement(0.25);
    setGradeRules(spec.gradeRules || []);
    
    // Initialize preview with current measurements
    setPreviewMeasurements({ ...spec.measurements });
  };

  const calculateGrades = () => {
    if (!selectedSpec || !baseSize || baseValue === 0) return;

    const sizeIndex = sizeChart.sizes.indexOf(baseSize);
    if (sizeIndex === -1) return;

    const newMeasurements = { ...previewMeasurements };
    
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

    setPreviewMeasurements(newMeasurements);
  };

  const applyGrades = () => {
    if (!selectedSpec) return;

    const updatedSpecs = pomSpecs.map(spec => 
      spec.id === selectedSpec.id 
        ? { 
            ...spec, 
            measurements: previewMeasurements,
            gradeRules: gradeRules,
            updatedAt: new Date()
          }
        : spec
    );

    onUpdateSpecs(updatedSpecs);
    
    // Reset form
    setSelectedSpec(null);
    setBaseSize('');
    setBaseValue(0);
    setIncrement(0.25);
    setPreviewMeasurements({});
  };

  const resetPreview = () => {
    if (selectedSpec) {
      setPreviewMeasurements({ ...selectedSpec.measurements });
    }
  };

  const addGradeRule = () => {
    const newRule: GradeRule = {
      id: Date.now().toString(),
      fromSize: baseSize,
      toSize: sizeChart.sizes[sizeChart.sizes.length - 1],
      increment: increment,
      direction: 'up'
    };
    setGradeRules([...gradeRules, newRule]);
  };

  const removeGradeRule = (ruleId: string) => {
    setGradeRules(gradeRules.filter(rule => rule.id !== ruleId));
  };

  const getMeasurementStatus = (size: string, value: number | 'NR') => {
    if (value === 'NR') return 'NR';
    if (size === baseSize) return 'Base';
    return 'Graded';
  };

  const getCellColor = (size: string, value: number | 'NR') => {
    if (value === 'NR') return 'bg-red-50 border-red-200 text-red-800';
    if (size === baseSize) return 'bg-blue-50 border-blue-200 text-blue-800';
    return 'bg-gray-50 border-gray-200 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Grade Calculator</h3>
          <p className="text-sm text-gray-600">Calculate measurement grades across size ranges</p>
        </div>
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          <span className="text-sm text-gray-600">Auto-grading enabled</span>
        </div>
      </div>

      {/* POM Specification Selection */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select POM Specification
        </label>
        <select
          value={selectedSpec?.id || ''}
          onChange={(e) => {
            const spec = pomSpecs.find(s => s.id === e.target.value);
            if (spec) handleSpecSelect(spec);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        >
          <option value="">Choose a POM specification...</option>
          {pomSpecs.map(spec => (
            <option key={spec.id} value={spec.id}>
              {spec.pomCode} - {spec.pomName}
            </option>
          ))}
        </select>
      </div>

      {selectedSpec && (
        <>
          {/* Grade Calculation Controls */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Calculator className="w-5 h-5 text-blue-600 mr-2" />
              <h4 className="font-medium text-blue-900">Grade Calculation</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">Base Size</label>
                <select
                  value={baseSize}
                  onChange={(e) => setBaseSize(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select base size</option>
                  {sizeChart.sizes.map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">Base Value ({selectedSpec.unit})</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={baseValue}
                  onChange={(e) => setBaseValue(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">Increment ({selectedSpec.unit})</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={increment}
                  onChange={(e) => setIncrement(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex items-end space-x-2">
                <button
                  onClick={calculateGrades}
                  disabled={!baseSize || baseValue === 0}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Calculate
                </button>
                <button
                  onClick={resetPreview}
                  className="px-3 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Grade Rules */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">Grade Rules</h4>
              <button
                onClick={addGradeRule}
                className="text-sm text-teal-600 hover:text-teal-700"
              >
                + Add Rule
              </button>
            </div>
            
            {gradeRules.length > 0 ? (
              <div className="space-y-2">
                {gradeRules.map(rule => (
                  <div key={rule.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium">{rule.fromSize}</span>
                      <TrendingUp className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium">{rule.toSize}</span>
                      <span className="text-sm text-gray-600">+{rule.increment}{selectedSpec.unit}</span>
                    </div>
                    <button
                      onClick={() => removeGradeRule(rule.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No grade rules defined</p>
            )}
          </div>

          {/* Preview Table */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">Preview Measurements</h4>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Changes will be applied to:</span>
                <span className="bg-teal-100 text-teal-800 px-2 py-1 rounded text-sm font-medium">
                  {selectedSpec.pomCode}
                </span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      Size
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      Current
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      Preview
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sizeChart.sizes.map((size) => {
                    const currentValue = selectedSpec.measurements[size];
                    const previewValue = previewMeasurements[size];
                    const status = getMeasurementStatus(size, previewValue);
                    const hasChanged = currentValue !== previewValue;
                    
                    return (
                      <tr key={size} className={hasChanged ? 'bg-yellow-50' : ''}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200">
                          {size}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">
                          {currentValue === 'NR' ? 'NR' : currentValue}
                        </td>
                        <td className="px-4 py-3 border-r border-gray-200">
                          <span className={`px-3 py-1 rounded border text-sm ${getCellColor(size, previewValue)}`}>
                            {previewValue === 'NR' ? 'NR' : previewValue}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            status === 'Base' ? 'bg-blue-100 text-blue-800' :
                            status === 'Graded' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Apply Changes */}
          <div className="flex justify-end">
            <button
              onClick={applyGrades}
              className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              Apply Grade Calculations
            </button>
          </div>
        </>
      )}

      {!selectedSpec && (
        <div className="text-center py-12">
          <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a POM Specification</h3>
          <p className="text-gray-600">Choose a POM specification to start calculating grades</p>
        </div>
      )}
    </div>
  );
};
