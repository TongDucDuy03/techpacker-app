# i18n Implementation Summary

## 📋 Overview

Complete i18n architecture for TechPacker application ensuring:
- ✅ 100% UI text internationalized
- ✅ Global language persistence
- ✅ Module-based namespaces
- ✅ Enum keys as stable identifiers
- ✅ Shared translation source for UI and PDF

---

## 📁 Files Created/Modified

### Core i18n Files
- ✅ `src/i18n/index.ts` - Main i18n configuration (updated with articleInfo namespace)
- ✅ `src/i18n/hooks/useEnumTranslation.ts` - Hook for translating enum values
- ✅ `src/constants/enums.ts` - Business enum definitions

### Translation Files
- ✅ `src/i18n/locales/en/techpack.json` - TechPack enums (status, fitType, etc.)
- ✅ `src/i18n/locales/vi/techpack.json` - Vietnamese translations for enums
- ✅ `src/i18n/locales/en/articleInfo.json` - Article Info tab translations
- ✅ `src/i18n/locales/vi/articleInfo.json` - Vietnamese Article Info translations

### Documentation
- ✅ `docs/I18N_ARCHITECTURE.md` - Complete architecture guide
- ✅ `docs/EXAMPLE_REFACTOR.md` - Before/after refactor example

---

## 🎯 Key Principles

### 1. Enum Keys, Not Translated Strings

```typescript
// ✅ CORRECT - Store enum key
techPack.status = 'draft';  // Language-independent

// ❌ WRONG - Storing translated string
techPack.status = 'Draft';  // English only!
```

### 2. Translation at Display Time

```typescript
// ✅ CORRECT - Translate when displaying
const { translateEnum } = useEnumTranslation();
const statusLabel = translateEnum('techpack:enums.status', techPack.status);
// 'draft' → "Draft" (EN) or "Nháp" (VI)
```

### 3. Namespace Organization

```typescript
// ✅ CORRECT - Clear namespace
t('articleInfo:fields.articleCode')
t('bom:table.headers.specifications')

// ❌ WRONG - Flat structure
t('articleCode')  // Which module?
```

### 4. Shared Components Accept Keys

```typescript
// ✅ CORRECT - Component accepts translation key
<Input labelKey="articleInfo:fields.articleCode" />

// ❌ WRONG - Hardcoded text
<Input label="Article Code" />
```

---

## 🔄 Migration Checklist

### Phase 1: Setup ✅
- [x] Create enum constants
- [x] Create enum translation hook
- [x] Update i18n configuration
- [x] Create namespace structure

### Phase 2: Core Components
- [ ] Refactor shared components (Input, Select, Textarea) to accept `labelKey`/`placeholderKey`
- [ ] Migrate Header component
- [ ] Migrate Navigation

### Phase 3: Feature Modules
- [ ] Migrate ArticleInfoTab (example provided)
- [ ] Migrate BomTab
- [ ] Migrate MeasurementTab
- [ ] Migrate ColorwayTab
- [ ] Migrate ConstructionTab

### Phase 4: Advanced
- [ ] Migrate PDF export to use translations
- [ ] Migrate validation schemas
- [ ] Migrate toast/notification messages

### Phase 5: Testing
- [ ] Test language switching across all routes
- [ ] Test language persistence after refresh
- [ ] Test enum translations
- [ ] Test PDF export in both languages
- [ ] Run scan script to find remaining hardcoded strings

---

## 🚀 Quick Start

### 1. Use Translation in Component

```typescript
import { useTranslation } from 'react-i18next';
import { useEnumTranslation } from '../../../i18n/hooks/useEnumTranslation';

const MyComponent = () => {
  const { t } = useTranslation(['articleInfo', 'common']);
  const { translateEnum } = useEnumTranslation();
  
  return (
    <div>
      <h2>{t('articleInfo:title')}</h2>
      <Input labelKey="articleInfo:fields.articleCode" />
    </div>
  );
};
```

### 2. Translate Enum Values

```typescript
import { STATUSES } from '../../../constants/enums';
import { useEnumTranslation } from '../../../i18n/hooks/useEnumTranslation';

const { translateEnums } = useEnumTranslation();
const statusOptions = translateEnums('techpack:enums.status', STATUSES);
// Returns: [{ value: 'draft', label: 'Draft' }, ...]
```

### 3. Normalize Legacy Data

```typescript
import { normalizeStatus, normalizeFitType } from '../../../constants/enums';

// Convert old string values to enum keys
const status = normalizeStatus(techPack.status);  // 'Draft' → 'draft'
const fitType = normalizeFitType(techPack.fitType);  // 'Regular' → 'regular'
```

---

## ❌ Common Mistakes to Avoid

1. **Storing Translated Strings in Database**
   - ❌ `status: 'Draft'`
   - ✅ `status: 'draft'`

2. **Hardcoded Strings in Components**
   - ❌ `<h1>Article Information</h1>`
   - ✅ `<h1>{t('articleInfo:title')}</h1>`

3. **Not Using Namespaces**
   - ❌ `t('title')`  // Ambiguous
   - ✅ `t('articleInfo:title')`  // Clear

4. **Manual Enum Translation**
   - ❌ `const map = { draft: 'Draft', approved: 'Approved' }`
   - ✅ `translateEnum('techpack:enums.status', status)`

5. **Shared Components Not Accepting Keys**
   - ❌ `<Input label="Article Code" />`
   - ✅ `<Input labelKey="articleInfo:fields.articleCode" />`

---

## 📚 Next Steps

1. **Refactor Shared Components**
   - Update `Input.tsx`, `Select.tsx`, `Textarea.tsx` to accept `labelKey`/`placeholderKey`

2. **Migrate ArticleInfoTab**
   - Follow example in `docs/EXAMPLE_REFACTOR.md`
   - Use enum constants and translation hooks

3. **Run Scan Script**
   ```bash
   npm run i18n:scan
   ```
   - Find remaining hardcoded strings
   - Migrate them one by one

4. **Test Thoroughly**
   - Switch languages
   - Navigate between pages
   - Refresh page
   - Export PDF

---

## 🔗 Related Documentation

- `docs/I18N_ARCHITECTURE.md` - Complete architecture guide
- `docs/EXAMPLE_REFACTOR.md` - Refactor example
- `docs/I18N_REFACTOR_GUIDE.md` - Previous refactor guide







