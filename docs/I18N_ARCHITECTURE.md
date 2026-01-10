# i18n Architecture - TechPacker Application

## 🎯 Goals

1. **100% UI Text Internationalized** - No hardcoded strings
2. **Global Language Persistence** - Works across all routes
3. **Module-based Namespaces** - Each feature has its own namespace
4. **Enum Keys as Stable Identifiers** - Business values stored as keys, not translated strings
5. **Shared Translation Source** - UI and PDF export use same translations
6. **Easy Language Addition** - Add new language = add translation files only

---

## 📁 Folder Structure

```
src/
├── i18n/
│   ├── index.ts                    # i18next configuration
│   ├── constants.ts                # Enum mappings & constants
│   ├── hooks/
│   │   ├── useTranslation.ts       # Enhanced translation hook
│   │   └── useEnumTranslation.ts   # Enum translation helper
│   └── locales/
│       ├── en/
│       │   ├── common.json         # Common UI elements
│       │   ├── nav.json            # Navigation
│       │   ├── header.json         # Header component
│       │   ├── techpack.json       # TechPack module
│       │   ├── articleInfo.json    # Article Info tab
│       │   ├── bom.json            # BOM tab
│       │   ├── measurement.json    # Measurement tab
│       │   ├── colorway.json       # Colorway tab
│       │   ├── construction.json   # Construction tab
│       │   ├── revision.json       # Revision history
│       │   ├── pdf.json            # PDF export labels
│       │   ├── auth.json           # Authentication
│       │   ├── validation.json     # Validation messages
│       │   └── admin.json          # Admin panel
│       └── vi/
│           └── [same structure]
│
├── constants/
│   └── enums.ts                    # Business enum definitions
│
└── utils/
    └── enumTranslations.ts         # Enum to translation key mapping
```

---

## 🏗️ Architecture Principles

### 1. **Namespace Organization**

Each module/feature has its own namespace:

```typescript
// ✅ Good - Clear namespace
t('techpack:articleInfo.fields.articleCode')
t('bom:table.headers.specifications')
t('measurement:tolerance.plus')

// ❌ Bad - Flat structure
t('articleCode')
t('specifications')
```

### 2. **Enum Handling**

**Business values are stored as enum keys, NOT translated strings:**

```typescript
// ✅ Good - Store enum key
{
  status: 'draft',           // Key, not "Draft" or "Nháp"
  fitType: 'regular',        // Key, not "Regular" or "Thường"
  lifecycleStage: 'concept'  // Key, not "Concept" or "Khái niệm"
}

// ❌ Bad - Storing translated strings
{
  status: 'Draft',           // Wrong! Language-dependent
  fitType: 'Regular',        // Wrong! Can't switch languages
}
```

**Translation happens at display time:**

```typescript
// ✅ Good - Translate enum at display
const statusLabel = t(`techpack:enums.status.${status}`)
// status = 'draft' → "Draft" (EN) or "Nháp" (VI)

// ❌ Bad - Storing translated value
const statusLabel = status  // Wrong if status is already translated
```

### 3. **Shared Components Pattern**

Shared components (Input, Select, etc.) should accept translation keys:

```typescript
// ✅ Good - Component accepts translation key
<Input 
  labelKey="techpack:articleInfo.fields.articleCode"
  placeholderKey="techpack:articleInfo.placeholders.articleCode"
/>

// ❌ Bad - Component accepts hardcoded text
<Input 
  label="Article Code"  // Hardcoded!
  placeholder="Enter article code"  // Hardcoded!
/>
```

### 4. **PDF Export Integration**

PDF templates use the same translation system:

```typescript
// Server-side: Load translations and pass to template
const translations = await loadTranslations(locale);
await pdfService.generatePDF(techPack, { translations, locale });
```

---

## 📝 Example Refactor

### Before (Hardcoded Strings)

```typescript
// ArticleInfoTab.tsx
const ArticleInfoTab = () => {
  return (
    <div>
      <h2>Article Information</h2>
      
      <Input 
        label="Article Code"
        placeholder="Enter article code"
        value={articleCode}
      />
      
      <Input 
        label="Article Name"
        placeholder="Enter product name"
        value={articleName}
      />
      
      <Select
        label="Status"
        placeholder="Select status"
        options={[
          { value: 'draft', label: 'Draft' },
          { value: 'approved', label: 'Approved' },
          { value: 'in_review', label: 'In Review' }
        ]}
      />
      
      <Select
        label="Fit Type"
        options={[
          { value: 'regular', label: 'Regular' },
          { value: 'slim', label: 'Slim' },
          { value: 'loose', label: 'Loose' }
        ]}
      />
    </div>
  );
};
```

### After (Fully Internationalized)

```typescript
// ArticleInfoTab.tsx
import { useTranslation } from 'react-i18next';
import { useEnumTranslation } from '../../../i18n/hooks/useEnumTranslation';
import { FIT_TYPES, STATUSES } from '../../../constants/enums';

const ArticleInfoTab = () => {
  const { t } = useTranslation(['techpack', 'articleInfo', 'common']);
  const { translateEnum } = useEnumTranslation();
  
  // Get enum options with translations
  const statusOptions = STATUSES.map(status => ({
    value: status,  // Store key, not translated string
    label: translateEnum('techpack:enums.status', status)
  }));
  
  const fitTypeOptions = FIT_TYPES.map(fitType => ({
    value: fitType,  // Store key, not translated string
    label: translateEnum('techpack:enums.fitType', fitType)
  }));
  
  return (
    <div>
      <h2>{t('articleInfo:title')}</h2>
      
      <Input 
        labelKey="articleInfo:fields.articleCode"
        placeholderKey="articleInfo:placeholders.articleCode"
        value={articleCode}
      />
      
      <Input 
        labelKey="articleInfo:fields.articleName"
        placeholderKey="articleInfo:placeholders.articleName"
        value={articleName}
      />
      
      <Select
        labelKey="articleInfo:fields.status"
        placeholderKey="common:selectOption"
        options={statusOptions}
      />
      
      <Select
        labelKey="articleInfo:fields.fitType"
        options={fitTypeOptions}
      />
    </div>
  );
};
```

### Translation Files

```json
// locales/en/articleInfo.json
{
  "title": "Article Information",
  "fields": {
    "articleCode": "Article Code",
    "articleName": "Article Name",
    "status": "Status",
    "fitType": "Fit Type"
  },
  "placeholders": {
    "articleCode": "Enter article code",
    "articleName": "Enter product name"
  }
}

// locales/en/techpack.json
{
  "enums": {
    "status": {
      "draft": "Draft",
      "approved": "Approved",
      "in_review": "In Review"
    },
    "fitType": {
      "regular": "Regular",
      "slim": "Slim",
      "loose": "Loose"
    }
  }
}

// locales/vi/articleInfo.json
{
  "title": "Thông tin sản phẩm",
  "fields": {
    "articleCode": "Mã sản phẩm",
    "articleName": "Tên sản phẩm",
    "status": "Trạng thái",
    "fitType": "Kiểu vừa vặn"
  },
  "placeholders": {
    "articleCode": "Nhập mã sản phẩm",
    "articleName": "Nhập tên sản phẩm"
  }
}

// locales/vi/techpack.json
{
  "enums": {
    "status": {
      "draft": "Nháp",
      "approved": "Đã duyệt",
      "in_review": "Đang duyệt"
    },
    "fitType": {
      "regular": "Thường",
      "slim": "Slim",
      "loose": "Rộng"
    }
  }
}
```

---

## 🔧 Implementation Files

### 1. Enhanced i18n Configuration

```typescript
// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend'; // For lazy loading

// Import all namespaces
import commonEn from './locales/en/common.json';
import navEn from './locales/en/nav.json';
import headerEn from './locales/en/header.json';
import techpackEn from './locales/en/techpack.json';
import articleInfoEn from './locales/en/articleInfo.json';
import bomEn from './locales/en/bom.json';
import measurementEn from './locales/en/measurement.json';
import pdfEn from './locales/en/pdf.json';
// ... import all namespaces

// Same for Vietnamese
import commonVi from './locales/vi/common.json';
// ... import all vi namespaces

const STORAGE_KEY = 'tp_locale';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: commonEn,
        nav: navEn,
        header: headerEn,
        techpack: techpackEn,
        articleInfo: articleInfoEn,
        bom: bomEn,
        measurement: measurementEn,
        pdf: pdfEn,
        // ... all namespaces
      },
      vi: {
        common: commonVi,
        nav: navVi,
        header: headerVi,
        techpack: techpackVi,
        articleInfo: articleInfoVi,
        bom: bomVi,
        measurement: measurementVi,
        pdf: pdfVi,
        // ... all namespaces
      },
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: [
      'common', 'nav', 'header', 'techpack', 
      'articleInfo', 'bom', 'measurement', 
      'colorway', 'construction', 'revision',
      'pdf', 'auth', 'validation', 'admin'
    ],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: STORAGE_KEY,
    },
    react: {
      useSuspense: false,
    },
    supportedLngs: ['en', 'vi'],
  });

// Persist language changes globally
i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    document.documentElement.lang = lng;
    localStorage.setItem(STORAGE_KEY, lng);
    document.cookie = `tp_locale=${lng}; path=/; max-age=31536000`;
  }
});

// Set initial lang
if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.language || 'en';
}

export const changeLanguage = (lng: string) => {
  i18n.changeLanguage(lng);
};

export default i18n;
```

### 2. Enum Constants

```typescript
// src/constants/enums.ts

/**
 * Business enum values - stored as keys, never translated
 * These are stable identifiers used in database and business logic
 */
export const STATUSES = [
  'draft',
  'in_review',
  'approved',
  'rejected',
  'archived',
] as const;

export const FIT_TYPES = [
  'regular',
  'slim',
  'loose',
  'oversized',
] as const;

export const LIFECYCLE_STAGES = [
  'concept',
  'development',
  'sampling',
  'production',
  'discontinued',
] as const;

export const GENDERS = [
  'unisex',
  'male',
  'female',
  'kids',
] as const;

export type Status = typeof STATUSES[number];
export type FitType = typeof FIT_TYPES[number];
export type LifecycleStage = typeof LIFECYCLE_STAGES[number];
export type Gender = typeof GENDERS[number];
```

### 3. Enum Translation Hook

```typescript
// src/i18n/hooks/useEnumTranslation.ts

import { useTranslation } from 'react-i18next';

/**
 * Hook for translating enum values
 * Ensures enums are always translated consistently
 */
export const useEnumTranslation = () => {
  const { t } = useTranslation();
  
  const translateEnum = (
    namespace: string,
    enumKey: string,
    fallback?: string
  ): string => {
    const key = `${namespace}.${enumKey}`;
    const translated = t(key, { defaultValue: fallback || enumKey });
    return translated;
  };
  
  return { translateEnum };
};
```

### 4. Enhanced Translation Hook

```typescript
// src/i18n/hooks/useTranslation.ts

import { useTranslation as useI18nTranslation } from 'react-i18next';
import { useEnumTranslation } from './useEnumTranslation';

/**
 * Enhanced translation hook with enum support
 */
export const useTranslation = (namespaces?: string | string[]) => {
  const i18n = useI18nTranslation(namespaces);
  const { translateEnum } = useEnumTranslation();
  
  return {
    ...i18n,
    t: i18n.t,
    translateEnum,
  };
};
```

### 5. Refactored Shared Components

```typescript
// src/components/TechPackForm/shared/Input.tsx

import React from 'react';
import { useTranslation } from 'react-i18next';

interface InputProps {
  labelKey?: string;        // Translation key instead of label
  label?: string;            // Fallback if labelKey not provided
  placeholderKey?: string;   // Translation key for placeholder
  placeholder?: string;      // Fallback if placeholderKey not provided
  // ... other props
}

const Input: React.FC<InputProps> = ({
  labelKey,
  label,
  placeholderKey,
  placeholder,
  // ... other props
}) => {
  const { t } = useTranslation('common');
  
  // Resolve translations
  const resolvedLabel = labelKey ? t(labelKey) : label;
  const resolvedPlaceholder = placeholderKey ? t(placeholderKey) : placeholder;
  
  return (
    <div>
      {resolvedLabel && (
        <label>{resolvedLabel}</label>
      )}
      <input
        placeholder={resolvedPlaceholder}
        // ... other props
      />
    </div>
  );
};
```

---

## ❌ Common Mistakes & How to Avoid

### Mistake 1: Storing Translated Strings in Database

**Problem:**
```typescript
// ❌ Wrong - Storing translated value
techPack.status = 'Draft';  // English only!
techPack.status = 'Nháp';   // Vietnamese only!
```

**Solution:**
```typescript
// ✅ Correct - Store enum key
techPack.status = 'draft';  // Language-independent key

// Translate at display time
const statusLabel = t(`techpack:enums.status.${techPack.status}`);
```

### Mistake 2: Hardcoded Strings in Shared Components

**Problem:**
```typescript
// ❌ Wrong - Component accepts hardcoded text
<Input label="Article Code" />
```

**Solution:**
```typescript
// ✅ Correct - Component accepts translation key
<Input labelKey="articleInfo:fields.articleCode" />
```

### Mistake 3: Not Using Namespaces

**Problem:**
```typescript
// ❌ Wrong - Flat structure, conflicts possible
t('title')  // Which title? Article? BOM? Measurement?
```

**Solution:**
```typescript
// ✅ Correct - Clear namespace
t('articleInfo:title')
t('bom:title')
t('measurement:title')
```

### Mistake 4: Inconsistent Enum Translation

**Problem:**
```typescript
// ❌ Wrong - Manual translation, inconsistent
const statusMap = {
  draft: 'Draft',
  approved: 'Approved'
};
```

**Solution:**
```typescript
// ✅ Correct - Use translation system
const { translateEnum } = useEnumTranslation();
const statusLabel = translateEnum('techpack:enums.status', status);
```

### Mistake 5: PDF Export Not Using i18n

**Problem:**
```typescript
// ❌ Wrong - Hardcoded in PDF template
<h1>Tech Pack Details</h1>
```

**Solution:**
```typescript
// ✅ Correct - Pass translations to PDF
const translations = await loadTranslations(locale);
await generatePDF(techPack, { translations, locale });

// In EJS template
<h1><%= translations.techpack.title %></h1>
```

### Mistake 6: Not Persisting Language Globally

**Problem:**
```typescript
// ❌ Wrong - Language resets on navigation
const [lang, setLang] = useState('en');  // Component state
```

**Solution:**
```typescript
// ✅ Correct - Use i18next with localStorage
i18n.changeLanguage('vi');  // Persists automatically
```

---

## 🧪 Testing Checklist

- [ ] All UI text uses `t()` function
- [ ] No hardcoded strings in components
- [ ] Enum values stored as keys, not translated strings
- [ ] Language persists across route navigation
- [ ] Language persists after page refresh
- [ ] PDF export uses same translations as UI
- [ ] All namespaces loaded correctly
- [ ] Fallback to English works for missing keys
- [ ] Enum translations work for all enum types
- [ ] Shared components accept translation keys

---

## 🚀 Migration Strategy

1. **Phase 1: Setup**
   - ✅ Create namespace structure
   - ✅ Setup i18n configuration
   - ✅ Create enum constants

2. **Phase 2: Core Components**
   - Migrate Header
   - Migrate Navigation
   - Migrate Shared Components (Input, Select, etc.)

3. **Phase 3: Feature Modules**
   - Migrate TechPack List
   - Migrate Article Info Tab
   - Migrate BOM Tab
   - Migrate Measurement Tab

4. **Phase 4: Advanced**
   - Migrate PDF Export
   - Migrate Validation Messages
   - Migrate Toast/Notification Messages

5. **Phase 5: Polish**
   - Run scan script to find remaining hardcoded strings
   - Test all pages in both languages
   - Verify enum handling

---

## 📚 Additional Resources

- [i18next Documentation](https://www.i18next.com/)
- [react-i18next Documentation](https://react.i18next.com/)
- [Namespace Best Practices](https://www.i18next.com/principles/namespaces)







