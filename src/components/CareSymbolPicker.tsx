import React, { useState, useMemo } from 'react';
import { CareSymbol, CareSymbolType, CareSymbolStandard } from '../types';
import { careSymbols, getCareSymbolsByType, getCareSymbolsByStandard } from '../data/careSymbols';
import { Search, Filter, Check, X, Info } from 'lucide-react';

interface CareSymbolPickerProps {
  selectedSymbols: CareSymbol[];
  onSymbolsChange: (symbols: CareSymbol[]) => void;
  maxSymbols?: number;
  allowMultiple?: boolean;
  className?: string;
}

export const CareSymbolPicker: React.FC<CareSymbolPickerProps> = ({
  selectedSymbols,
  onSymbolsChange,
  maxSymbols = 10,
  allowMultiple = true,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<CareSymbolType | 'all'>('all');
  const [selectedStandard, setSelectedStandard] = useState<CareSymbolStandard | 'all'>('all');
  const [showPreview, setShowPreview] = useState(false);
  const [previewSymbol, setPreviewSymbol] = useState<CareSymbol | null>(null);

  const symbolTypes: CareSymbolType[] = ['wash', 'dry', 'iron', 'bleach', 'dryclean', 'warning', 'temperature', 'special'];
  const standards: CareSymbolStandard[] = ['ISO', 'ASTM', 'GINETEX', 'JIS', 'AS', 'Custom'];

  const filteredSymbols = useMemo(() => {
    let filtered = careSymbols;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(symbol =>
        symbol.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        symbol.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(symbol => symbol.type === selectedType);
    }

    // Filter by standard
    if (selectedStandard !== 'all') {
      filtered = filtered.filter(symbol => symbol.standard === selectedStandard);
    }

    return filtered;
  }, [searchTerm, selectedType, selectedStandard]);

  const handleSymbolSelect = (symbol: CareSymbol) => {
    if (!allowMultiple) {
      onSymbolsChange([symbol]);
      return;
    }

    const isSelected = selectedSymbols.some(s => s.id === symbol.id);
    
    if (isSelected) {
      // Remove symbol
      onSymbolsChange(selectedSymbols.filter(s => s.id !== symbol.id));
    } else {
      // Add symbol (check max limit)
      if (selectedSymbols.length < maxSymbols) {
        onSymbolsChange([...selectedSymbols, symbol]);
      }
    }
  };

  const handleSymbolRemove = (symbolId: string) => {
    onSymbolsChange(selectedSymbols.filter(s => s.id !== symbolId));
  };

  const handlePreview = (symbol: CareSymbol) => {
    setPreviewSymbol(symbol);
    setShowPreview(true);
  };

  const isSymbolSelected = (symbol: CareSymbol) => {
    return selectedSymbols.some(s => s.id === symbol.id);
  };

  const canAddMore = selectedSymbols.length < maxSymbols;

  return (
    <div className={`care-symbol-picker ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Care Symbol Picker</h3>
        <p className="text-sm text-gray-600">
          Select care symbols for your garment. {selectedSymbols.length}/{maxSymbols} selected.
        </p>
      </div>

      {/* Selected Symbols Preview */}
      {selectedSymbols.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Selected Symbols</h4>
          <div className="flex flex-wrap gap-2">
            {selectedSymbols.map(symbol => (
              <div
                key={symbol.id}
                className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-md"
              >
                <div
                  className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded"
                  dangerouslySetInnerHTML={{ __html: symbol.svg }}
                />
                <span className="text-sm text-gray-700">{symbol.name}</span>
                <button
                  onClick={() => handleSymbolRemove(symbol.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search symbols..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Type and Standard Filters */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Symbol Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as CareSymbolType | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              {symbolTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Standard</label>
            <select
              value={selectedStandard}
              onChange={(e) => setSelectedStandard(e.target.value as CareSymbolStandard | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Standards</option>
              {standards.map(standard => (
                <option key={standard} value={standard}>{standard}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Symbols Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {filteredSymbols.map(symbol => {
          const isSelected = isSymbolSelected(symbol);
          const canSelect = canAddMore || isSelected;

          return (
            <div
              key={symbol.id}
              className={`relative p-3 border rounded-lg cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : canSelect
                  ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  : 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
              }`}
              onClick={() => canSelect && handleSymbolSelect(symbol)}
            >
              {/* Symbol */}
              <div
                className="w-12 h-12 mx-auto mb-2 flex items-center justify-center border border-gray-300 rounded bg-white"
                dangerouslySetInnerHTML={{ __html: symbol.svg }}
              />

              {/* Symbol Info */}
              <div className="text-center">
                <h4 className="text-xs font-medium text-gray-700 truncate">{symbol.name}</h4>
                <p className="text-xs text-gray-500 truncate">{symbol.description}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <span className="text-xs text-gray-400">{symbol.standard}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreview(symbol);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Info className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-1 right-1">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* No Results */}
      {filteredSymbols.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Filter className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No symbols found matching your criteria.</p>
        </div>
      )}

      {/* Symbol Preview Modal */}
      {showPreview && previewSymbol && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{previewSymbol.name}</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center mb-4">
              <div
                className="w-24 h-24 mx-auto mb-4 flex items-center justify-center border border-gray-300 rounded bg-white"
                dangerouslySetInnerHTML={{ __html: previewSymbol.svg }}
              />
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-700">Description</h4>
                <p className="text-sm text-gray-600">{previewSymbol.description}</p>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Type:</span>
                <span className="text-gray-600 capitalize">{previewSymbol.type}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Standard:</span>
                <span className="text-gray-600">{previewSymbol.standard}</span>
              </div>

              {previewSymbol.temperature && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Temperature:</span>
                  <span className="text-gray-600">
                    {previewSymbol.temperature.min && previewSymbol.temperature.max
                      ? `${previewSymbol.temperature.min}-${previewSymbol.temperature.max}°${previewSymbol.temperature.unit}`
                      : previewSymbol.temperature.min
                      ? `${previewSymbol.temperature.min}°${previewSymbol.temperature.unit}`
                      : `${previewSymbol.temperature.max}°${previewSymbol.temperature.unit}`}
                  </span>
                </div>
              )}

              {previewSymbol.warnings && previewSymbol.warnings.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Warnings</h4>
                  <ul className="text-sm text-gray-600">
                    {previewSymbol.warnings.map((warning, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-red-500">•</span>
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  handleSymbolSelect(previewSymbol);
                  setShowPreview(false);
                }}
                disabled={!canAddMore && !isSymbolSelected(previewSymbol)}
                className={`flex-1 py-2 px-4 rounded-md font-medium ${
                  isSymbolSelected(previewSymbol)
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : canAddMore
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSymbolSelected(previewSymbol) ? 'Remove Symbol' : 'Add Symbol'}
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
