import React, { useState, useEffect } from 'react';
import { useTechPack } from '../../contexts/TechPackContext';
import ArticleInfoTab from './tabs/ArticleInfoTab';
import BomTab from './tabs/BomTab';
import MeasurementTab from './tabs/MeasurementTab';
import HowToMeasureTab from './tabs/HowToMeasureTab';
import ColorwayTab from './tabs/ColorwayTab';
import RevisionTab from './tabs/RevisionTab';
import { 
  FileText, 
  Package, 
  Ruler, 
  BookOpen, 
  Palette, 
  Clock,
  Save,
  Download,
  Eye,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

const TechPackTabs: React.FC = () => {
  const context = useTechPack();
  const { state, setCurrentTab, saveTechPack, exportToPDF } = context ?? {};
  const { currentTab = 0, techpack, isSaving = false, lastSaved, hasUnsavedChanges = false } = state ?? {};

  const [showSaveNotification, setShowSaveNotification] = useState(false);

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
      component: BomTab,
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
      name: 'How to Measure',
      icon: BookOpen,
      component: HowToMeasureTab,
      description: 'Measurement instructions',
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
    await saveTechPack();
  };

  const handleExportPDF = () => {
    exportToPDF();
  };

  const CurrentTabComponent = tabs[currentTab]?.component || ArticleInfoTab;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {techpack.articleInfo.productName || 'New Tech Pack'}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>{techpack.articleInfo.articleCode || 'No Article Code'}</span>
                  <span>•</span>
                  <span>Version {techpack.articleInfo.version}</span>
                  <span>•</span>
                  <span className={`font-medium ${
                    techpack.status === 'Approved' ? 'text-green-600' :
                    techpack.status === 'In Review' ? 'text-blue-600' :
                    techpack.status === 'Rejected' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {techpack.status}
                  </span>
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
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </button>

              <button
                onClick={handleExportPDF}
                className="flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </button>

              <button className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </button>
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
        <CurrentTabComponent 
          techPack={techpack}
          onUpdate={(updates) => {
            // Update context state
            setState(prev => ({
              ...prev,
              techpack: { ...prev.techpack, ...updates },
              hasUnsavedChanges: true
            }));
          }}
          setCurrentTab={setCurrentTab}
        />
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
