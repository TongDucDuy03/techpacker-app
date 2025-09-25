import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  FileSpreadsheet,
  Calculator,
  GitCompare,
  Ruler,
  Settings,
  Eye,
  Edit,
  Trash2,
  Info
} from 'lucide-react';
import { POMSpecification, POMCode, SizeChart, SizeRange, SizeVariation } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { POMForm } from './POMForm';
import { MeasurementTable } from './MeasurementTable';
import { GradeCalculator } from './GradeCalculator';
import { MeasurementComparison } from './MeasurementComparison';
import { POMCodeModal } from './POMCodeModal';

interface POMManagerProps {
  techPackId?: string;
}

// Predefined POM codes database
const predefinedPOMCodes: POMCode[] = [
  {
    code: 'BL',
    name: 'Body Length',
    description: 'Length from shoulder to hem',
    category: 'Body',
    unit: 'inches',
    howToMeasure: 'Measure from the highest point of the shoulder seam to the bottom hem of the garment.'
  },
  {
    code: 'CL',
    name: 'Collar Length',
    description: 'Collar circumference',
    category: 'Collar',
    unit: 'inches',
    howToMeasure: 'Measure around the collar opening when buttoned.'
  },
  {
    code: 'SL',
    name: 'Sleeve Length',
    description: 'Sleeve length from shoulder',
    category: 'Sleeve',
    unit: 'inches',
    howToMeasure: 'Measure from the shoulder seam to the end of the sleeve.'
  },
  {
    code: 'PK',
    name: 'Pocket Width',
    description: 'Pocket opening width',
    category: 'Pocket',
    unit: 'inches',
    howToMeasure: 'Measure the width of the pocket opening.'
  },
  {
    code: 'CW',
    name: 'Chest Width',
    description: 'Chest measurement',
    category: 'Body',
    unit: 'inches',
    howToMeasure: 'Measure across the chest from armpit to armpit.'
  },
  {
    code: 'SH',
    name: 'Shoulder Width',
    description: 'Shoulder to shoulder',
    category: 'Body',
    unit: 'inches',
    howToMeasure: 'Measure from shoulder point to shoulder point.'
  },
  {
    code: 'WL',
    name: 'Waist Length',
    description: 'Length to waist',
    category: 'Body',
    unit: 'inches',
    howToMeasure: 'Measure from shoulder to waist line.'
  },
  {
    code: 'HL',
    name: 'Hip Length',
    description: 'Length to hip',
    category: 'Body',
    unit: 'inches',
    howToMeasure: 'Measure from shoulder to hip line.'
  }
];

// Size charts for different ranges
const sizeCharts: SizeChart[] = [
  {
    id: '1',
    name: 'Standard Sizes',
    sizeRange: 'XXS-XLT',
    sizes: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XLT'],
    variations: ['Regular', 'Tall'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Plus Sizes',
    sizeRange: '2XL-8XLT',
    sizes: ['2XL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL', '2XLT', '3XLT', '4XLT', '5XLT', '6XLT', '7XLT', '8XLT'],
    variations: ['Regular', 'Tall'],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const mockPOMSpecs: POMSpecification[] = [
  {
    id: '1',
    pomCode: 'BL',
    pomName: 'Body Length',
    tolerances: { minusTol: 0.25, plusTol: 0.25, unit: 'inches' },
    measurements: {
      'XS': 26.5,
      'S': 27,
      'M': 27.5,
      'L': 28,
      'XL': 28.5,
      'XXL': 29
    },
    howToMeasure: 'Measure from the highest point of the shoulder seam to the bottom hem of the garment.',
    category: 'Body',
    unit: 'inches',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    pomCode: 'CL',
    pomName: 'Collar Length',
    tolerances: { minusTol: 0.125, plusTol: 0.125, unit: 'inches' },
    measurements: {
      'XS': 14.5,
      'S': 15,
      'M': 15.5,
      'L': 16,
      'XL': 16.5,
      'XXL': 17
    },
    howToMeasure: 'Measure around the collar opening when buttoned.',
    category: 'Collar',
    unit: 'inches',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    pomCode: 'SL',
    pomName: 'Sleeve Length',
    tolerances: { minusTol: 0.25, plusTol: 0.25, unit: 'inches' },
    measurements: {
      'XS': 23,
      'S': 23.5,
      'M': 24,
      'L': 24.5,
      'XL': 25,
      'XXL': 25.5
    },
    howToMeasure: 'Measure from the shoulder seam to the end of the sleeve.',
    category: 'Sleeve',
    unit: 'inches',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const POMManager: React.FC<POMManagerProps> = ({ techPackId }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'specifications' | 'calculator' | 'comparison'>('specifications');
  const [pomSpecs, setPomSpecs] = useState<POMSpecification[]>(mockPOMSpecs);
  const [selectedSizeChart, setSelectedSizeChart] = useState<SizeChart>(sizeCharts[0]);
  const [showForm, setShowForm] = useState(false);
  const [editingSpec, setEditingSpec] = useState<POMSpecification | null>(null);
  const [showPOMCodeModal, setShowPOMCodeModal] = useState(false);
  const [selectedPOMCode, setSelectedPOMCode] = useState<POMCode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const categories = useMemo(() => {
    const cats = Array.from(new Set(pomSpecs.map(spec => spec.category)));
    return ['all', ...cats];
  }, [pomSpecs]);

  const filteredSpecs = useMemo(() => {
    let filtered = pomSpecs;
    
    if (searchTerm) {
      filtered = filtered.filter(spec => 
        spec.pomCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        spec.pomName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        spec.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(spec => spec.category === categoryFilter);
    }

    return filtered;
  }, [pomSpecs, searchTerm, categoryFilter]);

  const handleCreateSpec = () => {
    setEditingSpec(null);
    setShowForm(true);
  };

  const handleEditSpec = (spec: POMSpecification) => {
    setEditingSpec(spec);
    setShowForm(true);
  };

  const handleSaveSpec = (specData: Omit<POMSpecification, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingSpec) {
      setPomSpecs(prev => prev.map(spec => 
        spec.id === editingSpec.id 
          ? { ...specData, id: editingSpec.id, createdAt: editingSpec.createdAt, updatedAt: new Date() }
          : spec
      ));
    } else {
      const newSpec: POMSpecification = {
        ...specData,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setPomSpecs(prev => [...prev, newSpec]);
    }
    setShowForm(false);
    setEditingSpec(null);
  };

  const handleDeleteSpec = (id: string) => {
    setPomSpecs(prev => prev.filter(spec => spec.id !== id));
  };

  const handleViewPOMCode = (pomCode: string) => {
    const code = predefinedPOMCodes.find(c => c.code === pomCode);
    if (code) {
      setSelectedPOMCode(code);
      setShowPOMCodeModal(true);
    }
  };

  const handleExportPDF = () => {
    // TODO: Implement PDF export
    console.log('PDF export functionality to be implemented');
  };

  const handleImportExcel = () => {
    // TODO: Implement Excel import
    console.log('Excel import functionality to be implemented');
  };

  const tabs = [
    { id: 'specifications', label: t('measurements.title'), icon: Ruler },
    { id: 'calculator', label: t('measurements.gradeRules'), icon: Calculator },
    { id: 'comparison', label: t('measurements.comparison'), icon: GitCompare },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('measurements.headerTitle')}</h2>
          <p className="text-gray-600">{t('measurements.headerSubtitle')}</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleImportExcel}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
            {t('measurements.actions.importExcel')}
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            {t('measurements.actions.exportPdf')}
          </button>
          <button
            onClick={handleCreateSpec}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('measurements.create')}
          </button>
        </div>
      </div>

      {/* Size Chart Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{t('measurements.sizeChart')}</h3>
            <p className="text-sm text-gray-600">{t('measurements.sizeChartHint')}</p>
          </div>
          <div className="flex space-x-3">
            {sizeCharts.map(chart => (
              <button
                key={chart.id}
                onClick={() => setSelectedSizeChart(chart)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  selectedSizeChart.id === chart.id
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {chart.name}
              </button>
            ))}
          </div>
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
          {activeTab === 'specifications' && (
            <>
              {/* Search and Filters */}
              <div className="mb-6">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder={t('measurements.searchPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category === 'all' ? t('measurements.allCategories') : category}
                      </option>
                    ))}
                  </select>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
                    <Filter className="w-4 h-4 mr-2" />
                    {t('measurements.moreFilters')}
                  </button>
                </div>
              </div>

              {/* POM Specifications List */}
              <div className="space-y-4">
                {filteredSpecs.map((spec) => (
                  <div key={spec.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <span className="bg-teal-100 text-teal-800 px-2 py-1 rounded text-sm font-medium">
                            {spec.pomCode}
                          </span>
                          <h3 className="text-lg font-medium text-gray-900">{spec.pomName}</h3>
                          <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
                            {spec.category}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {t('measurements.tolerances')}: ±{spec.tolerances.minusTol}{spec.tolerances.unit}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewPOMCode(spec.pomCode)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title={t('measurements.viewPOMCode')}
                        >
                          <Info className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditSpec(spec)}
                          className="text-teal-600 hover:text-teal-900 transition-colors"
                          title={t('common.edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSpec(spec.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredSpecs.length === 0 && (
                <div className="text-center py-12">
                  <Ruler className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('measurements.emptyTitle')}</h3>
                  <p className="text-gray-600 mb-6">{t('measurements.emptySubtitle')}</p>
                  <button
                    onClick={handleCreateSpec}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    {t('measurements.create')}
                  </button>
                </div>
              )}
            </>
          )}

          {activeTab === 'calculator' && (
            <GradeCalculator 
              pomSpecs={pomSpecs}
              sizeChart={selectedSizeChart}
              onUpdateSpecs={setPomSpecs}
            />
          )}

          {activeTab === 'comparison' && (
            <MeasurementComparison 
              pomSpecs={pomSpecs}
              sizeChart={selectedSizeChart}
            />
          )}
        </div>
      </div>

      {/* POM Form Modal */}
      {showForm && (
        <POMForm
          spec={editingSpec}
          pomCodes={predefinedPOMCodes}
          sizeChart={selectedSizeChart}
          onSave={handleSaveSpec}
          onCancel={() => {
            setShowForm(false);
            setEditingSpec(null);
          }}
        />
      )}

      {/* POM Code Info Modal */}
      {showPOMCodeModal && selectedPOMCode && (
        <POMCodeModal
          pomCode={selectedPOMCode}
          onClose={() => {
            setShowPOMCodeModal(false);
            setSelectedPOMCode(null);
          }}
        />
      )}
    </div>
  );
};
