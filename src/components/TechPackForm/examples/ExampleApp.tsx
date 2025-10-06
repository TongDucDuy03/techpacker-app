import React from 'react';
import { TechPackProvider } from '../../../contexts/TechPackContext';
import TechPackTabs from '../TechPackTabs';
import useAutoSave from '../../../hooks/useAutoSave';
import useKeyboardShortcuts from '../../../hooks/useKeyboardShortcuts';

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
  // Enable auto-save functionality
  useAutoSave({
    delay: 2000, // Auto-save after 2 seconds of inactivity
    enabled: true
  });

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <>
      {/* Optional: Add a header/navigation */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">
              Tech Pack Management System
            </h1>
            <nav className="flex space-x-4">
              <a href="#" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</a>
              <a href="#" className="text-sm text-gray-600 hover:text-gray-900">Templates</a>
              <a href="#" className="text-sm text-gray-600 hover:text-gray-900">Settings</a>
            </nav>
          </div>
        </div>
      </header>

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
