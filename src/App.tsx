import React, { useEffect, useMemo, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { TechPackList } from './components/TechPackList';
import { TechPackDetail } from './components/TechPackDetail';
import { MaterialsLibrary } from './components/MaterialsLibrary';
import { MeasurementsManagement } from './components/MeasurementsManagement';
import { ColorwaysManagement } from './components/ColorwaysManagement';
import { TechPack, CreateTechPackInput } from './types/techpack';
import { TechPackProvider, useTechPack } from './contexts/TechPackContext';
import { api, isApiConfigured } from './lib/api';
import { showPromise, showError } from './lib/toast';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedTechPack, setSelectedTechPack] = useState<TechPack | null>(null);
  const context = useTechPack();
  const { techPacks = [], createTechPack, updateTechPack, deleteTechPack } = context ?? {};

  const handleViewTechPack = (techPack: TechPack) => {
    setSelectedTechPack(techPack);
    setCurrentPage('techpack-detail');
  };

  const handleBackToList = () => {
    setSelectedTechPack(null);
    setCurrentPage('techpacks');
  };

  const handleUpdate = async (id: string, data: Partial<TechPack>) => {
    if (updateTechPack) {
      await updateTechPack(id, data);
      if (selectedTechPack?.id === id) {
        setSelectedTechPack(prev => (prev ? { ...prev, ...data } as TechPack : null));
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (deleteTechPack) {
      await deleteTechPack(id);
      if (selectedTechPack?.id === id) {
        handleBackToList();
      }
    }
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard techPacks={techPacks} activities={[]} />;
      case 'techpacks':
        return (
          <TechPackList
            techPacks={techPacks}
            onViewTechPack={handleViewTechPack}
            onCreateTechPack={createTechPack}
            onUpdateTechPack={handleUpdate}
            onDeleteTechPack={handleDelete}
          />
        );
      case 'techpack-detail':
        return selectedTechPack ? (
          <TechPackDetail
            techPack={selectedTechPack}
            onBack={handleBackToList}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        ) : (
          <div>Tech pack not found</div>
        );
      case 'measurements':
        return <MeasurementsManagement />;
      case 'materials':
        return <MaterialsLibrary />;
      case 'colorways':
        return <ColorwaysManagement />;
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
        return <Dashboard techPacks={techPacks} activities={[]} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderContent()}
    </Layout>
  );
}

function App() {
  return (
    <TechPackProvider>
      <Toaster position="top-right" reverseOrder={false} />
      <AppContent />
    </TechPackProvider>
  );
}

export default App;