import React from 'react';
import { ExportManager } from './components/ExportManager';
import { mockTechPacks } from './data/mockData';

const ExportDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Professional Export & PDF Generation Demo
          </h1>
          <p className="text-gray-600">
            Complete system for creating professional PDF documents with advanced formatting and templates
          </p>
        </div>
        
        <ExportManager techPack={mockTechPacks[0]} />
      </div>
    </div>
  );
};

export default ExportDemo;
