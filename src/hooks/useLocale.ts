import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { changeLanguage, getCurrentLanguage } from '../i18n';

/**
 * Custom hook for locale management
 * Provides language state and change handler with persistent storage
 */
export const useLocale = () => {
  const { i18n } = useTranslation();

  const currentLocale = getCurrentLanguage();
  
  const setLocale = useCallback((locale: string) => {
    changeLanguage(locale);
  }, []);

  return {
    locale: currentLocale,
    setLocale,
    isEnglish: currentLocale === 'en' || currentLocale.startsWith('en'),
    isVietnamese: currentLocale === 'vi' || currentLocale.startsWith('vi'),
  };
};







