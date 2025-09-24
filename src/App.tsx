import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { TechPackList } from './components/TechPackList';
import { TechPackDetail } from './components/TechPackDetail';
import { TechPack } from './types';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedTechPack, setSelectedTechPack] = useState<TechPack | null>(null);

  const handleViewTechPack = (techPack: TechPack) => {
    setSelectedTechPack(techPack);
    setCurrentPage('techpack-detail');
  };

  const handleBackToList = () => {
    setSelectedTechPack(null);
    setCurrentPage('techpacks');
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'techpacks':
        return <TechPackList onViewTechPack={handleViewTechPack} />;
      case 'techpack-detail':
        return selectedTechPack ? (
          <TechPackDetail techPack={selectedTechPack} onBack={handleBackToList} />
        ) : (
          <div>Tech pack not found</div>
        );
      case 'measurements':
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Measurements Management</h3>
            <p className="text-gray-600">Coming soon - Manage measurement standards and templates</p>
          </div>
        );
      case 'materials':
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Materials Library</h3>
            <p className="text-gray-600">Coming soon - Manage fabric and materials database</p>
          </div>
        );
      case 'colorways':
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Colorways Management</h3>
            <p className="text-gray-600">Coming soon - Manage color palettes and Pantone references</p>
          </div>
        );
      case 'analytics':
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Analytics Dashboard</h3>
            <p className="text-gray-600">Coming soon - Production insights and performance metrics</p>
          </div>
        );
      case 'team':
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Team Management</h3>
            <p className="text-gray-600">Coming soon - Manage team members and permissions</p>
          </div>
        );
      case 'settings':
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Settings</h3>
            <p className="text-gray-600">Coming soon - Application preferences and configurations</p>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderContent()}
    </Layout>
  );
}

export default App;