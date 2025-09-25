import React, { useState } from 'react';
import { GitCompare, TrendingUp, TrendingDown, CheckCircle, XCircle, AlertTriangle, Download } from 'lucide-react';
import { POMSpecification, SizeChart, MeasurementComparison as ComparisonType, Tolerance } from '../types';

interface MeasurementComparisonProps {
  pomSpecs: POMSpecification[];
  sizeChart: SizeChart;
}

export const MeasurementComparison: React.FC<MeasurementComparisonProps> = ({
  pomSpecs,
  sizeChart
}) => {
  const [selectedSpec, setSelectedSpec] = useState<POMSpecification | null>(null);
  const [comparisons, setComparisons] = useState<ComparisonType[]>([]);
  const [targetMeasurements, setTargetMeasurements] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);

  const handleSpecSelect = (spec: POMSpecification) => {
    setSelectedSpec(spec);
    setTargetMeasurements({});
    setComparisons([]);
    setShowResults(false);
  };

  const handleTargetMeasurementChange = (size: string, value: number) => {
    setTargetMeasurements(prev => ({
      ...prev,
      [size]: value
    }));
  };

  const runComparison = () => {
    if (!selectedSpec) return;

    const newComparisons: ComparisonType[] = [];
    
    sizeChart.sizes.forEach(size => {
      const currentValue = selectedSpec.measurements[size];
      const targetValue = targetMeasurements[size];
      
      if (currentValue !== 'NR' && targetValue !== undefined) {
        const current = currentValue as number;
        const deviation = current - targetValue;
        const tolerance = selectedSpec.tolerances;
        
        let status: 'Pass' | 'Fail' | 'Warning';
        if (Math.abs(deviation) <= tolerance.minusTol) {
          status = 'Pass';
        } else if (Math.abs(deviation) <= tolerance.plusTol) {
          status = 'Warning';
        } else {
          status = 'Fail';
        }
        
        newComparisons.push({
          id: `${selectedSpec.id}-${size}`,
          pomCode: selectedSpec.pomCode,
          currentValue: current,
          targetValue: targetValue,
          tolerance: tolerance,
          status: status,
          deviation: deviation
        });
      }
    });
    
    setComparisons(newComparisons);
    setShowResults(true);
  };

  const getStatusIcon = (status: 'Pass' | 'Fail' | 'Warning') => {
    switch (status) {
      case 'Pass':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'Fail':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'Warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: 'Pass' | 'Fail' | 'Warning') => {
    switch (status) {
      case 'Pass':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Fail':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getDeviationColor = (deviation: number) => {
    if (Math.abs(deviation) <= 0.1) return 'text-green-600';
    if (Math.abs(deviation) <= 0.25) return 'text-yellow-600';
    return 'text-red-600';
  };

  const exportResults = () => {
    const csvContent = [
      ['POM Code', 'Size', 'Current Value', 'Target Value', 'Deviation', 'Status', 'Tolerance Range'],
      ...comparisons.map(comp => {
        const size = sizeChart.sizes.find(s => 
          selectedSpec?.measurements[s] === comp.currentValue
        ) || '';
        
        return [
          comp.pomCode,
          size,
          comp.currentValue.toString(),
          comp.targetValue.toString(),
          comp.deviation.toFixed(3),
          comp.status,
          `±${comp.tolerance.minusTol}`
        ];
      })
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `measurement_comparison_${selectedSpec?.pomCode}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const summary = {
    total: comparisons.length,
    pass: comparisons.filter(c => c.status === 'Pass').length,
    warning: comparisons.filter(c => c.status === 'Warning').length,
    fail: comparisons.filter(c => c.status === 'Fail').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Measurement Comparison</h3>
          <p className="text-sm text-gray-600">Compare current measurements against target values</p>
        </div>
        <div className="flex items-center space-x-2">
          <GitCompare className="w-5 h-5 text-blue-600" />
          <span className="text-sm text-gray-600">Tolerance-based validation</span>
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
          {/* Target Measurements Input */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
              <h4 className="font-medium text-blue-900">Target Measurements</h4>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {sizeChart.sizes.map(size => {
                const currentValue = selectedSpec.measurements[size];
                if (currentValue === 'NR') return null;
                
                return (
                  <div key={size}>
                    <label className="block text-sm font-medium text-blue-800 mb-1">
                      {size}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={targetMeasurements[size] || ''}
                      onChange={(e) => handleTargetMeasurementChange(size, parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Current: ${currentValue}`}
                    />
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={runComparison}
                disabled={Object.keys(targetMeasurements).length === 0}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Run Comparison
              </button>
            </div>
          </div>

          {/* Results Summary */}
          {showResults && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-medium text-gray-900">Comparison Results</h4>
                <button
                  onClick={exportResults}
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </button>
              </div>
              
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{summary.pass}</div>
                  <div className="text-sm text-green-600">Pass</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-600">{summary.warning}</div>
                  <div className="text-sm text-yellow-600">Warning</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">{summary.fail}</div>
                  <div className="text-sm text-red-600">Fail</div>
                </div>
              </div>

              {/* Detailed Results */}
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
                        Target
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                        Deviation
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                        Tolerance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {comparisons.map((comp) => {
                      const size = sizeChart.sizes.find(s => 
                        selectedSpec.measurements[s] === comp.currentValue
                      ) || '';
                      
                      return (
                        <tr key={comp.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200">
                            {size}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">
                            {comp.currentValue}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">
                            {comp.targetValue}
                          </td>
                          <td className={`px-4 py-3 text-sm font-medium border-r border-gray-200 ${getDeviationColor(comp.deviation)}`}>
                            {comp.deviation > 0 ? '+' : ''}{comp.deviation.toFixed(3)}
                          </td>
                          <td className="px-4 py-3 border-r border-gray-200">
                            <div className="flex items-center">
                              {getStatusIcon(comp.status)}
                              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(comp.status)}`}>
                                {comp.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            ±{comp.tolerance.minusTol}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {!selectedSpec && (
        <div className="text-center py-12">
          <GitCompare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a POM Specification</h3>
          <p className="text-gray-600">Choose a POM specification to start comparing measurements</p>
        </div>
      )}
    </div>
  );
};
