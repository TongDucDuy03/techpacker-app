import React from 'react';
import { Ruler, Plus, Search, Filter, Download, Upload } from 'lucide-react';
import { ConstructionDetail } from '../types';
import { useI18n } from '../lib/i18n';

interface WorkInstructionsProps {
  details: ConstructionDetail[];
}

export const WorkInstructions: React.FC<WorkInstructionsProps> = ({ details }) => {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{t('construction.instructions')}</h3>
          <p className="text-sm text-gray-600">Step-by-step work instructions for construction details</p>
        </div>
        <div className="flex items-center space-x-2">
          <Ruler className="w-5 h-5 text-teal-600" />
          <span className="text-sm text-gray-600">Work instruction system</span>
        </div>
      </div>

      {/* Coming Soon Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <Ruler className="w-16 h-16 text-teal-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Work Instructions</h3>
        <p className="text-gray-600 mb-6">Detailed step-by-step instructions for construction processes</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
          <div className="p-4 border border-gray-200 rounded-lg">
            <Plus className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900 mb-2">Step-by-Step</h4>
            <p className="text-sm text-gray-600">Detailed construction sequence with images</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <Search className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900 mb-2">Time Estimates</h4>
            <p className="text-sm text-gray-600">Accurate time estimates for each step</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <Filter className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900 mb-2">Print Ready</h4>
            <p className="text-sm text-gray-600">Print-optimized instruction sheets</p>
          </div>
        </div>
      </div>
    </div>
  );
};
