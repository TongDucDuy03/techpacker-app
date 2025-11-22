import { useState } from 'react';
import { Link } from 'react-router-dom';

import { TechPackList } from './components/TechPackList';
import { TechPackDetail } from './components/TechPackDetail';
import TechPackTabs from './components/TechPackForm/TechPackTabs';
import { ApiTechPack } from './types/techpack';
import { useTechPack } from './contexts/TechPackContext';
import { useAuth } from './contexts/AuthContext';

import { Plus, List, Settings, LogOut, User } from 'lucide-react';

// Admin Navigation Component
const AdminNavigation: React.FC = () => {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <Link
      to="/admin/users"
      className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
    >
      <Settings className="w-4 h-4" />
      Admin Panel
    </Link>
  );
};

// User Menu Component with Logout
const UserMenu: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      // Redirect will be handled by the router when user becomes null
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      {/* User Info */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-50">
        <User className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">
          {user.firstName} {user.lastName}
        </span>
        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
          {user.role}
        </span>
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
        title="Logout"
      >
        <LogOut className="w-4 h-4" />
        Logout
      </button>
    </div>
  );
};

function AppContent() {
  const [currentTab, setCurrentTab] = useState('list');
  const [selectedTechPack, setSelectedTechPack] = useState<ApiTechPack | null>(null);
  const [loadingTechPack, setLoadingTechPack] = useState(false);
  const context = useTechPack();
  const { techPacks = [], updateTechPack, deleteTechPack, getTechPack } = context ?? {};
  const { user } = useAuth();

  // Permission checks based on user role
  const canCreate = user?.role === 'admin' || user?.role === 'designer';
  const canEdit = user?.role === 'admin' || user?.role === 'designer';

  const handleViewTechPack = async (techPack: ApiTechPack) => {
    const techPackId = techPack._id || techPack.id;
    if (!techPackId || !getTechPack) {
      // Fallback: dùng data từ list nếu không có getTechPack hoặc ID
      setSelectedTechPack(techPack);
      setCurrentTab('view');
      return;
    }

    // Fetch full detail từ API trước khi mở view
    setLoadingTechPack(true);
    try {
      const fullTechPack = await getTechPack(techPackId);
      if (fullTechPack) {
        setSelectedTechPack(fullTechPack);
        setCurrentTab('view');
      } else {
        // Fallback: dùng data từ list nếu fetch fail
        setSelectedTechPack(techPack);
        setCurrentTab('view');
      }
    } catch (error) {
      console.error('[App] Failed to fetch full techpack for view:', error);
      // Fallback: dùng data từ list nếu fetch fail
      setSelectedTechPack(techPack);
      setCurrentTab('view');
    } finally {
      setLoadingTechPack(false);
    }
  };

  const handleEditTechPack = async (techPack: ApiTechPack) => {
    const techPackId = techPack._id || techPack.id;
    if (!techPackId || !getTechPack) {
      // Fallback: dùng data từ list nếu không có getTechPack hoặc ID
      setSelectedTechPack(techPack);
      setCurrentTab('edit');
      return;
    }

    // Fetch full detail từ API trước khi mở edit
    setLoadingTechPack(true);
    try {
      const fullTechPack = await getTechPack(techPackId);
      if (fullTechPack) {
        setSelectedTechPack(fullTechPack);
        setCurrentTab('edit');
      } else {
        // Fallback: dùng data từ list nếu fetch fail
        setSelectedTechPack(techPack);
        setCurrentTab('edit');
      }
    } catch (error) {
      console.error('[App] Failed to fetch full techpack for edit:', error);
      // Fallback: dùng data từ list nếu fetch fail
      setSelectedTechPack(techPack);
      setCurrentTab('edit');
    } finally {
      setLoadingTechPack(false);
    }
  };

  const handleBackToList = async () => {
    setSelectedTechPack(null);
    setCurrentTab('list');
    // Refresh the list when returning to it
    if (context?.loadTechPacks) {
      try {
        await context.loadTechPacks({ page: 1 });
      } catch (error) {
        console.error('Failed to refresh techpack list when returning:', error);
      }
    }
  };

  const handleUpdate = async (id: string, data: Partial<ApiTechPack>) => {
    if (updateTechPack) {
      await updateTechPack(id, data);
      if (selectedTechPack?._id === id) {
        setSelectedTechPack(prev => (prev ? { ...prev, ...data } as ApiTechPack : null));
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (deleteTechPack) {
      await deleteTechPack(id);
      if (selectedTechPack?._id === id) {
        handleBackToList();
      }
    }
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'list':
        return (
          <TechPackList
            techPacks={techPacks}
            onViewTechPack={handleViewTechPack}
            onEditTechPack={handleEditTechPack}
            onCreateTechPack={() => setCurrentTab('create')}
            onUpdateTechPack={handleUpdate}
            onDeleteTechPack={handleDelete}
          />
        );
      case 'create':
        return (
          <TechPackTabs onBackToList={handleBackToList} />
        );
      case 'edit':
        if (loadingTechPack) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Đang tải dữ liệu TechPack...</p>
              </div>
            </div>
          );
        }
        return selectedTechPack ? (
          <TechPackTabs onBackToList={handleBackToList} mode="edit" techPack={selectedTechPack} />
        ) : (
          <div>Tech pack not found</div>
        );
      case 'view':
        if (loadingTechPack) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Đang tải dữ liệu TechPack...</p>
              </div>
            </div>
          );
        }
        return selectedTechPack ? (
          <TechPackTabs onBackToList={handleBackToList} mode="view" techPack={selectedTechPack} />
        ) : (
          <div>Tech pack not found</div>
        );
      case 'detail':
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
      default:
        return (
          <TechPackList
            techPacks={techPacks}
            onViewTechPack={handleViewTechPack}
            onEditTechPack={handleEditTechPack}
            onCreateTechPack={() => setCurrentTab('create')}
            onUpdateTechPack={handleUpdate}
            onDeleteTechPack={handleDelete}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">TechPacker Pro</h1>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex items-center space-x-4">
              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setCurrentTab('list')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentTab === 'list'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <List className="w-4 h-4" />
                  Tech Packs
                </button>
                {canCreate && (
                  <button
                    onClick={() => setCurrentTab('create')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentTab === 'create'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    Create New
                  </button>
                )}
              </div>
              <AdminNavigation />
              <UserMenu />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>
    </div>
  );
}

export default AppContent;