import React, { useEffect, useMemo } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { TechPack } from '../types/techpack';
import { RevisionsTimeline } from './RevisionsTimeline';
import { api, isApiConfigured } from '../lib/api';

interface TechPackDetailProps {
  techPack: TechPack;
  onBack: () => void;
  onUpdate: (id: string, data: Partial<TechPack>) => void;
  onDelete: (id: string) => void;
}

export const TechPackDetail: React.FC<TechPackDetailProps> = ({ techPack, onBack, onUpdate, onDelete }) => {
  const useApi = useMemo(() => isApiConfigured(), []);

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
          onClick={() => onDelete(techPack._id)}
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
              src={techPack.metadata?.images?.[0]?.thumbnail || 'https://via.placeholder.com/400x300'}
              alt={techPack.name}
              className="w-full h-80 object-cover"
            />
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">{techPack.name}</h2>
                <p className="text-gray-600">{techPack.articleCode} • {techPack.metadata?.category || 'No category'}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                techPack.status === 'approved' ? 'bg-green-100 text-green-800' :
                techPack.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
                techPack.status === 'rejected' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {techPack.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Owner</p>
                <p className="text-gray-900">{techPack.ownerId.firstName} {techPack.ownerId.lastName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Season</p>
                <p className="text-gray-900">{techPack.metadata?.season || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="text-gray-900">{new Date(techPack.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Last Modified</p>
                <p className="text-gray-900">{new Date(techPack.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>

            {techPack.metadata?.description && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700">{techPack.metadata.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Materials</h3>
        {techPack.materials.length === 0 ? (
          <p className="text-gray-600">No materials added</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {techPack.materials.map((material, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <p className="font-medium text-gray-900">{material.name}</p>
                <p className="text-sm text-gray-600">Type: {material.type}</p>
                <p className="text-sm text-gray-600">Supplier: {material.supplier || 'Not specified'}</p>
                <p className="text-sm text-gray-600">Code: {material.code || 'N/A'}</p>
                {material.notes && <p className="text-sm text-gray-600">Notes: {material.notes}</p>}
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
            {techPack.measurements.map((measurement, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-gray-900">{measurement.pomName}</p>
                  <span className="text-sm text-gray-600">
                    Tolerance: -{measurement.toleranceMinus}/+{measurement.tolerancePlus}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Code: {measurement.pomCode}</p>
                {measurement.sizes && Object.keys(measurement.sizes).length > 0 && (
                  <div className="grid grid-cols-5 gap-2">
                    {Object.entries(measurement.sizes).map(([size, value]) => (
                      <div key={size} className="text-sm text-gray-700">
                        <span className="font-medium mr-1">{size}:</span>
                        <span>{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Colorways</h3>
        {techPack.colorways.length === 0 ? (
          <p className="text-gray-600">No colorways added</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {techPack.colorways.map((colorway, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <p className="font-medium text-gray-900">{colorway.name}</p>
                <p className="text-sm text-gray-600">Code: {colorway.code}</p>
                <p className="text-sm text-gray-600">Material: {colorway.materialType}</p>
                <p className="text-sm text-gray-600">Placement: {colorway.placement}</p>
                {colorway.pantoneCode && <p className="text-sm text-gray-600">Pantone: {colorway.pantoneCode}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};