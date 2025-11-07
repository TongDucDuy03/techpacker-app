import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTechPack } from '../../contexts/TechPackContext';
import { useAuth } from '../../contexts/AuthContext';
import { ApiTechPack, Colorway } from '../../types/techpack';
import ArticleInfoTab, { ArticleInfoTabRef } from './tabs/ArticleInfoTab';
import BomTab, { BomTabRef } from './tabs/BomTab';
import MeasurementTab from './tabs/MeasurementTab';
import HowToMeasureTab from './tabs/HowToMeasureTab';
import ConstructionTab, { ConstructionTabRef } from './tabs/ConstructionTab';
import ColorwayTab from './tabs/ColorwayTab';
import RevisionTab from './tabs/RevisionTab';
import SharingTab from './tabs/SharingTab';
import {
  FileText,
  Package,
  Ruler,
  BookOpen,
  Palette,
  Clock,
  Share2,
  Save,
  Download,
  Eye,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { showError } from '../../lib/toast';

interface TechPackTabsProps {
  onBackToList: () => void;
  mode?: 'create' | 'edit' | 'view';
  techPack?: ApiTechPack;
}

const TechPackTabs: React.FC<TechPackTabsProps> = ({ onBackToList, mode = 'create', techPack: initialTechPack }) => {
  const context = useTechPack();
  const { state, setCurrentTab, updateFormState, saveTechPack, exportToPDF, resetFormState } = context ?? {};
  const { currentTab = 0, techpack, isSaving = false, lastSaved, hasUnsavedChanges = false } = state ?? {};
  const { user } = useAuth();
  const articleInfoTabRef = useRef<ArticleInfoTabRef>(null);
  const bomTabRef = useRef<BomTabRef>(null);
  const constructionTabRef = useRef<ConstructionTabRef>(null);

  const [showSaveNotification, setShowSaveNotification] = useState(false);

  // Permission checks based on user role
  const canEdit = user?.role === 'admin' || user?.role === 'designer';
  const isReadOnly = user?.role === 'merchandiser' || user?.role === 'viewer' || mode === 'view';

  useEffect(() => {
    if ((mode === 'edit' || mode === 'view') && initialTechPack) {
      // Map the API TechPack (supports both current backend and legacy shapes) to the expected TechPack structure
      const resolvedProductClass =
        (initialTechPack as any).productClass ??
        (initialTechPack as any).articleInfo?.productClass ??
        (initialTechPack as any).category ??
        (initialTechPack as any).metadata?.category ??
        '';

      const rawHowToMeasures = ((initialTechPack as any).howToMeasure || []).map((htm: any, index: number) => {
        const steps = Array.isArray(htm.steps) && htm.steps.length > 0 ? htm.steps : (htm.instructions || []);
        return {
          id: htm._id || htm.id || `htm_${index}`,
          pomCode: htm.pomCode || '',
          pomName: htm.pomName || '',
          description: htm.description || '',
          imageUrl: htm.imageUrl || '',
          steps,
          instructions: steps,
          videoUrl: htm.videoUrl || '',
          language: htm.language || 'en-US',
          stepNumber: typeof htm.stepNumber === 'number' ? htm.stepNumber : index + 1,
          tips: htm.tips || [],
          commonMistakes: htm.commonMistakes || [],
          relatedMeasurements: htm.relatedMeasurements || [],
        };
      });

      const rawColorways = Array.isArray((initialTechPack as any).colorways)
        ? (initialTechPack as any).colorways
        : [];

      const mappedColorways = rawColorways.map((colorway: any, index: number) => {
        const parts = Array.isArray(colorway?.parts)
          ? colorway.parts.map((part: any, partIndex: number) => ({
              id: part?.id || part?._id || `part_${index}_${partIndex}`,
              partName: part?.partName || part?.name || '',
              colorName: part?.colorName || part?.color || '',
              pantoneCode: part?.pantoneCode || part?.pantone || '',
              hexCode: part?.hexCode || part?.hex || '',
              rgbCode: part?.rgbCode || '',
              imageUrl: part?.imageUrl,
              supplier: part?.supplier,
              colorType: (part?.colorType || 'Solid') as any,
            }))
          : [];

        const fallbackPart = parts[0];
        const rawHex = (colorway?.hexColor || fallbackPart?.hexCode || '').trim();
        const normalizedHex = rawHex
          ? rawHex.startsWith('#')
            ? rawHex
            : `#${rawHex}`
          : '';

        return {
          id: colorway?.id || colorway?._id || `colorway_${index}`,
          _id: typeof colorway?._id === 'string' ? colorway._id : undefined,
          name: (colorway?.name || colorway?.colorwayName || '').trim(),
          code: (colorway?.code || colorway?.colorwayCode || '').trim(),
          placement: (colorway?.placement || fallbackPart?.partName || '').trim(),
          materialType: (colorway?.materialType || '').trim(),
          season: (colorway?.season || '').trim(),
          isDefault: !!colorway?.isDefault,
          approvalStatus: (colorway?.approvalStatus || (colorway?.approved ? 'Approved' : 'Pending')) as Colorway['approvalStatus'],
          productionStatus: (colorway?.productionStatus || 'Lab Dip') as Colorway['productionStatus'],
          pantoneCode: (colorway?.pantoneCode || fallbackPart?.pantoneCode || '').trim(),
          hexColor: normalizedHex,
          supplier: (colorway?.supplier || '').trim(),
          notes: (colorway?.notes || '').trim(),
          collectionName: (colorway?.collectionName || '').trim(),
          parts,
        };
      });

      const mappedTechPack = {
        id: initialTechPack._id,
        articleInfo: {
          articleCode: (initialTechPack as any).articleCode || '',
          productName: (initialTechPack as any).productName || (initialTechPack as any).name || '',
          version: (() => {
            const v = (initialTechPack as any).version;
            if (!v) return 1;
            const digits = String(v).replace(/[^0-9]/g, '');
            const parsed = parseInt(digits, 10);
            return Number.isNaN(parsed) ? 1 : parsed;
          })(),
          gender: ((initialTechPack as any).gender || 'Unisex') as any,
          productClass: resolvedProductClass,
          fitType: 'Regular' as const,
          supplier: (initialTechPack as any).supplier || '',
          technicalDesignerId: typeof (initialTechPack as any).technicalDesignerId === 'object'
            ? (initialTechPack as any).technicalDesignerId?._id || ''
            : (initialTechPack as any).technicalDesignerId || '',
          fabricDescription: (initialTechPack as any).fabricDescription || '',
          productDescription: (initialTechPack as any).productDescription || '',
          designSketchUrl: (initialTechPack as any).designSketchUrl || '',
          season: (((initialTechPack as any).season || (initialTechPack as any).metadata?.season || 'SS25')) as any,
          brand: (initialTechPack as any).brand || '',
          collection: (initialTechPack as any).collectionName || (initialTechPack as any).collection || '',
          targetMarket: (initialTechPack as any).targetMarket || '',
          pricePoint: (initialTechPack as any).pricePoint || undefined,
          notes: (initialTechPack as any).notes || (initialTechPack as any).description || '',
          lifecycleStage: (initialTechPack as any).lifecycleStage || undefined,
          status: (initialTechPack as any).status || 'Draft',
          category: resolvedProductClass,
          currency: (initialTechPack as any).currency || 'USD',
          retailPrice: (initialTechPack as any).retailPrice || undefined,
          createdDate: (initialTechPack as any).createdAt,
          lastModified: (initialTechPack as any).updatedAt,
          // Readonly fields
          createdAt: (initialTechPack as any).createdAt,
          updatedAt: (initialTechPack as any).updatedAt,
          createdBy: typeof (initialTechPack as any).createdBy === 'object'
            ? (initialTechPack as any).createdBy?._id || ''
            : (initialTechPack as any).createdBy || '',
          createdByName: typeof (initialTechPack as any).createdBy === 'object'
            ? `${(initialTechPack as any).createdBy?.firstName || ''} ${(initialTechPack as any).createdBy?.lastName || ''}`.trim()
            : (initialTechPack as any).createdByName || '',
          updatedBy: typeof (initialTechPack as any).updatedBy === 'object'
            ? (initialTechPack as any).updatedBy?._id || ''
            : (initialTechPack as any).updatedBy || '',
          updatedByName: typeof (initialTechPack as any).updatedBy === 'object'
            ? `${(initialTechPack as any).updatedBy?.firstName || ''} ${(initialTechPack as any).updatedBy?.lastName || ''}`.trim()
            : (initialTechPack as any).updatedByName || '',
        },
        bom: (initialTechPack as any).bom || (initialTechPack as any).materials || [],
        measurements: (initialTechPack as any).measurements || [],
        howToMeasures: rawHowToMeasures,
        colorways: mappedColorways,
        revisionHistory: (initialTechPack as any).revisions || [],
        status: (initialTechPack as any).status,
        completeness: {
          isComplete: false,
          missingItems: [],
          completionPercentage: 0,
        },
        createdBy: (initialTechPack as any).createdBy || (initialTechPack as any).ownerId || '',
        updatedBy: (initialTechPack as any).updatedBy || (initialTechPack as any).ownerId || '',
        createdAt: (initialTechPack as any).createdAt,
        updatedAt: (initialTechPack as any).updatedAt,
      };
      updateFormState(mappedTechPack);
    } else if (mode === 'create') {
      // Reset the form for creating a new tech pack
      resetFormState?.();
    }
  }, [mode, initialTechPack, updateFormState, resetFormState]);

  // Tab configuration
  const tabs = [
    {
      id: 0,
      name: 'Article Info',
      icon: FileText,
      component: ArticleInfoTab,
      description: 'Basic product information',
    },
    {
      id: 1,
      name: 'Bill of Materials',
      icon: Package,
      component: () => <BomTab ref={bomTabRef} />,
      description: 'Materials and components',
    },
    {
      id: 2,
      name: 'Measurements',
      icon: Ruler,
      component: MeasurementTab,
      description: 'Size specifications',
    },
    {
      id: 3,
      name: 'Construction',
      icon: BookOpen,
      component: () => <ConstructionTab ref={constructionTabRef} />,
      description: 'Construction instructions',
    },
    {
      id: 4,
      name: 'Colorways',
      icon: Palette,
      component: ColorwayTab,
      description: 'Color variations',
    },
    {
      id: 5,
      name: 'Revision History',
      icon: Clock,
      component: RevisionTab,
      description: 'Change tracking',
    },
    {
      id: 6,
      name: 'Sharing',
      icon: Share2,
      component: SharingTab,
      description: 'Access control and sharing',
    },
  ];

  // Calculate tab completion status
  const getTabCompletionStatus = (tabId: number) => {
    switch (tabId) {
      case 0: // Article Info
        return !!(techpack.articleInfo.articleCode &&
                 techpack.articleInfo.productName &&
                 techpack.articleInfo.fabricDescription);
      case 1: // BOM
        return techpack.bom.length > 0;
      case 2: // Measurements
        return techpack.measurements.length > 0;
      case 3: // How to Measure
        return techpack.howToMeasures.length > 0;
      case 4: // Colorways
        return techpack.colorways.length > 0;
      case 5: // Revision History
        return true; // Always complete
      default:
        return false;
    }
  };

  // Calculate overall progress
  const overallProgress = React.useMemo(() => {
    const completedTabs = tabs.slice(0, 5).filter(tab => getTabCompletionStatus(tab.id)).length;
    return Math.round((completedTabs / 5) * 100);
  }, [techpack]);

  // Show save notification
  useEffect(() => {
    if (lastSaved) {
      setShowSaveNotification(true);
      const timer = setTimeout(() => setShowSaveNotification(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastSaved]);

  const handleTabChange = (tabId: number) => {
    setCurrentTab(tabId);
  };

  const handleSave = async () => {
    // If we're on the Article Info tab (tab 0), validate before saving
    if (currentTab === 0 && articleInfoTabRef.current) {
      const isValid = articleInfoTabRef.current.validateAndSave();
      if (!isValid) {
        return; // Stop saving if validation fails
      }
    }

    // Validate BOM if on BOM tab (tab 1) or if BOM has items
    if (techpack.bom && techpack.bom.length > 0) {
      if (bomTabRef.current) {
        const bomValidation = bomTabRef.current.validateAll();
        if (!bomValidation.isValid) {
          showError(`Cannot save: ${bomValidation.errors.length} BOM item(s) have validation errors. Please fix them first.`);
          // Switch to BOM tab to show errors
          if (currentTab !== 1) {
            setCurrentTab(1);
          }
          return;
        }
      } else {
        // Fallback: use exported function
        const { validateBomForSave } = await import('./tabs/BomTab');
        const bomValidation = validateBomForSave(techpack.bom);
        if (!bomValidation.isValid) {
          showError(`Cannot save: ${bomValidation.errors.length} BOM item(s) have validation errors. Please fix them first.`);
          // Switch to BOM tab to show errors and try to trigger validation via ref
          if (currentTab !== 1) {
            setCurrentTab(1);
            // Wait for tab to mount, then trigger validation to update UI
            setTimeout(() => {
              if (bomTabRef.current) {
                bomTabRef.current.validateAll();
              }
            }, 100);
          } else {
            // Already on BOM tab, trigger validation to update UI
            setTimeout(() => {
              if (bomTabRef.current) {
                bomTabRef.current.validateAll();
              }
            }, 100);
          }
          return;
        }
      }
    }

    // Validate Construction if on Construction tab (tab 3) or if Construction has items
    if (techpack.howToMeasures && techpack.howToMeasures.length > 0) {
      if (constructionTabRef.current) {
        const constructionValidation = constructionTabRef.current.validateAll();
        if (!constructionValidation.isValid) {
          showError(`Cannot save: ${constructionValidation.errors.length} Construction item(s) have validation errors. Please fix them first.`);
          // Switch to Construction tab to show errors
          if (currentTab !== 3) {
            setCurrentTab(3);
          }
          return;
        }
      }
    }

    await saveTechPack();
  };

  const handleExportPDF = () => {
    exportToPDF();
  };

  const CurrentTabComponent = tabs[currentTab]?.component;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  console.log('Back to List clicked, onBackToList:', onBackToList);
                  if (onBackToList) {
                    onBackToList();
                  } else {
                    console.error('onBackToList is not defined');
                  }
                }}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to List
              </button>
              <div className="border-l border-gray-300 h-6"></div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {techpack.articleInfo.productName || 'New Tech Pack'}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>{techpack.articleInfo.articleCode || 'No Article Code'}</span>
                  <span>•</span>
                  <span>Version {techpack.articleInfo.version}</span>
                  <span>•</span>
                  {/* Normalize server enums to friendly display and color */}
                  {(() => {
                    const status = techpack.status || '';
                    const normalized = String(status).toLowerCase();
                    let colorClass = 'text-gray-600';
                    let label: string = String(status);
                    if (normalized === 'approved') { colorClass = 'text-green-600'; label = 'Approved'; }
                    else if (normalized === 'in review' || normalized === 'inreview' || normalized === 'in_review') { colorClass = 'text-yellow-600'; label = 'In Review'; }
                    else if (normalized === 'draft') { colorClass = 'text-gray-600'; label = 'Draft'; }
                    else if (normalized === 'rejected') { colorClass = 'text-red-600'; label = 'Rejected'; }
                    else if (normalized === 'archived') { colorClass = 'text-gray-400'; label = 'Archived'; }

                    return (
                      <span className={`font-medium ${colorClass}`}>{label}</span>
                    );
                  })()}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center space-x-3">
                <div className="text-sm text-gray-600">Progress:</div>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
                <div className="text-sm font-medium text-gray-900">{overallProgress}%</div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Save Status */}
              <div className="flex items-center space-x-2 text-sm">
                {isSaving ? (
                  <div className="flex items-center text-blue-600">
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Saving...
                  </div>
                ) : hasUnsavedChanges ? (
                  <div className="flex items-center text-yellow-600">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    Unsaved changes
                  </div>
                ) : lastSaved ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Saved {new Date(lastSaved).toLocaleTimeString()}
                  </div>
                ) : null}
              </div>

              {/* Action Buttons */}
              {canEdit && mode !== 'view' && (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {mode === 'edit' ? 'Update' : 'Save'}
                </button>
              )}

              {isReadOnly && (
                <div className="flex items-center px-3 py-2 text-sm text-gray-500 bg-gray-100 rounded-md">
                  <Eye className="w-4 h-4 mr-2" />
                  Read Only Mode
                </div>
              )}

              <button
                onClick={handleExportPDF}
                className="flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </button>

              {mode === 'view' && (
                <button className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-[73px] z-30">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              const isComplete = getTabCompletionStatus(tab.id);

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`mr-2 h-5 w-5 ${
                    isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                  <span className="flex items-center">
                    {tab.name}
                    {isComplete && (
                      <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
                    )}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        {
          currentTab === 0 ? (
            <ArticleInfoTab
              ref={articleInfoTabRef}
              techPack={techpack}
              mode={mode}
              onUpdate={updateFormState}
              setCurrentTab={setCurrentTab}
            />
          ) : currentTab === 1 ? (
            <BomTab ref={bomTabRef} />
          ) : currentTab === 3 ? (
            <ConstructionTab ref={constructionTabRef} />
          ) : CurrentTabComponent ? (
            <CurrentTabComponent
              techPack={techpack}
              mode={mode}
              onUpdate={updateFormState}
              setCurrentTab={setCurrentTab}
            />
          ) : null
        }
      </div>

      {/* Save Notification */}
      {showSaveNotification && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Tech pack saved successfully!</span>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      <div className="fixed bottom-4 left-4 z-40">
        <div className="bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
          <div className="font-medium mb-1">Keyboard Shortcuts:</div>
          <div>Ctrl+S: Save • Ctrl+E: Export • Tab: Next field</div>
        </div>
      </div>
    </div>
  );
};

export default TechPackTabs;
