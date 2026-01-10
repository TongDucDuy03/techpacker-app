# Common i18n Mistakes & How to Avoid Them

## 🚨 Mistake 1: Storing Translated Strings in Database

### Problem
```typescript
// ❌ WRONG - Storing translated value
techPack.status = 'Draft';  // English only!
techPack.status = 'Nháp';   // Vietnamese only!

// When user switches language, data becomes wrong
// User selects "Draft" (English) → saves to DB
// User switches to Vietnamese → sees "Draft" (not translated)
// Or worse: User selects "Nháp" → saves to DB
// User switches to English → sees "Nháp" (wrong language!)
```

### Solution
```typescript
// ✅ CORRECT - Store enum key
techPack.status = 'draft';  // Language-independent key

// Translate at display time
const { translateEnum } = useEnumTranslation();
const statusLabel = translateEnum('techpack:enums.status', techPack.status);
// 'draft' → "Draft" (EN) or "Nháp" (VI) based on current language
```

### How to Fix Existing Data
```typescript
import { normalizeStatus } from '../../../constants/enums';

// When loading from database
const normalizedStatus = normalizeStatus(techPack.status);
// Converts: 'Draft' → 'draft', 'Nháp' → 'draft', etc.
```

---

## 🚨 Mistake 2: Hardcoded Strings in Components

### Problem
```typescript
// ❌ WRONG - Hardcoded text
const ArticleInfoTab = () => {
  return (
    <div>
      <h2>Article Information</h2>
      <Input label="Article Code" />
      <button>Save</button>
    </div>
  );
};
```

### Solution
```typescript
// ✅ CORRECT - All text via translation
import { useTranslation } from 'react-i18next';

const ArticleInfoTab = () => {
  const { t } = useTranslation(['articleInfo', 'common']);
  
  return (
    <div>
      <h2>{t('articleInfo:title')}</h2>
      <Input labelKey="articleInfo:fields.articleCode" />
      <button>{t('common:save')}</button>
    </div>
  );
};
```

### Detection
Run scan script to find hardcoded strings:
```bash
npm run i18n:scan
```

---

## 🚨 Mistake 3: Not Using Namespaces

### Problem
```typescript
// ❌ WRONG - Flat structure, conflicts
t('title')  // Which title? Article? BOM? Measurement?
t('save')   // Which save? Article save? BOM save?

// If two modules have "title", one will be overwritten
```

### Solution
```typescript
// ✅ CORRECT - Clear namespace
t('articleInfo:title')    // Article Info tab title
t('bom:title')            // BOM tab title
t('measurement:title')    // Measurement tab title

// Namespace organization:
// module:section.key
// articleInfo:fields.articleCode
// bom:table.headers.specifications
```

### Best Practice
```typescript
// Always specify namespaces when using useTranslation
const { t } = useTranslation(['articleInfo', 'common']);

// Use namespace prefix in keys
t('articleInfo:title')  // Not just t('title')
```

---

## 🚨 Mistake 4: Inconsistent Enum Translation

### Problem
```typescript
// ❌ WRONG - Manual translation, inconsistent
const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    draft: 'Draft',
    approved: 'Approved',
    // Missing some statuses
    // Different translation in different components
  };
  return map[status] || status;
};

// Problem: 
// - Different components translate differently
// - Easy to miss some enum values
// - Hard to maintain
```

### Solution
```typescript
// ✅ CORRECT - Use translation system
import { useEnumTranslation } from '../../../i18n/hooks/useEnumTranslation';

const { translateEnum } = useEnumTranslation();
const statusLabel = translateEnum('techpack:enums.status', status);

// Benefits:
// - Consistent across all components
// - Centralized in translation files
// - Easy to add new languages
```

### For Option Lists
```typescript
// ✅ CORRECT - Use translateEnums helper
import { STATUSES } from '../../../constants/enums';
const { translateEnums } = useEnumTranslation();

const statusOptions = translateEnums('techpack:enums.status', STATUSES);
// Returns: [{ value: 'draft', label: 'Draft' }, ...]
// Automatically translated based on current language
```

---

## 🚨 Mistake 5: Shared Components Not Accepting Translation Keys

### Problem
```typescript
// ❌ WRONG - Component accepts hardcoded text
<Input 
  label="Article Code"           // Hardcoded!
  placeholder="Enter article code"  // Hardcoded!
/>

// Every usage must pass translated string
// But translation happens in parent component
// Inconsistent and error-prone
```

### Solution
```typescript
// ✅ CORRECT - Component accepts translation keys
<Input 
  labelKey="articleInfo:fields.articleCode"
  placeholderKey="articleInfo:placeholders.articleCode"
/>

// Component handles translation internally
// Consistent across all usages
```

### Component Implementation
```typescript
// src/components/TechPackForm/shared/Input.tsx
import { useTranslation } from 'react-i18next';

interface InputProps {
  labelKey?: string;        // Translation key
  label?: string;           // Fallback if labelKey not provided
  placeholderKey?: string;  // Translation key
  placeholder?: string;     // Fallback
  // ... other props
}

const Input: React.FC<InputProps> = ({ labelKey, label, placeholderKey, placeholder, ... }) => {
  const { t } = useTranslation('common');
  
  const resolvedLabel = labelKey ? t(labelKey) : label;
  const resolvedPlaceholder = placeholderKey ? t(placeholderKey) : placeholder;
  
  return (
    <div>
      {resolvedLabel && <label>{resolvedLabel}</label>}
      <input placeholder={resolvedPlaceholder} />
    </div>
  );
};
```

---

## 🚨 Mistake 6: PDF Export Not Using i18n

### Problem
```typescript
// ❌ WRONG - Hardcoded in PDF template
// server/src/templates/techpack-full-template.ejs
<h1>Tech Pack Details</h1>
<th>Article Code</th>
<td>Status: <%= status %></td>  // Shows 'draft' instead of 'Draft'
```

### Solution
```typescript
// ✅ CORRECT - Pass translations to PDF
// server/src/controllers/techpack.controller.ts
async exportPDF(req: AuthRequest, res: Response) {
  const locale = req.query.lang || 'en';
  const translations = await loadTranslations(locale);
  
  await pdfService.generatePDF(techPack, {
    translations,
    locale,
  });
}

// server/src/templates/techpack-full-template.ejs
<h1><%= translations.techpack.title %></h1>
<th><%= translations.articleInfo.fields.articleCode %></th>
<td><%= translations.techpack.enums.status[status] %></td>
```

### Implementation
```typescript
// server/src/utils/translations.ts
import fs from 'fs';
import path from 'path';

export async function loadTranslations(locale: string = 'en') {
  const localesDir = path.join(__dirname, '../locales', locale);
  const translations: Record<string, any> = {};
  
  // Load all JSON files in locale directory
  const files = fs.readdirSync(localesDir);
  for (const file of files) {
    if (file.endsWith('.json')) {
      const namespace = file.replace('.json', '');
      const content = fs.readFileSync(path.join(localesDir, file), 'utf-8');
      translations[namespace] = JSON.parse(content);
    }
  }
  
  return translations;
}
```

---

## 🚨 Mistake 7: Not Persisting Language Globally

### Problem
```typescript
// ❌ WRONG - Language resets on navigation
const MyComponent = () => {
  const [lang, setLang] = useState('en');  // Component state
  
  // When user navigates to different page:
  // - Language resets to default
  // - User has to select language again
};
```

### Solution
```typescript
// ✅ CORRECT - Use i18next with localStorage
// Already configured in src/i18n/index.ts

// Language persists automatically:
// - Across route navigation
// - After page refresh
// - In localStorage (key: 'tp_locale')

// Just use:
import { changeLanguage } from '../i18n';
changeLanguage('vi');  // Persists automatically
```

---

## 🚨 Mistake 8: Mixing Old and New i18n Systems

### Problem
```typescript
// ❌ WRONG - Using old i18n system
import { useI18n } from '../lib/i18n';  // Old system
const { t } = useI18n();
t('nav.techpacks');  // Old flat structure

// Mixed with new system
import { useTranslation } from 'react-i18next';  // New system
const { t: t2 } = useTranslation('nav');
t2('techpacks');  // New namespace structure

// Causes confusion and inconsistency
```

### Solution
```typescript
// ✅ CORRECT - Use only new i18n system
import { useTranslation } from 'react-i18next';

// Remove old i18n system (src/lib/i18n.tsx)
// Migrate all components to use react-i18next
const { t } = useTranslation(['nav', 'common']);
t('nav:techPacks');  // Consistent namespace structure
```

---

## 🚨 Mistake 9: Not Normalizing Legacy Data

### Problem
```typescript
// ❌ WRONG - Accepting any string value
const status = techPack.status;  // Could be 'Draft', 'draft', 'Nháp', etc.

// When translating:
translateEnum('techpack:enums.status', status);
// 'Draft' → tries to find 'techpack:enums.status.Draft' → not found!
// Falls back to 'Draft' (not translated)
```

### Solution
```typescript
// ✅ CORRECT - Normalize before using
import { normalizeStatus } from '../../../constants/enums';

const status = normalizeStatus(techPack.status);
// 'Draft' → 'draft'
// 'Nháp' → 'draft' (if mapped)
// 'draft' → 'draft'

// Now translation works correctly
translateEnum('techpack:enums.status', status);
// 'draft' → "Draft" (EN) or "Nháp" (VI)
```

---

## 🚨 Mistake 10: Forgetting to Update Translation Files

### Problem
```typescript
// ❌ WRONG - Using translation key that doesn't exist
t('articleInfo:fields.newField')  // Key not in JSON files

// Result: Shows 'articleInfo:fields.newField' instead of translated text
```

### Solution
```typescript
// ✅ CORRECT - Always add keys to both languages

// 1. Add to English file
// src/i18n/locales/en/articleInfo.json
{
  "fields": {
    "newField": "New Field"
  }
}

// 2. Add to Vietnamese file
// src/i18n/locales/vi/articleInfo.json
{
  "fields": {
    "newField": "Trường mới"
  }
}

// 3. Use in component
t('articleInfo:fields.newField')  // Now works!
```

### Best Practice
```typescript
// Use TypeScript to catch missing keys (optional)
// Or use a script to validate all translation keys
npm run i18n:validate  // (create this script)
```

---

## ✅ Prevention Checklist

Before committing code, check:

- [ ] No hardcoded strings in JSX
- [ ] All enum values stored as keys (not translated strings)
- [ ] All components use translation keys (not hardcoded text)
- [ ] All namespaces are clear and consistent
- [ ] Enum translations use `translateEnum()` helper
- [ ] Shared components accept `labelKey`/`placeholderKey`
- [ ] PDF export uses same translation system
- [ ] Language persists across navigation
- [ ] Legacy data is normalized before use
- [ ] Translation keys exist in both language files

---

## 🔍 How to Find and Fix Issues

### 1. Run Scan Script
```bash
npm run i18n:scan
```
Finds hardcoded strings automatically.

### 2. Manual Search
```bash
# Find hardcoded labels
grep -r 'label="' src/ --include="*.tsx"

# Find hardcoded placeholders
grep -r 'placeholder="' src/ --include="*.tsx"

# Find hardcoded button text
grep -r '>Save<' src/ --include="*.tsx"
```

### 3. TypeScript Checks
```typescript
// Use TypeScript to catch missing keys
// (Requires type-safe i18n setup)
t('articleInfo:fields.articleCode')  // ✅ Type-checked
t('articleInfo:fields.wrongKey')     // ❌ TypeScript error
```

---

## 📚 Summary

**Golden Rules:**
1. ✅ Store enum keys, not translated strings
2. ✅ Translate at display time, not storage time
3. ✅ Use namespaces for all translation keys
4. ✅ Shared components accept translation keys
5. ✅ PDF export uses same translation system
6. ✅ Language persists globally via i18next
7. ✅ Normalize legacy data before use
8. ✅ Keep translation files in sync

**When in doubt:**
- Ask: "Is this text visible to the user?" → Must be translated
- Ask: "Is this a business value?" → Store as enum key, translate at display
- Ask: "Can this be reused?" → Put in shared namespace (common, techpack, etc.)







