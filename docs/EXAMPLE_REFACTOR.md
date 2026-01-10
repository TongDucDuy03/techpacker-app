# Example Refactor: ArticleInfoTab Component

This document shows a complete before/after refactor of the ArticleInfoTab component to demonstrate the i18n architecture.

## Before (Hardcoded Strings)

```typescript
// ❌ BEFORE - Hardcoded strings, enum values as translated strings
import React, { useState } from 'react';
import Input from '../shared/Input';
import Select from '../shared/Select';

const ArticleInfoTab = ({ techPack, onUpdate }) => {
  const [articleInfo, setArticleInfo] = useState({
    articleCode: '',
    articleName: '',
    status: 'Draft',  // ❌ Storing translated string!
    fitType: 'Regular',  // ❌ Storing translated string!
    gender: 'Unisex',
    lifecycleStage: 'Concept',
  });

  return (
    <div>
      <h2>Article Information</h2>  {/* ❌ Hardcoded */}
      
      <Input 
        label="Article Code"  {/* ❌ Hardcoded */}
        placeholder="Enter article code"  {/* ❌ Hardcoded */}
        value={articleInfo.articleCode}
        onChange={(value) => setArticleInfo({ ...articleInfo, articleCode: value })}
      />
      
      <Input 
        label="Article Name"  {/* ❌ Hardcoded */}
        placeholder="Enter product name"  {/* ❌ Hardcoded */}
        value={articleInfo.articleName}
        onChange={(value) => setArticleInfo({ ...articleInfo, articleName: value })}
      />
      
      <Select
        label="Status"  {/* ❌ Hardcoded */}
        placeholder="Select status"  {/* ❌ Hardcoded */}
        value={articleInfo.status}
        onChange={(value) => setArticleInfo({ ...articleInfo, status: value })}
        options={[
          { value: 'Draft', label: 'Draft' },  {/* ❌ Translated strings as values */}
          { value: 'Approved', label: 'Approved' },
          { value: 'In Review', label: 'In Review' }
        ]}
      />
      
      <Select
        label="Fit Type"  {/* ❌ Hardcoded */}
        value={articleInfo.fitType}
        onChange={(value) => setArticleInfo({ ...articleInfo, fitType: value })}
        options={[
          { value: 'Regular', label: 'Regular' },  {/* ❌ Translated strings */}
          { value: 'Slim', label: 'Slim' },
          { value: 'Loose', label: 'Loose' }
        ]}
      />
    </div>
  );
};
```

## After (Fully Internationalized)

```typescript
// ✅ AFTER - All text via i18n, enums as keys
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEnumTranslation } from '../../../i18n/hooks/useEnumTranslation';
import { STATUSES, FIT_TYPES, GENDERS, LIFECYCLE_STAGES } from '../../../constants/enums';
import { normalizeStatus, normalizeFitType, normalizeGender } from '../../../constants/enums';
import Input from '../shared/Input';
import Select from '../shared/Select';

const ArticleInfoTab = ({ techPack, onUpdate }) => {
  const { t } = useTranslation(['articleInfo', 'techpack', 'common']);
  const { translateEnums } = useEnumTranslation();
  
  // Initialize with enum keys (not translated strings)
  const [articleInfo, setArticleInfo] = useState({
    articleCode: '',
    articleName: '',
    status: normalizeStatus(techPack?.status) || 'draft',  // ✅ Enum key
    fitType: normalizeFitType(techPack?.fitType) || 'regular',  // ✅ Enum key
    gender: normalizeGender(techPack?.gender) || 'unisex',  // ✅ Enum key
    lifecycleStage: techPack?.lifecycleStage || 'concept',  // ✅ Enum key
  });
  
  // Create translated option lists
  const statusOptions = translateEnums('techpack:enums.status', STATUSES);
  const fitTypeOptions = translateEnums('techpack:enums.fitType', FIT_TYPES);
  const genderOptions = translateEnums('techpack:enums.gender', GENDERS);
  const lifecycleOptions = translateEnums('techpack:enums.lifecycleStage', LIFECYCLE_STAGES);

  return (
    <div>
      <h2>{t('articleInfo:title')}</h2>  {/* ✅ Translation key */}
      
      <Input 
        labelKey="articleInfo:fields.articleCode"  {/* ✅ Translation key */}
        placeholderKey="articleInfo:placeholders.articleCode"  {/* ✅ Translation key */}
        value={articleInfo.articleCode}
        onChange={(value) => setArticleInfo({ ...articleInfo, articleCode: value })}
      />
      
      <Input 
        labelKey="articleInfo:fields.articleName"  {/* ✅ Translation key */}
        placeholderKey="articleInfo:placeholders.articleName"  {/* ✅ Translation key */}
        value={articleInfo.articleName}
        onChange={(value) => setArticleInfo({ ...articleInfo, articleName: value })}
      />
      
      <Select
        labelKey="articleInfo:fields.status"  {/* ✅ Translation key */}
        placeholderKey="common:selectOption"  {/* ✅ Translation key */}
        value={articleInfo.status}  {/* ✅ Enum key, not translated string */}
        onChange={(value) => setArticleInfo({ ...articleInfo, status: value as Status })}
        options={statusOptions}  {/* ✅ Pre-translated options */}
      />
      
      <Select
        labelKey="articleInfo:fields.fitType"  {/* ✅ Translation key */}
        value={articleInfo.fitType}  {/* ✅ Enum key */}
        onChange={(value) => setArticleInfo({ ...articleInfo, fitType: value as FitType })}
        options={fitTypeOptions}  {/* ✅ Pre-translated options */}
      />
      
      <Select
        labelKey="articleInfo:fields.gender"
        value={articleInfo.gender}
        onChange={(value) => setArticleInfo({ ...articleInfo, gender: value as Gender })}
        options={genderOptions}
      />
      
      <Select
        labelKey="articleInfo:fields.lifecycleStage"
        value={articleInfo.lifecycleStage}
        onChange={(value) => setArticleInfo({ ...articleInfo, lifecycleStage: value as LifecycleStage })}
        options={lifecycleOptions}
      />
    </div>
  );
};
```

## Key Changes

### 1. **Enum Handling**
- **Before**: Stored `'Draft'`, `'Regular'` (translated strings)
- **After**: Store `'draft'`, `'regular'` (enum keys)

### 2. **Component Props**
- **Before**: `label="Article Code"` (hardcoded)
- **After**: `labelKey="articleInfo:fields.articleCode"` (translation key)

### 3. **Translation Hooks**
- **Before**: No translation
- **After**: `useTranslation(['articleInfo', 'techpack', 'common'])` + `useEnumTranslation()`

### 4. **Option Lists**
- **Before**: Manual array with translated strings
- **After**: `translateEnums()` generates translated options from enum constants

### 5. **Data Normalization**
- **Before**: Accept any string value
- **After**: `normalizeStatus()`, `normalizeFitType()` convert legacy values to enum keys

## Benefits

1. ✅ **Language Switching**: Change language → all text updates instantly
2. ✅ **Data Consistency**: Enums stored as keys, not language-dependent strings
3. ✅ **Type Safety**: TypeScript enforces valid enum values
4. ✅ **Maintainability**: All translations in JSON files, easy to update
5. ✅ **PDF Export**: Can use same translation keys for PDF generation







