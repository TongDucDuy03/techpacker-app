import React, { useState, useEffect } from 'react';
import { CareInstruction, Language, CareSymbol } from '../types';
import { Languages, Plus, Trash2, Save, Eye, EyeOff, Copy, Globe } from 'lucide-react';

interface MultiLanguageEditorProps {
  instructions: CareInstruction[];
  onInstructionsChange: (instructions: CareInstruction[]) => void;
  selectedSymbols: CareSymbol[];
  className?: string;
}

const languageNames: Record<Language, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic'
};

const languageFlags: Record<Language, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹',
  pt: '🇵🇹',
  zh: '🇨🇳',
  ja: '🇯🇵',
  ko: '🇰🇷',
  ar: '🇸🇦'
};

export const MultiLanguageEditor: React.FC<MultiLanguageEditorProps> = ({
  instructions,
  onInstructionsChange,
  selectedSymbols,
  className = ''
}) => {
  const [activeLanguage, setActiveLanguage] = useState<Language>('en');
  const [showAllLanguages, setShowAllLanguages] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState<string | null>(null);
  const [newInstruction, setNewInstruction] = useState('');

  // Initialize instructions for all languages if not present
  useEffect(() => {
    const allLanguages: Language[] = ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko', 'ar'];
    const existingLanguages = instructions.map(inst => inst.language);
    const missingLanguages = allLanguages.filter(lang => !existingLanguages.includes(lang));

    if (missingLanguages.length > 0) {
      const newInstructions = missingLanguages.map(lang => ({
        id: `inst-${lang}-${Date.now()}`,
        language: lang,
        symbols: selectedSymbols,
        textInstructions: [],
        specialInstructions: [],
        warnings: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      onInstructionsChange([...instructions, ...newInstructions]);
    }
  }, [instructions, selectedSymbols, onInstructionsChange]);

  const getInstructionForLanguage = (language: Language): CareInstruction => {
    return instructions.find(inst => inst.language === language) || {
      id: `inst-${language}-${Date.now()}`,
      language,
      symbols: selectedSymbols,
      textInstructions: [],
      specialInstructions: [],
      warnings: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  };

  const updateInstruction = (language: Language, updates: Partial<CareInstruction>) => {
    const existingIndex = instructions.findIndex(inst => inst.language === language);
    const existingInstruction = getInstructionForLanguage(language);
    
    const updatedInstruction = {
      ...existingInstruction,
      ...updates,
      updatedAt: new Date()
    };

    if (existingIndex >= 0) {
      const newInstructions = [...instructions];
      newInstructions[existingIndex] = updatedInstruction;
      onInstructionsChange(newInstructions);
    } else {
      onInstructionsChange([...instructions, updatedInstruction]);
    }
  };

  const addTextInstruction = (language: Language, instruction: string) => {
    if (!instruction.trim()) return;

    const currentInstruction = getInstructionForLanguage(language);
    const newInstructions = [...currentInstruction.textInstructions, instruction.trim()];
    
    updateInstruction(language, { textInstructions: newInstructions });
    setNewInstruction('');
  };

  const removeTextInstruction = (language: Language, index: number) => {
    const currentInstruction = getInstructionForLanguage(language);
    const newInstructions = currentInstruction.textInstructions.filter((_, i) => i !== index);
    
    updateInstruction(language, { textInstructions: newInstructions });
  };

  const addSpecialInstruction = (language: Language, instruction: string) => {
    if (!instruction.trim()) return;

    const currentInstruction = getInstructionForLanguage(language);
    const newInstructions = [...(currentInstruction.specialInstructions || []), instruction.trim()];
    
    updateInstruction(language, { specialInstructions: newInstructions });
  };

  const removeSpecialInstruction = (language: Language, index: number) => {
    const currentInstruction = getInstructionForLanguage(language);
    const newInstructions = (currentInstruction.specialInstructions || []).filter((_, i) => i !== index);
    
    updateInstruction(language, { specialInstructions: newInstructions });
  };

  const addWarning = (language: Language, warning: string) => {
    if (!warning.trim()) return;

    const currentInstruction = getInstructionForLanguage(language);
    const newWarnings = [...(currentInstruction.warnings || []), warning.trim()];
    
    updateInstruction(language, { warnings: newWarnings });
  };

  const removeWarning = (language: Language, index: number) => {
    const currentInstruction = getInstructionForLanguage(language);
    const newWarnings = (currentInstruction.warnings || []).filter((_, i) => i !== index);
    
    updateInstruction(language, { warnings: newWarnings });
  };

  const copyFromLanguage = (fromLanguage: Language, toLanguage: Language) => {
    const sourceInstruction = getInstructionForLanguage(fromLanguage);
    updateInstruction(toLanguage, {
      textInstructions: [...sourceInstruction.textInstructions],
      specialInstructions: [...(sourceInstruction.specialInstructions || [])],
      warnings: [...(sourceInstruction.warnings || [])]
    });
  };

  const getCompletionStatus = (language: Language): 'complete' | 'partial' | 'empty' => {
    const instruction = getInstructionForLanguage(language);
    const hasTextInstructions = instruction.textInstructions.length > 0;
    const hasSpecialInstructions = (instruction.specialInstructions?.length || 0) > 0;
    const hasWarnings = (instruction.warnings?.length || 0) > 0;

    if (hasTextInstructions && hasSpecialInstructions) return 'complete';
    if (hasTextInstructions || hasSpecialInstructions || hasWarnings) return 'partial';
    return 'empty';
  };

  const getStatusColor = (status: 'complete' | 'partial' | 'empty') => {
    switch (status) {
      case 'complete': return 'text-green-600 bg-green-100';
      case 'partial': return 'text-yellow-600 bg-yellow-100';
      case 'empty': return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: 'complete' | 'partial' | 'empty') => {
    switch (status) {
      case 'complete': return '✓';
      case 'partial': return '◐';
      case 'empty': return '○';
    }
  };

  const currentInstruction = getInstructionForLanguage(activeLanguage);

  return (
    <div className={`multi-language-editor ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Multi-Language Care Instructions</h3>
        <p className="text-sm text-gray-600">
          Create care instructions in multiple languages for global compliance.
        </p>
      </div>

      {/* Language Tabs */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Languages</span>
          </div>
          <button
            onClick={() => setShowAllLanguages(!showAllLanguages)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            {showAllLanguages ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showAllLanguages ? 'Hide All' : 'Show All'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {(showAllLanguages ? Object.keys(languageNames) : ['en', 'es', 'fr', 'de', 'it']).map((lang) => {
            const language = lang as Language;
            const status = getCompletionStatus(language);
            const isActive = activeLanguage === language;

            return (
              <button
                key={language}
                onClick={() => setActiveLanguage(language)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                  isActive
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg">{languageFlags[language]}</span>
                <span className="text-sm font-medium">{languageNames[language]}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(status)}`}>
                  {getStatusIcon(status)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Language Editor */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{languageFlags[activeLanguage]}</span>
            <h4 className="text-lg font-semibold text-gray-900">
              {languageNames[activeLanguage]} Instructions
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(getCompletionStatus(activeLanguage))}`}>
              {getStatusIcon(getCompletionStatus(activeLanguage))}
            </span>
            <select
              onChange={(e) => {
                const fromLang = e.target.value as Language;
                if (fromLang && fromLang !== activeLanguage) {
                  copyFromLanguage(fromLang, activeLanguage);
                }
              }}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="">Copy from...</option>
              {Object.keys(languageNames).map((lang) => {
                const language = lang as Language;
                if (language !== activeLanguage) {
                  return (
                    <option key={language} value={language}>
                      {languageFlags[language]} {languageNames[language]}
                    </option>
                  );
                }
                return null;
              })}
            </select>
          </div>
        </div>

        {/* Text Instructions */}
        <div className="mb-6">
          <h5 className="text-sm font-medium text-gray-700 mb-3">Text Instructions</h5>
          <div className="space-y-2 mb-3">
            {currentInstruction.textInstructions.map((instruction, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-600 flex-1">{instruction}</span>
                <button
                  onClick={() => removeTextInstruction(activeLanguage, index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add text instruction..."
              value={newInstruction}
              onChange={(e) => setNewInstruction(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addTextInstruction(activeLanguage, newInstruction);
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => addTextInstruction(activeLanguage, newInstruction)}
              className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Special Instructions */}
        <div className="mb-6">
          <h5 className="text-sm font-medium text-gray-700 mb-3">Special Instructions</h5>
          <div className="space-y-2 mb-3">
            {(currentInstruction.specialInstructions || []).map((instruction, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
                <span className="text-sm text-gray-600 flex-1">{instruction}</span>
                <button
                  onClick={() => removeSpecialInstruction(activeLanguage, index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add special instruction..."
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addSpecialInstruction(activeLanguage, e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={(e) => {
                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                addSpecialInstruction(activeLanguage, input.value);
                input.value = '';
              }}
              className="px-3 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Warnings */}
        <div className="mb-6">
          <h5 className="text-sm font-medium text-gray-700 mb-3">Warnings</h5>
          <div className="space-y-2 mb-3">
            {(currentInstruction.warnings || []).map((warning, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-red-50 rounded">
                <span className="text-sm text-gray-600 flex-1">{warning}</span>
                <button
                  onClick={() => removeWarning(activeLanguage, index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add warning..."
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addWarning(activeLanguage, e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={(e) => {
                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                addWarning(activeLanguage, input.value);
                input.value = '';
              }}
              className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Selected Symbols Display */}
        <div>
          <h5 className="text-sm font-medium text-gray-700 mb-3">Selected Care Symbols</h5>
          <div className="flex flex-wrap gap-2">
            {selectedSymbols.map(symbol => (
              <div
                key={symbol.id}
                className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded"
              >
                <div
                  className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded bg-white"
                  dangerouslySetInnerHTML={{ __html: symbol.svg }}
                />
                <span className="text-xs text-gray-600">{symbol.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h5 className="text-sm font-medium text-gray-700 mb-2">Completion Summary</h5>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {Object.keys(languageNames).map((lang) => {
            const language = lang as Language;
            const status = getCompletionStatus(language);
            return (
              <div key={language} className="flex items-center gap-2 text-xs">
                <span>{languageFlags[language]}</span>
                <span className="text-gray-600">{languageNames[language]}</span>
                <span className={`px-1 py-0.5 rounded ${getStatusColor(status)}`}>
                  {getStatusIcon(status)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
