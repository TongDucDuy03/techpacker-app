import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (language: string) => void;
  availableLanguages: Array<{
    code: string;
    name: string;
    flag: string;
  }>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { currentLanguage, changeLanguage } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);

  const availableLanguages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' }
  ];

  useEffect(() => {
    // Set initial language from localStorage or browser preference
    const savedLanguage = localStorage.getItem('techpacker-language');
    if (savedLanguage && availableLanguages.some(lang => lang.code === savedLanguage)) {
      changeLanguage(savedLanguage);
    }
    setIsLoading(false);
  }, [changeLanguage]);

  const handleChangeLanguage = (language: string) => {
    changeLanguage(language);
    localStorage.setItem('techpacker-language', language);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        changeLanguage: handleChangeLanguage,
        availableLanguages
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageProvider;
