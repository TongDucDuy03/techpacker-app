import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { TechPackList } from './components/TechPackList';
import { TechPackDetail } from './components/TechPackDetail';
import { TechPack, Activity } from './types';
import { mockTechPacks } from './data/mockData';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedTechPack, setSelectedTechPack] = useState<TechPack | null>(null);
  const [techPacks, setTechPacks] = useState<TechPack[]>(mockTechPacks);
  const [activities, setActivities] = useState<Activity[]>([]);

  const handleViewTechPack = (techPack: TechPack) => {
    setSelectedTechPack(techPack);
    setCurrentPage('techpack-detail');
  };

  const handleBackToList = () => {
    setSelectedTechPack(null);
    setCurrentPage('techpacks');
  };

  const handleCreateTechPack = (techPackData: Omit<TechPack, 'id' | 'dateCreated' | 'lastModified'>) => {
    const newTechPack: TechPack = {
      ...techPackData,
      id: Date.now().toString(),
      dateCreated: new Date(),
      lastModified: new Date(),
    };
    setTechPacks(prev => [...prev, newTechPack]);
    setActivities(prev => [
      {
        id: `a${Date.now()}`,
        action: 'New tech pack created',
        item: newTechPack.name,
        time: 'just now',
        user: 'You'
      },
      ...prev
    ]);
  };

  const handleUpdateTechPack = (id: string, techPackData: Omit<TechPack, 'id' | 'dateCreated' | 'lastModified'>) => {
    setTechPacks(prev => prev.map(tp => 
      tp.id === id 
        ? { ...techPackData, id, dateCreated: tp.dateCreated, lastModified: new Date() }
        : tp
    ));
    setActivities(prev => [
      {
        id: `a${Date.now()}`,
        action: 'Tech pack updated',
        item: techPackData.name,
        time: 'just now',
        user: 'You'
      },
      ...prev
    ]);
    // Update selected tech pack if it's the one being edited
    if (selectedTechPack && selectedTechPack.id === id) {
      setSelectedTechPack({
        ...techPackData,
        id,
        dateCreated: selectedTechPack.dateCreated,
        lastModified: new Date()
      });
    }
  };

  const handleDeleteTechPack = (id: string) => {
    setTechPacks(prev => prev.filter(tp => tp.id !== id));
    const deleted = techPacks.find(tp => tp.id === id);
    if (deleted) {
      setActivities(prev => [
        {
          id: `a${Date.now()}`,
          action: 'Tech pack deleted',
          item: deleted.name,
          time: 'just now',
          user: 'You'
        },
        ...prev
      ]);
    }
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard techPacks={techPacks} activities={activities} />;
      case 'techpacks':
        return (
          <TechPackList 
            onViewTechPack={handleViewTechPack}
            techPacks={techPacks}
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
        return <Dashboard techPacks={techPacks} activities={activities} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderContent()}
    </Layout>
  );
}

export default App;