import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, FileText, Ruler, Palette, Info } from 'lucide-react';
import { TechPack } from '../types/techpack';
import ArticleInfoTab from './TechPackForm/tabs/ArticleInfoTab';

interface TechPackDetailProps {
  techPack: TechPack;
  onBack: () => void;
  onUpdate: (id: string, data: Partial<TechPack>) => void;
  onDelete: (id: string) => void;
}

const TABS = [
  { name: 'Article Info', icon: Info },
  { name: 'Bill of Materials', icon: FileText },
  { name: 'Measurements', icon: Ruler },
  { name: 'Colorways', icon: Palette },
];

export const TechPackDetail: React.FC<TechPackDetailProps> = ({ techPack: initialTechPack, onBack, onUpdate, onDelete }) => {
  const [techPack, setTechPack] = useState<TechPack>(initialTechPack);
  const [currentTab, setCurrentTab] = useState(0);

  useEffect(() => {
    setTechPack(initialTechPack);
  }, [initialTechPack]);

  const handleUpdate = (field: keyof TechPack, value: any) => {
    const updatedTechPack = { ...techPack, [field]: value };
    setTechPack(updatedTechPack);
    onUpdate(techPack._id, { [field]: value });
  };

  const renderTabContent = () => {
    switch (currentTab) {
      case 0:
        return <ArticleInfoTab techPack={techPack} onUpdate={handleUpdate} setCurrentTab={setCurrentTab} />;
      // Future tabs will be added here
      default:
        return <div className="p-6">Select a tab</div>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center text-teal-700 hover:text-teal-800">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Tech Packs
        </button>
        <button onClick={() => onDelete(techPack._id)} className="flex items-center px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-6 px-6" aria-label="Tabs">
            {TABS.map((tab, index) => (
              <button
                key={tab.name}
                onClick={() => setCurrentTab(index)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  currentTab === index
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="mr-2 h-5 w-5" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
        <div>{renderTabContent()}</div>
      </div>
    </div>
  );
};