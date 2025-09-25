import React, { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { toggleSidebar } from '../store/slices/uiSlice';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  currentPage,
  onPageChange,
  className = ''
}) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const sidebarCollapsed = useAppSelector(state => state.ui.sidebarCollapsed);

  const handleSidebarToggle = () => {
    dispatch(toggleSidebar());
  };

  const handlePageChange = (page: string) => {
    onPageChange(page);
  };

  return (
    <div className={`min-h-screen bg-white ${className}`}>
      {/* Header */}
      <Header
        onMenuClick={handleSidebarToggle}
        onNotificationClick={() => console.log('Notifications clicked')}
        onProfileClick={() => console.log('Profile clicked')}
        onSettingsClick={() => handlePageChange('settings')}
        className="sticky top-0 z-40"
      />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={handleSidebarToggle}
          currentPath={`/${currentPage}`}
          onNavigate={(path) => handlePageChange(path.replace('/', ''))}
          className="sticky top-16 h-[calc(100vh-4rem)]"
        />

        {/* Main Content */}
        <main className={`
          flex-1 transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'ml-16' : 'ml-64'}
        `}>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;