import React from 'react';
import { X, Ruler, Info, FileText } from 'lucide-react';
import { POMCode } from '../types';

interface POMCodeModalProps {
  pomCode: POMCode;
  onClose: () => void;
}

export const POMCodeModal: React.FC<POMCodeModalProps> = ({ pomCode, onClose }) => {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Body': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Sleeve': return 'bg-green-100 text-green-800 border-green-200';
      case 'Collar': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Pocket': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Body': return '👤';
      case 'Sleeve': return '👕';
      case 'Collar': return '👔';
      case 'Pocket': return '👖';
      default: return '📏';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-teal-100 p-2 rounded-lg">
              <Ruler className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{pomCode.code}</h2>
              <p className="text-sm text-gray-600">{pomCode.name}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getCategoryColor(pomCode.category)}`}>
              {getCategoryIcon(pomCode.category)} {pomCode.category}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
            <p className="text-gray-700 leading-relaxed">{pomCode.description}</p>
          </div>

          {/* How to Measure */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center">
              <Info className="w-5 h-5 mr-2 text-blue-600" />
              How to Measure
            </h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 leading-relaxed">{pomCode.howToMeasure}</p>
            </div>
          </div>

          {/* Technical Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Technical Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">POM Code</span>
                  <span className="text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                    {pomCode.code}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Category</span>
                  <span className="text-sm text-gray-900">{pomCode.category}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Unit of Measure</span>
                  <span className="text-sm text-gray-900">{pomCode.unit}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-600">Measurement Type</span>
                  <span className="text-sm text-gray-900">
                    {pomCode.category === 'Body' ? 'Body Measurement' :
                     pomCode.category === 'Sleeve' ? 'Sleeve Measurement' :
                     pomCode.category === 'Collar' ? 'Collar Measurement' :
                     pomCode.category === 'Pocket' ? 'Pocket Measurement' :
                     'General Measurement'}
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Reference */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Visual Reference</h3>
              {pomCode.imageUrl ? (
                <div className="bg-gray-100 rounded-lg p-4 text-center">
                  <img
                    src={pomCode.imageUrl}
                    alt={`${pomCode.name} measurement guide`}
                    className="w-full h-48 object-contain rounded-lg"
                  />
                </div>
              ) : (
                <div className="bg-gray-100 rounded-lg p-8 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No visual reference available</p>
                </div>
              )}
            </div>
          </div>

          {/* Measurement Tips */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Measurement Tips</h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <ul className="text-yellow-800 space-y-2 text-sm">
                <li className="flex items-start">
                  <span className="text-yellow-600 mr-2">•</span>
                  <span>Ensure the garment is laid flat and smooth before measuring</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-600 mr-2">•</span>
                  <span>Use a flexible measuring tape for accurate results</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-600 mr-2">•</span>
                  <span>Measure from the outside edge of seams when applicable</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-600 mr-2">•</span>
                  <span>Record measurements to the nearest 0.1 {pomCode.unit}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-600 mr-2">•</span>
                  <span>Double-check measurements for consistency across samples</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Related POM Codes */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Related Measurements</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {pomCode.category === 'Body' && (
                <>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <div className="text-sm font-medium text-gray-900">Chest Width</div>
                    <div className="text-xs text-gray-600">CW</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <div className="text-sm font-medium text-gray-900">Shoulder Width</div>
                    <div className="text-xs text-gray-600">SH</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <div className="text-sm font-medium text-gray-900">Waist Length</div>
                    <div className="text-xs text-gray-600">WL</div>
                  </div>
                </>
              )}
              {pomCode.category === 'Sleeve' && (
                <>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <div className="text-sm font-medium text-gray-900">Sleeve Opening</div>
                    <div className="text-xs text-gray-600">SO</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <div className="text-sm font-medium text-gray-900">Cuff Width</div>
                    <div className="text-xs text-gray-600">CF</div>
                  </div>
                </>
              )}
              {pomCode.category === 'Collar' && (
                <>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <div className="text-sm font-medium text-gray-900">Collar Height</div>
                    <div className="text-xs text-gray-600">CH</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <div className="text-sm font-medium text-gray-900">Collar Point</div>
                    <div className="text-xs text-gray-600">CP</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
