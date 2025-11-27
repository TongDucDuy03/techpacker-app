import React from 'react';
import { InputProps } from '../../../types/techpack';

const Input: React.FC<InputProps> = ({
  label,
  value,
  onChange,
  onBlur,
  helperText,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  error,
  className = '',
  maxLength,
  min,
  max,
  step,
  inputMode,
  datalistOptions,
  listId,
}) => {
  const isNumeric = type === 'number';
  const resolvedType = isNumeric ? 'text' : type;
  const resolvedInputMode = inputMode ?? (isNumeric ? 'decimal' : undefined);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isNumeric) {
      const raw = e.target.value;
      const normalized = raw.replace(/,/g, '.');
      const transitionalStates = ['', '-', '.', '-.', normalized.endsWith('.') ? normalized : null].filter(
        (state): state is string => state !== null && state !== undefined
      );
      if (transitionalStates.includes(normalized)) {
        onChange(normalized);
        return;
      }

      const parsed = Number(normalized);
      if (Number.isNaN(parsed)) {
        onChange('');
      } else {
        onChange(parsed);
      }
      return;
    }

    onChange(e.target.value);
  };

  const inputId = `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const normalizedDatalist =
    datalistOptions?.map((option) =>
      typeof option === 'string'
        ? { value: option, label: option }
        : { value: option.value, label: option.label ?? option.value }
    ) ?? [];
  const resolvedListId = normalizedDatalist.length > 0 ? listId ?? `${inputId}-list` : undefined;

  return (
    <div className={`flex flex-col space-y-1 ${className}`}>
      <label 
        htmlFor={inputId}
        className="text-sm font-medium text-gray-700 flex items-center"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <input
        id={inputId}
        type={resolvedType}
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        maxLength={maxLength}
        min={min}
        max={max}
        step={step}
        inputMode={resolvedInputMode}
        list={resolvedListId}
        className={`
          px-3 py-2 border rounded-md shadow-sm text-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
          ${error 
            ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
            : 'border-gray-300'
          }
        `}
      />
      {resolvedListId && (
        <datalist id={resolvedListId}>
          {normalizedDatalist.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </datalist>
      )}
      
      {error && <span className="text-xs text-red-600 mt-1">{error}</span>}
      {!error && helperText && <span className="text-xs text-gray-500 mt-1">{helperText}</span>}
    </div>
  );
};

export default Input;
