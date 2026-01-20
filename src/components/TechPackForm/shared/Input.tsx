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

      // Không cho phép dấu phẩy, chỉ chấp nhận dấu chấm làm phân cách thập phân
      if (raw.includes(',')) {
        return;
      }

      const normalized = raw;
      
      // Allow transitional states (empty, minus sign, dot, number ending with dot, etc.)
      // This allows typing "0.", "0.0", "0.05", etc. without losing the decimal point
      const transitionalStates = [
        '', 
        '-', 
        '.', 
        '-.',
        // Allow any number ending with a dot (e.g., "0.", "123.", "0.0")
        normalized.endsWith('.') ? normalized : null,
        // Allow "0.0", "0.00", etc. (numbers with leading zeros after decimal)
        /^0+\.\d*$/.test(normalized) ? normalized : null,
        // Allow "-0.", "-0.0", etc.
        /^-0+\.\d*$/.test(normalized) ? normalized : null
      ].filter(
        (state): state is string => state !== null && state !== undefined
      );
      
      if (transitionalStates.includes(normalized)) {
        onChange(normalized);
        return;
      }

      const parsed = Number(normalized);
      if (Number.isNaN(parsed)) {
        // If it's not a valid number but matches a pattern like "0.", keep it as is
        if (normalized.endsWith('.') || /^0+\.\d*$/.test(normalized) || /^-0+\.\d*$/.test(normalized)) {
          onChange(normalized);
          return;
        }
        onChange('');
      } else {
        // Check if original input ends with dot - if so, keep the string representation
        // to preserve decimal input (e.g., "0." should stay "0." not become 0)
        if (normalized.endsWith('.') && !normalized.endsWith('..')) {
          onChange(normalized);
        } else {
          onChange(parsed);
        }
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
        value={typeof value === 'number' 
          ? (isNumeric && value.toString().includes('.') && !value.toString().endsWith('.') 
              ? value.toString() 
              : String(value))
          : (value ?? '')}
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
