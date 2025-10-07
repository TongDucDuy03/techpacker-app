import React, { useEffect, useMemo, useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { TechPackList } from './components/TechPackList';
import { TechPackDetail } from './components/TechPackDetail';
import { MaterialsLibrary } from './components/MaterialsLibrary';
import { MeasurementsManagement } from './components/MeasurementsManagement';
import { ColorwaysManagement } from './components/ColorwaysManagement';
import { TechPack, CreateTechPackInput } from './types/techpack';
import { api, isApiConfigured } from './lib/api';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedTechPack, setSelectedTechPack] = useState<TechPack | null>(null);
  const [techPacks, setTechPacks] = useState<TechPack[]>([]);
  

  const useApi = useMemo(() => isApiConfigured(), []);

  // Load data from API on component mount
  useEffect(() => {
    if (!useApi) {
      console.error('API is not configured. Please check your backend server.');
      return;
    }

    const loadData = async () => {
      try {
        const response = await api.listTechPacks({ page: 1, limit: 20 });
        setTechPacks(response.data);
      } catch (error) {
        console.error('Failed to load data from API:', error);
      }
    };

    loadData();
  }, [useApi]);



  const loadTechPacks = async () => {
    try {
      const response = await api.listTechPacks({ page: 1, limit: 20 });
      setTechPacks(response.data);
    } catch (error) {
      console.error('Failed to load tech packs:', error);
    }
  };

  const handleViewTechPack = (techPack: TechPack) => {
    setSelectedTechPack(techPack);
    setCurrentPage('techpack-detail');
  };

  const handleBackToList = () => {
    setSelectedTechPack(null);
    setCurrentPage('techpacks');
  };

  const handleCreateTechPack = async (techPackData: CreateTechPackInput) => {
    try {
      await api.createTechPack({ ...techPackData, ownerId: '507f1f77bcf86cd799439011' });
      loadTechPacks(); // Refresh list after creating
    } catch (error) {
      console.error('Failed to create tech pack:', error);
    }
  };

  const handleUpdateTechPack = async (id: string, techPackData: Partial<TechPack>) => {
    try {
      await api.updateTechPack(id, techPackData);
      loadTechPacks(); // Refresh list after updating
      if (selectedTechPack && selectedTechPack._id === id) {
        // Refresh the selected tech pack with the latest data
        const updatedTechPack = { ...selectedTechPack, ...techPackData };
        setSelectedTechPack(updatedTechPack as TechPack);
      }
    } catch (error) {
      console.error('Failed to update tech pack:', error);
    }
  };

  const handleDeleteTechPack = async (id: string) => {
    try {
      await api.deleteTechPack(id);
      if (selectedTechPack && selectedTechPack._id === id) {
        handleBackToList();
      }
      loadTechPacks(); // Refresh list after deleting
    } catch (error) {
      console.error('Failed to delete tech pack:', error);
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
            onCreateTechPack={handleCreateTechPack}
            onUpdateTechPack={handleUpdateTechPack}
            onDeleteTechPack={handleDeleteTechPack}
          />
        );
      case 'techpack-detail':
        return selectedTechPack ? (
          <TechPackDetail
            techPack={selectedTechPack}
            onBack={handleBackToList}
            onUpdate={handleUpdateTechPack}
            onDelete={handleDeleteTechPack}
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

export default App;