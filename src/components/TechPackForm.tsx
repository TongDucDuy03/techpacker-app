import React, { useState } from 'react';
import { X, Plus, Upload, Save } from 'lucide-react';
import { TechPack, Material, Measurement, Colorway } from '../types';

interface TechPackFormProps {
  techPack?: TechPack;
  onSave: (techPack: Omit<TechPack, 'id' | 'dateCreated' | 'lastModified'>) => void;
  onCancel: () => void;
}

export const TechPackForm: React.FC<TechPackFormProps> = ({ techPack, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: techPack?.name || '',
    category: techPack?.category || 'Shirts',
    status: techPack?.status || 'draft' as const,
    season: techPack?.season || '',
    brand: techPack?.brand || '',
    designer: techPack?.designer || '',
    images: techPack?.images || ['https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg'],
    materials: techPack?.materials || [],
    measurements: techPack?.measurements || [],
    constructionDetails: techPack?.constructionDetails || [''],
    colorways: techPack?.colorways || []
  });

  const [activeTab, setActiveTab] = useState('basic');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const addMaterial = () => {
    const newMaterial: Material = {
      id: `m${Date.now()}`,
      name: '',
      composition: '',
      supplier: '',
      color: '',
      consumption: ''
    };
    setFormData(prev => ({
      ...prev,
      materials: [...prev.materials, newMaterial]
    }));
  };

  const updateMaterial = (index: number, field: keyof Material, value: string) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.map((material, i) => 
        i === index ? { ...material, [field]: value } : material
      )
    }));
  };

  const removeMaterial = (index: number) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index)
    }));
  };

  const addMeasurement = () => {
    const newMeasurement: Measurement = {
      id: `meas${Date.now()}`,
      point: '',
      tolerance: '',
      sizes: { XS: '', S: '', M: '', L: '', XL: '' }
    };
    setFormData(prev => ({
      ...prev,
      measurements: [...prev.measurements, newMeasurement]
    }));
  };

  const updateMeasurement = (index: number, field: keyof Measurement, value: any) => {
    setFormData(prev => ({
      ...prev,
      measurements: prev.measurements.map((measurement, i) => 
        i === index ? { ...measurement, [field]: value } : measurement
      )
    }));
  };

  const removeMeasurement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      measurements: prev.measurements.filter((_, i) => i !== index)
    }));
  };

  const addColorway = () => {
    const newColorway: Colorway = {
      id: `cw${Date.now()}`,
      name: '',
      colors: [{ part: '', color: '', pantone: '' }]
    };
    setFormData(prev => ({
      ...prev,
      colorways: [...prev.colorways, newColorway]
    }));
  };

  const updateColorway = (index: number, field: keyof Colorway, value: any) => {
    setFormData(prev => ({
      ...prev,
      colorways: prev.colorways.map((colorway, i) => 
        i === index ? { ...colorway, [field]: value } : colorway
      )
    }));
  };

  const removeColorway = (index: number) => {
    setFormData(prev => ({
      ...prev,
      colorways: prev.colorways.filter((_, i) => i !== index)
    }));
  };

  const addConstructionDetail = () => {
    setFormData(prev => ({
      ...prev,
      constructionDetails: [...prev.constructionDetails, '']
    }));
  };

  const updateConstructionDetail = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      constructionDetails: prev.constructionDetails.map((detail, i) => 
        i === index ? value : detail
      )
    }));
  };

  const removeConstructionDetail = (index: number) => {
    setFormData(prev => ({
      ...prev,
      constructionDetails: prev.constructionDetails.filter((_, i) => i !== index)
    }));
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'materials', label: 'Materials' },
    { id: 'measurements', label: 'Measurements' },
    { id: 'colorways', label: 'Colorways' },
    { id: 'construction', label: 'Construction' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {techPack ? 'Edit Tech Pack' : 'Create New Tech Pack'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-teal-500 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      <option value="Shirts">Shirts</option>
                      <option value="Outerwear">Outerwear</option>
                      <option value="Dresses">Dresses</option>
                      <option value="Pants">Pants</option>
                      <option value="Accessories">Accessories</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.brand}
                      onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Designer *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.designer}
                      onChange={(e) => setFormData(prev => ({ ...prev, designer: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Season *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.season}
                      onChange={(e) => setFormData(prev => ({ ...prev, season: e.target.value }))}
                      placeholder="e.g., Spring 2024"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      <option value="draft">Draft</option>
                      <option value="review">Under Review</option>
                      <option value="approved">Approved</option>
                      <option value="production">Production</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'materials' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Materials</h3>
                  <button
                    type="button"
                    onClick={addMaterial}
                    className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Material
                  </button>
                </div>
                {formData.materials.map((material, index) => (
                  <div key={material.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Material Name"
                        value={material.name}
                        onChange={(e) => updateMaterial(index, 'name', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Composition"
                        value={material.composition}
                        onChange={(e) => updateMaterial(index, 'composition', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Supplier"
                        value={material.supplier}
                        onChange={(e) => updateMaterial(index, 'supplier', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Color"
                        value={material.color}
                        onChange={(e) => updateMaterial(index, 'color', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Consumption"
                        value={material.consumption}
                        onChange={(e) => updateMaterial(index, 'consumption', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => removeMaterial(index)}
                        className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'measurements' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Measurements</h3>
                  <button
                    type="button"
                    onClick={addMeasurement}
                    className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Measurement
                  </button>
                </div>
                {formData.measurements.map((measurement, index) => (
                  <div key={measurement.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <input
                        type="text"
                        placeholder="Measurement Point"
                        value={measurement.point}
                        onChange={(e) => updateMeasurement(index, 'point', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Tolerance (e.g., ±0.5cm)"
                        value={measurement.tolerance}
                        onChange={(e) => updateMeasurement(index, 'tolerance', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div className="grid grid-cols-5 gap-2 mb-4">
                      {Object.entries(measurement.sizes).map(([size, value]) => (
                        <div key={size}>
                          <label className="block text-xs font-medium text-gray-700 mb-1">{size}</label>
                          <input
                            type="text"
                            placeholder="Size"
                            value={value}
                            onChange={(e) => updateMeasurement(index, 'sizes', { ...measurement.sizes, [size]: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMeasurement(index)}
                      className="px-3 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'colorways' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Colorways</h3>
                  <button
                    type="button"
                    onClick={addColorway}
                    className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Colorway
                  </button>
                </div>
                {formData.colorways.map((colorway, index) => (
                  <div key={colorway.id} className="border border-gray-200 rounded-lg p-4">
                    <input
                      type="text"
                      placeholder="Colorway Name"
                      value={colorway.name}
                      onChange={(e) => updateColorway(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent mb-4"
                    />
                    {colorway.colors.map((color, colorIndex) => (
                      <div key={colorIndex} className="grid grid-cols-3 gap-2 mb-2">
                        <input
                          type="text"
                          placeholder="Part"
                          value={color.part}
                          onChange={(e) => {
                            const newColors = [...colorway.colors];
                            newColors[colorIndex] = { ...color, part: e.target.value };
                            updateColorway(index, 'colors', newColors);
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder="Color"
                          value={color.color}
                          onChange={(e) => {
                            const newColors = [...colorway.colors];
                            newColors[colorIndex] = { ...color, color: e.target.value };
                            updateColorway(index, 'colors', newColors);
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder="Pantone (optional)"
                          value={color.pantone || ''}
                          onChange={(e) => {
                            const newColors = [...colorway.colors];
                            newColors[colorIndex] = { ...color, pantone: e.target.value };
                            updateColorway(index, 'colors', newColors);
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => removeColorway(index)}
                      className="px-3 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors text-sm"
                    >
                      Remove Colorway
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'construction' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Construction Details</h3>
                  <button
                    type="button"
                    onClick={addConstructionDetail}
                    className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Detail
                  </button>
                </div>
                {formData.constructionDetails.map((detail, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Construction detail"
                      value={detail}
                      onChange={(e) => updateConstructionDetail(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => removeConstructionDetail(index)}
                      className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {techPack ? 'Update' : 'Create'} Tech Pack
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};