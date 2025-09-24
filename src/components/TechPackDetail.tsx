import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Edit, 
  Download, 
  Share,
  Calendar,
  User,
  Tag,
  Package,
  Ruler,
  Palette,
  FileText
} from 'lucide-react';
import { TechPack } from '../types';

interface TechPackDetailProps {
  techPack: TechPack;
  onBack: () => void;
}

export const TechPackDetail: React.FC<TechPackDetailProps> = ({ techPack, onBack }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'measurements', label: 'Measurements', icon: Ruler },
    { id: 'materials', label: 'Materials', icon: Package },
    { id: 'colorways', label: 'Colorways', icon: Palette },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'review': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'production': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{techPack.name}</h1>
            <div className="flex items-center space-x-4 mt-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(techPack.status)}`}>
                {techPack.status.charAt(0).toUpperCase() + techPack.status.slice(1)}
              </span>
              <span className="text-gray-500 text-sm">{techPack.category}</span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
            <Share className="w-4 h-4 mr-2" />
            Share
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab.id
                          ? 'border-teal-500 text-teal-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Product Images</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {techPack.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`${techPack.name} ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-200"
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Construction Details</h3>
                    <ul className="space-y-2">
                      {techPack.constructionDetails.map((detail, index) => (
                        <li key={index} className="flex items-start">
                          <span className="w-2 h-2 bg-teal-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                          <span className="text-gray-700">{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'measurements' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Size Chart</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Measurement Point
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tolerance
                          </th>
                          {Object.keys(techPack.measurements[0]?.sizes || {}).map(size => (
                            <th key={size} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {size}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {techPack.measurements.map((measurement) => (
                          <tr key={measurement.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {measurement.point}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {measurement.tolerance}
                            </td>
                            {Object.values(measurement.sizes).map((size, index) => (
                              <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {size}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'materials' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Material Specifications</h3>
                  <div className="space-y-4">
                    {techPack.materials.map((material) => (
                      <div key={material.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-gray-900">{material.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{material.composition}</p>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div><span className="font-medium">Supplier:</span> {material.supplier}</div>
                            <div><span className="font-medium">Color:</span> {material.color}</div>
                            <div><span className="font-medium">Consumption:</span> {material.consumption}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'colorways' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Color Options</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {techPack.colorways.map((colorway) => (
                      <div key={colorway.id} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-3">{colorway.name}</h4>
                        <div className="space-y-2">
                          {colorway.colors.map((color, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">{color.part}</span>
                              <div className="flex items-center">
                                <span className="text-sm font-medium mr-2">{color.color}</span>
                                {color.pantone && (
                                  <span className="text-xs text-gray-500">({color.pantone})</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center">
                <Tag className="w-4 h-4 text-gray-400 mr-3" />
                <span className="text-gray-600 w-20">Brand:</span>
                <span className="font-medium">{techPack.brand}</span>
              </div>
              <div className="flex items-center">
                <User className="w-4 h-4 text-gray-400 mr-3" />
                <span className="text-gray-600 w-20">Designer:</span>
                <span className="font-medium">{techPack.designer}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 text-gray-400 mr-3" />
                <span className="text-gray-600 w-20">Season:</span>
                <span className="font-medium">{techPack.season}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 text-gray-400 mr-3" />
                <span className="text-gray-600 w-20">Created:</span>
                <span className="font-medium">{techPack.dateCreated.toLocaleDateString()}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 text-gray-400 mr-3" />
                <span className="text-gray-600 w-20">Modified:</span>
                <span className="font-medium">{techPack.lastModified.toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                Duplicate Tech Pack
              </button>
              <button className="w-full text-left px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                Create Production Order
              </button>
              <button className="w-full text-left px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                Generate Cost Sheet
              </button>
              <button className="w-full text-left px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                Request Sample
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};