import React from 'react';
import { Settings, FileText, Download, Upload } from 'lucide-react';
import { useI18n } from '../lib/i18n';

export const DrawingTemplates: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{t('construction.templates')}</h3>
          <p className="text-sm text-gray-600">Pre-built drawing templates for common constructions</p>
        </div>
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-teal-600" />
          <span className="text-sm text-gray-600">Template management</span>
        </div>
      </div>

      {/* Coming Soon Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <FileText className="w-16 h-16 text-teal-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Drawing Templates</h3>
        <p className="text-gray-600 mb-6">Pre-built templates for standard construction drawings</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
          <div className="p-4 border border-gray-200 rounded-lg">
            <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900 mb-2">Standard Templates</h4>
            <p className="text-sm text-gray-600">Common seam, pocket, and collar templates</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <Download className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900 mb-2">Custom Templates</h4>
            <p className="text-sm text-gray-600">Create and save your own drawing templates</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <Upload className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900 mb-2">Import/Export</h4>
            <p className="text-sm text-gray-600">Share templates with team members</p>
          </div>
        </div>
      </div>
    </div>
  );
};
