import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useLocale } from '../hooks/useLocale';
import LanguageModal from './LanguageModal';

const LanguageButton: React.FC = () => {
  const { t } = useTranslation('common');
  const { locale, setLocale } = useLocale();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Get language display name
  const getLanguageDisplay = (code: string): string => {
    const langMap: Record<string, string> = {
      en: 'En',
      vi: 'Vi',
      zh: '中文',
      ja: '日本語',
      ko: '한국어',
      fr: 'Fr',
      de: 'De',
      es: 'Es',
      pt: 'Pt',
      ru: 'Рус',
      ar: 'العربية',
      th: 'ไทย',
      id: 'ID',
    };
    return langMap[code] || code.toUpperCase();
  };

  const handleLanguageChange = (langCode: string) => {
    setLocale(langCode);
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        aria-label={t('language')}
      >
        <Globe className="w-4 h-4" />
        <span>{getLanguageDisplay(locale)}</span>
      </button>

      <LanguageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentLanguage={locale}
        onLanguageChange={handleLanguageChange}
      />
    </>
  );
};

export default LanguageButton;

