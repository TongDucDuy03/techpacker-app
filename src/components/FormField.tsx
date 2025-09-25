import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import TranslatedText from './TranslatedText';

interface FormFieldProps {
  label: string;
  translationKey?: string;
  required?: boolean;
  error?: string;
  errorTranslationKey?: string;
  helpText?: string;
  helpTextTranslationKey?: string;
  children: React.ReactNode;
  className?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  translationKey,
  required = false,
  error,
  errorTranslationKey,
  helpText,
  helpTextTranslationKey,
  children,
  className = ''
}) => {
  const { t } = useTranslation();

  const displayLabel = translationKey ? t(translationKey) : label;
  const displayError = errorTranslationKey ? t(errorTranslationKey) : error;
  const displayHelpText = helpTextTranslationKey ? t(helpTextTranslationKey) : helpText;

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {displayLabel}
        {required && (
          <span className="text-red-500 ml-1">*</span>
        )}
      </label>
      
      {children}
      
      {displayHelpText && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {displayHelpText}
        </p>
      )}
      
      {displayError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {displayError}
        </p>
      )}
    </div>
  );
};

export default FormField;
