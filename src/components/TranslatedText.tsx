import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

interface TranslatedTextProps {
  translationKey: string;
  values?: Record<string, any>;
  fallback?: string;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}

const TranslatedText: React.FC<TranslatedTextProps> = ({
  translationKey,
  values,
  fallback,
  className = '',
  as: Component = 'span',
  children
}) => {
  const { t } = useTranslation();

  const translatedText = t(translationKey, values);

  // If translation is the same as the key, it means translation is missing
  const displayText = translatedText === translationKey ? fallback || translationKey : translatedText;

  return (
    <Component className={className}>
      {children || displayText}
    </Component>
  );
};

export default TranslatedText;
