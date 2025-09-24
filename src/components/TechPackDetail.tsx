import React from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { TechPack } from '../types';

interface TechPackDetailProps {
  techPack: TechPack;
  onBack: () => void;
  onUpdate: (id: string, data: Omit<TechPack, 'id' | 'dateCreated' | 'lastModified'>) => void;
  onDelete: (id: string) => void;
}

export const TechPackDetail: React.FC<TechPackDetailProps> = ({ techPack, onBack, onUpdate, onDelete }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center text-teal-700 hover:text-teal-800"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Tech Packs
        </button>
        <button
          onClick={() => onDelete(techPack.id)}
          className="flex items-center px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="bg-gray-100">
            <img
              src={techPack.images[0]}
              alt={techPack.name}
              className="w-full h-80 object-cover"
            />
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">{techPack.name}</h2>
                <p className="text-gray-600">{techPack.category} • {techPack.brand}</p>
              </div>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {techPack.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Designer</p>
                <p className="text-gray-900">{techPack.designer}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Season</p>
                <p className="text-gray-900">{techPack.season}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="text-gray-900">{techPack.dateCreated.toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Last Modified</p>
                <p className="text-gray-900">{techPack.lastModified.toLocaleDateString()}</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Construction Details</h3>
              <ul className="list-disc pl-5 text-gray-700 space-y-1">
                {techPack.constructionDetails.map((detail, index) => (
                  <li key={index}>{detail}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Materials</h3>
        {techPack.materials.length === 0 ? (
          <p className="text-gray-600">No materials added</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {techPack.materials.map(material => (
              <div key={material.id} className="border border-gray-200 rounded-lg p-4">
                <p className="font-medium text-gray-900">{material.name}</p>
                <p className="text-sm text-gray-600">{material.composition}</p>
                <p className="text-sm text-gray-600">Supplier: {material.supplier}</p>
                <p className="text-sm text-gray-600">Color: {material.color}</p>
                <p className="text-sm text-gray-600">Consumption: {material.consumption}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Measurements</h3>
        {techPack.measurements.length === 0 ? (
          <p className="text-gray-600">No measurements added</p>
        ) : (
          <div className="space-y-3">
            {techPack.measurements.map(measurement => (
              <div key={measurement.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-gray-900">{measurement.point}</p>
                  <span className="text-sm text-gray-600">Tolerance: {measurement.tolerance}</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(measurement.sizes).map(([size, value]) => (
                    <div key={size} className="text-sm text-gray-700">
                      <span className="font-medium mr-1">{size}:</span>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};