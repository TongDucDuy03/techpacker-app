import React from 'react';
import { Globe, ArrowRight, Download, Upload } from 'lucide-react';
import { SizeSet, GradingRule } from '../types';
import { useI18n } from '../lib/i18n';

interface RegionalConversionProps {
  sizeSets: SizeSet[];
  gradingRules: GradingRule[];
}

export const RegionalConversion: React.FC<RegionalConversionProps> = ({ sizeSets, gradingRules }) => {
  const { t } = useI18n();

  const conversionMappings = {
    'US': { 'EU': '36,38,40,42,44,46', 'UK': '8,10,12,14,16,18', 'JP': 'S,M,L,XL,XXL,XXXL' },
    'EU': { 'US': 'XS,S,M,L,XL,XXL', 'UK': '6,8,10,12,14,16', 'JP': 'S,M,L,XL,XXL,XXXL' },
    'UK': { 'US': 'XS,S,M,L,XL,XXL', 'EU': '34,36,38,40,42,44', 'JP': 'S,M,L,XL,XXL,XXXL' },
    'JP': { 'US': 'XS,S,M,L,XL,XXL', 'EU': '34,36,38,40,42,44', 'UK': '6,8,10,12,14,16' },
    'AU': { 'US': 'XS,S,M,L,XL,XXL', 'EU': '34,36,38,40,42,44', 'UK': '6,8,10,12,14,16' }
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
          <h3 className="text-lg font-medium text-gray-900">{t('grading.regionalConversion')}</h3>
          <p className="text-sm text-gray-600">Convert size ranges between different regional standards</p>
        </div>
        <div className="flex items-center space-x-2">
          <Globe className="w-5 h-5 text-teal-600" />
          <span className="text-sm text-gray-600">Regional size conversion</span>
        </div>
      </div>

      {/* Conversion Matrix */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h4 className="font-medium text-gray-900 mb-4">Size Conversion Matrix</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  From Region
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  To Region
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  Size Mapping
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(conversionMappings).map(([fromRegion, mappings]) =>
                Object.entries(mappings).map(([toRegion, mapping]) => (
                  <tr key={`${fromRegion}-${toRegion}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200">
                      <div className="flex items-center">
                        {getRegionFlag(fromRegion)} {fromRegion}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200">
                      <div className="flex items-center">
                        {getRegionFlag(toRegion)} {toRegion}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">XS,S,M,L,XL,XXL</span>
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                        <span className="text-xs bg-teal-100 px-2 py-1 rounded">{mapping}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <button className="text-teal-600 hover:text-teal-700 text-sm">
                          Edit
                        </button>
                        <button className="text-blue-600 hover:text-blue-700 text-sm">
                          Apply
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Conversion Tool */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h4 className="font-medium text-gray-900 mb-4">Quick Conversion Tool</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Region</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent">
              <option value="US">🇺🇸 US</option>
              <option value="EU">🇪🇺 EU</option>
              <option value="UK">🇬🇧 UK</option>
              <option value="JP">🇯🇵 JP</option>
              <option value="AU">🇦🇺 AU</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Region</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent">
              <option value="EU">🇪🇺 EU</option>
              <option value="US">🇺🇸 US</option>
              <option value="UK">🇬🇧 UK</option>
              <option value="JP">🇯🇵 JP</option>
              <option value="AU">🇦🇺 AU</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="w-full bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              Convert Sizes
            </button>
          </div>
        </div>
      </div>

      {/* Import/Export Tools */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h4 className="font-medium text-gray-900 mb-4">Import/Export Conversion Tables</h4>
        <div className="flex items-center space-x-4">
          <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </button>
          <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
};
