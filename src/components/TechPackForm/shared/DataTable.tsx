import React, { useState } from 'react';
import { DataTableProps, TableColumn } from '../../../types/techpack';
import { Plus, Trash2, Edit, ChevronDown, ChevronUp } from 'lucide-react';

const DataTable = <T extends { id: string }>({ 
  data,
  columns,
  onAdd,
  onEdit,
  onDelete,
  onSort,
  className = '',
  maxHeight = 'calc(100vh - 300px)',
  showActions = true,
  addButtonText = 'Add New Row',
  emptyMessage = 'No data available. Add a new row to get started.',
}: DataTableProps<T>) => {

  const [sortConfig, setSortConfig] = useState<{ key: keyof T | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  const handleSort = (key: keyof T) => {
    if (!onSort) return;
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    onSort(key, direction);
  };

  const renderCell = (item: T, column: TableColumn<T>, index: number) => {
    const value = item[column.key];
    if (column.render) {
      return column.render(value, item, index);
    }
    return <>{value}</>;
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Data Table</h3>
        {onAdd && (
          <button 
            onClick={onAdd}
            className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            {addButtonText}
          </button>
        )}
      </div>

      <div className="overflow-x-auto" style={{ maxHeight }}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {columns.map((column) => (
                <th 
                  key={column.key as string}
                  scope="col"
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.sortable ? 'cursor-pointer' : ''}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                  style={{ width: column.width }}
                >
                  <div className="flex items-center">
                    {column.header}
                    {column.sortable && (
                      <span className="ml-1">
                        {sortConfig.key === column.key ? (
                          sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-gray-300" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {showActions && (
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (showActions ? 1 : 0)} className="px-6 py-12 text-center text-sm text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  {columns.map((column) => (
                    <td key={column.key as string} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {renderCell(item, column, index)}
                    </td>
                  ))}
                  {showActions && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-3">
                        {onEdit && (
                          <button onClick={() => onEdit(item, index)} className="text-blue-600 hover:text-blue-900">
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {onDelete && (
                          <button onClick={() => onDelete(item, index)} className="text-red-600 hover:text-red-900">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
