import React from 'react';
import { Palette, Plus, Search, Filter, Download, Upload } from 'lucide-react';
import { useI18n } from '../lib/i18n';

export const SymbolsLibrary: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{t('construction.symbols')}</h3>
          <p className="text-sm text-gray-600">Predefined construction symbols and annotations</p>
        </div>
        <div className="flex items-center space-x-2">
          <Palette className="w-5 h-5 text-teal-600" />
          <span className="text-sm text-gray-600">Symbol library system</span>
        </div>
      </div>

      {/* Coming Soon Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <Palette className="w-16 h-16 text-teal-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Symbols Library</h3>
        <p className="text-gray-600 mb-6">Professional construction symbols and annotation tools</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
          <div className="p-4 border border-gray-200 rounded-lg">
            <Plus className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900 mb-2">Seam Symbols</h4>
            <p className="text-sm text-gray-600">Standard seam type symbols and notations</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <Search className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900 mb-2">Measurement Symbols</h4>
            <p className="text-sm text-gray-600">Dimension lines and measurement callouts</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <Filter className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900 mb-2">Annotation Tools</h4>
            <p className="text-sm text-gray-600">Text, arrows, and callout symbols</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <Download className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900 mb-2">Custom Symbols</h4>
            <p className="text-sm text-gray-600">Create and save custom symbol libraries</p>
          </div>
        </div>
      </div>
    </div>
  );
};
