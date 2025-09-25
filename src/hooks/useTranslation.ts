import { useTranslation as useI18nTranslation } from 'react-i18next';

export const useTranslation = (namespace?: string) => {
  const { t, i18n } = useI18nTranslation(namespace);
  
  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
  };
  
  const currentLanguage = i18n.language;
  
  const isRTL = false; // Vietnamese and English are LTR languages
  
  return {
    t,
    changeLanguage,
    currentLanguage,
    isRTL,
    i18n
  };
};

export default useTranslation;
