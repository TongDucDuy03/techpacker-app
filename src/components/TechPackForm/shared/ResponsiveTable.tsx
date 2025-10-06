import React, { useState } from 'react';
import { ChevronDown, ChevronRight, MoreVertical } from 'lucide-react';

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Array<{
    key: keyof T;
    header: string;
    render?: (value: any, item: T) => React.ReactNode;
    mobile?: boolean; // Show on mobile
    priority?: 'high' | 'medium' | 'low'; // Display priority
  }>;
  onRowClick?: (item: T, index: number) => void;
  className?: string;
}

const ResponsiveTable = <T extends { id: string }>({
  data,
  columns,
  onRowClick,
  className = ''
}: ResponsiveTableProps<T>) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Separate columns by priority for responsive design
  const highPriorityColumns = columns.filter(col => col.priority === 'high' || col.mobile);
  const otherColumns = columns.filter(col => col.priority !== 'high' && !col.mobile);

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key as string}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr
                key={item.id}
                className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(item, index)}
              >
                {columns.map((column) => (
                  <td key={column.key as string} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {column.render ? column.render(item[column.key], item) : String(item[column.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden">
        {data.map((item, index) => {
          const isExpanded = expandedRows.has(item.id);
          
          return (
            <div key={item.id} className="border-b border-gray-200 last:border-b-0">
              <div className="p-4">
                {/* Main content - always visible */}
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    {highPriorityColumns.map((column) => (
                      <div key={column.key as string} className="mb-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">
                          {column.header}:
                        </span>
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {column.render ? column.render(item[column.key], item) : String(item[column.key])}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {otherColumns.length > 0 && (
                    <button
                      onClick={() => toggleRowExpansion(item.id)}
                      className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>
                  )}
                </div>

                {/* Expanded content */}
                {isExpanded && otherColumns.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="grid grid-cols-1 gap-2">
                      {otherColumns.map((column) => (
                        <div key={column.key as string} className="flex justify-between">
                          <span className="text-xs text-gray-500 uppercase tracking-wide">
                            {column.header}:
                          </span>
                          <span className="text-sm text-gray-900 text-right">
                            {column.render ? column.render(item[column.key], item) : String(item[column.key])}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {data.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No data available</p>
        </div>
      )}
    </div>
  );
};

export default ResponsiveTable;
