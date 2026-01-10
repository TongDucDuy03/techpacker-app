import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import namespaces
import commonEn from './locales/en/common.json';
import navEn from './locales/en/nav.json';
import techpackEn from './locales/en/techpack.json';
import articleInfoEn from './locales/en/articleInfo.json';
import bomEn from './locales/en/bom.json';
import measurementEn from './locales/en/measurement.json';
import authEn from './locales/en/auth.json';
import validationEn from './locales/en/validation.json';
import adminEn from './locales/en/admin.json';
import headerEn from './locales/en/header.json';

import commonVi from './locales/vi/common.json';
import navVi from './locales/vi/nav.json';
import techpackVi from './locales/vi/techpack.json';
import articleInfoVi from './locales/vi/articleInfo.json';
import bomVi from './locales/vi/bom.json';
import measurementVi from './locales/vi/measurement.json';
import authVi from './locales/vi/auth.json';
import validationVi from './locales/vi/validation.json';
import adminVi from './locales/vi/admin.json';
import headerVi from './locales/vi/header.json';

// Storage key for language preference
const STORAGE_KEY = 'tp_locale';

// Initialize i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: commonEn,
        nav: navEn,
        techpack: techpackEn,
        articleInfo: articleInfoEn,
        bom: bomEn,
        measurement: measurementEn,
        auth: authEn,
        validation: validationEn,
        admin: adminEn,
        header: headerEn,
      },
      vi: {
        common: commonVi,
        nav: navVi,
        techpack: techpackVi,
        articleInfo: articleInfoVi,
        bom: bomVi,
        measurement: measurementVi,
        auth: authVi,
        validation: validationVi,
        admin: adminVi,
        header: headerVi,
      },
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'nav', 'techpack', 'articleInfo', 'bom', 'measurement', 'auth', 'validation', 'admin', 'header'],
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      // Order: localStorage -> navigator -> fallback
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: STORAGE_KEY,
      checkWhitelist: true,
    },
    react: {
      useSuspense: false,
    },
    // Support language codes with region
    supportedLngs: ['en', 'vi'],
    nonExplicitSupportedLngs: true,
  });

// Persist language changes
i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    document.documentElement.lang = lng;
    localStorage.setItem(STORAGE_KEY, lng);
    document.cookie = `tp_locale=${lng}; path=/; max-age=31536000`;
  }
});

// Set initial lang attribute
if (typeof document !== 'undefined') {
  const currentLang = i18n.language || 'en';
  document.documentElement.lang = currentLang;
}

// Helper to change language
export const changeLanguage = (lng: string) => {
  i18n.changeLanguage(lng);
};

// Helper to get current language
export const getCurrentLanguage = () => {
  return i18n.language || 'en';
};

export default i18n;
