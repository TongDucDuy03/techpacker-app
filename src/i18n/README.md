# Internationalization (i18n) Setup

## Overview

TechPacker hỗ trợ đa ngôn ngữ với tiếng Anh và tiếng Việt. Hệ thống i18n được xây dựng trên React i18next với các tính năng:

- **Language Detection**: Tự động phát hiện ngôn ngữ từ browser hoặc localStorage
- **Persistent Language**: Lưu lựa chọn ngôn ngữ trong localStorage
- **Fallback Support**: Fallback về tiếng Anh nếu translation không tồn tại
- **Type Safety**: TypeScript support cho translation keys
- **Lazy Loading**: Tải translation files khi cần thiết

## Cấu trúc thư mục

```
src/i18n/
├── index.ts              # i18n configuration
├── locales/
│   ├── en.json          # English translations
│   └── vi.json          # Vietnamese translations
└── README.md            # This file
```

## Sử dụng

### 1. Hook useTranslation

```tsx
import { useTranslation } from '../hooks/useTranslation';

function MyComponent() {
  const { t, changeLanguage, currentLanguage } = useTranslation();
  
  return (
    <div>
      <h1>{t('common.title')}</h1>
      <button onClick={() => changeLanguage('vi')}>
        Switch to Vietnamese
      </button>
    </div>
  );
}
```

### 2. Component TranslatedText

```tsx
import TranslatedText from '../components/TranslatedText';

function MyComponent() {
  return (
    <div>
      <TranslatedText 
        translationKey="common.title"
        fallback="Default Title"
        className="text-xl font-bold"
      />
    </div>
  );
}
```

### 3. Language Selector

```tsx
import LanguageSelector from '../components/LanguageSelector';

function Header() {
  return (
    <header>
      <LanguageSelector 
        variant="dropdown" // or "buttons"
        showLabel={true}
      />
    </header>
  );
}
```

## Translation Keys

### Cấu trúc keys

```json
{
  "common": {
    "loading": "Loading...",
    "save": "Save",
    "cancel": "Cancel"
  },
  "techpack": {
    "title": "TechPack",
    "create": "Create TechPack",
    "validation": {
      "nameRequired": "Name is required"
    }
  }
}
```

### Sử dụng nested keys

```tsx
// Sử dụng dot notation
t('techpack.validation.nameRequired')

// Hoặc với namespace
const { t } = useTranslation('techpack');
t('validation.nameRequired')
```

### Interpolation

```json
{
  "ui": {
    "welcome": "Welcome, {{name}}!",
    "itemsCount": "You have {{count}} items"
  }
}
```

```tsx
t('ui.welcome', { name: 'John' })
t('ui.itemsCount', { count: 5 })
```

## Thêm ngôn ngữ mới

### 1. Tạo file translation

```json
// src/i18n/locales/es.json
{
  "common": {
    "loading": "Cargando...",
    "save": "Guardar",
    "cancel": "Cancelar"
  }
}
```

### 2. Cập nhật configuration

```typescript
// src/i18n/index.ts
import es from './locales/es.json';

const resources = {
  en: { translation: en },
  vi: { translation: vi },
  es: { translation: es } // Thêm ngôn ngữ mới
};
```

### 3. Cập nhật LanguageSelector

```typescript
// src/components/LanguageSelector.tsx
const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'es', name: 'Español', flag: '🇪🇸' } // Thêm ngôn ngữ mới
];
```

## Best Practices

### 1. Naming Convention

- Sử dụng camelCase cho keys
- Nhóm keys theo module/feature
- Sử dụng descriptive names

```json
{
  "techpack": {
    "form": {
      "nameLabel": "TechPack Name",
      "namePlaceholder": "Enter techpack name",
      "nameRequired": "Name is required"
    }
  }
}
```

### 2. Fallback Strategy

```tsx
// Luôn cung cấp fallback
<TranslatedText 
  translationKey="common.title"
  fallback="Default Title"
/>

// Hoặc với hook
t('common.title', { defaultValue: 'Default Title' })
```

### 3. Pluralization

```json
{
  "items": {
    "zero": "No items",
    "one": "One item",
    "other": "{{count}} items"
  }
}
```

```tsx
t('items', { count: 0 }) // "No items"
t('items', { count: 1 }) // "One item"
t('items', { count: 5 }) // "5 items"
```

### 4. Context-aware Translations

```json
{
  "status": {
    "draft": "Draft",
    "review": "Review",
    "approved": "Approved"
  }
}
```

```tsx
t(`status.${techPack.status}`)
```

## Testing

### 1. Test với different languages

```tsx
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';

test('renders in Vietnamese', () => {
  i18n.changeLanguage('vi');
  render(
    <I18nextProvider i18n={i18n}>
      <MyComponent />
    </I18nextProvider>
  );
  
  expect(screen.getByText('Tên TechPack')).toBeInTheDocument();
});
```

### 2. Test translation keys

```tsx
test('has all required translation keys', () => {
  const enKeys = Object.keys(en);
  const viKeys = Object.keys(vi);
  
  expect(enKeys).toEqual(viKeys);
});
```

## Performance

### 1. Lazy Loading

```typescript
// Tải translation khi cần thiết
const loadTranslation = async (language: string) => {
  const translation = await import(`./locales/${language}.json`);
  i18n.addResourceBundle(language, 'translation', translation.default);
};
```

### 2. Namespace Splitting

```typescript
// Chia nhỏ translation files
const resources = {
  en: {
    common: enCommon,
    techpack: enTechpack,
    bom: enBom
  }
};
```

## Troubleshooting

### 1. Missing translations

- Kiểm tra key có đúng không
- Kiểm tra file translation có tồn tại không
- Kiểm tra fallback language

### 2. Language not persisting

- Kiểm tra localStorage permissions
- Kiểm tra LanguageProvider có wrap đúng không

### 3. Performance issues

- Sử dụng React.memo cho components
- Lazy load translation files
- Optimize bundle size

## Resources

- [React i18next Documentation](https://react.i18next.com/)
- [i18next Documentation](https://www.i18next.com/)
- [ICU Message Format](https://unicode-org.github.io/icu/userguide/format_parse/messages/)
- [Pluralization Rules](https://www.i18next.com/translation-function/plurals)
