import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  FileSpreadsheet,
  Eye,
  Edit,
  Trash2,
  Package,
  Tag,
  FileText,
  Archive
} from 'lucide-react';
import { BOMItem, PartClassification, Placement, UOM, Supplier } from '../types';
import { BOMForm } from './BOMForm';
import { BOMTable } from './BOMTable';
import { MaterialGallery } from './MaterialGallery';
import { useTranslation } from '../hooks/useTranslation';

interface BOMManagerProps {
  techPackId?: string;
}

const mockSuppliers: Supplier[] = [
  {
    id: '1',
    name: 'Fabric World Ltd',
    contact: 'John Smith',
    email: 'john@fabricworld.com',
    phone: '+1-555-0123',
    address: '123 Textile St, New York',
    specialties: ['Fabric'],
    rating: 4.8
  },
  {
    id: '2',
    name: 'Trims & Accessories Co',
    contact: 'Sarah Johnson',
    email: 'sarah@trimsco.com',
    phone: '+1-555-0456',
    address: '456 Accessory Ave, Los Angeles',
    specialties: ['Trims', 'Labels'],
    rating: 4.6
  },
  {
    id: '3',
    name: 'Packaging Solutions Inc',
    contact: 'Mike Chen',
    email: 'mike@packaging.com',
    phone: '+1-555-0789',
    address: '789 Package Blvd, Chicago',
    specialties: ['Packaging'],
    rating: 4.4
  }
];

const mockBOMItems: BOMItem[] = [
  {
    id: '1',
    part: 'Fabric',
    materialCode: 'FAB-001',
    placement: 'Body',
    sizeSpec: '18L',
    quantity: 2.5,
    uom: 'Yards',
    supplier: 'Fabric World Ltd',
    comments: ['100% Cotton', 'Pre-shrunk'],
    images: ['https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg'],
    color: 'Navy Blue',
    weight: 180,
    cost: 12.50,
    leadTime: 14,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    part: 'Trims',
    materialCode: 'TRM-002',
    placement: 'Collar',
    sizeSpec: '3/4"x3/4"',
    quantity: 12,
    uom: 'Pieces',
    supplier: 'Trims & Accessories Co',
    comments: ['Polyester blend', 'Colorfast'],
    images: ['https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg'],
    color: 'White',
    weight: 5,
    cost: 0.25,
    leadTime: 7,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    part: 'Labels',
    materialCode: 'LBL-003',
    placement: 'Collar',
    sizeSpec: '2"x1"',
    quantity: 1,
    uom: 'Pieces',
    supplier: 'Trims & Accessories Co',
    comments: ['Woven care label', 'Machine washable'],
    images: ['https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg'],
    color: 'White',
    weight: 2,
    cost: 0.15,
    leadTime: 5,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '4',
    part: 'Packaging',
    materialCode: 'PKG-004',
    placement: 'Other',
    sizeSpec: '12"x16"',
    quantity: 1,
    uom: 'Pieces',
    supplier: 'Packaging Solutions Inc',
    comments: ['Poly bag', 'Recyclable'],
    images: ['https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg'],
    color: 'Clear',
    weight: 10,
    cost: 0.50,
    leadTime: 3,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const BOMManager: React.FC<BOMManagerProps> = ({ techPackId }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<PartClassification>('Fabric');
  const [bomItems, setBomItems] = useState<BOMItem[]>(mockBOMItems);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<BOMItem | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BOMItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof BOMItem>('materialCode');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const tabs: { id: PartClassification; icon: React.ComponentType<any>; color: string }[] = [
    { id: 'Fabric', icon: Package, color: 'bg-blue-500' },
    { id: 'Trims', icon: Tag, color: 'bg-green-500' },
    { id: 'Labels', icon: FileText, color: 'bg-orange-500' },
    { id: 'Packaging', icon: Archive, color: 'bg-gray-500' }
  ];

  const filteredItems = useMemo(() => {
    let filtered = bomItems.filter(item => item.part === activeTab);
    
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.materialCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.placement.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.comments.some(comment => comment.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return 0;
    });
  }, [bomItems, activeTab, searchTerm, sortField, sortDirection]);

  const handleCreateItem = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEditItem = (item: BOMItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleSaveItem = (itemData: Omit<BOMItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingItem) {
      setBomItems(prev => prev.map(item => 
        item.id === editingItem.id 
          ? { ...itemData, id: editingItem.id, createdAt: editingItem.createdAt, updatedAt: new Date() }
          : item
      ));
    } else {
      const newItem: BOMItem = {
        ...itemData,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setBomItems(prev => [...prev, newItem]);
    }
    setShowForm(false);
    setEditingItem(null);
  };

  const handleDeleteItem = (id: string) => {
    setBomItems(prev => prev.filter(item => item.id !== id));
  };

  const handleViewGallery = (item: BOMItem) => {
    setSelectedItem(item);
    setShowGallery(true);
  };

  const handleExportBOM = () => {
    const csvContent = [
      [
        t('bom.part'),
        t('bom.materialCode'),
        t('bom.placement'),
        t('bom.sizeSpec'),
        t('bom.quantity'),
        t('bom.uom'),
        t('bom.supplier'),
        t('bom.comments'),
        t('bom.color'),
        t('bom.cost')
      ],
      ...filteredItems.map(item => [
        item.part,
        item.materialCode,
        item.placement,
        item.sizeSpec,
        item.quantity.toString(),
        item.uom,
        item.supplier,
        item.comments.join('; '),
        item.color || '',
        item.cost?.toString() || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BOM_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBulkImport = () => {
    // TODO: Implement Excel import functionality
    console.log('Bulk import functionality to be implemented');
  };

  const getTabColor = (part: PartClassification) => {
    const tab = tabs.find(t => t.id === part);
    return tab?.color || 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
              <h2 className="text-2xl font-bold text-gray-900">{t('bom.title')}</h2>
              <p className="text-gray-600">{t('bom.subtitle')}</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleBulkImport}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
                {t('bom.actions.importExcel')}
          </button>
          <button
            onClick={handleExportBOM}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
                {t('bom.actions.exportCsv')}
          </button>
          <button
            onClick={handleCreateItem}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
                {t('bom.actions.addItem')}
          </button>
        </div>
      </div>

      {/* Classification Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const itemCount = bomItems.filter(item => item.part === tab.id).length;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center ${
                    isActive
                      ? 'border-teal-500 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className={`${tab.color} p-1 rounded mr-2`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  {t(`bom.parts.${tab.id.toLowerCase()}`)}
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    isActive ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {itemCount}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('bom.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
              <Filter className="w-4 h-4 mr-2" />
              {t('bom.filters')}
            </button>
          </div>
        </div>

        {/* BOM Table */}
        <BOMTable
          items={filteredItems}
          onEdit={handleEditItem}
          onDelete={handleDeleteItem}
          onViewGallery={handleViewGallery}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={(field, direction) => {
            setSortField(field);
            setSortDirection(direction);
          }}
        />
      </div>

      {/* BOM Form Modal */}
      {showForm && (
        <BOMForm
          item={editingItem}
          suppliers={mockSuppliers}
          onSave={handleSaveItem}
          onCancel={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
        />
      )}

      {/* Material Gallery Modal */}
      {showGallery && selectedItem && (
        <MaterialGallery
          item={selectedItem}
          onClose={() => {
            setShowGallery(false);
            setSelectedItem(null);
          }}
        />
      )}
    </div>
  );
};
