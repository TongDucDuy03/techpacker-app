import React from 'react';
import { Users, Plus, Edit, Trash2, Globe } from 'lucide-react';
import { SizeSet } from '../types';
import { useI18n } from '../lib/i18n';

interface SizeRangeManagerProps {
  sizeSets: SizeSet[];
  onUpdateSizeSets: (sizeSets: SizeSet[]) => void;
}

export const SizeRangeManager: React.FC<SizeRangeManagerProps> = ({ sizeSets, onUpdateSizeSets }) => {
  const { t } = useI18n();

  const getFitTypeColor = (fitType: string) => {
    switch (fitType) {
      case 'Regular': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Tall': return 'bg-green-100 text-green-800 border-green-200';
      case 'Big & Tall': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Petite': return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'Plus': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRegionFlag = (region: string) => {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{t('grading.sizeRanges')}</h3>
          <p className="text-sm text-gray-600">Manage size ranges and fit type variations</p>
        </div>
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-teal-600" />
          <span className="text-sm text-gray-600">Size set management</span>
        </div>
      </div>

      {/* Size Sets List */}
      <div className="space-y-4">
        {sizeSets.map((sizeSet) => (
          <div key={sizeSet.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{sizeSet.name}</h3>
                  <div className="flex items-center space-x-3 mt-1">
                    <span className={`px-2 py-1 rounded text-sm font-medium border ${getFitTypeColor(sizeSet.fitType)}`}>
                      {sizeSet.fitType}
                    </span>
                    <span className="flex items-center text-sm text-gray-600">
                      {getRegionFlag(sizeSet.region)} {sizeSet.region}
                    </span>
                    <span className="text-sm text-gray-600">
                      {sizeSet.sizes.length} sizes
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="text-teal-600 hover:text-teal-900 transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="text-red-600 hover:text-red-900 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Sizes Display */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Available Sizes:</h4>
              <div className="flex flex-wrap gap-2">
                {sizeSet.sizes.map((size) => (
                  <span key={size} className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
                    {size}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {sizeSets.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No size sets found</h3>
          <p className="text-gray-600 mb-6">Create your first size set to get started</p>
          <button className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center mx-auto">
            <Plus className="w-4 h-4 mr-2" />
            Create Size Set
          </button>
        </div>
      )}
    </div>
  );
};
