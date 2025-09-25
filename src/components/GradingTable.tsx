import React, { useState } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  RotateCcw, 
  Save, 
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  Minus
} from 'lucide-react';
import { GradingRule, POMSpecification } from '../types';
import { useI18n } from '../lib/i18n';

interface GradingTableProps {
  gradingRules: GradingRule[];
  pomSpecs: POMSpecification[];
  onUpdateRules: (rules: GradingRule[]) => void;
}

export const GradingTable: React.FC<GradingTableProps> = ({
  gradingRules,
  pomSpecs,
  onUpdateRules
}) => {
  const { t } = useI18n();
  const [selectedRule, setSelectedRule] = useState<GradingRule | null>(null);
  const [previewMeasurements, setPreviewMeasurements] = useState<Record<string, Record<string, number | 'NR'>>>({});
  const [baseMeasurements, setBaseMeasurements] = useState<Record<string, number>>({});
  const [isCalculating, setIsCalculating] = useState(false);

  const handleRuleSelect = (rule: GradingRule) => {
    setSelectedRule(rule);
    setBaseMeasurements({});
    setPreviewMeasurements({});
  };

  const handleBaseMeasurementChange = (pomCode: string, value: number) => {
    setBaseMeasurements(prev => ({
      ...prev,
      [pomCode]: value
    }));
  };

  const calculateGrading = () => {
    if (!selectedRule || Object.keys(baseMeasurements).length === 0) return;

    setIsCalculating(true);
    
    const newPreview: Record<string, Record<string, number | 'NR'>> = {};
    
    // Initialize with base measurements
    selectedRule.sizeRanges.forEach(size => {
      newPreview[size] = {};
      Object.keys(baseMeasurements).forEach(pomCode => {
        newPreview[size][pomCode] = baseMeasurements[pomCode];
      });
    });

    // Apply grading increments
    selectedRule.increments.forEach(increment => {
      const baseSizeIndex = selectedRule.sizeRanges.indexOf(selectedRule.baseSize);
      if (baseSizeIndex === -1) return;

      const baseValue = baseMeasurements[increment.measurement];
      if (baseValue === undefined) return;

      selectedRule.sizeRanges.forEach((size, index) => {
        const sizeIndex = index;
        const gradeSteps = sizeIndex - baseSizeIndex;
        
        if (gradeSteps !== 0) {
          let newValue = baseValue;
          
          // Apply grading curve
          switch (increment.curve) {
            case 'Linear':
              newValue = baseValue + (increment.increment * gradeSteps);
              break;
            case 'Exponential':
              newValue = baseValue * Math.pow(1 + increment.increment, gradeSteps);
              break;
            case 'Custom':
              // For custom curves, use predefined increments
              if (increment.customCurve && increment.customCurve[Math.abs(gradeSteps) - 1] !== undefined) {
                newValue = baseValue + (increment.customCurve[Math.abs(gradeSteps) - 1] * Math.sign(gradeSteps));
              } else {
                newValue = baseValue + (increment.increment * gradeSteps);
              }
              break;
          }
          
          newPreview[size][increment.measurement] = Math.round(newValue * 100) / 100;
        }
      });
    });

    setPreviewMeasurements(newPreview);
    setIsCalculating(false);
  };

  const applyGrading = () => {
    if (!selectedRule) return;

    // Update the grading rule with calculated measurements
    const updatedRules = gradingRules.map(rule => 
      rule.id === selectedRule.id 
        ? { ...rule, updatedAt: new Date() }
        : rule
    );
    
    onUpdateRules(updatedRules);
    
    // Reset form
    setSelectedRule(null);
    setBaseMeasurements({});
    setPreviewMeasurements({});
  };

  const resetPreview = () => {
    setBaseMeasurements({});
    setPreviewMeasurements({});
  };

  const exportGradingTable = () => {
    if (!selectedRule || Object.keys(previewMeasurements).length === 0) return;

    const csvContent = [
      ['Size', ...Object.keys(baseMeasurements)],
      ...selectedRule.sizeRanges.map(size => [
        size,
        ...Object.keys(baseMeasurements).map(pomCode => 
          previewMeasurements[size]?.[pomCode] || ''
        )
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grading_table_${selectedRule.name}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getCellColor = (size: string, pomCode: string, value: number | 'NR') => {
    if (value === 'NR') return 'bg-red-50 border-red-200 text-red-800';
    if (size === selectedRule?.baseSize) return 'bg-blue-50 border-blue-200 text-blue-800';
    return 'bg-gray-50 border-gray-200 text-gray-800';
  };

  const getCellStatus = (size: string, pomCode: string) => {
    if (size === selectedRule?.baseSize) return 'Base';
    return 'Graded';
  };

  return (
    <div className="space-y-6">
      {/* Rule Selection */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Grading Rule
        </label>
        <select
          value={selectedRule?.id || ''}
          onChange={(e) => {
            const rule = gradingRules.find(r => r.id === e.target.value);
            if (rule) handleRuleSelect(rule);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        >
          <option value="">Choose a grading rule...</option>
          {gradingRules.map(rule => (
            <option key={rule.id} value={rule.id}>
              {rule.name} ({rule.fitType} - {rule.region})
            </option>
          ))}
        </select>
      </div>

      {selectedRule && (
        <>
          {/* Base Measurements Input */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Calculator className="w-5 h-5 text-blue-600 mr-2" />
              <h4 className="font-medium text-blue-900">Base Measurements ({selectedRule.baseSize})</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedRule.increments.map((increment, index) => {
                const pomSpec = pomSpecs.find(spec => spec.pomCode === increment.measurement);
                return (
                  <div key={index}>
                    <label className="block text-sm font-medium text-blue-800 mb-1">
                      {increment.measurement} - {pomSpec?.pomName || 'Unknown'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={baseMeasurements[increment.measurement] || ''}
                      onChange={(e) => handleBaseMeasurementChange(increment.measurement, parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter base measurement"
                    />
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={resetPreview}
                className="flex items-center px-4 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </button>
              <button
                onClick={calculateGrading}
                disabled={Object.keys(baseMeasurements).length === 0 || isCalculating}
                className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Calculator className="w-4 h-4 mr-2" />
                {isCalculating ? 'Calculating...' : 'Calculate Grading'}
              </button>
            </div>
          </div>

          {/* Grading Table */}
          {Object.keys(previewMeasurements).length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Grading Preview</h4>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={exportGradingTable}
                    className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </button>
                  <button
                    onClick={applyGrading}
                    className="flex items-center bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Apply Grading
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                        Size
                      </th>
                      {selectedRule.increments.map((increment, index) => {
                        const pomSpec = pomSpecs.find(spec => spec.pomCode === increment.measurement);
                        return (
                          <th key={index} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                            <div>
                              <div className="font-medium">{increment.measurement}</div>
                              <div className="text-xs text-gray-400">{pomSpec?.pomName || 'Unknown'}</div>
                              <div className="text-xs text-gray-400">+{increment.increment}</div>
                            </div>
                          </th>
                        );
                      })}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedRule.sizeRanges.map((size) => (
                      <tr key={size} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200">
                          {size}
                        </td>
                        {selectedRule.increments.map((increment, index) => {
                          const value = previewMeasurements[size]?.[increment.measurement] || 0;
                          const status = getCellStatus(size, increment.measurement);
                          
                          return (
                            <td key={index} className="px-4 py-3 border-r border-gray-200">
                              <span className={`px-3 py-1 rounded border text-sm ${getCellColor(size, increment.measurement, value)}`}>
                                {value === 'NR' ? 'NR' : value}
                              </span>
                            </td>
                          );
                        })}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            size === selectedRule.baseSize ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {size === selectedRule.baseSize ? 'Base' : 'Graded'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Rule Details */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium text-gray-900 mb-4">Rule Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Rule Name</label>
                <p className="text-sm text-gray-900">{selectedRule.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Base Size</label>
                <p className="text-sm text-gray-900">{selectedRule.baseSize}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Fit Type</label>
                <p className="text-sm text-gray-900">{selectedRule.fitType}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Region</label>
                <p className="text-sm text-gray-900">{selectedRule.region}</p>
              </div>
            </div>
          </div>
        </>
      )}

      {!selectedRule && (
        <div className="text-center py-12">
          <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Grading Rule</h3>
          <p className="text-gray-600">Choose a grading rule to start calculating measurements</p>
        </div>
      )}
    </div>
  );
};
