import React, { useState } from 'react';
import { TechPackProvider, useTechPack } from '../../../contexts/TechPackContext';
import TechPackTabs from '../TechPackTabs';
import useAutoSave from '../../../hooks/useAutoSave';
import useKeyboardShortcuts from '../../../hooks/useKeyboardShortcuts';
import { Plus, FileText, Package } from 'lucide-react';

// Example App component showing how to integrate the Tech Pack system
const ExampleTechPackApp: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <TechPackProvider>
        <TechPackAppContent />
      </TechPackProvider>
    </div>
  );
};

const TechPackAppContent: React.FC = () => {
  const { state, dispatch } = useTechPack();
  const [showNewTechPackModal, setShowNewTechPackModal] = useState(false);
  
  // Enable auto-save functionality
  useAutoSave({
    delay: 2000, // Auto-save after 2 seconds of inactivity
    enabled: true
  });

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  const handleCreateNewTechPack = () => {
    // Reset to new tech pack
    dispatch({
      type: 'SET_TECH_PACK',
      payload: {
        id: '',
        articleInfo: {
          articleCode: '',
          productName: '',
          version: 1,
          gender: 'Unisex',
          productClass: '',
          fitType: 'Regular',
          supplier: '',
          technicalDesigner: '',
          fabricDescription: '',
          season: 'Spring',
          lifecycleStage: 'Concept',
          createdDate: new Date().toISOString(),
          lastModified: new Date().toISOString(),
        },
        bom: [],
        measurements: [],
        howToMeasures: [],
        colorways: [],
        revisionHistory: [],
        status: 'Draft',
        completeness: {
          isComplete: false,
          missingItems: [],
          completionPercentage: 0,
        },
        createdBy: '',
        updatedBy: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    });
    setShowNewTechPackModal(false);
  };

  const handleLoadTechPack = () => {
    // For demo, we'll just show the current tech pack
    setShowNewTechPackModal(false);
  };

  return (
    <>
      {/* Header with New Tech Pack button */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Tech Pack Management System
                </h1>
                <p className="text-sm text-gray-600">
                  {state.techpack.articleInfo.productName || 'New Tech Pack'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowNewTechPackModal(true)}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Tech Pack
              </button>
              
              <nav className="flex space-x-4">
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</a>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900">Templates</a>
                <a href="#" className="text-sm text-gray-600 hover:text-gray-900">Settings</a>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* New Tech Pack Modal */}
      {showNewTechPackModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-2">Create New Tech Pack</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Start with a blank tech pack or choose from templates
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={handleCreateNewTechPack}
                  className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 mb-2"
                >
                  <Plus className="w-4 h-4 mr-2 inline" />
                  Start Blank
                </button>
                <button
                  onClick={handleLoadTechPack}
                  className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 mb-2"
                >
                  <Package className="w-4 h-4 mr-2 inline" />
                  Load Existing
                </button>
                <button
                  onClick={() => setShowNewTechPackModal(false)}
                  className="px-4 py-2 bg-white text-gray-500 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Tech Pack Interface */}
      <main>
        <TechPackTabs />
      </main>

      {/* Optional: Add a footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <p className="text-sm text-gray-500 text-center">
            © 2024 Tech Pack Management System. Built with React + TypeScript + TailwindCSS
          </p>
        </div>
      </footer>
    </>
  );
};

export default ExampleTechPackApp;
