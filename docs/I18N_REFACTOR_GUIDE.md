# i18n Refactor Guide - TechPacker

## A) Danh sách file cần tạo/sửa

### Files đã tạo mới:
1. `src/i18n/index.ts` - Setup i18next với namespace và persistent storage
2. `src/hooks/useLocale.ts` - Custom hook quản lý locale
3. `src/i18n/locales/en/common.json` - Common translations (EN)
4. `src/i18n/locales/vi/common.json` - Common translations (VI)
5. `src/i18n/locales/en/nav.json` - Navigation translations (EN)
6. `src/i18n/locales/vi/nav.json` - Navigation translations (VI)
7. `src/i18n/locales/en/techpack.json` - TechPack translations (EN)
8. `src/i18n/locales/vi/techpack.json` - TechPack translations (VI)
9. `src/i18n/locales/en/bom.json` - BOM translations (EN)
10. `src/i18n/locales/vi/bom.json` - BOM translations (VI)
11. `src/i18n/locales/en/measurement.json` - Measurement translations (EN)
12. `src/i18n/locales/vi/measurement.json` - Measurement translations (VI)
13. `src/i18n/locales/en/auth.json` - Auth translations (EN)
14. `src/i18n/locales/vi/auth.json` - Auth translations (VI)
15. `src/i18n/locales/en/validation.json` - Validation messages (EN)
16. `src/i18n/locales/vi/validation.json` - Validation messages (VI)
17. `src/i18n/locales/en/admin.json` - Admin translations (EN)
18. `src/i18n/locales/vi/admin.json` - Admin translations (VI)

### Files đã sửa:
1. `src/components/LanguageButton.tsx` - Dùng useLocale hook
2. `src/components/LanguageModal.tsx` - Dùng namespace 'common'
3. `src/components/TechPackList.tsx` - Migrate sang i18n
4. `src/App.tsx` - Đã có LanguageButton (cần migrate thêm text)

### Files cần sửa tiếp:
1. `src/components/TechPackForm/tabs/ArticleInfoTab.tsx`
2. `src/components/TechPackForm/tabs/MeasurementTab.tsx`
3. `src/components/TechPackForm/tabs/BomTab.tsx`
4. `src/pages/LoginPage.tsx`
5. `src/utils/validationSchemas.ts` - Validation messages
6. Các component khác có hard-coded strings

## B) Code mẫu

### 1. i18n/index.ts

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import namespaces
import commonEn from './locales/en/common.json';
import techpackEn from './locales/en/techpack.json';
// ... other namespaces

const STORAGE_KEY = 'tp_locale';

// Custom language detector
const customDetector = {
  name: 'customStorage',
  lookup() {
    if (typeof window === 'undefined') return undefined;
    return localStorage.getItem(STORAGE_KEY) || undefined;
  },
  cacheUserLanguage(lng: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, lng);
    document.cookie = `tp_locale=${lng}; path=/; max-age=31536000`;
  },
};

i18n
  .use(customDetector)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: commonEn, techpack: techpackEn, ... },
      vi: { common: commonVi, techpack: techpackVi, ... },
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'techpack', 'bom', 'measurement', ...],
    detection: {
      order: ['customStorage', 'localStorage', 'navigator'],
      lookupLocalStorage: STORAGE_KEY,
    },
  });

// Update document lang on change
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
  localStorage.setItem(STORAGE_KEY, lng);
  document.cookie = `tp_locale=${lng}; path=/; max-age=31536000`;
});

export const changeLanguage = (lng: string) => {
  i18n.changeLanguage(lng);
};

export default i18n;
```

### 2. useLocale() Hook

```typescript
import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { changeLanguage, getCurrentLanguage } from '../i18n';

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
```

### 3. LanguageModal Component

```typescript
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Search, Check } from 'lucide-react';

const LanguageModal: React.FC<LanguageModalProps> = ({
  isOpen,
  onClose,
  currentLanguage,
  onLanguageChange,
}) => {
  const { t } = useTranslation('common');
  const [searchQuery, setSearchQuery] = useState('');

  // ... implementation
};
```

### 4. Sử dụng trong Component

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation(['techpack', 'common']);
  
  return (
    <div>
      <h1>{t('techpack:list.title')}</h1>
      <button>{t('common:save')}</button>
      <span>{t('common:loading')}</span>
    </div>
  );
}
```

### 5. Enum/Status Mapping

```typescript
// ❌ Sai - Hard-code
<Tag>{status}</Tag>

// ✅ Đúng - Map qua i18n
const statusLabel = t(`techpack:articleInfo.status.${status.toLowerCase()}`, { 
  defaultValue: status 
});
<Tag>{statusLabel}</Tag>
```

## C) Ví dụ refactor

### 1. TechPackList Component

**Trước:**
```typescript
<Title level={2}>Tech Packs</Title>
<Search placeholder="Search by name or code" />
<Button>Create New Tech Pack</Button>
<Tag>{status}</Tag>
```

**Sau:**
```typescript
const { t } = useTranslation(['techpack', 'common']);

<Title level={2}>{t('techpack:list.title')}</Title>
<Search placeholder={t('techpack:list.searchPlaceholder')} />
<Button>{t('techpack:list.create')}</Button>
<Tag>{t(`techpack:articleInfo.status.${status.toLowerCase()}`)}</Tag>
```

### 2. ArticleInfoTab Component

**Trước:**
```typescript
<Input label="Article Code" />
<Input label="Article Name" />
<Select placeholder="Select status">
  <Option value="draft">Draft</Option>
  <Option value="approved">Approved</Option>
</Select>
```

**Sau:**
```typescript
const { t } = useTranslation(['techpack', 'common']);

<Input label={t('techpack:articleInfo.fields.articleCode')} />
<Input label={t('techpack:articleInfo.fields.articleName')} />
<Select placeholder={t('common:selectOption')}>
  <Option value="draft">{t('techpack:articleInfo.status.draft')}</Option>
  <Option value="approved">{t('techpack:articleInfo.status.approved')}</Option>
</Select>
```

### 3. MeasurementTab Component

**Trước:**
```typescript
<th>Measurement Point</th>
<th>Tolerance</th>
<input placeholder="Size" />
<button>Add Measurement</button>
```

**Sau:**
```typescript
const { t } = useTranslation(['measurement', 'common']);

<th>{t('measurement:header.point')}</th>
<th>{t('measurement:header.tolerance')}</th>
<input placeholder={t('measurement:placeholder.size')} />
<button>{t('measurement:add')}</button>
```

## D) Checklist để đảm bảo không còn text hard-code

### ✅ Component Checklist

- [ ] **Navigation & Header**
  - [ ] Nav links (Dashboard, Tech Packs, Settings...)
  - [ ] Header title
  - [ ] User menu (Logout, Profile...)
  - [ ] Breadcrumbs

- [ ] **Buttons & Actions**
  - [ ] Save, Cancel, Delete, Edit, View
  - [ ] Create, Update, Submit
  - [ ] Add, Remove, Apply
  - [ ] Export, Import

- [ ] **Form Fields**
  - [ ] Labels (Article Code, Article Name...)
  - [ ] Placeholders
  - [ ] Helper text
  - [ ] Error messages
  - [ ] Required indicators

- [ ] **Tables**
  - [ ] Column headers
  - [ ] Empty states ("No data available")
  - [ ] Loading states
  - [ ] Action tooltips

- [ ] **Modals & Dialogs**
  - [ ] Titles
  - [ ] Messages
  - [ ] Confirm/Cancel buttons
  - [ ] Validation messages

- [ ] **Status & Enums**
  - [ ] Status labels (Draft, Approved, In Review...)
  - [ ] Role labels (Admin, Designer...)
  - [ ] Lifecycle stages
  - [ ] Fit types
  - [ ] Seasons

- [ ] **Toast/Notifications**
  - [ ] Success messages
  - [ ] Error messages
  - [ ] Warning messages
  - [ ] Info messages

- [ ] **Validation**
  - [ ] Required field messages
  - [ ] Email validation
  - [ ] Min/Max length
  - [ ] Pattern validation

### ✅ Script để scan hard-coded strings

Tạo file `scripts/scan-hardcoded-strings.js`:

```javascript
#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const SRC_DIR = path.join(process.cwd(), 'src');

// Patterns to detect hard-coded strings
const PATTERNS = [
  /['"`]([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)['"`]/g,  // Title case strings
  /placeholder=['"`]([^'"`]+)['"`]/g,              // Placeholders
  /title=['"`]([^'"`]+)['"`]/g,                     // Titles
  />([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)</g,           // Text content
];

async function scanFiles() {
  const files = await glob('**/*.{ts,tsx}', {
    cwd: SRC_DIR,
    ignore: ['**/node_modules/**', '**/*.test.*', '**/i18n/**'],
  });

  const issues = [];

  for (const file of files) {
    const filePath = path.join(SRC_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Skip if already uses i18n
    if (content.includes('useTranslation') || content.includes('t(')) {
      continue;
    }

    for (const pattern of PATTERNS) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const text = match[1];
        // Filter out common false positives
        if (text.length > 3 && !text.match(/^(className|id|key|value|type|name|href|src)$/)) {
          issues.push({
            file,
            line: content.substring(0, match.index).split('\n').length,
            text: text.substring(0, 50),
          });
        }
      }
    }
  }

  if (issues.length > 0) {
    console.log(`\n⚠️  Found ${issues.length} potential hard-coded strings:\n`);
    issues.forEach(({ file, line, text }) => {
      console.log(`  ${file}:${line} - "${text}"`);
    });
  } else {
    console.log('✅ No hard-coded strings found!');
  }
}

scanFiles();
```

### ✅ Cách chạy checklist

1. **Manual Review:**
   ```bash
   # Search for common patterns
   grep -r 'placeholder="' src/ --include="*.tsx"
   grep -r 'title="' src/ --include="*.tsx"
   grep -r '>Save<' src/ --include="*.tsx"
   ```

2. **Script Scan:**
   ```bash
   node scripts/scan-hardcoded-strings.js
   ```

3. **ESLint Rule (optional):**
   Tạo custom ESLint rule để detect hard-coded strings trong JSX.

## E) Best Practices

1. **Luôn dùng namespace:**
   ```typescript
   // ✅ Đúng
   t('techpack:list.title')
   t('common:save')
   
   // ❌ Sai
   t('title')
   ```

2. **Map enums qua i18n:**
   ```typescript
   // ✅ Đúng
   const statusLabel = t(`techpack:articleInfo.status.${status.toLowerCase()}`, {
     defaultValue: status
   });
   
   // ❌ Sai
   <Tag>{status}</Tag>
   ```

3. **Dùng interpolation cho dynamic values:**
   ```typescript
   // ✅ Đúng
   t('validation:minLength', { min: 5 })
   
   // ❌ Sai
   `Must be at least ${min} characters`
   ```

4. **Không translate user content:**
   ```typescript
   // ✅ Đúng - Giữ nguyên user input
   <div>{techPack.notes}</div>
   
   // ❌ Sai - Không translate user content
   <div>{t(techPack.notes)}</div>
   ```

## F) Testing

1. **Test language persistence:**
   - Đổi ngôn ngữ → Refresh → Kiểm tra vẫn giữ ngôn ngữ
   - Clear localStorage → Kiểm tra fallback về browser language

2. **Test navigation:**
   - Đổi ngôn ngữ → Navigate sang page khác → Kiểm tra vẫn giữ ngôn ngữ

3. **Test all pages:**
   - Kiểm tra tất cả pages không còn text hard-code
   - Test với cả English và Vietnamese

## G) Next Steps

1. ✅ Setup i18n với namespace và persistent storage
2. ✅ Tạo LanguageModal và LanguageButton
3. ✅ Migrate TechPackList
4. ⏳ Migrate ArticleInfoTab
5. ⏳ Migrate MeasurementTab
6. ⏳ Migrate BomTab
7. ⏳ Migrate LoginPage
8. ⏳ Migrate validation schemas
9. ⏳ Scan và fix tất cả hard-coded strings
10. ⏳ Test toàn bộ app với cả 2 ngôn ngữ







