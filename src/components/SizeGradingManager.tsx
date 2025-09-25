import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Calculator,
  Ruler,
  BarChart3,
  Globe,
  Users,
  Settings,
  Eye,
  Edit,
  Trash2,
  Copy,
  Save,
  Languages
} from 'lucide-react';
import { 
  GradingRule, 
  SizeSet, 
  GradingTemplate, 
  FitType, 
  SizeRegion, 
  GradingCurve,
  POMSpecification 
} from '../types';
import { useI18n } from '../lib/i18n';
import { GradingRuleForm } from './GradingRuleForm';
import { GradingTable } from './GradingTable';
import { GradingCalculator } from './GradingCalculator';
import { TemplateLibrary } from './TemplateLibrary';
import { FitAnalysis } from './FitAnalysis';
import { SizeRangeManager } from './SizeRangeManager';
import { RegionalConversion } from './RegionalConversion';

interface SizeGradingManagerProps {
  pomSpecs?: POMSpecification[];
}

// Mock data
const mockGradingRules: GradingRule[] = [
  {
    id: '1',
    name: 'Standard Shirt Grading',
    baseSize: 'M',
    sizeRanges: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    fitType: 'Regular',
    increments: [
      { measurement: 'BL', increment: 0.5, curve: 'Linear' },
      { measurement: 'CL', increment: 0.25, curve: 'Linear' },
      { measurement: 'SL', increment: 0.5, curve: 'Linear' },
      { measurement: 'CW', increment: 1, curve: 'Linear' }
    ],
    region: 'US',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Tall Fit Grading',
    baseSize: 'M',
    sizeRanges: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    fitType: 'Tall',
    increments: [
      { measurement: 'BL', increment: 0.75, curve: 'Linear' },
      { measurement: 'CL', increment: 0.25, curve: 'Linear' },
      { measurement: 'SL', increment: 0.75, curve: 'Linear' },
      { measurement: 'CW', increment: 1, curve: 'Linear' }
    ],
    region: 'US',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const mockSizeSets: SizeSet[] = [
  {
    id: '1',
    name: 'Standard US Men\'s',
    region: 'US',
    fitType: 'Regular',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    measurements: {},
    gradingRules: [mockGradingRules[0]],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Tall US Men\'s',
    region: 'US',
    fitType: 'Tall',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    measurements: {},
    gradingRules: [mockGradingRules[1]],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const mockTemplates: GradingTemplate[] = [
  {
    id: '1',
    name: 'Basic Shirt Template',
    category: 'Shirts',
    description: 'Standard grading template for basic shirts',
    fitType: 'Regular',
    region: 'US',
    gradingRules: [mockGradingRules[0]],
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Tall Fit Template',
    category: 'Shirts',
    description: 'Grading template for tall fit shirts',
    fitType: 'Tall',
    region: 'US',
    gradingRules: [mockGradingRules[1]],
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const SizeGradingManager: React.FC<SizeGradingManagerProps> = ({ pomSpecs = [] }) => {
  const { t, language, changeLanguage } = useI18n();
  const [activeTab, setActiveTab] = useState<'rules' | 'calculator' | 'templates' | 'analysis' | 'ranges' | 'conversion'>('rules');
  const [gradingRules, setGradingRules] = useState<GradingRule[]>(mockGradingRules);
  const [sizeSets, setSizeSets] = useState<SizeSet[]>(mockSizeSets);
  const [templates, setTemplates] = useState<GradingTemplate[]>(mockTemplates);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<GradingRule | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [fitTypeFilter, setFitTypeFilter] = useState<FitType | 'all'>('all');
  const [regionFilter, setRegionFilter] = useState<SizeRegion | 'all'>('all');

  const fitTypes: FitType[] = ['Regular', 'Tall', 'Big & Tall', 'Petite', 'Plus'];
  const regions: SizeRegion[] = ['US', 'EU', 'UK', 'JP', 'AU'];

  const filteredRules = useMemo(() => {
    let filtered = gradingRules;
    
    if (searchTerm) {
      filtered = filtered.filter(rule => 
        rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rule.baseSize.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (fitTypeFilter !== 'all') {
      filtered = filtered.filter(rule => rule.fitType === fitTypeFilter);
    }

    if (regionFilter !== 'all') {
      filtered = filtered.filter(rule => rule.region === regionFilter);
    }

    return filtered;
  }, [gradingRules, searchTerm, fitTypeFilter, regionFilter]);

  const handleCreateRule = () => {
    setEditingRule(null);
    setShowForm(true);
  };

  const handleEditRule = (rule: GradingRule) => {
    setEditingRule(rule);
    setShowForm(true);
  };

  const handleSaveRule = (ruleData: Omit<GradingRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingRule) {
      setGradingRules(prev => prev.map(rule => 
        rule.id === editingRule.id 
          ? { ...ruleData, id: editingRule.id, createdAt: editingRule.createdAt, updatedAt: new Date() }
          : rule
      ));
    } else {
      const newRule: GradingRule = {
        ...ruleData,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setGradingRules(prev => [...prev, newRule]);
    }
    setShowForm(false);
    setEditingRule(null);
  };

  const handleDeleteRule = (id: string) => {
    setGradingRules(prev => prev.filter(rule => rule.id !== id));
  };

  const handleDuplicateRule = (rule: GradingRule) => {
    const duplicatedRule: GradingRule = {
      ...rule,
      id: Date.now().toString(),
      name: `${rule.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setGradingRules(prev => [...prev, duplicatedRule]);
  };

  const handleExportRules = () => {
    const csvContent = [
      ['Name', 'Base Size', 'Fit Type', 'Region', 'Size Ranges', 'Increments'],
      ...filteredRules.map(rule => [
        rule.name,
        rule.baseSize,
        rule.fitType,
        rule.region,
        rule.sizeRanges.join(', '),
        rule.increments.map(inc => `${inc.measurement}: ${inc.increment}`).join('; ')
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grading_rules_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportTemplate = () => {
    // TODO: Implement template import
    console.log('Template import functionality to be implemented');
  };

  const tabs = [
    { id: 'rules', label: t('grading.rules'), icon: Ruler },
    { id: 'calculator', label: t('grading.calculator'), icon: Calculator },
    { id: 'templates', label: t('grading.templates'), icon: Settings },
    { id: 'analysis', label: t('grading.analysis'), icon: BarChart3 },
    { id: 'ranges', label: t('grading.sizeRanges'), icon: Users },
    { id: 'conversion', label: t('grading.regionalConversion'), icon: Globe }
  ];

  const getFitTypeColor = (fitType: FitType) => {
    switch (fitType) {
      case 'Regular': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Tall': return 'bg-green-100 text-green-800 border-green-200';
      case 'Big & Tall': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Petite': return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'Plus': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRegionFlag = (region: SizeRegion) => {
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('grading.title')}</h2>
          <p className="text-gray-600">{t('grading.subtitle')}</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Language Switcher */}
          <div className="flex items-center space-x-2">
            <Languages className="w-4 h-4 text-gray-500" />
            <button
              onClick={() => changeLanguage(language === 'en' ? 'vi' : 'en')}
              className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              {language === 'en' ? 'VI' : 'EN'}
            </button>
          </div>
          
          <button
            onClick={handleImportTemplate}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
            {t('grading.import')}
          </button>
          <button
            onClick={handleExportRules}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            {t('grading.export')}
          </button>
          <button
            onClick={handleCreateRule}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('grading.createRule')}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center ${
                    isActive
                      ? 'border-teal-500 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'rules' && (
            <>
              {/* Search and Filters */}
              <div className="mb-6">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder={`${t('grading.rules')}...`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={fitTypeFilter}
                    onChange={(e) => setFitTypeFilter(e.target.value as FitType | 'all')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="all">{t('grading.fitTypes')}</option>
                    {fitTypes.map(fitType => (
                      <option key={fitType} value={fitType}>{t(`grading.${fitType.toLowerCase().replace(' & ', '')}`)}</option>
                    ))}
                  </select>
                  <select
                    value={regionFilter}
                    onChange={(e) => setRegionFilter(e.target.value as SizeRegion | 'all')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="all">{t('grading.regions')}</option>
                    {regions.map(region => (
                      <option key={region} value={region}>{getRegionFlag(region)} {t(`grading.${region.toLowerCase()}`)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grading Rules List */}
              <div className="space-y-4">
                {filteredRules.map((rule) => (
                  <div key={rule.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{rule.name}</h3>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className="bg-teal-100 text-teal-800 px-2 py-1 rounded text-sm font-medium">
                              {t('grading.baseSize')}: {rule.baseSize}
                            </span>
                            <span className={`px-2 py-1 rounded text-sm font-medium border ${getFitTypeColor(rule.fitType)}`}>
                              {t(`grading.${rule.fitType.toLowerCase().replace(' & ', '')}`)}
                            </span>
                            <span className="flex items-center text-sm text-gray-600">
                              {getRegionFlag(rule.region)} {t(`grading.${rule.region.toLowerCase()}`)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditRule(rule)}
                          className="text-teal-600 hover:text-teal-900 transition-colors"
                          title={t('grading.editRule')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicateRule(rule)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title={t('grading.deleteRule')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Increments Display */}
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Grading Increments:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {rule.increments.map((increment, index) => (
                          <div key={index} className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-sm font-medium text-gray-900">{increment.measurement}</div>
                            <div className="text-sm text-gray-600">+{increment.increment}</div>
                            <div className="text-xs text-gray-500">{t(`grading.${increment.curve.toLowerCase()}`)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredRules.length === 0 && (
                <div className="text-center py-12">
                  <Ruler className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No grading rules found</h3>
                  <p className="text-gray-600 mb-6">Create your first grading rule to get started</p>
                  <button
                    onClick={handleCreateRule}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    {t('grading.createRule')}
                  </button>
                </div>
              )}
            </>
          )}

          {activeTab === 'calculator' && (
            <GradingCalculator 
              gradingRules={gradingRules}
              pomSpecs={pomSpecs}
              onUpdateRules={setGradingRules}
            />
          )}

          {activeTab === 'templates' && (
            <TemplateLibrary 
              templates={templates}
              gradingRules={gradingRules}
              onUpdateTemplates={setTemplates}
            />
          )}

          {activeTab === 'analysis' && (
            <FitAnalysis 
              sizeSets={sizeSets}
              gradingRules={gradingRules}
            />
          )}

          {activeTab === 'ranges' && (
            <SizeRangeManager 
              sizeSets={sizeSets}
              onUpdateSizeSets={setSizeSets}
            />
          )}

          {activeTab === 'conversion' && (
            <RegionalConversion 
              sizeSets={sizeSets}
              gradingRules={gradingRules}
            />
          )}
        </div>
      </div>

      {/* Grading Rule Form Modal */}
      {showForm && (
        <GradingRuleForm
          rule={editingRule}
          pomSpecs={pomSpecs}
          onSave={handleSaveRule}
          onCancel={() => {
            setShowForm(false);
            setEditingRule(null);
          }}
        />
      )}
    </div>
  );
};
