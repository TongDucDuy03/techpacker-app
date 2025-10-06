import React, { useState, useMemo } from 'react';
import { useTechPack } from '../../../contexts/TechPackContext';
import { Colorway, ColorwayPart } from '../../../types/techpack';
import Input from '../shared/Input';
import Select from '../shared/Select';
import DataTable from '../shared/DataTable';
import { Plus, Palette, Copy, Eye, Star, Upload, Download } from 'lucide-react';

const ColorwayTab: React.FC = () => {
  const { state, addColorway, updateColorway, deleteColorway } = useTechPack();
  const { colorways, bom } = state.techpack;

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [selectedColorway, setSelectedColorway] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Colorway>>({
    colorwayName: '',
    colorwayCode: '',
    season: '',
    isDefault: false,
    parts: [],
    approvalStatus: 'Pending',
    productionStatus: 'Lab Dip',
  });

  const [partFormData, setPartFormData] = useState<Partial<ColorwayPart>>({
    partName: '',
    colorName: '',
    pantoneCode: '',
    hexCode: '#000000',
    rgbCode: '',
    colorType: 'Solid',
  });

  // Get unique parts from BOM for colorway parts
  const availableParts = useMemo(() => {
    const bomParts = bom.map(item => item.part);
    const uniqueParts = Array.from(new Set(bomParts));
    return uniqueParts.map(part => ({ value: part, label: part }));
  }, [bom]);

  // Color type options
  const colorTypeOptions = [
    { value: 'Solid', label: 'Solid Color' },
    { value: 'Print', label: 'Print' },
    { value: 'Embroidery', label: 'Embroidery' },
    { value: 'Applique', label: 'Applique' },
  ];

  // Approval status options
  const approvalStatusOptions = [
    { value: 'Pending', label: 'Pending' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Rejected', label: 'Rejected' },
  ];

  // Production status options
  const productionStatusOptions = [
    { value: 'Lab Dip', label: 'Lab Dip' },
    { value: 'Bulk Fabric', label: 'Bulk Fabric' },
    { value: 'Finished', label: 'Finished' },
  ];

  const handleInputChange = (field: keyof Colorway) => (value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePartInputChange = (field: keyof ColorwayPart) => (value: string) => {
    setPartFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-generate RGB from hex
    if (field === 'hexCode' && value.match(/^#[0-9A-Fa-f]{6}$/)) {
      const r = parseInt(value.slice(1, 3), 16);
      const g = parseInt(value.slice(3, 5), 16);
      const b = parseInt(value.slice(5, 7), 16);
      setPartFormData(prev => ({ ...prev, rgbCode: `rgb(${r}, ${g}, ${b})` }));
    }
  };

  const handleAddPart = () => {
    if (!partFormData.partName || !partFormData.colorName) {
      alert('Please fill in part name and color name');
      return;
    }

    const newPart: ColorwayPart = {
      id: `part_${Date.now()}`,
      partName: partFormData.partName!,
      colorName: partFormData.colorName!,
      pantoneCode: partFormData.pantoneCode || '',
      hexCode: partFormData.hexCode || '#000000',
      rgbCode: partFormData.rgbCode || '',
      colorType: partFormData.colorType || 'Solid',
    };

    setFormData(prev => ({
      ...prev,
      parts: [...(prev.parts || []), newPart]
    }));

    // Reset part form
    setPartFormData({
      partName: '',
      colorName: '',
      pantoneCode: '',
      hexCode: '#000000',
      rgbCode: '',
      colorType: 'Solid',
    });
  };

  const handleRemovePart = (partId: string) => {
    setFormData(prev => ({
      ...prev,
      parts: (prev.parts || []).filter(part => part.id !== partId)
    }));
  };

  const handleEditPart = (part: ColorwayPart) => {
    setPartFormData(part);
    handleRemovePart(part.id);
  };

  const handleSubmit = () => {
    if (!formData.colorwayName || !formData.colorwayCode) {
      alert('Please fill in colorway name and code');
      return;
    }

    const colorway: Colorway = {
      id: editingIndex !== null ? colorways[editingIndex].id : `colorway_${Date.now()}`,
      colorwayName: formData.colorwayName!,
      colorwayCode: formData.colorwayCode!,
      season: formData.season || '',
      isDefault: formData.isDefault || false,
      parts: formData.parts || [],
      approvalStatus: formData.approvalStatus || 'Pending',
      productionStatus: formData.productionStatus || 'Lab Dip',
    };

    if (editingIndex !== null) {
      updateColorway(editingIndex, colorway);
      setEditingIndex(null);
    } else {
      addColorway(colorway);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      colorwayName: '',
      colorwayCode: '',
      season: '',
      isDefault: false,
      parts: [],
      approvalStatus: 'Pending',
      productionStatus: 'Lab Dip',
    });
    setPartFormData({
      partName: '',
      colorName: '',
      pantoneCode: '',
      hexCode: '#000000',
      rgbCode: '',
      colorType: 'Solid',
    });
    setShowAddForm(false);
    setEditingIndex(null);
  };

  const handleEdit = (colorway: Colorway, index: number) => {
    setFormData(colorway);
    setEditingIndex(index);
    setShowAddForm(true);
  };

  const handleDelete = (colorway: Colorway, index: number) => {
    if (window.confirm(`Are you sure you want to delete colorway "${colorway.colorwayName}"?`)) {
      deleteColorway(index);
    }
  };

  const handleDuplicate = (colorway: Colorway) => {
    const duplicated: Colorway = {
      ...colorway,
      id: `colorway_${Date.now()}`,
      colorwayName: `${colorway.colorwayName} Copy`,
      colorwayCode: `${colorway.colorwayCode}_COPY`,
      isDefault: false,
      parts: colorway.parts.map(part => ({
        ...part,
        id: `part_${Date.now()}_${Math.random()}`
      }))
    };
    
    addColorway(duplicated);
  };

  const handleSetDefault = (index: number) => {
    // First, set all colorways to non-default
    colorways.forEach((_, i) => {
      updateColorway(i, { isDefault: false });
    });
    // Then set the selected one as default
    updateColorway(index, { isDefault: true });
  };

  const validatePantoneCode = (code: string): boolean => {
    // Basic Pantone code validation
    return /^(PANTONE\s+)?[0-9]{2,3}-[0-9]{4}\s+(TPX|TCX|C|U)$/i.test(code) || code === '';
  };

  const validateHexCode = (code: string): boolean => {
    return /^#[0-9A-Fa-f]{6}$/.test(code);
  };

  // Table columns for colorway parts
  const partColumns = [
    {
      key: 'partName' as keyof ColorwayPart,
      header: 'Part',
      width: '20%',
    },
    {
      key: 'colorName' as keyof ColorwayPart,
      header: 'Color Name',
      width: '20%',
    },
    {
      key: 'pantoneCode' as keyof ColorwayPart,
      header: 'Pantone Code',
      width: '15%',
    },
    {
      key: 'hexCode' as keyof ColorwayPart,
      header: 'Color',
      width: '10%',
      render: (value: string) => (
        <div className="flex items-center space-x-2">
          <div 
            className="w-6 h-6 rounded border border-gray-300"
            style={{ backgroundColor: value }}
          />
          <span className="text-xs font-mono">{value}</span>
        </div>
      ),
    },
    {
      key: 'colorType' as keyof ColorwayPart,
      header: 'Type',
      width: '15%',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Colorways</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage color variations and Pantone specifications
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-center">
              <div className="text-2xl font-bold text-blue-600">{colorways.length}</div>
              <div className="text-gray-500">Colorways</div>
            </div>
            <div className="text-sm text-center">
              <div className="text-2xl font-bold text-green-600">
                {colorways.filter(c => c.approvalStatus === 'Approved').length}
              </div>
              <div className="text-gray-500">Approved</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                showPreview
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview Mode
            </button>

            {colorways.length > 0 && (
              <Select
                label=""
                value={selectedColorway}
                onChange={setSelectedColorway}
                options={colorways.map(c => ({ value: c.id, label: c.colorwayName }))}
                placeholder="Select colorway to preview..."
                className="min-w-48"
              />
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </button>
            <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Colorway
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {editingIndex !== null ? 'Edit Colorway' : 'Add New Colorway'}
          </h3>
          
          {/* Colorway Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Input
              label="Colorway Name"
              value={formData.colorwayName || ''}
              onChange={handleInputChange('colorwayName')}
              placeholder="e.g., Navy Blazer"
              required
            />
            
            <Input
              label="Colorway Code"
              value={formData.colorwayCode || ''}
              onChange={handleInputChange('colorwayCode')}
              placeholder="e.g., NVY001"
              required
            />
            
            <Input
              label="Season"
              value={formData.season || ''}
              onChange={handleInputChange('season')}
              placeholder="e.g., SS25"
            />
            
            <Select
              label="Approval Status"
              value={formData.approvalStatus || 'Pending'}
              onChange={handleInputChange('approvalStatus')}
              options={approvalStatusOptions}
            />
            
            <Select
              label="Production Status"
              value={formData.productionStatus || 'Lab Dip'}
              onChange={handleInputChange('productionStatus')}
              options={productionStatusOptions}
            />
            
            <div className="flex items-center space-x-2 mt-6">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault || false}
                onChange={(e) => handleInputChange('isDefault')(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isDefault" className="text-sm font-medium text-gray-700">
                Set as default colorway
              </label>
            </div>
          </div>

          {/* Color Parts Section */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-md font-semibold text-gray-800 mb-4">Color Parts</h4>
            
            {/* Add Part Form */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                <Select
                  label="Part"
                  value={partFormData.partName || ''}
                  onChange={handlePartInputChange('partName')}
                  options={availableParts}
                  placeholder="Select part..."
                />
                
                <Input
                  label="Color Name"
                  value={partFormData.colorName || ''}
                  onChange={handlePartInputChange('colorName')}
                  placeholder="e.g., Navy Blue"
                />
                
                <Input
                  label="Pantone Code"
                  value={partFormData.pantoneCode || ''}
                  onChange={handlePartInputChange('pantoneCode')}
                  placeholder="19-4052 TPX"
                  error={partFormData.pantoneCode && !validatePantoneCode(partFormData.pantoneCode) ? 'Invalid Pantone format' : undefined}
                />
                
                <div className="flex flex-col space-y-1">
                  <label className="text-sm font-medium text-gray-700">Hex Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={partFormData.hexCode || '#000000'}
                      onChange={(e) => handlePartInputChange('hexCode')(e.target.value)}
                      className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={partFormData.hexCode || '#000000'}
                      onChange={(e) => handlePartInputChange('hexCode')(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                      placeholder="#000000"
                    />
                  </div>
                </div>
                
                <Select
                  label="Type"
                  value={partFormData.colorType || 'Solid'}
                  onChange={handlePartInputChange('colorType')}
                  options={colorTypeOptions}
                />
                
                <button
                  onClick={handleAddPart}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 h-10"
                >
                  Add Part
                </button>
              </div>
            </div>

            {/* Parts Table */}
            {formData.parts && formData.parts.length > 0 && (
              <DataTable
                data={formData.parts}
                columns={partColumns}
                onEdit={(part) => handleEditPart(part)}
                onDelete={(part) => handleRemovePart(part.id)}
                showActions={true}
                addButtonText=""
                emptyMessage=""
                className="mb-4"
              />
            )}
          </div>
          
          <div className="flex items-center justify-end space-x-3 mt-6">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              {editingIndex !== null ? 'Update' : 'Add'} Colorway
            </button>
          </div>
        </div>
      )}

      {/* Colorways Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {colorways.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Palette className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No colorways defined</p>
            <p className="text-sm">Add colorways to define different color variations for this tech pack.</p>
          </div>
        ) : (
          colorways.map((colorway, index) => (
            <div key={colorway.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-gray-900">{colorway.colorwayName}</h3>
                    {colorway.isDefault && (
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDuplicate(colorway)}
                      className="text-gray-600 hover:text-gray-800"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(colorway, index)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit"
                    >
                      <Palette className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-sm text-gray-600 mb-3">
                  <div>Code: <span className="font-mono">{colorway.colorwayCode}</span></div>
                  <div className="flex items-center justify-between mt-1">
                    <span>Status: <span className={`font-medium ${
                      colorway.approvalStatus === 'Approved' ? 'text-green-600' :
                      colorway.approvalStatus === 'Rejected' ? 'text-red-600' : 'text-yellow-600'
                    }`}>{colorway.approvalStatus}</span></span>
                    <span className="text-xs text-gray-500">{colorway.productionStatus}</span>
                  </div>
                </div>

                {/* Color Swatches */}
                <div className="space-y-2 mb-4">
                  {colorway.parts.slice(0, 4).map((part) => (
                    <div key={part.id} className="flex items-center space-x-3">
                      <div 
                        className="w-6 h-6 rounded border border-gray-300 flex-shrink-0"
                        style={{ backgroundColor: part.hexCode }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{part.partName}</div>
                        <div className="text-xs text-gray-500 truncate">{part.colorName}</div>
                      </div>
                      {part.pantoneCode && (
                        <div className="text-xs text-gray-400 font-mono">{part.pantoneCode}</div>
                      )}
                    </div>
                  ))}
                  {colorway.parts.length > 4 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{colorway.parts.length - 4} more parts
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {!colorway.isDefault && (
                      <button
                        onClick={() => handleSetDefault(index)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Set Default
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(colorway, index)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ColorwayTab;
