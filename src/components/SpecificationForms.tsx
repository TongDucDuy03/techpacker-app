import React from 'react';
import { FileText, Plus, Search, Filter, Download, Upload } from 'lucide-react';
import { ConstructionDetail } from '../types';
import { useI18n } from '../lib/i18n';

interface SpecificationFormsProps {
  details: ConstructionDetail[];
}

export const SpecificationForms: React.FC<SpecificationFormsProps> = ({ details }) => {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{t('construction.specifications')}</h3>
          <p className="text-sm text-gray-600">Manage detailed construction specifications and standards</p>
        </div>
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-teal-600" />
          <span className="text-sm text-gray-600">Specification management</span>
        </div>
      </div>

      {/* Coming Soon Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <FileText className="w-16 h-16 text-teal-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Specification Forms</h3>
        <p className="text-gray-600 mb-6">Detailed specification forms for construction standards and requirements</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
          <div className="p-4 border border-gray-200 rounded-lg">
            <Plus className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900 mb-2">Thread Specifications</h4>
            <p className="text-sm text-gray-600">Detailed thread type, color, and weight specifications</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <Search className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900 mb-2">Machine Settings</h4>
            <p className="text-sm text-gray-600">SPI, tension, needle size, and presser foot settings</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <Filter className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900 mb-2">Quality Standards</h4>
            <p className="text-sm text-gray-600">Quality checkpoints and inspection criteria</p>
          </div>
        </div>
      </div>
    </div>
  );
};
