import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Eye, 
  Download,
  Calendar,
  User,
  Tag,
  FileText
} from 'lucide-react';
import { TechPack } from '../types';
import { mockTechPacks } from '../data/mockData';
import { TechPackForm } from './TechPackForm';

interface TechPackListProps {
  onViewTechPack: (techPack: TechPack) => void;
  techPacks: TechPack[];
  onCreateTechPack: (techPack: Omit<TechPack, 'id' | 'dateCreated' | 'lastModified'>) => void;
  onUpdateTechPack: (id: string, techPack: Omit<TechPack, 'id' | 'dateCreated' | 'lastModified'>) => void;
  onDeleteTechPack: (id: string) => void;
}

export const TechPackList: React.FC<TechPackListProps> = ({ 
  onViewTechPack, 
  techPacks, 
  onCreateTechPack, 
  onUpdateTechPack, 
  onDeleteTechPack 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingTechPack, setEditingTechPack] = useState<TechPack | null>(null);

  const filteredTechPacks = techPacks.filter(techPack => {
    const matchesSearch = techPack.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         techPack.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || techPack.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || techPack.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      case 'production': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCreateNew = () => {
    setEditingTechPack(null);
    setShowForm(true);
  };

  const handleEdit = (techPack: TechPack) => {
    setEditingTechPack(techPack);
    setShowForm(true);
  };

  const handleSave = (techPackData: Omit<TechPack, 'id' | 'dateCreated' | 'lastModified'>) => {
    if (editingTechPack) {
      onUpdateTechPack(editingTechPack.id, techPackData);
    } else {
      onCreateTechPack(techPackData);
    }
    setShowForm(false);
    setEditingTechPack(null);
  };

  const handleExport = (techPack: TechPack) => {
    // Create a simple text export
    const exportData = `
TECH PACK EXPORT
================

Product: ${techPack.name}
Category: ${techPack.category}
Brand: ${techPack.brand}
Designer: ${techPack.designer}
Season: ${techPack.season}
Status: ${techPack.status}

MATERIALS:
${techPack.materials.map(m => `- ${m.name}: ${m.composition} (${m.supplier})`).join('\n')}

MEASUREMENTS:
${techPack.measurements.map(m => `- ${m.point}: ${Object.entries(m.sizes).map(([size, value]) => `${size}: ${value}`).join(', ')} (${m.tolerance})`).join('\n')}

CONSTRUCTION DETAILS:
${techPack.constructionDetails.map(d => `- ${d}`).join('\n')}

COLORWAYS:
${techPack.colorways.map(c => `- ${c.name}: ${c.colors.map(color => `${color.part}: ${color.color}`).join(', ')}`).join('\n')}
    `.trim();

    const blob = new Blob([exportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${techPack.name.replace(/\s+/g, '_')}_techpack.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Tech Pack Management</h3>
          <p className="text-gray-600">Manage your fashion technical packages</p>
        </div>
        <button 
          onClick={handleCreateNew}
          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Tech Pack
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tech packs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="production">Production</option>
          </select>
          
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            <option value="Shirts">Shirts</option>
            <option value="Outerwear">Outerwear</option>
            <option value="Dresses">Dresses</option>
            <option value="Pants">Pants</option>
          </select>
          
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center">
            <Filter className="w-4 h-4 mr-2" />
            More Filters
          </button>
        </div>
      </div>

      {/* Tech Pack Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTechPacks.map((techPack) => (
          )
          )
          }
          <div key={techPack.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            {/* Image */}
            <div className="aspect-w-16 aspect-h-9 bg-gray-200">
              <img
                src={techPack.images[0]}
                alt={techPack.name}
                className="w-full h-48 object-cover"
              />
            </div>
            
            {/* Content */}
            <div className="p-6">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-gray-900 text-lg">{techPack.name}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(techPack.status)}`}>
                  {techPack.status}
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center">
                  <Tag className="w-4 h-4 mr-2" />
                  {techPack.category} • {techPack.brand}
                </div>
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  {techPack.designer}
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  {techPack.lastModified.toLocaleDateString()}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => onViewTechPack(techPack)}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </button>
                <button className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                <button 
                  onClick={() => handleEdit(techPack)}
                  className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleExport(techPack)}
                  className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTechPacks.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tech packs found</h3>
          <p className="text-gray-600 mb-6">Try adjusting your search or filter criteria</p>
          <button 
            onClick={handleCreateNew}
            className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Create Your First Tech Pack
          </button>
        </div>
      )}
    </div>

      {showForm && (
        <TechPackForm
          techPack={editingTechPack}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}
    </>
  );
};