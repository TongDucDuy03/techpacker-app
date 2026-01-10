import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Search, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface Language {
  code: string;
  name: string;
  nativeName: string;
}

// Only expose languages that have translation resources configured.
const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
];

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: string;
  onLanguageChange: (langCode: string) => void;
}

const LanguageModal: React.FC<LanguageModalProps> = ({
  isOpen,
  onClose,
  currentLanguage,
  onLanguageChange,
}) => {
  const { t } = useTranslation('common');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) {
      return LANGUAGES;
    }
    const query = searchQuery.toLowerCase();
    return LANGUAGES.filter(
      (lang) =>
        lang.name.toLowerCase().includes(query) ||
        lang.nativeName.toLowerCase().includes(query) ||
        lang.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleLanguageSelect = (langCode: string) => {
    onLanguageChange(langCode);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-modal-title"
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2
            id="language-modal-title"
            className="text-lg font-semibold text-gray-900"
          >
            {t('common.language')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-500 transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
        </div>

        {/* Language List */}
        <div className="max-h-96 overflow-y-auto">
          {filteredLanguages.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              {t('common.search')} - No languages found
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filteredLanguages.map((lang) => {
                const isSelected = lang.code === currentLanguage;
                return (
                  <li key={lang.code}>
                    <button
                      onClick={() => handleLanguageSelect(lang.code)}
                      className={cn(
                        'w-full px-6 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between',
                        isSelected && 'bg-blue-50'
                      )}
                      aria-selected={isSelected}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          {lang.nativeName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {lang.name}
                        </span>
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-blue-600" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default LanguageModal;

