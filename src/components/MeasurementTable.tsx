import React, { useState } from 'react';
import { Calculator, Info, AlertCircle } from 'lucide-react';
import { Tolerance } from '../types';

interface MeasurementTableProps {
  measurements: Record<string, number | 'NR'>;
  sizes: string[];
  unit: 'inches' | 'cm';
  tolerances: Tolerance;
  onMeasurementChange: (size: string, value: number | 'NR') => void;
  onGradeCalculation: (baseSize: string, baseValue: number, increment: number) => void;
  showGradeCalculator: boolean;
}

export const MeasurementTable: React.FC<MeasurementTableProps> = ({
  measurements,
  sizes,
  unit,
  tolerances,
  onMeasurementChange,
  onGradeCalculation,
  showGradeCalculator
}) => {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const [gradeBaseSize, setGradeBaseSize] = useState<string>('');
  const [gradeIncrement, setGradeIncrement] = useState<number>(0.25);

  const handleCellClick = (size: string) => {
    setEditingCell(size);
    setTempValue(measurements[size] === 'NR' ? 'NR' : measurements[size].toString());
  };

  const handleCellBlur = () => {
    if (editingCell) {
      let value: number | 'NR';
      if (tempValue === 'NR' || tempValue.toLowerCase() === 'nr') {
        value = 'NR';
      } else {
        const numValue = parseFloat(tempValue);
        value = isNaN(numValue) ? 0 : numValue;
      }
      onMeasurementChange(editingCell, value);
      setEditingCell(null);
      setTempValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setTempValue('');
    }
  };

  const getCellColor = (size: string, value: number | 'NR') => {
    if (value === 'NR') return 'bg-red-50 border-red-200 text-red-800';
    
    // Find base size (first non-zero, non-NR value)
    const baseSize = sizes.find(s => measurements[s] !== 'NR' && measurements[s] !== 0);
    if (baseSize && size === baseSize) {
      return 'bg-blue-50 border-blue-200 text-blue-800';
    }
    
    return 'bg-gray-50 border-gray-200 text-gray-800';
  };

  const getCellStatus = (size: string, value: number | 'NR') => {
    if (value === 'NR') return 'NR';
    
    // Find base size
    const baseSize = sizes.find(s => measurements[s] !== 'NR' && measurements[s] !== 0);
    if (baseSize && size === baseSize) {
      return 'Base';
    }
    
    return 'Graded';
  };

  const handleGradeCalculation = () => {
    if (gradeBaseSize && measurements[gradeBaseSize] !== 'NR') {
      const baseValue = measurements[gradeBaseSize] as number;
      onGradeCalculation(gradeBaseSize, baseValue, gradeIncrement);
    }
  };

  const getToleranceRange = (value: number | 'NR') => {
    if (value === 'NR') return null;
    return {
      min: (value as number) - tolerances.minusTol,
      max: (value as number) + tolerances.plusTol
    };
  };

  return (
    <div className="space-y-4">
      {/* Grade Calculator */}
      {showGradeCalculator && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <Calculator className="w-5 h-5 text-blue-600 mr-2" />
            <h4 className="font-medium text-blue-900">Grade Calculator</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-blue-800 mb-1">Base Size</label>
              <select
                value={gradeBaseSize}
                onChange={(e) => setGradeBaseSize(e.target.value)}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select base size</option>
                {sizes.map(size => (
                  <option key={size} value={size}>
                    {size} ({measurements[size] !== 'NR' ? measurements[size] : 'NR'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-800 mb-1">Increment ({unit})</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={gradeIncrement}
                onChange={(e) => setGradeIncrement(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleGradeCalculation}
                disabled={!gradeBaseSize || measurements[gradeBaseSize] === 'NR'}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Calculate Grades
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Measurement Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Size
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Measurement ({unit})
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Tolerance Range
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sizes.map((size) => {
              const value = measurements[size];
              const toleranceRange = getToleranceRange(value);
              const status = getCellStatus(size, value);
              
              return (
                <tr key={size} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200">
                    {size}
                  </td>
                  <td className="px-4 py-3 border-r border-gray-200">
                    {editingCell === size ? (
                      <input
                        type="text"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={handleCellBlur}
                        onKeyDown={handleKeyPress}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={() => handleCellClick(size)}
                        className={`w-full px-3 py-2 rounded border text-left transition-colors ${getCellColor(size, value)}`}
                      >
                        {value === 'NR' ? 'NR' : value}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">
                    {toleranceRange ? (
                      <div className="flex items-center">
                        <span className="text-xs">
                          {toleranceRange.min.toFixed(2)} - {toleranceRange.max.toFixed(2)}
                        </span>
                        <Info className="w-3 h-3 text-gray-400 ml-1" />
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
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

      {/* Legend */}
      <div className="flex items-center space-x-6 text-sm">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded mr-2"></div>
          <span className="text-gray-600">Base Size</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded mr-2"></div>
          <span className="text-gray-600">Graded Size</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-100 border border-red-200 rounded mr-2"></div>
          <span className="text-gray-600">Not Required (NR)</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">Instructions:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Click on any cell to edit the measurement value</li>
              <li>Type "NR" to mark a measurement as Not Required</li>
              <li>Use the Grade Calculator to automatically calculate measurements for all sizes</li>
              <li>Base size (blue) is used as reference for grading calculations</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
