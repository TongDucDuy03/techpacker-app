// Validation utilities for TechPack forms

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  email?: boolean;
  url?: boolean;
  custom?: (value: any) => string | null;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Common validation patterns
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/.+/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alphanumericWithSpaces: /^[a-zA-Z0-9\s]+$/,
  numbersOnly: /^\d+$/,
  decimal: /^\d+(\.\d+)?$/,
  colorCode: /^#[0-9A-Fa-f]{6}$/,
  pantoneCode: /^PANTONE\s+\d+(-\d+)?\s+[A-Z]+$/i,
  materialCode: /^[A-Z0-9-]+$/,
};

// Validation messages
export const VALIDATION_MESSAGES = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  url: 'Please enter a valid URL',
  minLength: (min: number) => `Must be at least ${min} characters long`,
  maxLength: (max: number) => `Must be no more than ${max} characters long`,
  min: (min: number) => `Must be at least ${min}`,
  max: (max: number) => `Must be no more than ${max}`,
  pattern: 'Invalid format',
  colorCode: 'Please enter a valid hex color code (e.g., #FF0000)',
  pantoneCode: 'Please enter a valid Pantone code (e.g., PANTONE 18-1664 TPX)',
  materialCode: 'Please enter a valid material code (alphanumeric with hyphens)',
  positiveNumber: 'Must be a positive number',
  decimal: 'Must be a valid decimal number',
};

// Single field validation function
export function validateField(value: any, rules: ValidationRule, fieldName: string): string | null {
  // Required validation
  if (rules.required && (value === null || value === undefined || value === '')) {
    return VALIDATION_MESSAGES.required;
  }

  // Skip other validations if field is empty and not required
  if (!rules.required && (value === null || value === undefined || value === '')) {
    return null;
  }

  const stringValue = String(value);

  // Length validations
  if (rules.minLength && stringValue.length < rules.minLength) {
    return VALIDATION_MESSAGES.minLength(rules.minLength);
  }

  if (rules.maxLength && stringValue.length > rules.maxLength) {
    return VALIDATION_MESSAGES.maxLength(rules.maxLength);
  }

  // Numeric validations
  if (rules.min !== undefined || rules.max !== undefined) {
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return 'Must be a valid number';
    }
    if (rules.min !== undefined && numValue < rules.min) {
      return VALIDATION_MESSAGES.min(rules.min);
    }
    if (rules.max !== undefined && numValue > rules.max) {
      return VALIDATION_MESSAGES.max(rules.max);
    }
  }

  // Email validation
  if (rules.email && !VALIDATION_PATTERNS.email.test(stringValue)) {
    return VALIDATION_MESSAGES.email;
  }

  // URL validation
  if (rules.url && !VALIDATION_PATTERNS.url.test(stringValue)) {
    return VALIDATION_MESSAGES.url;
  }

  // Pattern validation
  if (rules.pattern && !rules.pattern.test(stringValue)) {
    return VALIDATION_MESSAGES.pattern;
  }

  // Custom validation
  if (rules.custom) {
    return rules.custom(value);
  }

  return null;
}

// Validate multiple fields
export function validateFields(data: Record<string, any>, schema: Record<string, ValidationRule>): ValidationResult {
  const errors: ValidationError[] = [];

  Object.entries(schema).forEach(([fieldName, rules]) => {
    const value = data[fieldName];
    const error = validateField(value, rules, fieldName);
    
    if (error) {
      errors.push({ field: fieldName, message: error });
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Specific validation functions for TechPack business rules
export const techPackValidators = {
  productName: (value: string): string | null => {
    if (!value || value.trim().length === 0) return VALIDATION_MESSAGES.required;
    if (value.length < 2) return VALIDATION_MESSAGES.minLength(2);
    if (value.length > 100) return VALIDATION_MESSAGES.maxLength(100);
    return null;
  },

  materialCode: (value: string): string | null => {
    if (!value || value.trim().length === 0) return VALIDATION_MESSAGES.required;
    if (!VALIDATION_PATTERNS.materialCode.test(value)) {
      return VALIDATION_MESSAGES.materialCode;
    }
    return null;
  },

  quantity: (value: number): string | null => {
    if (value === null || value === undefined) return VALIDATION_MESSAGES.required;
    if (isNaN(value) || value <= 0) return VALIDATION_MESSAGES.positiveNumber;
    if (value > 10000) return 'Quantity cannot exceed 10,000';
    return null;
  },

  colorCode: (value: string): string | null => {
    if (!value || value.trim().length === 0) return null; // Optional field
    if (!VALIDATION_PATTERNS.colorCode.test(value)) {
      return VALIDATION_MESSAGES.colorCode;
    }
    return null;
  },

  pantoneCode: (value: string): string | null => {
    if (!value || value.trim().length === 0) return null; // Optional field
    if (!VALIDATION_PATTERNS.pantoneCode.test(value)) {
      return VALIDATION_MESSAGES.pantoneCode;
    }
    return null;
  },

  measurement: (value: number): string | null => {
    if (value === null || value === undefined) return VALIDATION_MESSAGES.required;
    if (isNaN(value) || value < 0) return 'Measurement must be a positive number';
    if (value > 1000) return 'Measurement cannot exceed 1000cm';
    return null;
  },

  tolerance: (value: number): string | null => {
    if (value === null || value === undefined) return null; // Optional field
    if (isNaN(value) || value < 0) return 'Tolerance must be a positive number';
    if (value > 50) return 'Tolerance cannot exceed 50cm';
    return null;
  }
};
