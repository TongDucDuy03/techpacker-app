import React, { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { CareLabel, CareInstruction, CareSymbol, ComplianceInfo, LabelDesign, Language } from '../types';
import { CareSymbolPicker } from './CareSymbolPicker';
import { MultiLanguageEditor } from './MultiLanguageEditor';
import { ComplianceChecker } from './ComplianceChecker';
import { LabelDesigner } from './LabelDesigner';
import { RegulationDatabase } from './RegulationDatabase';
import { Save, Download, Eye, Settings, FileText, Shield, Palette, Database } from 'lucide-react';

interface CareInstructionsManagerProps {
  className?: string;
}

export const CareInstructionsManager: React.FC<CareInstructionsManagerProps> = ({
  className = ''
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'symbols' | 'instructions' | 'compliance' | 'designer' | 'regulations'>('symbols');
  const [selectedSymbols, setSelectedSymbols] = useState<CareSymbol[]>([]);
  const [careInstructions, setCareInstructions] = useState<CareInstruction[]>([]);
  const [complianceInfo, setComplianceInfo] = useState<ComplianceInfo>({
    id: 'compliance-1',
    fiberContent: [],
    countryOfOrigin: '',
    chemicalRestrictions: [],
    testingRequirements: [],
    certifications: [],
    lastUpdated: new Date()
  });
  const [labelDesign, setLabelDesign] = useState<LabelDesign>({
    id: 'design-1',
    name: 'Care Label Design',
    elements: [],
    canvas: {
      width: 200,
      height: 100,
      backgroundColor: '#ffffff',
      borderColor: '#000000',
      borderWidth: 1
    },
    createdAt: new Date(),
    updatedAt: new Date()
  });
  const [careLabel, setCareLabel] = useState<CareLabel | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const tabs = [
    { id: 'symbols', label: t('care.tabs.symbols'), icon: FileText },
    { id: 'instructions', label: t('care.tabs.instructions'), icon: Settings },
    { id: 'compliance', label: t('care.tabs.compliance'), icon: Shield },
    { id: 'designer', label: t('care.tabs.designer'), icon: Palette },
    { id: 'regulations', label: t('care.tabs.regulations'), icon: Database }
  ];

  const generateCareLabel = () => {
    const newCareLabel: CareLabel = {
      id: `label-${Date.now()}`,
      name: t('care.generatedName'),
      instructions: careInstructions,
      compliance: complianceInfo,
      layout: {
        width: labelDesign.canvas.width,
        height: labelDesign.canvas.height,
        symbolSize: 20,
        fontSize: 10,
        spacing: 5
      },
      printSpecs: {
        resolution: 300,
        format: 'PDF',
        colorMode: 'CMYK'
      },
      placement: {
        location: t('care.preview.placement.sideSeam'),
        attachment: t('care.preview.placement.sewn'),
        size: t('care.preview.placement.standard')
      },
      costPerLabel: 0.05,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setCareLabel(newCareLabel);
  };

  const saveCareLabel = async () => {
    setIsSaving(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    generateCareLabel();
    setIsSaving(false);
  };

  const exportCareLabel = () => {
    if (!careLabel) return;

    const dataStr = JSON.stringify(careLabel, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${careLabel.name}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getCompletionStatus = () => {
    const hasSymbols = selectedSymbols.length > 0;
    const hasInstructions = careInstructions.some(inst => inst.textInstructions.length > 0);
    const hasCompliance = complianceInfo.fiberContent.length > 0 && complianceInfo.countryOfOrigin;
    const hasDesign = labelDesign.elements.length > 0;

    const completed = [hasSymbols, hasInstructions, hasCompliance, hasDesign].filter(Boolean).length;
    return { completed, total: 4, percentage: (completed / 4) * 100 };
  };

  const status = getCompletionStatus();

  return (
    <div className={`care-instructions-manager ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('care.title')}</h2>
            <p className="text-gray-600">
              {t('care.subtitle', 'Tạo nhãn bảo quản đầy đủ với ký hiệu, đa ngôn ngữ và kiểm tra tuân thủ.')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm text-gray-600">{t('care.progress.title')}</div>
              <div className="text-lg font-semibold text-gray-900">
                {status.completed}/{status.total} ({Math.round(status.percentage)}%)
              </div>
            </div>
            <div className="w-16 h-16 relative">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="#e5e7eb"
                  strokeWidth="4"
                  fill="none"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="#3b82f6"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - status.percentage / 100)}`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-semibold text-gray-700">
                  {Math.round(status.percentage)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>{t('care.progress.title')}</span>
          <span>{t('care.progress.summary', { completed: status.completed, total: status.total })}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${status.percentage}%` }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mb-6">
        {activeTab === 'symbols' && (
          <CareSymbolPicker
            selectedSymbols={selectedSymbols}
            onSymbolsChange={setSelectedSymbols}
            maxSymbols={10}
            allowMultiple={true}
          />
        )}

        {activeTab === 'instructions' && (
          <MultiLanguageEditor
            instructions={careInstructions}
            onInstructionsChange={setCareInstructions}
            selectedSymbols={selectedSymbols}
          />
        )}

        {activeTab === 'compliance' && (
          <ComplianceChecker
            complianceInfo={complianceInfo}
            onComplianceChange={setComplianceInfo}
            regions={['US', 'EU', 'UK', 'CA', 'AU']}
          />
        )}

        {activeTab === 'designer' && (
          <LabelDesigner
            design={labelDesign}
            onDesignChange={setLabelDesign}
            careSymbols={selectedSymbols}
          />
        )}

        {activeTab === 'regulations' && (
          <RegulationDatabase />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between p-6 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={generateCareLabel}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <Eye className="w-4 h-4" />
            {t('care.actions.preview')}
          </button>
          
          {careLabel && (
            <button
              onClick={exportCareLabel}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              {t('care.actions.export')}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={saveCareLabel}
            disabled={isSaving || status.completed < 2}
            className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t('care.actions.saving')}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {t('care.actions.save')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Care Label Preview */}
      {careLabel && (
        <div className="mt-6 p-6 bg-white border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('care.preview.title')}</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Label Preview */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">{t('care.preview.visual')}</h4>
              <div className="border border-gray-300 rounded p-4 bg-white">
                <div
                  className="border border-gray-400 mx-auto"
                  style={{
                    width: `${careLabel.layout.width}px`,
                    height: `${careLabel.layout.height}px`,
                    backgroundColor: labelDesign.canvas.backgroundColor
                  }}
                >
                  {/* Render symbols */}
                  <div className="flex flex-wrap gap-1 p-2">
                    {selectedSymbols.map(symbol => (
                      <div
                        key={symbol.id}
                        className="w-5 h-5 border border-gray-300 rounded bg-white flex items-center justify-center"
                        dangerouslySetInnerHTML={{ __html: symbol.svg }}
                      />
                    ))}
                  </div>
                  
                  {/* Render text instructions */}
                  <div className="px-2 pb-2">
                    {careInstructions.find(inst => inst.language === 'en')?.textInstructions.map((instruction, index) => (
                      <div key={index} className="text-xs text-gray-700 mb-1">
                        {instruction}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Label Details */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">{t('care.preview.details')}</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('care.preview.name')}</span>
                  <span className="text-gray-900">{careLabel.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('care.preview.size')}</span>
                  <span className="text-gray-900">{careLabel.layout.width} × {careLabel.layout.height}px</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('care.preview.languages')}</span>
                  <span className="text-gray-900">{careInstructions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('care.preview.symbols')}</span>
                  <span className="text-gray-900">{selectedSymbols.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('care.preview.cost')}</span>
                  <span className="text-gray-900">${careLabel.costPerLabel.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('care.preview.placement')}</span>
                  <span className="text-gray-900">{careLabel.placement.location}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
