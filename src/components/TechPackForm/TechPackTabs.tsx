import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTechPack } from '../../contexts/TechPackContext';
import { useAuth } from '../../contexts/AuthContext';
import { ApiTechPack, Colorway, SIZE_RANGES, DEFAULT_MEASUREMENT_UNIT } from '../../types/techpack';
import ArticleInfoTab, { ArticleInfoTabRef } from './tabs/ArticleInfoTab';
import BomTab, { BomTabRef } from './tabs/BomTab';
import MeasurementTab from './tabs/MeasurementTab';
import HowToMeasureTab from './tabs/HowToMeasureTab';
import ConstructionTab, { ConstructionTabRef } from './tabs/ConstructionTab';
import PackingTab from './tabs/PackingTab';
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
  ArrowLeft,
  Archive
} from 'lucide-react';
import { showError, showWarning } from '../../lib/toast';
import { Modal } from 'antd';
import { DEFAULT_MEASUREMENT_BASE_HIGHLIGHT_COLOR, DEFAULT_MEASUREMENT_ROW_STRIPE_COLOR } from '../../constants/measurementDisplay';

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
  // Allow edit if user is admin/designer, OR if mode is 'create' (new techpack)
  const canEdit = (user?.role === 'admin' || user?.role === 'designer') || mode === 'create';
  const isReadOnly = (user?.role === 'merchandiser' || user?.role === 'viewer') && mode !== 'create';

  useEffect(() => {
    if ((mode === 'edit' || mode === 'view') && initialTechPack) {
      // Map the API TechPack (supports both current backend and legacy shapes) to the expected TechPack structure
      const resolvedProductClass =
        (initialTechPack as any).productClass ??
        (initialTechPack as any).articleInfo?.productClass ??
        (initialTechPack as any).category ??
        (initialTechPack as any).metadata?.category ??
        '';

      const resolvedGender = ((initialTechPack as any).gender || 'Unisex') as keyof typeof SIZE_RANGES;
      const defaultSizeRange = [...(SIZE_RANGES[resolvedGender] || SIZE_RANGES['Unisex'])];

      const rawSizeRange = Array.isArray((initialTechPack as any).measurementSizeRange)
        ? (initialTechPack as any).measurementSizeRange.filter(
            (size: any) => typeof size === 'string' && size.trim().length > 0
          )
        : [];
      const normalizedSizeRange = rawSizeRange.length > 0 ? rawSizeRange : defaultSizeRange;
      const serverBaseSize = (initialTechPack as any).measurementBaseSize;
      const resolvedBaseSize =
        serverBaseSize && normalizedSizeRange.includes(serverBaseSize)
          ? serverBaseSize
          : normalizedSizeRange[0];
      const resolvedBaseHighlight =
        (initialTechPack as any).measurementBaseHighlightColor || DEFAULT_MEASUREMENT_BASE_HIGHLIGHT_COLOR;
      const resolvedRowStripe =
        (initialTechPack as any).measurementRowStripeColor || DEFAULT_MEASUREMENT_ROW_STRIPE_COLOR;

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
          note: htm.note || '',
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
          imageUrl: (colorway?.imageUrl || '').trim(),
          parts,
        };
      });

      const mappedTechPack = {
        id: initialTechPack._id,
        articleInfo: {
          articleCode: (initialTechPack as any).articleCode || '',
          articleName: (initialTechPack as any).articleName || (initialTechPack as any).productName || (initialTechPack as any).name || '',
          version: (() => {
            const v = (initialTechPack as any).version;
            if (!v) return 1;
            const digits = String(v).replace(/[^0-9]/g, '');
            const parsed = parseInt(digits, 10);
            return Number.isNaN(parsed) ? 1 : parsed;
          })(),
          gender: resolvedGender,
          productClass: resolvedProductClass,
          fitType: 'Regular' as const,
          supplier: (initialTechPack as any).supplier || '',
          technicalDesignerId: typeof (initialTechPack as any).technicalDesignerId === 'object'
            ? (initialTechPack as any).technicalDesignerId?._id || ''
            : (initialTechPack as any).technicalDesignerId || '',
          fabricDescription: (initialTechPack as any).fabricDescription || '',
          productDescription: (initialTechPack as any).productDescription || '',
          designSketchUrl: (initialTechPack as any).designSketchUrl || '',
          companyLogoUrl: (initialTechPack as any).companyLogoUrl || '',
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
        bom: Array.isArray((initialTechPack as any).bom) 
          ? ((initialTechPack as any).bom || []).map((item: any, index: number) => ({
              id: item._id ? String(item._id) : (item.id || `bom_${index}`),
              part: item.part || '',
              materialName: item.materialName || '',
              placement: item.placement || '',
              size: item.size || '',
              quantity: item.quantity || 0,
              uom: item.uom || 'm',
              supplier: item.supplier || '',
              comments: item.comments || '',
              materialComposition: item.materialComposition || '',
              colorCode: item.colorCode || '',
              supplierCode: item.supplierCode || '',
              weight: item.weight || '',
              width: item.width || '',
              shrinkage: item.shrinkage || '',
              careInstructions: item.careInstructions || '',
              testingRequirements: item.testingRequirements || '',
              imageUrl: item.imageUrl || '',
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            }))
          : [],
        measurements: (initialTechPack as any).measurements || [],
        sampleMeasurementRounds: (initialTechPack as any).sampleMeasurementRounds || [],
        measurementSizeRange: normalizedSizeRange,
        measurementBaseSize: resolvedBaseSize,
        measurementUnit: (initialTechPack as any).measurementUnit || DEFAULT_MEASUREMENT_UNIT,
        measurementBaseHighlightColor: resolvedBaseHighlight,
        measurementRowStripeColor: resolvedRowStripe,
        howToMeasures: rawHowToMeasures,
        colorways: mappedColorways,
        revisionHistory: (initialTechPack as any).revisions || [],
        status: (initialTechPack as any).status,
        packingNotes: (initialTechPack as any).packingNotes || '',
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
      // Load từ server - không set hasUnsavedChanges (skipUnsavedFlag = true)
      // Note: initialTechPack đã được fetch full detail từ App.tsx trước khi truyền vào đây
      updateFormState(mappedTechPack, true);
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
      name: 'Packing',
      icon: Archive,
      component: PackingTab,
      description: 'Packing & folding instructions',
    },
    {
      id: 6,
      name: 'Revision History',
      icon: Clock,
      component: (props: any) => <RevisionTab onBackToList={onBackToList} {...props} />,
      description: 'Change tracking',
    },
    {
      id: 7,
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
                 techpack.articleInfo.articleName &&
                 techpack.articleInfo.fabricDescription);
      case 1: // BOM
        return techpack.bom.length > 0;
      case 2: // Measurements
        return techpack.measurements.length > 0;
      case 3: // Construction / How to Measure
        return techpack.howToMeasures.length > 0;
      case 4: // Colorways
        return techpack.colorways.length > 0;
      case 5: // Packing
        return !!(techpack.packingNotes && techpack.packingNotes.trim().length > 0);
      case 6: // Revision History
        return true; // Always complete
      default:
        return false;
    }
  };

  // Calculate overall progress
  const overallProgress = React.useMemo(() => {
    const trackedTabIds = [0, 1, 2, 3, 4, 5];
    const completedTabs = trackedTabIds.filter(tabId => getTabCompletionStatus(tabId)).length;
    return Math.round((completedTabs / trackedTabIds.length) * 100);
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

  // Helper function to format validation alert message
  const formatValidationAlert = (fieldKey: string, tabName: string): string => {
    const FIELD_LABEL_MAP: Record<string, string> = {
      // BOM fields
      part: 'Part',
      materialName: 'Material Name',
      materialCode: 'Material Code',
      quantity: 'Quantity',
      uom: 'Unit of Measure',
      // Measurements fields
      pomCode: 'POM Code',
      pomName: 'POM Name',
      minusTolerance: 'Minus Tolerance',
      plusTolerance: 'Plus Tolerance',
      sizes: 'Size Measurements', // Changed from 'measurement' to 'sizes' to match UI
      // Colorways fields
      name: 'Colorway Name',
      code: 'Colorway Code',
      placement: 'Placement',
      materialType: 'Material Type',
      // Construction fields (pomCode already defined above for Measurements)
      description: 'Description',
      steps: 'Steps',
    };
    
    const fieldLabel = FIELD_LABEL_MAP[fieldKey] || fieldKey;
    return `Trường ${fieldLabel}, thuộc tab ${tabName} chưa được điền. Vui lòng điền đầy đủ thông tin.`;
  };

  const handleSave = async () => {
    // Debug: Log để kiểm tra
    console.log('[TechPackTabs] handleSave called', { mode, canEdit, isSaving, currentTab });
    
    // If we're on the Article Info tab (tab 0), validate before saving
    if (currentTab === 0 && articleInfoTabRef.current) {
      const isValid = articleInfoTabRef.current.validateAndSave();
      if (!isValid) {
        console.log('[TechPackTabs] Article Info validation failed');
        return; // Stop saving if validation fails
      }
    }

    // Validate BOM if on BOM tab (tab 1) or if BOM has items
    if (techpack.bom && techpack.bom.length > 0) {
      let bomValidation;
      if (bomTabRef.current) {
        bomValidation = bomTabRef.current.validateAll();
      } else {
        // Fallback: use exported function
        const { validateBomForSave } = await import('./tabs/BomTab');
        bomValidation = validateBomForSave(techpack.bom);
      }
      
      if (!bomValidation.isValid) {
        // Get first error field from first error item
        const firstError = bomValidation.errors[0];
        const firstField = Object.keys(firstError.errors)[0];
        const alertMessage = formatValidationAlert(firstField, 'Bill of Materials');
        showError(alertMessage);
        // Switch to BOM tab to show errors
        if (currentTab !== 1) {
          setCurrentTab(1);
        }
        // Trigger validation to update UI
        setTimeout(() => {
          if (bomTabRef.current) {
            bomTabRef.current.validateAll();
          }
        }, 100);
        return;
      }
    }

    // Validate Measurements if on Measurements tab (tab 2) or if Measurements has items
    if (techpack.measurements && techpack.measurements.length > 0) {
      const { validateMeasurementsForSave } = await import('./tabs/MeasurementTab');
      const measurementsValidation = validateMeasurementsForSave(techpack.measurements, {
        defaultBaseSize: techpack.measurementBaseSize,
      });
      
      if (!measurementsValidation.isValid) {
        // Get first error field from first error item
        const firstError = measurementsValidation.errors[0];
        const firstField = Object.keys(firstError.errors)[0];
        const alertMessage = formatValidationAlert(firstField, 'Measurements');
        showError(alertMessage);
        // Switch to Measurements tab to show errors
        if (currentTab !== 2) {
          setCurrentTab(2);
        }
        return;
      }
    }

    // Validate Construction if on Construction tab (tab 3) or if Construction has items
    if (techpack.howToMeasures && techpack.howToMeasures.length > 0) {
      if (constructionTabRef.current) {
        const constructionValidation = constructionTabRef.current.validateAll();
        if (!constructionValidation.isValid) {
          // Get first error field from first error item
          const firstError = constructionValidation.errors[0];
          const firstField = Object.keys(firstError.errors)[0];
          const alertMessage = formatValidationAlert(firstField, 'Construction');
          showError(alertMessage);
          // Switch to Construction tab to show errors
          if (currentTab !== 3) {
            setCurrentTab(3);
          }
          return;
        }
      }
    }

    // Validate Colorways if on Colorways tab (tab 4) or if Colorways has items
    if (techpack.colorways && techpack.colorways.length > 0) {
      const { validateColorwaysForSave } = await import('./tabs/ColorwayTab');
      const colorwaysValidation = validateColorwaysForSave(techpack.colorways);
      
      if (!colorwaysValidation.isValid) {
        // Get first error field from first error item
        const firstError = colorwaysValidation.errors[0];
        const firstField = Object.keys(firstError.errors)[0];
        const alertMessage = formatValidationAlert(firstField, 'Colorways');
        showError(alertMessage);
        // Switch to Colorways tab to show errors
        if (currentTab !== 4) {
          setCurrentTab(4);
        }
        return;
      }
    }

    // For update flow, require confirmation and skip when no changes
    if (mode === 'edit') {
      if (!hasUnsavedChanges) {
        showWarning('Chưa có gì thay đổi.');
        return;
      }
      Modal.confirm({
        title: 'Xác nhận cập nhật',
        content: 'Bạn có muốn cập nhật TechPack này?',
        okText: 'Cập nhật',
        cancelText: 'Hủy',
        onOk: async () => {
          console.log('[TechPackTabs] Calling saveTechPack (confirmed)...');
          await saveTechPack();
          console.log('[TechPackTabs] saveTechPack completed');
        }
      });
      return;
    }

    // For create flow: no confirmation
    console.log('[TechPackTabs] Calling saveTechPack (create)...');
    await saveTechPack();
    console.log('[TechPackTabs] saveTechPack completed');
  };

  const handleExportPDF = async () => {
    await exportToPDF();
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
                  if (!onBackToList) {
                    console.error('onBackToList is not defined');
                    return;
                  }
                  if (hasUnsavedChanges) {
                    Modal.confirm({
                      title: 'Thoát mà không lưu?',
                      content: 'Bạn có muốn thoát mà không lưu các thay đổi?',
                      okText: 'Thoát',
                      cancelText: 'Tiếp tục chỉnh sửa',
                      onOk: () => onBackToList()
                    });
                  } else {
                    onBackToList();
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
                  {techpack.articleInfo.articleName || 'New Tech Pack'}
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
                  onClick={(e) => {
                    console.log('[TechPackTabs] Update button clicked', { mode, canEdit, isSaving, hasUnsavedChanges });
                    e.preventDefault();
                    handleSave();
                  }}
                  disabled={isSaving}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={isSaving ? 'Đang lưu...' : mode === 'edit' ? 'Cập nhật TechPack' : 'Lưu TechPack mới'}
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
                disabled={state?.isExportingPDF}
                className="flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {state?.isExportingPDF ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang tạo PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </>
                )}
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
    </div>
  );
};

export default TechPackTabs;
