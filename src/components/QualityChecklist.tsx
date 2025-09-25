import React from 'react';
import { Grid, Plus, Search, Filter, Download, Upload, CheckCircle } from 'lucide-react';
import { ConstructionDetail } from '../types';
import { useI18n } from '../lib/i18n';

interface QualityChecklistProps {
  details: ConstructionDetail[];
}

export const QualityChecklist: React.FC<QualityChecklistProps> = ({ details }) => {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{t('construction.checklist')}</h3>
          <p className="text-sm text-gray-600">Quality control checklists for construction details</p>
        </div>
        <div className="flex items-center space-x-2">
          <Grid className="w-5 h-5 text-teal-600" />
          <span className="text-sm text-gray-600">Quality checklist system</span>
        </div>
      </div>

      {/* Coming Soon Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <CheckCircle className="w-16 h-16 text-teal-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Quality Checklist</h3>
        <p className="text-gray-600 mb-6">Comprehensive quality control checklists for construction processes</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
          <div className="p-4 border border-gray-200 rounded-lg">
            <Plus className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900 mb-2">Quality Points</h4>
            <p className="text-sm text-gray-600">Predefined quality checkpoints for each construction</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <Search className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900 mb-2">Custom Checklists</h4>
            <p className="text-sm text-gray-600">Create custom checklists for specific requirements</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <Filter className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900 mb-2">Progress Tracking</h4>
            <p className="text-sm text-gray-600">Track completion status and quality scores</p>
          </div>
        </div>
      </div>
    </div>
  );
};
