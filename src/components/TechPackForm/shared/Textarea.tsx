import React from 'react';
import { TextareaProps } from '../../../types/techpack';

const Textarea: React.FC<TextareaProps> = ({
  label,
  value,
  onChange,
  onBlur,
  helperText,
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
        onBlur={onBlur}
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
          {(value || '').length}/{maxLength}
        </div>
      )}
      
      {error && <span className="text-xs text-red-600 mt-1">{error}</span>}
      {!error && helperText && <span className="text-xs text-gray-500 mt-1">{helperText}</span>}
    </div>
  );
};

export default Textarea;
