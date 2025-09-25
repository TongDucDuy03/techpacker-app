import React from 'react';
import { Image, Grid, Layers, Palette, Ruler, Download, Save } from 'lucide-react';
import { TechnicalDrawing } from '../types';
import { useI18n } from '../lib/i18n';

interface TechnicalDrawingCanvasProps {
  drawings: TechnicalDrawing[];
  onUpdateDrawings: (drawings: TechnicalDrawing[]) => void;
}

export const TechnicalDrawingCanvas: React.FC<TechnicalDrawingCanvasProps> = ({
  drawings,
  onUpdateDrawings
}) => {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{t('construction.drawings')}</h3>
          <p className="text-sm text-gray-600">Create and edit technical drawings with SVG canvas</p>
        </div>
        <div className="flex items-center space-x-2">
          <Image className="w-5 h-5 text-teal-600" />
          <span className="text-sm text-gray-600">SVG-based drawing system</span>
        </div>
      </div>

      {/* Coming Soon Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <Image className="w-16 h-16 text-teal-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Technical Drawing Canvas</h3>
        <p className="text-gray-600 mb-6">Advanced SVG-based drawing canvas with professional tools coming soon</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
          <div className="p-4 border border-gray-200 rounded-lg">
            <Grid className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900 mb-2">Grid System</h4>
            <p className="text-sm text-gray-600">Precise grid alignment and snap-to-grid functionality</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <Layers className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900 mb-2">Layer Management</h4>
            <p className="text-sm text-gray-600">Organize drawing elements in separate layers</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <Palette className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900 mb-2">Symbols Library</h4>
            <p className="text-sm text-gray-600">Pre-built construction symbols and annotations</p>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <Ruler className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <h4 className="font-medium text-gray-900 mb-2">Measurement Tools</h4>
            <p className="text-sm text-gray-600">Precise measurement and dimensioning tools</p>
          </div>
        </div>
      </div>
    </div>
  );
};
