import React, { useState, useMemo } from 'react';
import { 
  Wrench, 
  FileText, 
  Image, 
  Library, 
  Settings, 
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  Copy,
  Save,
  Languages,
  Grid,
  Layers,
  Palette,
  Ruler,
  Scissors,
  Zap,
  X
} from 'lucide-react';
import { 
  ConstructionDetail, 
  TechnicalDrawing, 
  ConstructionLibrary, 
  DrawingTemplate,
  ConstructionSymbol,
  ConstructionCategory,
  SeamType,
  PocketType,
  CollarType,
  ClosureType
} from '../types';
import { useI18n } from '../lib/i18n';
import { ConstructionDetailForm } from './ConstructionDetailForm';
import { TechnicalDrawingCanvas } from './TechnicalDrawingCanvas';
import { ConstructionLibraryView } from './ConstructionLibraryView';
import { DrawingTemplates } from './DrawingTemplates';
import { SymbolsLibrary } from './SymbolsLibrary';
import { SpecificationForms } from './SpecificationForms';
import { WorkInstructions } from './WorkInstructions';
import { QualityChecklist } from './QualityChecklist';

interface ConstructionManagerProps {
  techPack?: any;
  onTechPackUpdate?: (techPack: any) => void;
}

// Mock data
const mockConstructionDetails: ConstructionDetail[] = [
  {
    id: '1',
    category: 'Seams',
    name: 'Flat Fell Seam',
    description: 'Strong, flat seam finish commonly used in jeans and workwear',
    specifications: [
      {
        id: 's1',
        seamType: 'Flat Fell',
        spi: 8,
        threadSpec: {
          id: 't1',
          color: 'Navy',
          weight: '40/2',
          type: 'Polyester',
          brand: 'Gutermann',
          code: 'GT-40'
        },
        needleSize: '16',
        presserFoot: 'Flat Fell Foot',
        tension: '4',
        specialInstructions: 'Use edge guide for consistent seam allowance'
      }
    ],
    sequence: 1,
    qualityCheckpoints: [
      'Check seam allowance consistency',
      'Verify flat appearance',
      'Test seam strength'
    ],
    specialInstructions: [
      'Press seam allowance to one side',
      'Topstitch close to folded edge'
    ],
    materials: ['Main fabric', 'Thread', 'Interfacing'],
    tools: ['Sewing machine', 'Flat fell foot', 'Iron', 'Edge guide'],
    estimatedTime: 15,
    difficulty: 'Medium',
    photos: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user1',
    tags: ['seam', 'flat-fell', 'strong']
  },
  {
    id: '2',
    category: 'Pockets',
    name: 'Welt Pocket',
    description: 'Professional welt pocket construction with clean finish',
    specifications: [
      {
        id: 's2',
        seamType: 'Straight Stitch',
        spi: 12,
        threadSpec: {
          id: 't2',
          color: 'Black',
          weight: '50/3',
          type: 'Polyester',
          brand: 'Coats',
          code: 'CT-50'
        },
        needleSize: '14',
        presserFoot: 'Standard',
        tension: '3',
        specialInstructions: 'Use marking tools for precise placement'
      }
    ],
    sequence: 2,
    qualityCheckpoints: [
      'Check welt alignment',
      'Verify pocket opening size',
      'Test pocket functionality'
    ],
    specialInstructions: [
      'Mark pocket placement accurately',
      'Cut opening carefully',
      'Press welt edges'
    ],
    materials: ['Main fabric', 'Pocketing', 'Welt fabric', 'Thread'],
    tools: ['Sewing machine', 'Marking tools', 'Scissors', 'Iron'],
    estimatedTime: 25,
    difficulty: 'Hard',
    photos: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user1',
    tags: ['pocket', 'welt', 'professional']
  }
];

const mockTechnicalDrawings: TechnicalDrawing[] = [
  {
    id: '1',
    name: 'Flat Fell Seam Detail',
    description: 'Technical drawing showing flat fell seam construction',
    category: 'Seams',
    layers: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    grid: { enabled: true, size: 10, color: '#e5e7eb' },
    units: 'inches',
    scale: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user1'
  }
];

const mockLibraries: ConstructionLibrary[] = [
  {
    id: '1',
    name: 'Standard Seam Library',
    description: 'Collection of standard seam constructions',
    category: 'Seams',
    details: [mockConstructionDetails[0]],
    templates: [],
    symbols: [],
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user1'
  }
];

export const ConstructionManager: React.FC<ConstructionManagerProps> = ({ 
  techPack,
  onTechPackUpdate 
}) => {
  const { t, language, changeLanguage } = useI18n();
  const [activeTab, setActiveTab] = useState<'details' | 'drawings' | 'library' | 'templates' | 'symbols' | 'specifications' | 'instructions' | 'checklist'>('details');
  const [constructionDetails, setConstructionDetails] = useState<ConstructionDetail[]>(mockConstructionDetails);
  const [technicalDrawings, setTechnicalDrawings] = useState<TechnicalDrawing[]>(mockTechnicalDrawings);
  const [libraries, setLibraries] = useState<ConstructionLibrary[]>(mockLibraries);
  const [showDetailForm, setShowDetailForm] = useState(false);
  const [showDrawingCanvas, setShowDrawingCanvas] = useState(false);
  const [editingDetail, setEditingDetail] = useState<ConstructionDetail | null>(null);
  const [editingDrawing, setEditingDrawing] = useState<TechnicalDrawing | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ConstructionCategory | 'all'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');

  const categories: ConstructionCategory[] = ['Seams', 'Pockets', 'Collar', 'Sleeves', 'Closures', 'Hems', 'Pleats', 'Darts', 'Other'];
  const difficulties = ['Easy', 'Medium', 'Hard', 'Expert'];

  const filteredDetails = useMemo(() => {
    let filtered = constructionDetails;
    
    if (searchTerm) {
      filtered = filtered.filter(detail => 
        detail.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        detail.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        detail.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(detail => detail.category === categoryFilter);
    }

    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(detail => detail.difficulty === difficultyFilter);
    }

    return filtered;
  }, [constructionDetails, searchTerm, categoryFilter, difficultyFilter]);

  const handleCreateDetail = () => {
    setEditingDetail(null);
    setShowDetailForm(true);
  };

  const handleEditDetail = (detail: ConstructionDetail) => {
    setEditingDetail(detail);
    setShowDetailForm(true);
  };

  const handleSaveDetail = (detailData: Omit<ConstructionDetail, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingDetail) {
      setConstructionDetails(prev => prev.map(detail => 
        detail.id === editingDetail.id 
          ? { ...detailData, id: editingDetail.id, createdAt: editingDetail.createdAt, updatedAt: new Date() }
          : detail
      ));
    } else {
      const newDetail: ConstructionDetail = {
        ...detailData,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setConstructionDetails(prev => [...prev, newDetail]);
    }
    setShowDetailForm(false);
    setEditingDetail(null);
  };

  const handleDeleteDetail = (id: string) => {
    setConstructionDetails(prev => prev.filter(detail => detail.id !== id));
  };

  const handleDuplicateDetail = (detail: ConstructionDetail) => {
    const duplicatedDetail: ConstructionDetail = {
      ...detail,
      id: Date.now().toString(),
      name: `${detail.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setConstructionDetails(prev => [...prev, duplicatedDetail]);
  };

  const handleCreateDrawing = () => {
    setEditingDrawing(null);
    setShowDrawingCanvas(true);
  };

  const handleEditDrawing = (drawing: TechnicalDrawing) => {
    setEditingDrawing(drawing);
    setShowDrawingCanvas(true);
  };

  const getCategoryColor = (category: ConstructionCategory) => {
    switch (category) {
      case 'Seams': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Pockets': return 'bg-green-100 text-green-800 border-green-200';
      case 'Collar': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Sleeves': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Closures': return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'Hems': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Pleats': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Darts': return 'bg-red-100 text-red-800 border-red-200';
      case 'Other': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Hard': return 'bg-orange-100 text-orange-800';
      case 'Expert': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const tabs = [
    { id: 'details', label: t('construction.details'), icon: Wrench },
    { id: 'drawings', label: t('construction.drawings'), icon: Image },
    { id: 'library', label: t('construction.library'), icon: Library },
    { id: 'templates', label: t('construction.templates'), icon: Settings },
    { id: 'symbols', label: t('construction.symbols'), icon: Palette },
    { id: 'specifications', label: t('construction.specifications'), icon: FileText },
    { id: 'instructions', label: t('construction.instructions'), icon: Ruler },
    { id: 'checklist', label: t('construction.checklist'), icon: Grid }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('construction.title')}</h2>
          <p className="text-gray-600">{t('construction.subtitle')}</p>
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
            onClick={handleCreateDrawing}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Image className="w-4 h-4 mr-2" />
            {t('construction.createDrawing')}
          </button>
          <button
            onClick={handleCreateDetail}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('construction.createDetail')}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center whitespace-nowrap ${
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
          {activeTab === 'details' && (
            <>
              {/* Search and Filters */}
              <div className="mb-6">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder={`${t('construction.details')}...`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as ConstructionCategory | 'all')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="all">{t('construction.categories')}</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{t(`construction.${category.toLowerCase()}`)}</option>
                    ))}
                  </select>
                  <select
                    value={difficultyFilter}
                    onChange={(e) => setDifficultyFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="all">{t('construction.allDifficulties')}</option>
                    {difficulties.map(difficulty => (
                      <option key={difficulty} value={difficulty}>{t(`construction.difficulty.${difficulty.toLowerCase()}`)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Construction Details List */}
              <div className="space-y-4">
                {filteredDetails.map((detail) => (
                  <div key={detail.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{detail.name}</h3>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className={`px-2 py-1 rounded text-sm font-medium border ${getCategoryColor(detail.category)}`}>
                              {t(`construction.${detail.category.toLowerCase()}`)}
                            </span>
                            <span className={`px-2 py-1 rounded text-sm font-medium ${getDifficultyColor(detail.difficulty)}`}>
                              {t(`construction.difficulty.${detail.difficulty.toLowerCase()}`)}
                            </span>
                            <span className="text-sm text-gray-600">
                              {detail.estimatedTime} {t('construction.minutes')}
                            </span>
                            <span className="text-sm text-gray-600">
                              {detail.specifications.length} {t('construction.specs', { count: detail.specifications.length })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditDetail(detail)}
                          className="text-teal-600 hover:text-teal-900 transition-colors"
                          title={t('construction.editDetail')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicateDetail(detail)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title={t('construction.duplicate')}
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDetail(detail.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title={t('construction.deleteDetail')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mt-2">{detail.description}</p>
                    
                    {/* Specifications Preview */}
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">{t('construction.specifications')}:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {detail.specifications.map((spec) => (
                          <div key={spec.id} className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-sm font-medium text-gray-900">{t(`construction.seamType.${spec.seamType.replace(' ', '')}`)}</div>
                            <div className="text-sm text-gray-600">SPI: {spec.spi}</div>
                            <div className="text-sm text-gray-600">Needle: {spec.needleSize}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tags */}
                    {detail.tags.length > 0 && (
                      <div className="mt-4">
                        <div className="flex flex-wrap gap-2">
                          {detail.tags.map((tag) => (
                            <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {filteredDetails.length === 0 && (
                <div className="text-center py-12">
                  <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No construction details found</h3>
                  <p className="text-gray-600 mb-6">Create your first construction detail to get started</p>
                  <button
                    onClick={handleCreateDetail}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    {t('construction.createDetail')}
                  </button>
                </div>
              )}
            </>
          )}

          {activeTab === 'drawings' && (
            <TechnicalDrawingCanvas 
              drawings={technicalDrawings}
              onUpdateDrawings={setTechnicalDrawings}
            />
          )}

          {activeTab === 'library' && (
            <ConstructionLibraryView 
              libraries={libraries}
              onUpdateLibraries={setLibraries}
            />
          )}

          {activeTab === 'templates' && (
            <DrawingTemplates />
          )}

          {activeTab === 'symbols' && (
            <SymbolsLibrary />
          )}

          {activeTab === 'specifications' && (
            <SpecificationForms 
              details={constructionDetails}
            />
          )}

          {activeTab === 'instructions' && (
            <WorkInstructions 
              details={constructionDetails}
            />
          )}

          {activeTab === 'checklist' && (
            <QualityChecklist 
              details={constructionDetails}
            />
          )}
        </div>
      </div>

      {/* Construction Detail Form Modal */}
      {showDetailForm && (
        <ConstructionDetailForm
          detail={editingDetail}
          onSave={handleSaveDetail}
          onCancel={() => {
            setShowDetailForm(false);
            setEditingDetail(null);
          }}
        />
      )}

      {/* Technical Drawing Canvas Modal */}
      {showDrawingCanvas && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingDrawing ? t('construction.editDrawing') : t('construction.createDrawing')}
              </h2>
              <button
                onClick={() => setShowDrawingCanvas(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 h-full">
              <div className="text-center py-12">
                <Image className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('construction.drawingCanvas')}</h3>
                <p className="text-gray-600">{t('construction.drawingCanvasHint')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
