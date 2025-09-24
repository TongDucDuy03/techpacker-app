import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Ruler, 
  Palette, 
  Settings,
  Package,
  Users,
  BarChart3
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'techpacks', label: 'Tech Packs', icon: FileText },
    { id: 'measurements', label: 'Measurements', icon: Ruler },
    { id: 'materials', label: 'Materials', icon: Package },
    { id: 'colorways', label: 'Colorways', icon: Palette },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-slate-800 shadow-lg">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold text-white">TechPacker Pro</h1>
          <p className="text-slate-400 text-sm mt-1">Fashion Tech Management</p>
        </div>
        
        <nav className="mt-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`w-full flex items-center px-6 py-3 text-left transition-colors ${
                  currentPage === item.id
                    ? 'bg-teal-600 text-white border-r-3 border-teal-400'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-800 capitalize">
                {currentPage}
              </h2>
              <div className="flex items-center space-x-4">
                <div className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm font-medium">
                  Production Ready
                </div>
              </div>
            </div>
          </div>
        </header>
        
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};