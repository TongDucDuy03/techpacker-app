import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import LanguageSelector from './LanguageSelector';
import { Menu, Bell, User, Settings } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
  onNotificationClick?: () => void;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  className?: string;
}

const Header: React.FC<HeaderProps> = ({
  onMenuClick,
  onNotificationClick,
  onProfileClick,
  onSettingsClick,
  className = ''
}) => {
  const { t } = useTranslation();

  return (
    <header className={`bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t('ui.sidebar.collapse')}
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              TechPacker
            </h1>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              v1.0.0
            </span>
          </div>
        </div>

        {/* Center - Search */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <input
              type="text"
              placeholder={t('common.search')}
              className="
                w-full px-4 py-2 pl-10 pr-4 text-sm border border-gray-300 dark:border-gray-600 
                rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                placeholder-gray-500 dark:placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                hover:border-gray-400 dark:hover:border-gray-500 transition-colors
              "
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Language Selector */}
          <LanguageSelector 
            variant="buttons" 
            showLabel={false}
            className="hidden sm:flex"
          />

          {/* Notifications */}
          <button
            onClick={onNotificationClick}
            className="relative p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t('ui.notifications.info')}
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Settings */}
          <button
            onClick={onSettingsClick}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t('common.settings')}
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Profile */}
          <button
            onClick={onProfileClick}
            className="flex items-center space-x-2 p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t('common.profile')}
          >
            <User className="w-5 h-5" />
            <span className="hidden sm:block text-sm font-medium">
              John Doe
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
