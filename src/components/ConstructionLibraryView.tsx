import React from 'react';
import { Library, Plus, Search, Filter, Download, Upload } from 'lucide-react';
import { ConstructionLibrary } from '../types';
import { useI18n } from '../lib/i18n';

interface ConstructionLibraryViewProps {
  libraries: ConstructionLibrary[];
  onUpdateLibraries: (libraries: ConstructionLibrary[]) => void;
}

export const ConstructionLibraryView: React.FC<ConstructionLibraryViewProps> = ({
  libraries,
  onUpdateLibraries
}) => {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{t('construction.library')}</h3>
          <p className="text-sm text-gray-600">{t('construction.libraryHint')}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Library className="w-5 h-5 text-teal-600" />
          <span className="text-sm text-gray-600">{t('construction.librarySystem')}</span>
        </div>
      </div>

      {/* Coming Soon Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <Library className="w-16 h-16 text-teal-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('construction.library')}</h3>
        <p className="text-gray-600 mb-6">{t('construction.libraryIntro')}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
          <div className="p-4 border border-gray-200 rounded-lg">
            <Plus className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900 mb-2">{t('construction.createLibraries')}</h4>
            <p className="text-sm text-gray-600">{t('construction.createLibrariesHint')}</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <Download className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900 mb-2">{t('construction.shareExport')}</h4>
            <p className="text-sm text-gray-600">{t('construction.shareExportHint')}</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <Upload className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900 mb-2">{t('construction.importTemplates')}</h4>
            <p className="text-sm text-gray-600">{t('construction.importTemplatesHint')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
