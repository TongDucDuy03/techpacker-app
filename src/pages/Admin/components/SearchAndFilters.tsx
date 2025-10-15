import React, { useState } from 'react';

interface Props {
  searchTerm: string;
  roleFilter: string;
  onSearch: (term: string) => void;
  onRoleFilter: (role: string) => void;
}

const SearchAndFilters: React.FC<Props> = ({ searchTerm, roleFilter, onSearch, onRoleFilter }) => {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(localSearchTerm);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearchTerm(e.target.value);
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onRoleFilter(e.target.value);
  };

  const clearFilters = () => {
    setLocalSearchTerm('');
    onSearch('');
    onRoleFilter('');
  };

  return (
    <div style={{
      display: 'flex',
      gap: '15px',
      alignItems: 'center',
      marginBottom: '20px',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #dee2e6'
    }}>
      <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <label htmlFor="search" style={{ fontWeight: 'bold', minWidth: 'fit-content' }}>Search:</label>
        <input
          id="search"
          type="text"
          value={localSearchTerm}
          onChange={handleSearchChange}
          placeholder="Search by name or email..."
          style={{
            padding: '8px 12px',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            minWidth: '250px'
          }}
        />
        <button
          type="submit"
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Search
        </button>
      </form>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <label htmlFor="roleFilter" style={{ fontWeight: 'bold', minWidth: 'fit-content' }}>Role:</label>
        <select
          id="roleFilter"
          value={roleFilter}
          onChange={handleRoleChange}
          style={{
            padding: '8px 12px',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            minWidth: '120px'
          }}
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="designer">Designer</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>

      {(searchTerm || roleFilter) && (
        <button
          onClick={clearFilters}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear Filters
        </button>
      )}
    </div>
  );
};

export default SearchAndFilters;
