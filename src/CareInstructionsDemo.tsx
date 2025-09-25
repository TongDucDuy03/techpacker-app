import React from 'react';
import { CareInstructionsManager } from './components/CareInstructionsManager';

const CareInstructionsDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Care Instructions & Compliance Management Demo
          </h1>
          <p className="text-gray-600">
            Complete system for creating care labels with international compliance standards
          </p>
        </div>
        
        <CareInstructionsManager />
      </div>
    </div>
  );
};

export default CareInstructionsDemo;
