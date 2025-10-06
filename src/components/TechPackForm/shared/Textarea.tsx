import React from 'react';
import { TextareaProps } from '../../../types/techpack';

const Textarea: React.FC<TextareaProps> = ({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  className = '',
  rows = 3,
  maxLength,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const textareaId = `textarea-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className={`flex flex-col space-y-1 ${className}`}>
      <label 
        htmlFor={textareaId}
        className="text-sm font-medium text-gray-700 flex items-center"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <textarea
        id={textareaId}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        rows={rows}
        maxLength={maxLength}
        className={`
          px-3 py-2 border rounded-md shadow-sm text-sm resize-y
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
          ${error 
            ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
            : 'border-gray-300'
          }
        `}
      />
      
      {maxLength && (
        <div className="text-xs text-gray-500 text-right">
          {value.length}/{maxLength}
        </div>
      )}
      
      {error && (
        <span className="text-sm text-red-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </span>
      )}
    </div>
  );
};

export default Textarea;
