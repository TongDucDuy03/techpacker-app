import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { 
  LayoutDashboard, 
  Package, 
  Ruler, 
  Wrench, 
  Heart, 
  Box, 
  Truck, 
  BarChart3, 
  Settings, 
  HelpCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  currentPath: string;
  onNavigate: (path: string) => void;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggle,
  currentPath,
  onNavigate,
  className = ''
}) => {
  const { t } = useTranslation();

  const menuItems = [
    {
      key: 'dashboard',
      label: t('navigation.dashboard'),
      icon: LayoutDashboard,
      path: '/dashboard'
    },
    {
      key: 'techpacks',
      label: t('navigation.techpacks'),
      icon: Package,
      path: '/techpacks'
    },
    {
      key: 'bom',
      label: t('navigation.bom'),
      icon: Box,
      path: '/bom'
    },
    {
      key: 'measurements',
      label: t('navigation.measurements'),
      icon: Ruler,
      path: '/measurements'
    },
    {
      key: 'construction',
      label: t('navigation.construction'),
      icon: Wrench,
      path: '/construction'
    },
    {
      key: 'care',
      label: t('navigation.care'),
      icon: Heart,
      path: '/care'
    },
    {
      key: 'materials',
      label: t('navigation.materials'),
      icon: Box,
      path: '/materials'
    },
    {
      key: 'suppliers',
      label: t('navigation.suppliers'),
      icon: Truck,
      path: '/suppliers'
    },
    {
      key: 'reports',
      label: t('navigation.reports'),
      icon: BarChart3,
      path: '/reports'
    }
  ];

  const bottomMenuItems = [
    {
      key: 'settings',
      label: t('navigation.settings'),
      icon: Settings,
      path: '/settings'
    },
    {
      key: 'help',
      label: t('navigation.help'),
      icon: HelpCircle,
      path: '/help'
    }
  ];

  const renderMenuItem = (item: typeof menuItems[0]) => {
    const Icon = item.icon;
    const isActive = currentPath === item.path;
    
    return (
      <button
        key={item.key}
        onClick={() => onNavigate(item.path)}
        className={`
          w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
          ${isActive
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
          }
        `}
        title={collapsed ? item.label : undefined}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && (
          <span className="min-w-0 whitespace-normal break-words">{item.label}</span>
        )}
      </button>
    );
  };

  return (
    <aside className={`
      bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
      flex flex-col transition-all duration-300 ease-in-out
      ${collapsed ? 'w-16' : 'w-64'}
      ${className}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('common.dashboard')}
          </h2>
        )}
        <button
          onClick={onToggle}
          className="p-1 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label={collapsed ? t('ui.sidebar.expand') : t('ui.sidebar.collapse')}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Main Menu */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map(renderMenuItem)}
      </nav>

      {/* Bottom Menu */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        {bottomMenuItems.map(renderMenuItem)}
      </div>
    </aside>
  );
};

export default Sidebar;
