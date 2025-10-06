import React, { useState, useMemo } from 'react';
import { useTechPack } from '../../../contexts/TechPackContext';
import { BomItem, UNITS_OF_MEASURE, COMMON_MATERIALS, COMMON_PLACEMENTS } from '../../../types/techpack';
import DataTable from '../shared/DataTable';
import Input from '../shared/Input';
import Select from '../shared/Select';
import Textarea from '../shared/Textarea';
import { Plus, Upload, Download, Search, Filter, Package } from 'lucide-react';

const BomTab: React.FC = () => {
  const { state, addBomItem, updateBomItem, deleteBomItem } = useTechPack();
  const { bom } = state.techpack;

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterByPart, setFilterByPart] = useState('');
  
  const [formData, setFormData] = useState<Partial<BomItem>>({
    part: '',
    materialName: '',
    placement: '',
    size: '',
    quantity: 0,
    uom: 'm',
    supplier: '',
    comments: '',
    materialComposition: '',
    colorCode: '',
    supplierCode: '',
  });

  // Filter and search BOM items
  const filteredBom = useMemo(() => {
    return bom.filter(item => {
      const matchesSearch = searchTerm === '' || 
        item.part.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterByPart === '' || item.part === filterByPart;
      
      return matchesSearch && matchesFilter;
    });
  }, [bom, searchTerm, filterByPart]);

  // Get unique parts for filter
  const uniqueParts = useMemo(() => {
    return Array.from(new Set(bom.map(item => item.part))).sort();
  }, [bom]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalItems = bom.length;
    const totalQuantity = bom.reduce((sum, item) => sum + item.quantity, 0);
    const uniqueSuppliers = new Set(bom.map(item => item.supplier)).size;
    
    return { totalItems, totalQuantity, uniqueSuppliers };
  }, [bom]);

  const handleInputChange = (field: keyof BomItem) => (value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.part || !formData.materialName || !formData.quantity) {
      alert('Please fill in all required fields');
      return;
    }

    const bomItem: BomItem = {
      id: editingIndex !== null ? bom[editingIndex].id : `bom_${Date.now()}`,
      part: formData.part!,
      materialName: formData.materialName!,
      placement: formData.placement || '',
      size: formData.size || '',
      quantity: Number(formData.quantity),
      uom: formData.uom as any || 'm',
      supplier: formData.supplier || '',
      comments: formData.comments || '',
      materialComposition: formData.materialComposition || '',
      colorCode: formData.colorCode || '',
      supplierCode: formData.supplierCode || '',
    };

    if (editingIndex !== null) {
      updateBomItem(editingIndex, bomItem);
      setEditingIndex(null);
    } else {
      addBomItem(bomItem);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      part: '',
      materialName: '',
      placement: '',
      size: '',
      quantity: 0,
      uom: 'm',
      supplier: '',
      comments: '',
      materialComposition: '',
      colorCode: '',
      supplierCode: '',
    });
    setShowAddForm(false);
    setEditingIndex(null);
  };

  const handleEdit = (item: BomItem, index: number) => {
    setFormData(item);
    setEditingIndex(index);
    setShowAddForm(true);
  };

  const handleDelete = (item: BomItem, index: number) => {
    if (window.confirm(`Are you sure you want to delete "${item.part} - ${item.materialName}"?`)) {
      deleteBomItem(index);
    }
  };

  const handleAddTemplate = (templateType: string) => {
    const templates = {
      shirt: [
        { part: 'Main Fabric', materialName: 'Cotton Oxford', placement: 'Body, Sleeves', quantity: 1.5, uom: 'm' },
        { part: 'Button', materialName: 'Plastic Button', placement: 'Center Front', quantity: 8, uom: 'pcs' },
        { part: 'Thread', materialName: 'Polyester Thread', placement: 'All Over', quantity: 200, uom: 'g' },
        { part: 'Label - Main', materialName: 'Woven Label', placement: 'Center Back Neck', quantity: 1, uom: 'pcs' },
        { part: 'Label - Care', materialName: 'Printed Label', placement: 'Left Side Seam', quantity: 1, uom: 'pcs' },
      ],
      pants: [
        { part: 'Main Fabric', materialName: 'Cotton Twill', placement: 'Body', quantity: 1.2, uom: 'm' },
        { part: 'Zipper', materialName: 'Metal Zipper', placement: 'Center Front', quantity: 1, uom: 'pcs' },
        { part: 'Button', materialName: 'Metal Button', placement: 'Waistband', quantity: 1, uom: 'pcs' },
        { part: 'Thread', materialName: 'Polyester Thread', placement: 'All Over', quantity: 150, uom: 'g' },
      ]
    };

    const template = templates[templateType as keyof typeof templates];
    if (template) {
      template.forEach(item => {
        const bomItem: BomItem = {
          id: `bom_${Date.now()}_${Math.random()}`,
          ...item,
          supplier: '',
          comments: '',
        };
        addBomItem(bomItem);
      });
    }
  };

  // Table columns configuration
  const columns = [
    {
      key: 'part' as keyof BomItem,
      header: 'Part',
      width: '15%',
      sortable: true,
    },
    {
      key: 'materialName' as keyof BomItem,
      header: 'Material Name',
      width: '20%',
      sortable: true,
    },
    {
      key: 'placement' as keyof BomItem,
      header: 'Placement',
      width: '15%',
    },
    {
      key: 'size' as keyof BomItem,
      header: 'Size',
      width: '8%',
    },
    {
      key: 'quantity' as keyof BomItem,
      header: 'Qty',
      width: '8%',
      render: (value: number) => value.toFixed(2),
    },
    {
      key: 'uom' as keyof BomItem,
      header: 'UOM',
      width: '8%',
    },
    {
      key: 'supplier' as keyof BomItem,
      header: 'Supplier',
      width: '15%',
    },
    {
      key: 'comments' as keyof BomItem,
      header: 'Comments',
      width: '11%',
      render: (value: string) => (
        <span className="text-xs text-gray-600 truncate" title={value}>
          {value}
        </span>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bill of Materials</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage materials and components for this tech pack
            </p>
          </div>
          
          {/* Summary Stats */}
          <div className="flex items-center space-x-6 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totals.totalItems}</div>
              <div className="text-gray-500">Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{totals.uniqueSuppliers}</div>
              <div className="text-gray-500">Suppliers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{totals.totalQuantity.toFixed(1)}</div>
              <div className="text-gray-500">Total Qty</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={filterByPart}
                onChange={(e) => setFilterByPart(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Parts</option>
                {uniqueParts.map(part => (
                  <option key={part} value={part}>{part}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Template Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleAddTemplate('shirt')}
                className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Package className="w-3 h-3 mr-1 inline" />
                Shirt Template
              </button>
              <button
                onClick={() => handleAddTemplate('pants')}
                className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Package className="w-3 h-3 mr-1 inline" />
                Pants Template
              </button>
            </div>

            {/* Import/Export */}
            <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </button>
            <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>

            {/* Add Button */}
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Material
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {editingIndex !== null ? 'Edit Material' : 'Add New Material'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Part"
              value={formData.part || ''}
              onChange={handleInputChange('part')}
              options={COMMON_MATERIALS}
              required
            />
            
            <Input
              label="Material Name"
              value={formData.materialName || ''}
              onChange={handleInputChange('materialName')}
              placeholder="e.g., Cotton Oxford"
              required
            />
            
            <Select
              label="Placement"
              value={formData.placement || ''}
              onChange={handleInputChange('placement')}
              options={COMMON_PLACEMENTS}
            />
            
            <Input
              label="Size"
              value={formData.size || ''}
              onChange={handleInputChange('size')}
              placeholder="e.g., 14mm, L, etc."
            />
            
            <Input
              label="Quantity"
              value={formData.quantity || 0}
              onChange={handleInputChange('quantity')}
              type="number"
              min={0}
              step={0.01}
              required
            />
            
            <Select
              label="Unit of Measure"
              value={formData.uom || 'm'}
              onChange={handleInputChange('uom')}
              options={UNITS_OF_MEASURE}
              required
            />
            
            <Input
              label="Supplier"
              value={formData.supplier || ''}
              onChange={handleInputChange('supplier')}
              placeholder="Supplier name"
            />
            
            <Input
              label="Supplier Code"
              value={formData.supplierCode || ''}
              onChange={handleInputChange('supplierCode')}
              placeholder="Material code"
            />
            
            <Input
              label="Color Code"
              value={formData.colorCode || ''}
              onChange={handleInputChange('colorCode')}
              placeholder="e.g., Navy, #001122"
            />
            
            <div className="md:col-span-2">
              <Input
                label="Material Composition"
                value={formData.materialComposition || ''}
                onChange={handleInputChange('materialComposition')}
                placeholder="e.g., 100% Cotton, 65% Cotton 35% Polyester"
              />
            </div>
            
            <div className="md:col-span-3">
              <Textarea
                label="Comments"
                value={formData.comments || ''}
                onChange={handleInputChange('comments')}
                placeholder="Additional notes or specifications..."
                rows={2}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-end space-x-3 mt-6">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {editingIndex !== null ? 'Update' : 'Add'} Material
            </button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        data={filteredBom}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        addButtonText="Add Material"
        emptyMessage="No materials added yet. Click 'Add Material' to get started or use a template."
        className="mb-6"
      />
    </div>
  );
};

export default BomTab;
