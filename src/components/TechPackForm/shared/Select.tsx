import React from 'react';
import { SelectProps } from '../../../types/techpack';

const Select: React.FC<SelectProps> = ({
  label,
  value,
  onChange,
  onBlur,
  helperText,
  options,
  placeholder = 'Select an option...',
  required = false,
  disabled = false,
  error,
  className = '',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  const selectId = `select-${label.toLowerCase().replace(/\s+/g, '-')}`;

  // Normalize options to array of objects
  const normalizedOptions = options.map(option => 
    typeof option === 'string' 
      ? { value: option, label: option }
      : option
  );

  return (
    <div className={`flex flex-col space-y-1 ${className}`}>
      <label 
        htmlFor={selectId}
        className="text-sm font-medium text-gray-700 flex items-center"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <select
        id={selectId}
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        className={`
          px-3 py-2 border rounded-md shadow-sm text-sm bg-white
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
          ${error 
            ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
            : 'border-gray-300'
          }
        `}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {normalizedOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {error && <span className="text-xs text-red-600 mt-1">{error}</span>}
      {!error && helperText && <span className="text-xs text-gray-500 mt-1">{helperText}</span>}
    </div>
  );
};

export default Select;
