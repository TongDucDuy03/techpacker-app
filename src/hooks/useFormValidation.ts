import { useState, useCallback, useEffect } from 'react';
import { ValidationRule, ValidationError, validateField, validateFields } from '../utils/validation';

export interface FormValidationConfig {
  [fieldName: string]: ValidationRule;
}

export interface FormValidationState {
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
}

export interface FormValidationActions {
  validateField: (fieldName: string, value: any) => void;
  validateForm: (data: Record<string, any>) => boolean;
  setFieldTouched: (fieldName: string, touched?: boolean) => void;
  setFieldError: (fieldName: string, error: string | null) => void;
  clearErrors: () => void;
  clearFieldError: (fieldName: string) => void;
  setSubmitting: (submitting: boolean) => void;
  reset: () => void;
}

export interface UseFormValidationReturn extends FormValidationState, FormValidationActions {
  getFieldProps: (fieldName: string) => {
    error: string | undefined;
    helperText: string | undefined;
    onBlur: () => void;
    onChange: (value: any) => void;
  };
}

export function useFormValidation(
  validationConfig: FormValidationConfig,
  options: {
    validateOnChange?: boolean;
    validateOnBlur?: boolean;
    showErrorsOnlyAfterTouch?: boolean;
  } = {}
): UseFormValidationReturn {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    showErrorsOnlyAfterTouch = true,
  } = options;

  const [state, setState] = useState<FormValidationState>({
    errors: {},
    touched: {},
    isValid: true,
    isSubmitting: false,
  });

  // Validate a single field
  const validateSingleField = useCallback((fieldName: string, value: any): string | null => {
    const rules = validationConfig[fieldName];
    if (!rules) return null;
    
    return validateField(value, rules, fieldName);
  }, [validationConfig]);

  // Validate field and update state
  const handleValidateField = useCallback((fieldName: string, value: any) => {
    const error = validateSingleField(fieldName, value);
    
    setState(prev => ({
      ...prev,
      errors: {
        ...prev.errors,
        [fieldName]: error || '',
      },
    }));
  }, [validateSingleField]);

  // Validate entire form
  const handleValidateForm = useCallback((data: Record<string, any>): boolean => {
    const result = validateFields(data, validationConfig);
    
    const newErrors: Record<string, string> = {};
    result.errors.forEach(error => {
      newErrors[error.field] = error.message;
    });

    setState(prev => ({
      ...prev,
      errors: newErrors,
      isValid: result.isValid,
    }));

    return result.isValid;
  }, [validationConfig]);

  // Set field as touched
  const setFieldTouched = useCallback((fieldName: string, touched: boolean = true) => {
    setState(prev => ({
      ...prev,
      touched: {
        ...prev.touched,
        [fieldName]: touched,
      },
    }));
  }, []);

  // Set field error manually
  const setFieldError = useCallback((fieldName: string, error: string | null) => {
    setState(prev => ({
      ...prev,
      errors: {
        ...prev.errors,
        [fieldName]: error || '',
      },
    }));
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setState(prev => ({
      ...prev,
      errors: {},
      isValid: true,
    }));
  }, []);

  // Clear specific field error
  const clearFieldError = useCallback((fieldName: string) => {
    setState(prev => {
      const newErrors = { ...prev.errors };
      delete newErrors[fieldName];
      
      return {
        ...prev,
        errors: newErrors,
      };
    });
  }, []);

  // Set submitting state
  const setSubmitting = useCallback((submitting: boolean) => {
    setState(prev => ({
      ...prev,
      isSubmitting: submitting,
    }));
  }, []);

  // Reset form validation state
  const reset = useCallback(() => {
    setState({
      errors: {},
      touched: {},
      isValid: true,
      isSubmitting: false,
    });
  }, []);

  // Get field props for easy integration with form components
  const getFieldProps = useCallback((fieldName: string) => {
    const hasError = state.errors[fieldName] && state.errors[fieldName].length > 0;
    const shouldShowError = showErrorsOnlyAfterTouch ? state.touched[fieldName] && hasError : hasError;

    return {
      error: shouldShowError ? state.errors[fieldName] : undefined,
      helperText: shouldShowError ? state.errors[fieldName] : undefined,
      onBlur: () => {
        setFieldTouched(fieldName, true);
      },
      onChange: (value: any) => {
        if (validateOnChange) {
          handleValidateField(fieldName, value);
        }
      },
    };
  }, [state.errors, state.touched, showErrorsOnlyAfterTouch, validateOnChange, handleValidateField, setFieldTouched]);

  // Update overall form validity when errors change
  useEffect(() => {
    const hasErrors = Object.values(state.errors).some(error => error && error.length > 0);
    setState(prev => ({
      ...prev,
      isValid: !hasErrors,
    }));
  }, [state.errors]);

  return {
    ...state,
    validateField: handleValidateField,
    validateForm: handleValidateForm,
    setFieldTouched,
    setFieldError,
    clearErrors,
    clearFieldError,
    setSubmitting,
    reset,
    getFieldProps,
  };
}

// Hook for array field validation (useful for BOM entries, measurements, etc.)
export function useArrayFieldValidation<T>(
  itemValidationConfig: FormValidationConfig,
  initialItems: T[] = []
) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [itemErrors, setItemErrors] = useState<Record<number, Record<string, string>>>({});

  const validateItem = useCallback((index: number, item: T): boolean => {
    const result = validateFields(item as Record<string, any>, itemValidationConfig);
    
    const newErrors: Record<string, string> = {};
    result.errors.forEach(error => {
      newErrors[error.field] = error.message;
    });

    setItemErrors(prev => ({
      ...prev,
      [index]: newErrors,
    }));

    return result.isValid;
  }, [itemValidationConfig]);

  const validateAllItems = useCallback((): boolean => {
    let allValid = true;
    const newItemErrors: Record<number, Record<string, string>> = {};

    items.forEach((item, index) => {
      const result = validateFields(item as Record<string, any>, itemValidationConfig);
      
      const errors: Record<string, string> = {};
      result.errors.forEach(error => {
        errors[error.field] = error.message;
      });

      newItemErrors[index] = errors;
      
      if (!result.isValid) {
        allValid = false;
      }
    });

    setItemErrors(newItemErrors);
    return allValid;
  }, [items, itemValidationConfig]);

  const getItemFieldError = useCallback((itemIndex: number, fieldName: string): string | undefined => {
    return itemErrors[itemIndex]?.[fieldName];
  }, [itemErrors]);

  const clearItemErrors = useCallback((itemIndex?: number) => {
    if (itemIndex !== undefined) {
      setItemErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[itemIndex];
        return newErrors;
      });
    } else {
      setItemErrors({});
    }
  }, []);

  return {
    items,
    setItems,
    itemErrors,
    validateItem,
    validateAllItems,
    getItemFieldError,
    clearItemErrors,
  };
}
