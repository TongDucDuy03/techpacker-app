import React, { useState } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  Edit, 
  Trash2, 
  Eye, 
  Package,
  Tag,
  FileText,
  Archive,
  DollarSign,
  Clock,
  Weight
} from 'lucide-react';
import { BOMItem, PartClassification } from '../types';

interface BOMTableProps {
  items: BOMItem[];
  onEdit: (item: BOMItem) => void;
  onDelete: (id: string) => void;
  onViewGallery: (item: BOMItem) => void;
  sortField: keyof BOMItem;
  sortDirection: 'asc' | 'desc';
  onSort: (field: keyof BOMItem, direction: 'asc' | 'desc') => void;
}

export const BOMTable: React.FC<BOMTableProps> = ({
  items,
  onEdit,
  onDelete,
  onViewGallery,
  sortField,
  sortDirection,
  onSort
}) => {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const handleSort = (field: keyof BOMItem) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(field, newDirection);
  };

  const getSortIcon = (field: keyof BOMItem) => {
    if (sortField !== field) {
      return <ChevronUp className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-teal-600" />
      : <ChevronDown className="w-4 h-4 text-teal-600" />;
  };

  const getPartIcon = (part: PartClassification) => {
    switch (part) {
      case 'Fabric': return <Package className="w-4 h-4 text-blue-600" />;
      case 'Trims': return <Tag className="w-4 h-4 text-green-600" />;
      case 'Labels': return <FileText className="w-4 h-4 text-orange-600" />;
      case 'Packaging': return <Archive className="w-4 h-4 text-gray-600" />;
      default: return <Package className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPartColor = (part: PartClassification) => {
    switch (part) {
      case 'Fabric': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'Trims': return 'bg-green-50 border-green-200 text-green-800';
      case 'Labels': return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'Packaging': return 'bg-gray-50 border-gray-200 text-gray-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return '-';
    return `$${amount.toFixed(2)}`;
  };

  const formatWeight = (weight: number | undefined) => {
    if (!weight) return '-';
    return `${weight}g`;
  };

  if (items.length === 0) {
    return (
      <div className="p-12 text-center">
        <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
        <p className="text-gray-600">Add your first BOM item to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {/* Part */}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                onClick={() => handleSort('part')}
                className="flex items-center space-x-1 hover:text-gray-700"
              >
                <span>Part</span>
                {getSortIcon('part')}
              </button>
            </th>

            {/* Material Code */}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                onClick={() => handleSort('materialCode')}
                className="flex items-center space-x-1 hover:text-gray-700"
              >
                <span>Material Code</span>
                {getSortIcon('materialCode')}
              </button>
            </th>

            {/* Placement */}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                onClick={() => handleSort('placement')}
                className="flex items-center space-x-1 hover:text-gray-700"
              >
                <span>Placement</span>
                {getSortIcon('placement')}
              </button>
            </th>

            {/* Size Spec */}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                onClick={() => handleSort('sizeSpec')}
                className="flex items-center space-x-1 hover:text-gray-700"
              >
                <span>Size Spec</span>
                {getSortIcon('sizeSpec')}
              </button>
            </th>

            {/* Quantity & UOM */}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                onClick={() => handleSort('quantity')}
                className="flex items-center space-x-1 hover:text-gray-700"
              >
                <span>Qty / UOM</span>
                {getSortIcon('quantity')}
              </button>
            </th>

            {/* Supplier */}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                onClick={() => handleSort('supplier')}
                className="flex items-center space-x-1 hover:text-gray-700"
              >
                <span>Supplier</span>
                {getSortIcon('supplier')}
              </button>
            </th>

            {/* Color */}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                onClick={() => handleSort('color')}
                className="flex items-center space-x-1 hover:text-gray-700"
              >
                <span>Color</span>
                {getSortIcon('color')}
              </button>
            </th>

            {/* Cost */}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                onClick={() => handleSort('cost')}
                className="flex items-center space-x-1 hover:text-gray-700"
              >
                <span>Cost</span>
                {getSortIcon('cost')}
              </button>
            </th>

            {/* Lead Time */}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                onClick={() => handleSort('leadTime')}
                className="flex items-center space-x-1 hover:text-gray-700"
              >
                <span>Lead Time</span>
                {getSortIcon('leadTime')}
              </button>
            </th>

            {/* Actions */}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((item) => (
            <tr
              key={item.id}
              className={`hover:bg-gray-50 transition-colors ${
                hoveredRow === item.id ? 'bg-blue-50' : ''
              }`}
              onMouseEnter={() => setHoveredRow(item.id)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              {/* Part */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  {getPartIcon(item.part)}
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium border ${getPartColor(item.part)}`}>
                    {item.part}
                  </span>
                </div>
              </td>

              {/* Material Code */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{item.materialCode}</div>
              </td>

              {/* Placement */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{item.placement}</div>
              </td>

              {/* Size Spec */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 font-mono">{item.sizeSpec}</div>
              </td>

              {/* Quantity & UOM */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  <span className="font-medium">{item.quantity}</span>
                  <span className="text-gray-500 ml-1">{item.uom}</span>
                </div>
              </td>

              {/* Supplier */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{item.supplier}</div>
              </td>

              {/* Color */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  {item.color && (
                    <>
                      <div 
                        className="w-4 h-4 rounded-full border border-gray-300 mr-2"
                        style={{ backgroundColor: item.color.toLowerCase() }}
                      />
                      <span className="text-sm text-gray-900">{item.color}</span>
                    </>
                  )}
                  {!item.color && <span className="text-sm text-gray-500">-</span>}
                </div>
              </td>

              {/* Cost */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center text-sm text-gray-900">
                  <DollarSign className="w-4 h-4 text-green-600 mr-1" />
                  {formatCurrency(item.cost)}
                </div>
              </td>

              {/* Lead Time */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center text-sm text-gray-900">
                  <Clock className="w-4 h-4 text-blue-600 mr-1" />
                  {item.leadTime ? `${item.leadTime} days` : '-'}
                </div>
              </td>

              {/* Actions */}
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex items-center space-x-2">
                  {item.images && item.images.length > 0 && (
                    <button
                      onClick={() => onViewGallery(item)}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                      title="View Gallery"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(item)}
                    className="text-teal-600 hover:text-teal-900 transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="text-red-600 hover:text-red-900 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
